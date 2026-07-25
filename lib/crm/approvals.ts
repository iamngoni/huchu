/**
 * CRM public document approvals.
 *
 * A quotation or invoice can be sent to a client via a tokenized public link
 * (/a/[token]). The client approves or declines without logging in. Approving
 * a quotation marks the underlying SalesQuotation ACCEPTED. Every response
 * writes a CRM activity and notifies the lead's assignee.
 */
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";

import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { emitCrmNotification } from "@/lib/notifications";

type Tx = Prisma.TransactionClient;

export function generateApprovalToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Create (or rotate) the approval token for a lead document. Returns the token.
 */
export async function createOrRotateApproval(
  tx: Tx,
  params: { companyId: string; leadDocumentId: string; expiresInDays?: number },
): Promise<string> {
  const token = generateApprovalToken();
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await tx.crmDocumentApproval.upsert({
    where: { leadDocumentId: params.leadDocumentId },
    update: { token, status: "PENDING", expiresAt, respondedAt: null, responseNote: null, responderName: null, firstViewedAt: null },
    create: {
      companyId: params.companyId,
      leadDocumentId: params.leadDocumentId,
      token,
      expiresAt,
    },
  });
  return token;
}

export type PublicApprovalView = {
  companyName: string;
  documentType: "QUOTATION" | "INVOICE" | "RECEIPT";
  status: string;
  number: string;
  currency: string;
  total: number;
  lines: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }>;
  expired: boolean;
};

function isExpired(expiresAt: Date | null): boolean {
  return Boolean(expiresAt && expiresAt.getTime() < Date.now());
}

/**
 * Load the public view for an approval token and stamp firstViewedAt.
 */
export async function getApprovalByToken(token: string): Promise<PublicApprovalView | null> {
  const approval = await prisma.crmDocumentApproval.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      firstViewedAt: true,
      companyId: true,
      leadDocument: {
        select: {
          type: true,
          currency: true,
          amount: true,
          quotation: { select: { quotationNumber: true, lines: true } },
          invoice: { select: { invoiceNumber: true, lines: true } },
        },
      },
    },
  });
  if (!approval) return null;
  // A revoked link must not leak the document's content — treat as not found.
  if (approval.status === "REVOKED") return null;

  if (!approval.firstViewedAt) {
    void prisma.crmDocumentApproval
      .update({ where: { id: approval.id }, data: { firstViewedAt: new Date() } })
      .catch(() => {});
  }

  const company = await prisma.company.findUnique({
    where: { id: approval.companyId },
    select: { name: true },
  });

  const doc = approval.leadDocument;
  const source = doc.quotation ?? doc.invoice;
  const number = doc.quotation?.quotationNumber ?? doc.invoice?.invoiceNumber ?? "";
  const expired = approval.status === "PENDING" && isExpired(approval.expiresAt);

  // An expired, never-actioned link no longer discloses pricing — the client
  // must request a fresh link from the rep.
  const lines = expired
    ? []
    : (source?.lines ?? []).map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      }));

  return {
    companyName: company?.name ?? "",
    documentType: doc.type,
    status: approval.status,
    number,
    currency: doc.currency,
    total: expired ? 0 : doc.amount,
    lines,
    expired,
  };
}

export type RespondInput = {
  token: string;
  action: "APPROVE" | "DECLINE";
  note?: string | null;
  name?: string | null;
};

/**
 * Record a client's approve/decline decision. Only a PENDING, non-expired
 * approval can be actioned. Returns the resulting status or throws.
 */
export async function respondToApproval(input: RespondInput): Promise<{ status: "APPROVED" | "DECLINED" }> {
  const approval = await prisma.crmDocumentApproval.findUnique({
    where: { token: input.token },
    select: {
      id: true,
      companyId: true,
      status: true,
      expiresAt: true,
      leadDocument: {
        select: {
          id: true,
          type: true,
          quotationId: true,
          lead: { select: { id: true, clientId: true, assignedToId: true } },
        },
      },
    },
  });
  if (!approval) throw new Error("Approval not found");
  if (approval.status !== "PENDING") throw new Error("This document has already been responded to");
  if (isExpired(approval.expiresAt)) {
    // Persist the expiry outside any transaction that later throws — a throw
    // inside a $transaction would roll this write back.
    await prisma.crmDocumentApproval.updateMany({
      where: { id: approval.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    throw new Error("This approval link has expired");
  }

  const result = await prisma.$transaction(async (tx) => {
    const nextStatus = input.action === "APPROVE" ? ("APPROVED" as const) : ("DECLINED" as const);
    // Atomic claim: only one concurrent responder can move PENDING → final.
    const claimed = await tx.crmDocumentApproval.updateMany({
      where: { id: approval.id, status: "PENDING" },
      data: {
        status: nextStatus,
        respondedAt: new Date(),
        responseNote: input.note ?? undefined,
        responderName: input.name ?? undefined,
      },
    });
    if (claimed.count === 0) {
      throw new Error("This document has already been responded to");
    }

    if (input.action === "APPROVE" && approval.leadDocument.type === "QUOTATION" && approval.leadDocument.quotationId) {
      await tx.salesQuotation.update({
        where: { id: approval.leadDocument.quotationId },
        data: { status: "ACCEPTED" },
      });
    }

    const lead = approval.leadDocument.lead;
    await tx.crmActivity.create({
      data: {
        companyId: approval.companyId,
        type: input.action === "APPROVE" ? "DOCUMENT_APPROVED" : "DOCUMENT_DECLINED",
        leadId: lead.id,
        clientId: lead.clientId ?? undefined,
        subject: `Document ${input.action === "APPROVE" ? "approved" : "declined"} by client${input.name ? ` (${input.name})` : ""}`,
        body: input.note ?? undefined,
        metadata: { leadDocumentId: approval.leadDocument.id },
      },
    });

    return { companyId: approval.companyId, leadId: lead.id, assignedToId: lead.assignedToId, action: input.action, nextStatus };
  });

  if (result.assignedToId) {
    await emitCrmNotification({
      companyId: result.companyId,
      recipientIds: [result.assignedToId],
      type: result.action === "APPROVE" ? NotificationType.CRM_DOCUMENT_APPROVED : NotificationType.CRM_DOCUMENT_DECLINED,
      title: result.action === "APPROVE" ? "Quote approved" : "Quote declined",
      summary: `A client ${result.action === "APPROVE" ? "approved" : "declined"} a document.`,
      leadId: result.leadId,
      viewPath: `/crm/leads/${result.leadId}`,
    });
  }

  return { status: result.nextStatus };
}
