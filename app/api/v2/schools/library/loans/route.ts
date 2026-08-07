import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  errorResponse,
  successResponse,
  validateSession,
} from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { schoolPermissionDenial } from "@/lib/schools/permissions";
import {
  issueLoan,
  LibraryError,
  renewLoan,
  reserveBook,
  returnLoan,
} from "@/lib/schools/library";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("issue"),
    copyId: z.string().uuid(),
    studentId: z.string().uuid(),
  }),
  z.object({ action: z.literal("return"), loanId: z.string().uuid() }),
  z.object({ action: z.literal("renew"), loanId: z.string().uuid() }),
  z.object({
    action: z.literal("reserve"),
    bookId: z.string().uuid(),
    studentId: z.string().uuid(),
  }),
  z.object({ action: z.literal("pay-fine"), loanId: z.string().uuid() }),
]);

/**
 * The issue desk: lend, take back, renew, reserve, settle a fine.
 *
 * One route with an action, rather than five, because they are five buttons on
 * one screen operated by one person against one counter, and five routes would
 * be five copies of the same guard.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    // `edit` on academics: lending is a librarian's daily work, not a
    // structural change, but it does write against a child's record.
    const denied = schoolPermissionDenial(session, "schools.academics", "edit");
    if (denied) return errorResponse(denied, 403);
    const companyId = session.user.companyId;

    const validated = bodySchema.parse(await request.json());

    switch (validated.action) {
      case "issue": {
        const loan = await issueLoan({
          companyId,
          copyId: validated.copyId,
          studentId: validated.studentId,
          issuedById: session.user.id,
        });
        return successResponse(loan, 201);
      }
      case "return": {
        const returned = await returnLoan({
          companyId,
          loanId: validated.loanId,
          returnedById: session.user.id,
        });
        return successResponse(returned);
      }
      case "renew": {
        const renewed = await renewLoan({ companyId, loanId: validated.loanId });
        return successResponse(renewed);
      }
      case "reserve": {
        const reservation = await reserveBook({
          companyId,
          bookId: validated.bookId,
          studentId: validated.studentId,
        });
        return successResponse(reservation, 201);
      }
      case "pay-fine": {
        const loan = await prisma.schoolBookLoan.findFirst({
          where: { id: validated.loanId, companyId },
          select: { id: true, fineAmount: true, finePaidAt: true },
        });
        if (!loan) return errorResponse("Loan not found", 404);
        if (!loan.fineAmount) return errorResponse("There is no fine on that loan", 400);
        if (loan.finePaidAt) return errorResponse("That fine is already settled", 409);

        const paid = await prisma.schoolBookLoan.update({
          where: { id: loan.id },
          data: { finePaidAt: new Date() },
          select: { id: true, finePaidAt: true },
        });
        return successResponse(paid);
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation failed", 400, error.issues);
    }
    if (error instanceof LibraryError) return errorResponse(error.message, 409);
    console.error("[API] POST /api/v2/schools/library/loans error:", error);
    return errorResponse("Failed at the issue desk");
  }
}
