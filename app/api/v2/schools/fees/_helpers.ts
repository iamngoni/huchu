import {
  Prisma,
  type AccountingSourceType,
  type SchoolFeeInvoiceStatus,
} from "@prisma/client";
import { createJournalEntryFromSource } from "@/lib/accounting/posting";

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
  amount: number;
  netAmount?: number;
  taxAmount?: number;
  grossAmount?: number;
  currency?: string;
  payload?: Record<string, unknown>;
  invertDirection?: boolean;
  version?: number;
  /** Lets a period-lock override be attributed. Null for ordinary postings. */
  actorRole?: string | null;
};

function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMoneyOrZero(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return toMoney(value);
}

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
    amount: toMoneyOrZero(input.amount),
    netAmount: toMoneyOrZero(input.netAmount),
    taxAmount: toMoneyOrZero(input.taxAmount),
    grossAmount: toMoneyOrZero(input.grossAmount ?? input.amount),
    currency: input.currency ?? "USD",
    actorRole: input.actorRole ?? null,
    invertDirection: input.invertDirection === true,
    payload: {
      idempotencyKey,
      eventType: input.eventType,
      sourceRef: input.sourceRef,
      sourceId: input.sourceId,
      postingSourceId,
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
  totalAmount: number;
  paidAmount: number;
  waivedAmount: number;
  writeOffAmount: number;
  balanceAmount: number;
}) {
  const current = input.currentStatus;
  if (current === "VOIDED" || current === "WRITEOFF") return current;
  if (input.totalAmount <= 0) return "DRAFT";
  if (input.balanceAmount <= 0) return "PAID";
  if (input.paidAmount > 0 || input.waivedAmount > 0 || input.writeOffAmount > 0) {
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

  const subTotal = toMoney(
    lines.reduce((sum, line) => sum + Math.max(line.lineTotal - line.taxAmount, 0), 0),
  );
  const taxTotal = toMoney(lines.reduce((sum, line) => sum + line.taxAmount, 0));
  const totalAmount = toMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const paidAmount = toMoney(
    allocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0),
  );
  const waivedAmount = toMoney(waivers.reduce((sum, waiver) => sum + waiver.amount, 0));
  const writeOffAmount = invoice.status === "WRITEOFF" ? toMoney(totalAmount - paidAmount - waivedAmount) : 0;
  const balanceAmount = toMoney(
    Math.max(totalAmount - paidAmount - waivedAmount - writeOffAmount, 0),
  );
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
      status: nextStatus as SchoolFeeInvoiceStatus,
    },
  });
}
