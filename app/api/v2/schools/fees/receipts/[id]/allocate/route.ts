import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { writeSchoolAuditEvent } from "@/lib/schools/audit";
import { schoolPermissionDenial } from "@/lib/schools/permissions";
import { exceeds, money, sumMoney, toNumberOrZero } from "@/lib/schools/money";
import {
  availableReceiptCredit,
  FeeCreditError,
  isFeeCreditCheckViolation,
  loadInvoicesForAllocation,
  lockFeeReceipt,
  refreshFeeInvoiceBalance,
  refreshFeeReceiptSplit,
  spreadOverInvoices,
} from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * S-2.5 — spend a credit on the next bill.
 *
 * A surplus that can be seen but not used is not a credit, it is a note in a
 * ledger. This is the other half: the parent who paid $500 against a $450 bill
 * has $50, and next term's invoice is what it is for.
 *
 * Two shapes, because bursars work both ways:
 *
 *   * name the invoices and the amounts — for a bursar splitting a credit
 *     deliberately;
 *   * name the invoices only, and let the credit settle them oldest first
 *     until it runs out.
 *
 * **This posts nothing to the ledger, deliberately.** The money reached the
 * bank when the receipt was posted, and that posting already moved it out of
 * cash and into the family's receivable. Allocating the credit to an invoice
 * moves it *within* receivables and changes no account balance. A journal entry
 * here would double-count the payment.
 */
const allocationSchema = z.object({
  invoiceId: z.string().uuid(),
  allocatedAmount: z.number().finite().positive().optional(),
});

const schema = z.object({
  allocations: z.array(allocationSchema).min(1).max(50),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const denied = schoolPermissionDenial(session, "schools.fees", "receive-payment");
    if (denied) return errorResponse(denied, 403);
    const companyId = session.user.companyId;
    const { id } = await params;

    const body = await request.json();
    const validated = schema.parse(body);

    const named = validated.allocations.filter(
      (allocation) => allocation.allocatedAmount !== undefined,
    );
    if (named.length > 0 && named.length !== validated.allocations.length) {
      return errorResponse(
        "Give an amount for every invoice or for none of them",
        400,
      );
    }
    const invoiceIds = validated.allocations.map((allocation) => allocation.invoiceId);
    if (new Set(invoiceIds).size !== invoiceIds.length) {
      return errorResponse("Duplicate invoice allocations are not allowed", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockFeeReceipt(tx, { companyId, receiptId: id });

      const receipt = await tx.schoolFeeReceipt.findFirst({
        where: { id, companyId },
        select: {
          id: true,
          receiptNo: true,
          studentId: true,
          status: true,
          currency: true,
          amountUnallocated: true,
          refundedAmount: true,
        },
      });
      if (!receipt) throw new FeeCreditError("Fee receipt not found", 404);
      if (receipt.status !== "POSTED") {
        throw new FeeCreditError(
          "Only a posted receipt carries credit that can be allocated",
          400,
        );
      }

      const credit = availableReceiptCredit(receipt);
      if (!credit.greaterThan(0)) {
        throw new FeeCreditError(
          `Receipt ${receipt.receiptNo} has no credit left to allocate`,
          400,
        );
      }

      const locked = await loadInvoicesForAllocation(tx, {
        companyId,
        studentId: receipt.studentId,
        currency: receipt.currency,
        invoiceIds,
      });

      let allocations: Array<{ invoiceId: string; allocatedAmount: Prisma.Decimal }>;
      if (named.length > 0) {
        allocations = validated.allocations.map((allocation) => ({
          invoiceId: allocation.invoiceId,
          allocatedAmount: money(allocation.allocatedAmount ?? 0),
        }));
        for (const allocation of allocations) {
          const invoice = locked.get(allocation.invoiceId);
          if (!invoice) {
            throw new FeeCreditError("One or more invoices are invalid", 400);
          }
          if (exceeds(allocation.allocatedAmount, invoice.balanceAmount)) {
            throw new FeeCreditError(
              `Allocation exceeds the outstanding balance on invoice ${invoice.invoiceNo}`,
              400,
            );
          }
        }
      } else {
        const ordered = invoiceIds
          .map((invoiceId) => locked.get(invoiceId))
          .filter((invoice): invoice is NonNullable<typeof invoice> => Boolean(invoice));
        allocations = spreadOverInvoices(credit, ordered).allocations;
        if (allocations.length === 0) {
          throw new FeeCreditError(
            "Those invoices have nothing outstanding to settle",
            400,
          );
        }
      }

      const total = sumMoney(allocations.map((allocation) => allocation.allocatedAmount));
      if (exceeds(total, credit)) {
        throw new FeeCreditError(
          `Receipt ${receipt.receiptNo} has ${credit.toFixed(2)} ${receipt.currency} of credit; that allocates ${total.toFixed(2)}`,
          400,
        );
      }

      for (const allocation of allocations) {
        // A receipt may already have an allocation against this invoice — a
        // part-payment now being topped up from the same credit — and the
        // `(companyId, receiptId, invoiceId)` unique key makes a second row
        // impossible. Add to the existing one rather than failing.
        const existing = await tx.schoolFeeReceiptAllocation.findFirst({
          where: { companyId, receiptId: id, invoiceId: allocation.invoiceId },
          select: { id: true, allocatedAmount: true },
        });
        if (existing) {
          await tx.schoolFeeReceiptAllocation.update({
            where: { id: existing.id },
            data: {
              allocatedAmount: money(existing.allocatedAmount).plus(
                allocation.allocatedAmount,
              ),
            },
          });
        } else {
          await tx.schoolFeeReceiptAllocation.create({
            data: {
              companyId,
              receiptId: id,
              invoiceId: allocation.invoiceId,
              allocatedAmount: allocation.allocatedAmount,
            },
          });
        }

        await refreshFeeInvoiceBalance(tx, {
          companyId,
          invoiceId: allocation.invoiceId,
        });
      }

      await refreshFeeReceiptSplit(tx, { companyId, receiptId: id });

      await writeSchoolAuditEvent(tx, {
        companyId,
        actorId: session.user.id,
        eventType: "schools.fee.credit.allocated",
        entityType: "SchoolFeeReceipt",
        entityId: id,
        payload: {
          receiptNo: receipt.receiptNo,
          studentId: receipt.studentId,
          currency: receipt.currency,
          creditBefore: toNumberOrZero(credit),
          allocated: toNumberOrZero(total),
          allocations: allocations.map((allocation) => ({
            invoiceId: allocation.invoiceId,
            allocatedAmount: toNumberOrZero(allocation.allocatedAmount),
          })),
        },
      });

      return tx.schoolFeeReceipt.findUnique({
        where: { id },
        include: {
          student: {
            select: { id: true, studentNo: true, firstName: true, lastName: true },
          },
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNo: true,
                  status: true,
                  balanceAmount: true,
                  creditAmount: true,
                },
              },
            },
            orderBy: [{ createdAt: "asc" }],
          },
        },
      });
    });

    if (!result) return errorResponse("Fee receipt not found", 404);
    return successResponse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation failed", 400, error.issues);
    }
    if (error instanceof FeeCreditError) {
      return errorResponse(error.message, error.status);
    }
    if (isFeeCreditCheckViolation(error)) {
      return errorResponse(
        "That credit has moved since the page was loaded; reload and try again",
        409,
      );
    }
    console.error(
      "[API] POST /api/v2/schools/fees/receipts/[id]/allocate error:",
      error,
    );
    return errorResponse("Failed to allocate the credit");
  }
}
