import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { issueWithFdmsConnector, syncWithFdmsConnector } from "@/lib/accounting/fdms-connector";

export type FiscalValidationResult = {
  ok: boolean;
  missing: string[];
};

/**
 * S-2.7 — which document a fiscal receipt was issued for.
 *
 * There are two, and there will not be a third without another column: a
 * `FiscalReceipt` row names exactly one, held by the
 * `FiscalReceipt_one_source_check` constraint. The accounting module fiscalises
 * a `SalesInvoice` at the moment it is issued; a school fiscalises a
 * `SchoolFeeReceipt` at the moment the money is taken, because that is the
 * document the parent is handed.
 */
export type FiscalDocumentSource =
  | { kind: "SALES_INVOICE"; invoiceId: string }
  | { kind: "SCHOOL_FEE_RECEIPT"; schoolReceiptId: string };

export type FiscalIssueResult = {
  status: "SUCCESS" | "PENDING" | "FAILED";
  receiptId?: string;
  providerKey?: string | null;
  fiscalNumber?: string | null;
  providerReference?: string | null;
  error?: string;
};

function sourceWhere(
  source: FiscalDocumentSource,
): Prisma.FiscalReceiptWhereUniqueInput {
  return source.kind === "SALES_INVOICE"
    ? { invoiceId: source.invoiceId }
    : { schoolReceiptId: source.schoolReceiptId };
}

/**
 * Issue one document to FDMS and record what came back.
 *
 * This is the whole of the transport-facing work, and it is deliberately
 * ignorant of what kind of document it is issuing: it finds the tenant's active
 * provider, refuses to re-issue something already accepted, writes a PENDING
 * row *before* the call, makes the call, and records the outcome. The payload
 * is built by the caller, because only the caller knows what the document is.
 *
 * **Synchronous, and durable either way.** The HTTP call blocks the request that
 * triggered it, exactly as the sales-invoice path has always done. What makes
 * that survivable is the order: the row exists in PENDING before the connector
 * is touched, so a timeout, a crash or a 500 leaves a durable record with an
 * `attemptCount` and a `nextRetryAt` for the replay endpoint to find. Nothing
 * about the source document is written here, so a fiscal failure can never undo
 * the invoice or the receipt that caused it.
 */
export async function issueFiscalDocument(input: {
  companyId: string;
  source: FiscalDocumentSource;
  /** Written to `receiptNumber` — the school's own receipt no. Optional. */
  documentNumber?: string | null;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  /**
   * Run once the attempt is committed to, before the connector is called, and
   * only when there is going to be an attempt. The sales-invoice path uses it
   * to stamp `SalesInvoice.fiscalStatus = PENDING`; doing that unconditionally
   * would flip an already-accepted invoice back to PENDING and never correct
   * it, because an accepted document returns early and is never re-sent.
   */
  onAttempt?: () => Promise<void>;
}): Promise<FiscalIssueResult> {
  const { companyId, source, idempotencyKey, payload } = input;

  const provider = await prisma.fiscalisationProviderConfig.findFirst({
    where: { companyId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!provider) {
    return { status: "FAILED", error: "Missing fiscalisation provider configuration" };
  }

  const existing = await prisma.fiscalReceipt.findUnique({
    where: sourceWhere(source),
  });
  if (existing && existing.companyId !== companyId) {
    return { status: "FAILED", error: "Fiscal receipt belongs to another company" };
  }
  if (existing?.status === "SUCCESS") {
    return {
      status: "SUCCESS",
      receiptId: existing.id,
      providerKey: existing.providerKey ?? provider.providerKey,
      fiscalNumber: existing.fiscalNumber ?? null,
      providerReference: existing.providerReference ?? null,
    };
  }

  const pending = {
    status: "PENDING" as const,
    providerKey: provider.providerKey,
    requestIdempotencyKey: idempotencyKey,
    rawResponseJson: JSON.stringify({
      status: "PENDING",
      providerKey: provider.providerKey,
      request: payload,
    }),
    lastSyncedAt: new Date(),
  };

  const receipt = existing
    ? await prisma.fiscalReceipt.update({
        where: { id: existing.id },
        data: {
          ...pending,
          attemptCount: { increment: 1 },
          nextRetryAt: null,
          lastError: null,
        },
      })
    : await prisma.fiscalReceipt.create({
        data: {
          companyId,
          ...(source.kind === "SALES_INVOICE"
            ? { invoiceId: source.invoiceId }
            : { schoolReceiptId: source.schoolReceiptId }),
          ...(input.documentNumber ? { receiptNumber: input.documentNumber } : {}),
          ...pending,
          attemptCount: 1,
        },
      });

  if (input.onAttempt) await input.onAttempt();

  try {
    const connectorResult = await issueWithFdmsConnector({
      provider,
      payload: { idempotencyKey, payload },
      attemptCount: receipt.attemptCount,
    });

    const updated = await markFiscalReceiptResult({
      receiptId: receipt.id,
      status: connectorResult.status,
      fiscalNumber: connectorResult.fiscalNumber,
      providerReference: connectorResult.providerReference,
      qrCodeData: connectorResult.qrCodeData,
      signature: connectorResult.signature,
      rawResponseJson: connectorResult.rawResponseJson,
      error: connectorResult.error,
      nextRetryAt: connectorResult.nextRetryAt,
    });

    return {
      status: updated.status === "VOIDED" ? "FAILED" : updated.status,
      receiptId: updated.id,
      providerKey: updated.providerKey,
      fiscalNumber: updated.fiscalNumber,
      providerReference: updated.providerReference,
      error: updated.lastError ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown FDMS connector error";
    const updated = await markFiscalReceiptResult({
      receiptId: receipt.id,
      status: "FAILED",
      rawResponseJson: JSON.stringify({ error: message }),
      error: message,
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return {
      status: "FAILED",
      receiptId: updated.id,
      providerKey: updated.providerKey,
      error: message,
    };
  }
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export async function validateFiscalInvoice(companyId: string, invoiceId: string): Promise<FiscalValidationResult> {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      lines: true,
    },
  });

  if (!invoice || invoice.companyId !== companyId) {
    return { ok: false, missing: ["invoice"] };
  }

  const settings = await prisma.accountingSettings.findUnique({
    where: { companyId },
  });

  const missing: string[] = [];
  if (!settings) {
    missing.push("accounting settings");
  } else {
    if (!normalize(settings.legalName)) missing.push("supplier legal name");
    if (!normalize(settings.vatNumber)) missing.push("supplier VAT number");
    if (!normalize(settings.taxNumber)) missing.push("supplier tax number");
    if (!normalize(settings.address)) missing.push("supplier address");
  }

  if (!normalize(invoice.invoiceNumber)) missing.push("invoice number");
  if (!invoice.invoiceDate) missing.push("invoice date");
  if (!normalize(invoice.currency)) missing.push("currency");

  if (!normalize(invoice.customer?.name)) missing.push("customer name");
  if (!normalize(invoice.customer?.address)) missing.push("customer address");

  if (!invoice.lines || invoice.lines.length === 0) {
    missing.push("invoice line items");
  }

  const invalidLines = (invoice.lines ?? []).filter(
    (line) =>
      !normalize(line.description) ||
      line.quantity <= 0 ||
      !Number.isFinite(line.unitPrice) ||
      line.unitPrice < 0,
  );
  if (invalidLines.length > 0) missing.push("valid line descriptions and quantities");

  return { ok: missing.length === 0, missing };
}

export async function markFiscalReceiptResult(input: {
  receiptId: string;
  status: "SUCCESS" | "FAILED" | "VOIDED" | "PENDING";
  fiscalNumber?: string | null;
  providerReference?: string | null;
  qrCodeData?: string | null;
  signature?: string | null;
  rawResponseJson?: string | null;
  error?: string | null;
  nextRetryAt?: Date | null;
}) {
  const updated = await prisma.fiscalReceipt.update({
    where: { id: input.receiptId },
    data: {
      status: input.status,
      fiscalNumber: input.fiscalNumber ?? undefined,
      qrCodeData: input.qrCodeData ?? undefined,
      signature: input.signature ?? undefined,
      rawResponseJson: input.rawResponseJson ?? undefined,
      lastError: input.error ?? undefined,
      providerReference: input.providerReference ?? input.fiscalNumber ?? undefined,
      nextRetryAt: input.nextRetryAt ?? undefined,
      lastSyncedAt: new Date(),
      issuedAt: input.status === "SUCCESS" ? new Date() : undefined,
    },
  });

  if (updated.invoiceId) {
    await prisma.salesInvoice.update({
      where: { id: updated.invoiceId },
      data: {
        fiscalStatus: updated.status,
      },
    });
  }

  return updated;
}

export async function issueFiscalReceipt(companyId: string, invoiceId: string, actorId: string) {
  void actorId;
  const idempotencyKey = `${companyId}:${invoiceId}`;
  const validation = await validateFiscalInvoice(companyId, invoiceId);
  if (!validation.ok) {
    return { status: "FAILED", error: `Missing fiscal fields: ${validation.missing.join(", ")}` };
  }

  const [invoice, supplier] = await Promise.all([
    prisma.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        lines: true,
      },
    }),
    prisma.accountingSettings.findUnique({
      where: { companyId },
      select: {
        legalName: true,
        tradingName: true,
        vatNumber: true,
        taxNumber: true,
        address: true,
        phone: true,
        email: true,
      },
    }),
  ]);

  if (!invoice) {
    return { status: "FAILED", error: "Invoice not found" };
  }

  const payload = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    currency: invoice.currency,
    totals: {
      subTotal: invoice.subTotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
    },
    supplier,
    customer: {
      name: invoice.customer?.name ?? null,
      taxNumber: invoice.customer?.taxNumber ?? null,
      vatNumber: invoice.customer?.vatNumber ?? null,
      address: invoice.customer?.address ?? null,
      phone: invoice.customer?.phone ?? null,
      email: invoice.customer?.email ?? null,
    },
    items: invoice.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      taxAmount: line.taxAmount,
      lineTotal: line.lineTotal,
    })),
  };

  return issueFiscalDocument({
    companyId,
    source: { kind: "SALES_INVOICE", invoiceId },
    idempotencyKey,
    payload,
    // Stamped before the call and corrected by `markFiscalReceiptResult`
    // afterwards, so a crash mid-flight leaves the invoice saying "in
    // progress" rather than "done".
    onAttempt: async () => {
      await prisma.salesInvoice.update({
        where: { id: invoiceId },
        data: { fiscalStatus: "PENDING" },
      });
    },
  });
}

export async function syncFiscalReceiptStatus(companyId: string, receiptId: string) {
  const receipt = await prisma.fiscalReceipt.findUnique({
    where: { id: receiptId },
  });
  if (!receipt || receipt.companyId !== companyId) {
    throw new Error("Fiscal receipt not found");
  }

  const provider = await prisma.fiscalisationProviderConfig.findFirst({
    where: {
      companyId,
      isActive: true,
      ...(receipt.providerKey ? { providerKey: receipt.providerKey } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!provider) {
    throw new Error("Active fiscalisation provider configuration not found");
  }

  const reference = receipt.providerReference ?? receipt.fiscalNumber ?? receipt.receiptNumber;
  if (!reference) {
    throw new Error("Receipt has no provider reference for sync");
  }

  const syncResult = await syncWithFdmsConnector({
    provider,
    providerReference: reference,
    attemptCount: receipt.attemptCount,
  });

  return markFiscalReceiptResult({
    receiptId,
    status: syncResult.status,
    fiscalNumber: syncResult.fiscalNumber,
    providerReference: syncResult.providerReference,
    qrCodeData: syncResult.qrCodeData,
    signature: syncResult.signature,
    rawResponseJson: syncResult.rawResponseJson,
    error: syncResult.error,
    nextRetryAt: syncResult.nextRetryAt,
  });
}
