import {
  Prisma,
  type AccountingSourceType,
  type SchoolFeeInvoiceStatus,
} from "@prisma/client";
import { createJournalEntryFromSource } from "@/lib/accounting/posting";
import {
  clampAtZero,
  isZeroOrLess,
  isPositive,
  money,
  type MoneyLike,
  sumMoney,
  toBaseAmount,
  toNumberOrZero,
} from "@/lib/schools/money";

/**
 * S-2.4 — the partial unique index that stops a student being invoiced twice
 * for one term against one fee structure.
 *
 * It cannot live in `schema.prisma` (Prisma has no `WHERE` on `@@unique`), so
 * the name is written down once here and matched against what Postgres reports.
 * A voided invoice is outside the index; so is an ad-hoc invoice with no fee
 * structure, because `feeStructureId` is nullable and NULLs are distinct.
 */
export const LIVE_FEE_INVOICE_INDEX =
  "SchoolFeeInvoice_live_student_term_structure_key";

/**
 * The columns the index covers, in the order Postgres reports them.
 *
 * Prisma does not surface the index *name* for a P2002 raised by an index it
 * does not know about — it reports the column list instead — so that is what is
 * matched. No other unique constraint on `SchoolFeeInvoice` covers these four,
 * so the match is unambiguous.
 */
const LIVE_FEE_INVOICE_COLUMNS = [
  "companyid",
  "studentid",
  "termid",
  "feestructureid",
];

export function isDuplicateLiveInvoice(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  const named = (
    Array.isArray(target)
      ? target.join(",")
      : typeof target === "string"
        ? target
        : error.message
  ).toLowerCase();

  if (named.includes(LIVE_FEE_INVOICE_INDEX.toLowerCase())) return true;
  return LIVE_FEE_INVOICE_COLUMNS.every((column) => named.includes(column));
}

export type SchoolFeeAccountingEventType =
  | "SCHOOL_FEE_INVOICE_ISSUED"
  | "SCHOOL_FEE_RECEIPT_POSTED"
  | "SCHOOL_FEE_RECEIPT_VOIDED"
  | "SCHOOL_FEE_WAIVER_APPLIED"
  | "SCHOOL_FEE_WRITEOFF_POSTED";

type SchoolFeeAccountingEventInput = {
  companyId: string;
  actorId: string;
  eventType: SchoolFeeAccountingEventType;
  sourceId: string;
  sourceRef: string;
  entryDate: Date;
  /**
   * Post-S-2.1 these are `Prisma.Decimal` at every real call site. They are
   * coerced to `number` once, here, because that is what `PostingContext`
   * takes; do not do arithmetic on them before handing them over.
   *
   * Post-S-2.2 they are expected **in the company's base currency** — see
   * `documentCurrency` below.
   */
  amount: MoneyLike;
  netAmount?: MoneyLike;
  taxAmount?: MoneyLike;
  grossAmount?: MoneyLike;
  /**
   * The currency the ledger entry is denominated in. The posting engine does no
   * conversion — it stamps whatever it is given onto the journal entry — so
   * this must be the company's base currency and `amount` must already be the
   * base-currency figure. A school billing in ZWG passes `baseAmount` here and
   * records the ZWG side through `documentCurrency` / `documentAmount`, which
   * travel in the payload for S-2.3 to make proper use of.
   */
  currency?: string;
  documentCurrency?: string;
  documentAmount?: MoneyLike;
  exchangeRate?: MoneyLike;
  payload?: Record<string, unknown>;
  invertDirection?: boolean;
  version?: number;
  /** Lets a period-lock override be attributed. Null for ordinary postings. */
  actorRole?: string | null;
};

function toPostingSourceType(
  eventType: SchoolFeeAccountingEventType,
): AccountingSourceType {
  switch (eventType) {
    case "SCHOOL_FEE_INVOICE_ISSUED":
      return "SALES_INVOICE";
    case "SCHOOL_FEE_RECEIPT_POSTED":
    case "SCHOOL_FEE_RECEIPT_VOIDED":
      return "SALES_RECEIPT";
    case "SCHOOL_FEE_WAIVER_APPLIED":
    case "SCHOOL_FEE_WRITEOFF_POSTED":
      return "SALES_WRITE_OFF";
    default:
      return "MANUAL";
  }
}

function buildPostingSourceId(input: {
  eventType: SchoolFeeAccountingEventType;
  sourceId: string;
}) {
  if (input.eventType === "SCHOOL_FEE_RECEIPT_VOIDED") {
    return `SCHOOL_FEE_RECEIPT_VOID:${input.sourceId}`;
  }
  if (input.eventType === "SCHOOL_FEE_WRITEOFF_POSTED") {
    return `SCHOOL_FEE_WRITEOFF:${input.sourceId}`;
  }
  if (input.eventType === "SCHOOL_FEE_WAIVER_APPLIED") {
    return `SCHOOL_FEE_WAIVER:${input.sourceId}`;
  }
  if (input.eventType === "SCHOOL_FEE_INVOICE_ISSUED") {
    return `SCHOOL_FEE_INVOICE:${input.sourceId}`;
  }
  return `SCHOOL_FEE_RECEIPT:${input.sourceId}`;
}

/**
 * Failures that mean "not yet", not "never".
 *
 * A locked period is the ordinary case of a receipt taken after month end. The
 * event stays PENDING and `retryPendingAccountingEvents` — the same drain the
 * replay endpoint and `pnpm platform:accounting-replay` use — posts it once the
 * period reopens. Anything else is a real posting failure and is surfaced.
 */
const PENDING_POSTING_CODES = new Set([
  "PERIOD_LOCKED",
  "PERIOD_OVERRIDE_FORBIDDEN",
  "PERIOD_OVERRIDE_REASON_REQUIRED",
]);

export type SchoolFeePostingResult = {
  accountingStatus: "POSTED" | "PENDING" | "FAILED";
  journalEntryId: string | null;
  accountingError: string | null;
};

/**
 * Post a school fee event to the ledger.
 *
 * This used to call `captureAccountingEvent` and stop, which wrote an
 * `AccountingIntegrationEvent` with status PENDING and produced no journal
 * entry. The only things that turned those rows into ledger movements were the
 * replay endpoint and a CLI, both run by hand — so fee income, the pack's whole
 * wedge, sat outside the trial balance until somebody remembered.
 *
 * It now does what retail's `postRetailJournal` does: posts inline through
 * `createJournalEntryFromSource`, which creates the integration event itself,
 * resolves the posting rule, writes the balanced entry and syncs the AR
 * subledger. Idempotency is unchanged — the source id is still
 * `SCHOOL_FEE_RECEIPT:{id}` and friends, so a repeated call returns the
 * existing entry rather than a second one.
 */
export async function emitSchoolFeeAccountingEvent(
  input: SchoolFeeAccountingEventInput,
): Promise<SchoolFeePostingResult> {
  const sourceType = toPostingSourceType(input.eventType);
  const postingSourceId = buildPostingSourceId({
    eventType: input.eventType,
    sourceId: input.sourceId,
  });
  const version = input.version ?? 1;
  const idempotencyKey = `schools:${input.eventType}:${input.sourceId}:v${version}`;

  const result = await createJournalEntryFromSource({
    companyId: input.companyId,
    sourceType,
    sourceId: postingSourceId,
    entryDate: input.entryDate,
    description: `${input.eventType} (${input.sourceRef})`,
    createdById: input.actorId,
    // Post S-2.1 Float→Decimal: these arrive as `Prisma.Decimal`. Coerced once
    // here because `PostingContext` is a number contract.
    amount: toNumberOrZero(money(input.amount)),
    netAmount: toNumberOrZero(money(input.netAmount)),
    taxAmount: toNumberOrZero(money(input.taxAmount)),
    grossAmount: toNumberOrZero(money(input.grossAmount ?? input.amount)),
    currency: input.currency ?? "USD",
    actorRole: input.actorRole ?? null,
    invertDirection: input.invertDirection === true,
    payload: {
      idempotencyKey,
      eventType: input.eventType,
      sourceRef: input.sourceRef,
      sourceId: input.sourceId,
      postingSourceId,
      // S-2.2. The ledger carries the base-currency figure; what the family was
      // actually billed travels alongside it so nothing has to be re-derived
      // from a rate that may since have moved.
      documentCurrency: input.documentCurrency ?? input.currency ?? "USD",
      documentAmount: toNumberOrZero(money(input.documentAmount ?? input.amount)),
      exchangeRate: toNumberOrZero(input.exchangeRate ?? 1),
      ...input.payload,
    },
  });

  if (result.entryId || result.skipped) {
    return {
      accountingStatus: "POSTED",
      journalEntryId: result.entryId ?? null,
      accountingError: null,
    };
  }

  return {
    accountingStatus: PENDING_POSTING_CODES.has(result.code ?? "") ? "PENDING" : "FAILED",
    journalEntryId: null,
    accountingError: result.error ?? "Accounting posting failed",
  };
}

export function recalculateFeeInvoiceStatus(input: {
  currentStatus: string;
  totalAmount: MoneyLike;
  paidAmount: MoneyLike;
  waivedAmount: MoneyLike;
  writeOffAmount: MoneyLike;
  balanceAmount: MoneyLike;
}) {
  const current = input.currentStatus;
  if (current === "VOIDED" || current === "WRITEOFF") return current;
  if (isZeroOrLess(input.totalAmount)) return "DRAFT";
  if (isZeroOrLess(input.balanceAmount)) return "PAID";
  if (
    isPositive(input.paidAmount) ||
    isPositive(input.waivedAmount) ||
    isPositive(input.writeOffAmount)
  ) {
    return "PART_PAID";
  }
  return current === "DRAFT" ? "DRAFT" : "ISSUED";
}

export async function refreshFeeInvoiceBalance(
  tx: Prisma.TransactionClient,
  input: { companyId: string; invoiceId: string },
) {
  const { companyId, invoiceId } = input;

  const [invoice, lines, allocations, waivers] = await Promise.all([
    tx.schoolFeeInvoice.findFirst({
      where: { id: invoiceId, companyId },
      select: {
        id: true,
        status: true,
        exchangeRate: true,
      },
    }),
    tx.schoolFeeInvoiceLine.findMany({
      where: { invoiceId, companyId },
      select: { lineTotal: true, taxAmount: true },
    }),
    tx.schoolFeeReceiptAllocation.findMany({
      where: {
        companyId,
        invoiceId,
        receipt: { status: "POSTED" },
      },
      select: { allocatedAmount: true },
    }),
    tx.schoolFeeWaiver.findMany({
      where: {
        companyId,
        invoiceId,
        status: "APPLIED",
      },
      select: { amount: true },
    }),
  ]);

  if (!invoice) return null;

  // Post S-2.1 Float→Decimal: every one of these columns is a `Prisma.Decimal`,
  // and the sums stay Decimal from the read to the write. A hundred invoice
  // lines accumulated with `+=` on a double is exactly the drift the migration
  // exists to end.
  const subTotal = sumMoney(
    lines.map((line) => clampAtZero(money(line.lineTotal).minus(money(line.taxAmount)))),
  );
  const taxTotal = sumMoney(lines.map((line) => line.taxAmount));
  const totalAmount = sumMoney(lines.map((line) => line.lineTotal));
  const paidAmount = sumMoney(allocations.map((allocation) => allocation.allocatedAmount));
  const waivedAmount = sumMoney(waivers.map((waiver) => waiver.amount));
  const settled = paidAmount.plus(waivedAmount);
  const writeOffAmount =
    invoice.status === "WRITEOFF" ? clampAtZero(totalAmount.minus(settled)) : money(0);
  const balanceAmount = clampAtZero(totalAmount.minus(settled).minus(writeOffAmount));
  const nextStatus = recalculateFeeInvoiceStatus({
    currentStatus: invoice.status,
    totalAmount,
    paidAmount,
    waivedAmount,
    writeOffAmount,
    balanceAmount,
  });

  return tx.schoolFeeInvoice.update({
    where: { id: invoiceId },
    data: {
      subTotal,
      taxTotal,
      totalAmount,
      paidAmount,
      waivedAmount,
      writeOffAmount,
      balanceAmount,
      // S-2.2. The base-currency equivalent is derived, never entered, so it
      // cannot disagree with the total it restates.
      baseAmount: toBaseAmount(totalAmount, invoice.exchangeRate),
      status: nextStatus as SchoolFeeInvoiceStatus,
    },
  });
}
