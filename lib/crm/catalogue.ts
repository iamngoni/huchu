/**
 * The catalogue, and the arithmetic of putting it on a quote.
 *
 * Pricing is the part of a CRM people check by hand, so all of it is pure and
 * tested: a rounding rule nobody can reproduce is how a business ends up
 * arguing with its own invoices.
 */
import type { CrmCatalogKind } from "@prisma/client";
import { z } from "zod";

export const CATALOG_KINDS = ["SERVICE", "PRODUCT", "LABOUR", "MATERIAL", "BUNDLE"] as const;

export const CATALOG_KIND_LABELS: Record<CrmCatalogKind, string> = {
  SERVICE: "Service",
  PRODUCT: "Product",
  LABOUR: "Labour",
  MATERIAL: "Material",
  BUNDLE: "Bundle",
};

export type PriceTier = { minQuantity: number; unitPrice: number };

/**
 * The unit price for a quantity: the tier with the highest minimum at or below
 * it, falling back to the list price when no tier applies.
 */
export function priceForQuantity(
  listPrice: number,
  tiers: PriceTier[],
  quantity: number,
): { unitPrice: number; tier: PriceTier | null } {
  const applicable = tiers
    .filter((tier) => quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  return applicable
    ? { unitPrice: applicable.unitPrice, tier: applicable }
    : { unitPrice: listPrice, tier: null };
}

/** Money is rounded once, at the point it becomes a number on a document. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type QuoteLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  /** Per-line discount, as a percentage of that line. */
  discountPercent?: number;
  costPrice?: number | null;
};

export type QuoteLineTotals = {
  gross: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
  margin: number | null;
};

/**
 * One line's totals.
 *
 * Tax is charged on the discounted amount, never on the list price — charging
 * VAT on money the customer isn't paying is the kind of error that turns into
 * a credit note and a phone call.
 */
export function lineTotals(line: QuoteLineInput): QuoteLineTotals {
  const gross = line.quantity * line.unitPrice;
  const discountPercent = Math.min(100, Math.max(0, line.discountPercent ?? 0));
  const discount = (gross * discountPercent) / 100;
  const net = gross - discount;
  const tax = (net * (line.taxRate ?? 0)) / 100;

  const cost = line.costPrice ?? null;
  const margin = cost === null ? null : net - cost * line.quantity;

  return {
    gross: roundMoney(gross),
    discount: roundMoney(discount),
    net: roundMoney(net),
    tax: roundMoney(tax),
    total: roundMoney(net + tax),
    margin: margin === null ? null : roundMoney(margin),
  };
}

export type QuoteTotals = {
  subtotal: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
  margin: number | null;
  marginPercent: number | null;
  discountPercent: number;
};

/**
 * The whole document.
 *
 * Every line is rounded before summing, so the totals match what a customer
 * gets adding up the printed lines with a calculator. Summing first and
 * rounding once is more accurate and less defensible.
 */
export function quoteTotals(
  lines: QuoteLineInput[],
  documentDiscountPercent = 0,
): QuoteTotals {
  let subtotal = 0;
  let lineDiscount = 0;
  let tax = 0;
  let cost = 0;
  let anyCost = false;

  for (const line of lines) {
    const totals = lineTotals(line);
    subtotal += totals.gross;
    lineDiscount += totals.discount;
    tax += totals.tax;
    if (line.costPrice !== null && line.costPrice !== undefined) {
      anyCost = true;
      cost += line.costPrice * line.quantity;
    }
  }

  // A document-level discount applies after line discounts, on what is left.
  const afterLines = subtotal - lineDiscount;
  const headerPercent = Math.min(100, Math.max(0, documentDiscountPercent));
  const headerDiscount = (afterLines * headerPercent) / 100;
  const net = afterLines - headerDiscount;

  // The header discount reduces the taxable amount too.
  const taxAfterHeader = afterLines > 0 ? tax * (net / afterLines) : 0;

  const totalDiscount = lineDiscount + headerDiscount;
  const margin = anyCost ? net - cost : null;

  return {
    subtotal: roundMoney(subtotal),
    discount: roundMoney(totalDiscount),
    net: roundMoney(net),
    tax: roundMoney(taxAfterHeader),
    total: roundMoney(net + taxAfterHeader),
    margin: margin === null ? null : roundMoney(margin),
    marginPercent: margin === null || net === 0 ? null : Math.round((margin / net) * 1000) / 10,
    discountPercent: subtotal === 0 ? 0 : Math.round((totalDiscount / subtotal) * 1000) / 10,
  };
}

/**
 * Whether this quote needs a manager's blessing.
 *
 * Two ways to trip it: an overall discount past the company threshold, or any
 * single line discounted past what that catalogue item allows. The second
 * matters because a big discount on one expensive line can hide inside a
 * modest overall percentage.
 */
export function needsDiscountApproval(params: {
  totals: QuoteTotals;
  companyThresholdPercent: number;
  lines: { discountPercent?: number; maxDiscountPercent?: number | null }[];
}): { required: boolean; reason: string | null } {
  if (params.totals.discountPercent > params.companyThresholdPercent) {
    return {
      required: true,
      reason: `The overall discount of ${params.totals.discountPercent}% is above the ${params.companyThresholdPercent}% a rep can give`,
    };
  }

  for (const line of params.lines) {
    const cap = line.maxDiscountPercent;
    if (cap === null || cap === undefined) continue;
    if ((line.discountPercent ?? 0) > cap) {
      return {
        required: true,
        reason: `A line is discounted ${line.discountPercent}%, above the ${cap}% allowed on that item`,
      };
    }
  }

  return { required: false, reason: null };
}

/** Selling below cost is nearly always a mistake, so it's called out. */
export function belowCostLines(lines: QuoteLineInput[]): number[] {
  const flagged: number[] = [];
  lines.forEach((line, index) => {
    if (line.costPrice === null || line.costPrice === undefined) return;
    if (lineTotals(line).net < line.costPrice * line.quantity) flagged.push(index);
  });
  return flagged;
}

export const catalogItemSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  kind: z.enum(CATALOG_KINDS).optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  unitPrice: z.number().finite().nonnegative(),
  currency: z.string().trim().length(3).optional(),
  taxRate: z.number().finite().min(0).max(100).optional(),
  costPrice: z.number().finite().nonnegative().nullable().optional(),
  maxDiscountPercent: z.number().finite().min(0).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  tiers: z
    .array(
      z.object({
        minQuantity: z.number().finite().positive(),
        unitPrice: z.number().finite().nonnegative(),
      }),
    )
    .max(10)
    .optional(),
});

/** Build the line a document builder starts from when an item is picked. */
export function catalogItemToLine(
  item: {
    name: string;
    description?: string | null;
    unitPrice: number;
    taxRate?: number;
    costPrice?: number | null;
    unit?: string | null;
  },
  tiers: PriceTier[],
  quantity = 1,
): QuoteLineInput {
  const { unitPrice } = priceForQuantity(item.unitPrice, tiers, quantity);
  return {
    description: item.unit ? `${item.name} (per ${item.unit})` : item.name,
    quantity,
    unitPrice,
    taxRate: item.taxRate ?? 0,
    costPrice: item.costPrice ?? null,
  };
}

/** Default ceiling on what a rep may discount without asking. */
export const DEFAULT_DISCOUNT_THRESHOLD_PERCENT = 10;
