import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { schoolPermissionDenial } from "@/lib/schools/permissions";
import { resolveBaseCurrency, toNumberOrZero } from "@/lib/schools/money";
import {
  emitSchoolFeeAccountingEvent,
  refreshFeeInvoiceBalance,
} from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

const schema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const denied = schoolPermissionDenial(session, "schools.fees", "void");
    if (denied) return errorResponse(denied, 403);
    const companyId = session.user.companyId;
    const { id } = await params;
    const body = await request.json();
    const validated = schema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.schoolFeeReceipt.findFirst({
        where: { id, companyId },
        include: {
          allocations: {
            select: { invoiceId: true, allocatedAmount: true },
          },
        },
      });
      if (!receipt) return null;
      if (receipt.status === "VOIDED") return receipt;
      if (receipt.status !== "POSTED") {
        throw new Error("Only posted receipts can be voided");
      }

      const updated = await tx.schoolFeeReceipt.update({
        where: { id: receipt.id },
        data: {
          status: "VOIDED",
          notes: receipt.notes
            ? `${receipt.notes}\nVoid reason: ${validated.reason}`
            : `Void reason: ${validated.reason}`,
          voidedById: session.user.id,
          voidedAt: new Date(),
        },
        include: {
          allocations: {
            select: { invoiceId: true, allocatedAmount: true },
          },
        },
      });

      for (const allocation of updated.allocations) {
        await refreshFeeInvoiceBalance(tx, {
          companyId,
          invoiceId: allocation.invoiceId,
        });
      }

      return updated;
    });

    if (!result) return errorResponse("Fee receipt not found", 404);

    // The reversal must undo exactly what the receipt posted, so it uses the
    // rate stamped on the receipt rather than today's.
    const baseCurrency = await resolveBaseCurrency(companyId);

    const accounting = await emitSchoolFeeAccountingEvent({
      actorRole: session.user.role,
      companyId,
      actorId: session.user.id,
      eventType: "SCHOOL_FEE_RECEIPT_VOIDED",
      sourceId: result.id,
      sourceRef: result.receiptNo,
      entryDate: new Date(),
      amount: result.baseAmount,
      netAmount: result.baseAmount,
      taxAmount: 0,
      grossAmount: result.baseAmount,
      currency: baseCurrency,
      documentCurrency: result.currency,
      documentAmount: result.amountReceived,
      exchangeRate: result.exchangeRate,
      invertDirection: true,
      payload: {
        receiptNo: result.receiptNo,
        reason: validated.reason,
        studentId: result.studentId,
        allocations: result.allocations.map((allocation) => ({
          invoiceId: allocation.invoiceId,
          // Post S-2.1 Float→Decimal: coerced explicitly, or JSON.stringify
          // would store a Decimal as a string in the event payload.
          allocatedAmount: toNumberOrZero(allocation.allocatedAmount),
        })),
      },
    }).catch((error) => {
      console.error("[Accounting] School fee receipt void posting failed:", error);
      return {
        accountingStatus: "FAILED" as const,
        journalEntryId: null,
        accountingError:
          error instanceof Error ? error.message : "Accounting posting failed",
      };
    });

    return successResponse({ ...result, accounting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation failed", 400, error.issues);
    }
    const message = error instanceof Error ? error.message : "Failed to void fee receipt";
    if (message === "Only posted receipts can be voided") {
      return errorResponse(message, 400);
    }
    console.error("[API] POST /api/v2/schools/fees/receipts/[id]/void error:", error);
    return errorResponse("Failed to void fee receipt");
  }
}
