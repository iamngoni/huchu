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

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

async function generateDocNumber(
  tx: Tx,
  prefix: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const now = new Date();
    const datePart = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
    const timePart = `${pad2(now.getHours())}${pad2(now.getMinutes())}`;
    const randomPart = Math.floor(100 + Math.random() * 900);
    const candidate = `${prefix}-${datePart}-${timePart}-${randomPart}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

async function requireLeadWithClient(
  tx: Tx,
  companyId: string,
  leadId: string,
): Promise<{ id: string; clientId: string; stage: string; assignedToId: string | null }> {
  const lead = await tx.crmLead.findFirst({
    where: { id: leadId, companyId },
    select: { id: true, clientId: true, stage: true, assignedToId: true },
  });
  if (!lead) throw new Error("Lead not found");
  if (!lead.clientId) {
    throw new Error("Lead has no client; attach or create a client before quoting/invoicing");
  }
  return { id: lead.id, clientId: lead.clientId, stage: lead.stage, assignedToId: lead.assignedToId };
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

export type CreateQuotationInput = {
  companyId: string;
  userId: string;
  leadId: string;
  lines: CrmDocumentLineInput[];
  currency?: string;
  validUntil?: Date | null;
  notes?: string | null;
};

export async function createQuotationForLead(input: CreateQuotationInput) {
  const currency = input.currency ?? "USD";
  return prisma.$transaction(async (tx) => {
    const lead = await requireLeadWithClient(tx, input.companyId, input.leadId);
    const customerId = await ensureAccountingCustomer(tx, {
      companyId: input.companyId,
      clientId: lead.clientId,
    });
    const totals = computeTotals(input.lines);
    const quotationNumber = await generateDocNumber(tx, "QTN", async (candidate) =>
      Boolean(await tx.salesQuotation.findFirst({ where: { quotationNumber: candidate }, select: { id: true } })),
    );

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
        leadId: lead.id,
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
        leadId: lead.id,
        clientId: lead.clientId,
        subject: `Quotation ${quotation.quotationNumber} created`,
        metadata: { documentId: doc.id, quotationId: quotation.id },
        createdById: input.userId,
      },
    });

    if (!stageAtLeast(lead.stage, "QUOTED")) {
      await tx.crmLead.update({ where: { id: lead.id }, data: { stage: "QUOTED" } });
    }

    return { leadDocumentId: doc.id, quotationId: quotation.id, quotationNumber: quotation.quotationNumber, total: totals.total };
  });
}

export type CreateInvoiceInput = {
  companyId: string;
  userId: string;
  leadId: string;
  lines?: CrmDocumentLineInput[];
  fromQuotationId?: string;
  currency?: string;
  notes?: string | null;
  dueDate?: Date | null;
};

export async function createInvoiceForLead(input: CreateInvoiceInput) {
  const currency = input.currency ?? "USD";
  const result = await prisma.$transaction(async (tx) => {
    const lead = await requireLeadWithClient(tx, input.companyId, input.leadId);
    const customerId = await ensureAccountingCustomer(tx, {
      companyId: input.companyId,
      clientId: lead.clientId,
    });

    let lines = input.lines ?? [];
    if (input.fromQuotationId) {
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
    const invoiceNumber = await generateDocNumber(tx, "INV", async (candidate) =>
      Boolean(await tx.salesInvoice.findFirst({ where: { invoiceNumber: candidate }, select: { id: true } })),
    );
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
        leadId: lead.id,
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
        leadId: lead.id,
        clientId: lead.clientId,
        subject: `Invoice ${invoice.invoiceNumber} issued`,
        metadata: { documentId: doc.id, invoiceId: invoice.id },
        createdById: input.userId,
      },
    });

    if (!stageAtLeast(lead.stage, "INVOICED")) {
      await tx.crmLead.update({ where: { id: lead.id }, data: { stage: "INVOICED" } });
    }

    // Post the AR journal inside the same transaction (idempotent).
    await createJournalEntryFromSource(
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

    return {
      leadDocumentId: doc.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: totals.total,
    };
  });
  return result;
}

export type RecordReceiptInput = {
  companyId: string;
  userId: string;
  leadId: string;
  invoiceDocumentId: string;
  amount: number;
  method: string;
  receivedAt?: Date | null;
  reference?: string | null;
};

export async function recordReceiptForLead(input: RecordReceiptInput) {
  const receivedAt = input.receivedAt ?? new Date();
  const outcome = await prisma.$transaction(async (tx) => {
    const lead = await requireLeadWithClient(tx, input.companyId, input.leadId);
    const invoiceDoc = await tx.crmLeadDocument.findFirst({
      where: { id: input.invoiceDocumentId, companyId: input.companyId, leadId: lead.id, type: "INVOICE" },
      select: { invoiceId: true },
    });
    if (!invoiceDoc?.invoiceId) throw new Error("Invoice document not found for this lead");

    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceDoc.invoiceId, companyId: input.companyId },
      select: { id: true, currency: true },
    });
    if (!invoice) throw new Error("Invoice not found");

    const receiptNumber = await generateDocNumber(tx, "REC", async (candidate) =>
      Boolean(await tx.salesReceipt.findFirst({ where: { receiptNumber: candidate }, select: { id: true } })),
    );

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
        leadId: lead.id,
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
        leadId: lead.id,
        clientId: lead.clientId,
        subject: `Payment ${receipt.receiptNumber} recorded`,
        metadata: { documentId: doc.id, receiptId: receipt.id, amount: input.amount },
        createdById: input.userId,
      },
    });

    await createJournalEntryFromSource(
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

    return { leadDocumentId: doc.id, receiptId: receipt.id, invoiceId: invoice.id, leadId: lead.id, clientId: lead.clientId };
  });

  // Recompute the invoice balance/status and flip the lead to WON if fully
  // paid — both read committed rows so they run after the transaction.
  const balance = await recalcSalesInvoiceBalance(outcome.invoiceId);
  if (balance && "status" in balance && balance.status === "PAID") {
    await prisma.crmLead.updateMany({
      where: { id: outcome.leadId, companyId: input.companyId, stage: { not: "LOST" } },
      data: { stage: "WON", wonAt: new Date() },
    });
  }

  return outcome;
}
