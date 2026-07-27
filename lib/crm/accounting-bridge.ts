/**
 * CRM → Accounting bridge.
 *
 * Quotations, invoices, and receipts are created here but the records live in
 * the accounting module (SalesQuotation / SalesInvoice / SalesReceipt). Each
 * CRM document is linked back through a CrmLeadDocument row (scrap-metal
 * "Pattern B"). Invoices and receipts post journals via
 * `createJournalEntryFromSource`, which is idempotent and outbox-backed.
 *
 * A CrmClient is lazily linked to an accounting Customer the first time it
 * needs one (find-or-create by name, matching the gold/scrap convention).
 */
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createJournalEntryFromSource } from "@/lib/accounting/posting";
import { recalcSalesInvoiceBalance } from "@/lib/accounting/balances";
import { reserveIdentifier } from "@/lib/id-generator";

type Tx = Prisma.TransactionClient;

export type CrmDocumentLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

type ComputedLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
};

type DocTotals = {
  lines: ComputedLine[];
  subTotal: number;
  taxTotal: number;
  total: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeTotals(lines: CrmDocumentLineInput[]): DocTotals {
  const computed = lines.map((line) => {
    const taxRate = line.taxRate ?? 0;
    const net = line.quantity * line.unitPrice;
    const taxAmount = round2((net * taxRate) / 100);
    return {
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate,
      taxAmount,
      lineTotal: round2(net + taxAmount),
    };
  });
  const subTotal = round2(computed.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const taxTotal = round2(computed.reduce((s, l) => s + l.taxAmount, 0));
  const total = round2(subTotal + taxTotal);
  return { lines: computed, subTotal, taxTotal, total };
}

/**
 * Ensure a CrmClient is linked to an accounting Customer, creating one if
 * needed and writing the link back onto the CrmClient. Returns the customerId.
 */
export async function ensureAccountingCustomer(
  tx: Tx,
  params: { companyId: string; clientId: string },
): Promise<string> {
  const client = await tx.crmClient.findFirst({
    where: { id: params.clientId, companyId: params.companyId },
    select: { id: true, name: true, phone: true, email: true, customerId: true },
  });
  if (!client) throw new Error("CRM client not found");
  if (client.customerId) return client.customerId;

  // Reuse an existing accounting customer with the same name before creating.
  const existing = await tx.customer.findFirst({
    where: { companyId: params.companyId, name: client.name },
    select: { id: true },
  });
  const customerId =
    existing?.id ??
    (
      await tx.customer.create({
        data: {
          companyId: params.companyId,
          name: client.name,
          phone: client.phone ?? undefined,
          email: client.email ?? undefined,
          isActive: true,
        },
        select: { id: true },
      })
    ).id;

  await tx.crmClient.update({
    where: { id: client.id },
    data: { customerId },
  });
  return customerId;
}

/** Which record a document is being raised against. */
export type DocumentOwnerRef = { leadId: string; dealId?: undefined } | { dealId: string; leadId?: undefined };

type DocumentOwner = {
  kind: "lead" | "deal";
  id: string;
  clientId: string;
  stage: string;
  assignedToId: string | null;
};

/**
 * Resolve the record a document belongs to. A document hangs off a lead before
 * conversion and off the deal after it, and both need the same three things: a
 * company to bill, an owner to notify, and to not be closed-lost already.
 */
async function requireDocumentOwner(
  tx: Tx,
  companyId: string,
  ref: DocumentOwnerRef,
): Promise<DocumentOwner> {
  if (ref.dealId) {
    const deal = await tx.crmDeal.findFirst({
      where: { id: ref.dealId, companyId },
      select: { id: true, clientId: true, status: true, assignedToId: true },
    });
    if (!deal) throw new Error("Deal not found");
    if (deal.status === "LOST") {
      throw new Error("This deal is marked lost — reopen it before creating documents");
    }
    if (!deal.clientId) {
      throw new Error("This deal has no company; attach one before quoting or invoicing");
    }
    return {
      kind: "deal",
      id: deal.id,
      clientId: deal.clientId,
      stage: deal.status,
      assignedToId: deal.assignedToId,
    };
  }

  const lead = await tx.crmLead.findFirst({
    where: { id: ref.leadId, companyId },
    select: { id: true, clientId: true, stage: true, assignedToId: true },
  });
  if (!lead) throw new Error("Lead not found");
  if (lead.stage === "LOST") {
    throw new Error("This lead is marked LOST — reopen it before creating documents");
  }
  if (!lead.clientId) {
    throw new Error("Lead has no client; attach or create a client before quoting/invoicing");
  }
  return {
    kind: "lead",
    id: lead.id,
    clientId: lead.clientId,
    stage: lead.stage,
    assignedToId: lead.assignedToId,
  };
}

/** The foreign key to file a document under, given its owner. */
function ownerKey(owner: DocumentOwner): { leadId?: string; dealId?: string } {
  return owner.kind === "deal" ? { dealId: owner.id } : { leadId: owner.id };
}

const STAGE_ORDER = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "QUOTED",
  "INVOICED",
  "WON",
  "LOST",
] as const;

function stageAtLeast(current: string, target: string): boolean {
  return STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]) >=
    STAGE_ORDER.indexOf(target as (typeof STAGE_ORDER)[number]);
}

export type CreateQuotationInput = DocumentOwnerRef & {
  companyId: string;
  userId: string;
  lines: CrmDocumentLineInput[];
  currency?: string;
  validUntil?: Date | null;
  notes?: string | null;
};

export async function createQuotationForLead(input: CreateQuotationInput) {
  const currency = input.currency ?? "USD";
  return prisma.$transaction(async (tx) => {
    const owner = await requireDocumentOwner(tx, input.companyId, input as DocumentOwnerRef);
    const customerId = await ensureAccountingCustomer(tx, {
      companyId: input.companyId,
      clientId: owner.clientId,
    });
    const totals = computeTotals(input.lines);
    const quotationNumber = await reserveIdentifier(tx, {
      companyId: input.companyId,
      entity: "SALES_QUOTATION",
    });

    const quotation = await tx.salesQuotation.create({
      data: {
        companyId: input.companyId,
        customerId,
        quotationNumber,
        quotationDate: new Date(),
        validUntil: input.validUntil ?? undefined,
        status: "SENT",
        currency,
        subTotal: totals.subTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        notes: input.notes ?? undefined,
        createdById: input.userId,
        issuedById: input.userId,
        issuedAt: new Date(),
        lines: { create: totals.lines },
      },
      select: { id: true, quotationNumber: true, total: true },
    });

    const doc = await tx.crmLeadDocument.create({
      data: {
        companyId: input.companyId,
        ...ownerKey(owner),
        type: "QUOTATION",
        quotationId: quotation.id,
        amount: totals.total,
        currency,
        createdById: input.userId,
      },
      select: { id: true },
    });

    await tx.crmActivity.create({
      data: {
        companyId: input.companyId,
        type: "DOCUMENT_CREATED",
        ...ownerKey(owner),
        clientId: owner.clientId,
        subject: `Quotation ${quotation.quotationNumber} created`,
        metadata: { documentId: doc.id, quotationId: quotation.id },
        createdById: input.userId,
      },
    });

    // Only a lead auto-advances: its stages are a fixed enum this module can
    // reason about. A deal's stages are configurable per pipeline, so moving it
    // is the user's call through the stage bar.
    if (owner.kind === "lead" && !stageAtLeast(owner.stage, "QUOTED")) {
      await tx.crmLead.update({ where: { id: owner.id }, data: { stage: "QUOTED" } });
    }

    return { leadDocumentId: doc.id, quotationId: quotation.id, quotationNumber: quotation.quotationNumber, total: totals.total };
  });
}

export type CreateInvoiceInput = DocumentOwnerRef & {
  companyId: string;
  userId: string;
  lines?: CrmDocumentLineInput[];
  fromQuotationId?: string;
  currency?: string;
  notes?: string | null;
  dueDate?: Date | null;
};

export async function createInvoiceForLead(input: CreateInvoiceInput) {
  const currency = input.currency ?? "USD";
  const result = await prisma.$transaction(async (tx) => {
    const owner = await requireDocumentOwner(tx, input.companyId, input as DocumentOwnerRef);
    const customerId = await ensureAccountingCustomer(tx, {
      companyId: input.companyId,
      clientId: owner.clientId,
    });

    let lines = input.lines ?? [];
    if (input.fromQuotationId) {
      // The quotation must have been issued from THIS lead — a bare company
      // check would let any quotation id in the tenant be converted here.
      const linkedDoc = await tx.crmLeadDocument.findFirst({
        where: {
          companyId: input.companyId,
          ...ownerKey(owner),
          type: "QUOTATION",
          quotationId: input.fromQuotationId,
        },
        select: { id: true },
      });
      if (!linkedDoc) throw new Error("Source quotation does not belong to this lead");
      const quotation = await tx.salesQuotation.findFirst({
        where: { id: input.fromQuotationId, companyId: input.companyId },
        include: { lines: true },
      });
      if (!quotation) throw new Error("Source quotation not found");
      lines = quotation.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
      }));
      await tx.salesQuotation.update({
        where: { id: quotation.id },
        data: { status: "ACCEPTED" },
      });
    }
    if (lines.length === 0) throw new Error("Invoice needs at least one line");

    const totals = computeTotals(lines);
    const invoiceNumber = await reserveIdentifier(tx, {
      companyId: input.companyId,
      entity: "SALES_INVOICE",
    });
    const invoiceDate = new Date();

    const invoice = await tx.salesInvoice.create({
      data: {
        companyId: input.companyId,
        customerId,
        invoiceNumber,
        invoiceDate,
        dueDate: input.dueDate ?? undefined,
        status: "ISSUED",
        currency,
        subTotal: totals.subTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        notes: input.notes ?? undefined,
        createdById: input.userId,
        issuedById: input.userId,
        issuedAt: invoiceDate,
        lines: { create: totals.lines },
      },
      select: { id: true, invoiceNumber: true, total: true },
    });

    const doc = await tx.crmLeadDocument.create({
      data: {
        companyId: input.companyId,
        ...ownerKey(owner),
        type: "INVOICE",
        invoiceId: invoice.id,
        amount: totals.total,
        currency,
        createdById: input.userId,
      },
      select: { id: true },
    });

    await tx.crmActivity.create({
      data: {
        companyId: input.companyId,
        type: "DOCUMENT_CREATED",
        ...ownerKey(owner),
        clientId: owner.clientId,
        subject: `Invoice ${invoice.invoiceNumber} issued`,
        metadata: { documentId: doc.id, invoiceId: invoice.id },
        createdById: input.userId,
      },
    });

    if (owner.kind === "lead" && !stageAtLeast(owner.stage, "INVOICED")) {
      await tx.crmLead.update({ where: { id: owner.id }, data: { stage: "INVOICED" } });
    }

    // Post the AR journal inside the same transaction (idempotent). Posting
    // failures don't abort the invoice — the integration-event outbox records
    // them for replay — but they must not pass silently.
    const posting = await createJournalEntryFromSource(
      {
        companyId: input.companyId,
        sourceType: "SALES_INVOICE",
        sourceId: invoice.id,
        entryDate: invoiceDate,
        description: `CRM invoice ${invoice.invoiceNumber}`,
        createdById: input.userId,
        amount: totals.total,
        netAmount: totals.subTotal,
        taxAmount: totals.taxTotal,
        grossAmount: totals.total,
        currency,
      },
      tx,
    );
    if (posting.error) {
      console.error(
        `[CRM] Journal posting failed for invoice ${invoice.invoiceNumber}: ${posting.error} (${posting.code ?? "UNKNOWN"})`,
      );
    }

    return {
      leadDocumentId: doc.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: totals.total,
    };
  });
  return result;
}

export type RecordReceiptInput = DocumentOwnerRef & {
  companyId: string;
  userId: string;
  invoiceDocumentId: string;
  amount: number;
  method: string;
  receivedAt?: Date | null;
  reference?: string | null;
};

export async function recordReceiptForLead(input: RecordReceiptInput) {
  const receivedAt = input.receivedAt ?? new Date();
  const outcome = await prisma.$transaction(async (tx) => {
    const owner = await requireDocumentOwner(tx, input.companyId, input as DocumentOwnerRef);
    const invoiceDoc = await tx.crmLeadDocument.findFirst({
      where: { id: input.invoiceDocumentId, companyId: input.companyId, ...ownerKey(owner), type: "INVOICE" },
      select: { invoiceId: true },
    });
    if (!invoiceDoc?.invoiceId) throw new Error("Invoice document not found for this lead");

    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceDoc.invoiceId, companyId: input.companyId },
      select: { id: true, currency: true, total: true, creditTotal: true, writeOffTotal: true, status: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "VOIDED") throw new Error("Invoice is voided");

    // Guard against overpayment: sum receipts from the source of truth (not
    // the cached amountPaid) so repeated/inflated receipts can't overshoot the
    // outstanding balance — which would post bogus journals and inflate
    // PAID-basis commissions.
    const receiptAgg = await tx.salesReceipt.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true },
    });
    const alreadyReceived = Number(receiptAgg._sum.amount ?? 0);
    const outstanding =
      invoice.total - alreadyReceived - (invoice.creditTotal ?? 0) - (invoice.writeOffTotal ?? 0);
    if (outstanding <= 0.009) {
      throw new Error("Invoice is already fully settled");
    }
    if (input.amount > outstanding + 0.009) {
      throw new Error(
        `Payment of ${input.amount.toFixed(2)} exceeds the outstanding balance of ${outstanding.toFixed(2)}`,
      );
    }

    const receiptNumber = await reserveIdentifier(tx, {
      companyId: input.companyId,
      entity: "SALES_RECEIPT",
    });

    const receipt = await tx.salesReceipt.create({
      data: {
        companyId: input.companyId,
        invoiceId: invoice.id,
        receiptNumber,
        receivedAt,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? undefined,
        createdById: input.userId,
      },
      select: { id: true, receiptNumber: true },
    });

    const doc = await tx.crmLeadDocument.create({
      data: {
        companyId: input.companyId,
        ...ownerKey(owner),
        type: "RECEIPT",
        receiptId: receipt.id,
        amount: input.amount,
        currency: invoice.currency,
        createdById: input.userId,
      },
      select: { id: true },
    });

    await tx.crmActivity.create({
      data: {
        companyId: input.companyId,
        type: "PAYMENT_RECORDED",
        ...ownerKey(owner),
        clientId: owner.clientId,
        subject: `Payment ${receipt.receiptNumber} recorded`,
        metadata: { documentId: doc.id, receiptId: receipt.id, amount: input.amount },
        createdById: input.userId,
      },
    });

    const posting = await createJournalEntryFromSource(
      {
        companyId: input.companyId,
        sourceType: "SALES_RECEIPT",
        sourceId: receipt.id,
        entryDate: receivedAt,
        description: `CRM receipt ${receipt.receiptNumber}`,
        createdById: input.userId,
        amount: input.amount,
        netAmount: input.amount,
        taxAmount: 0,
        grossAmount: input.amount,
        currency: invoice.currency,
      },
      tx,
    );
    if (posting.error) {
      console.error(
        `[CRM] Journal posting failed for receipt ${receipt.receiptNumber}: ${posting.error} (${posting.code ?? "UNKNOWN"})`,
      );
    }

    return { leadDocumentId: doc.id, receiptId: receipt.id, invoiceId: invoice.id, ...ownerKey(owner), clientId: owner.clientId };
  });

  // Recompute the invoice balance/status and, once it is settled in full, close
  // the record out as won. Both read committed rows so they run after the
  // transaction. A deal's won stage comes from its own pipeline rather than a
  // fixed name, so it is looked up rather than assumed.
  const balance = await recalcSalesInvoiceBalance(outcome.invoiceId);
  if (balance && "status" in balance && balance.status === "PAID") {
    if (outcome.leadId) {
      await prisma.crmLead.updateMany({
        where: { id: outcome.leadId, companyId: input.companyId, stage: { not: "LOST" } },
        data: { stage: "WON", wonAt: new Date() },
      });
    } else if (outcome.dealId) {
      const deal = await prisma.crmDeal.findFirst({
        where: { id: outcome.dealId, companyId: input.companyId, status: "OPEN" },
        select: { id: true, pipelineId: true },
      });
      const wonStage = deal
        ? await prisma.crmPipelineStage.findFirst({
            where: { pipelineId: deal.pipelineId, status: "WON", archivedAt: null },
            select: { id: true, probability: true },
          })
        : null;
      if (deal && wonStage) {
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: {
            stageId: wonStage.id,
            status: "WON",
            probability: wonStage.probability,
            forecastCategory: "CLOSED",
            wonAt: new Date(),
            stageEnteredAt: new Date(),
          },
        });
      }
    }
  }

  return outcome;
}
