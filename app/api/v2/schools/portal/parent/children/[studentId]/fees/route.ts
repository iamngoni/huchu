import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import {
  canViewAnyPortalSubject,
  consentDeniedMessage,
  getGuardianChildLink,
  guardianMaySee,
  resolvePortalGuardian,
} from "@/lib/schools/portal-identity";

type RouteParams = { params: Promise<{ studentId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const companyId = session.user.companyId;
    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const guardianId = searchParams.get("guardianId");

    if (!canViewAnyPortalSubject(session.user.role)) {
      // A parent's own account is the only guardian context they get. The
      // previous code looked the guardian up by whatever `guardianId` was
      // passed and only compared it afterwards, so the comparison could never
      // fail — any parent could read another family's fees by guessing an id.
      const resolution = await resolvePortalGuardian(
        {
          companyId,
          userId: session.user.id,
          role: session.user.role,
          requestedId: guardianId,
        },
        { select: { id: true } },
      );

      if (resolution.kind === "forbidden") {
        return errorResponse("Cannot query fees for a different guardian context", 403);
      }
      if (!resolution.subject) {
        return errorResponse("Guardian context not found", 404);
      }

      const link = await getGuardianChildLink({
        companyId,
        guardianId: resolution.subject.id,
        studentId,
      });

      if (!link) {
        return errorResponse("Student is not linked to this parent account", 403);
      }
      if (!guardianMaySee(link, "financials")) {
        return errorResponse(consentDeniedMessage("financials"), 403);
      }
    }

    const student = await prisma.schoolStudent.findFirst({
      where: { id: studentId, companyId },
      select: {
        id: true,
        studentNo: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!student) return errorResponse("Student not found", 404);

    const [invoices, receipts] = await Promise.all([
      prisma.schoolFeeInvoice.findMany({
        where: {
          companyId,
          studentId,
          status: { in: ["ISSUED", "PART_PAID", "PAID", "WRITEOFF", "VOIDED"] },
        },
        include: {
          term: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      }),
      prisma.schoolFeeReceipt.findMany({
        where: {
          companyId,
          studentId,
          status: { in: ["POSTED", "VOIDED"] },
        },
        include: {
          allocations: {
            include: {
              invoice: {
                select: { id: true, invoiceNo: true },
              },
            },
          },
        },
        orderBy: [{ receiptDate: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    return successResponse({
      success: true,
      data: {
        resource: "portal-parent-student-fees",
        companyId,
        student,
        invoices,
        receipts,
        summary: {
          invoices: invoices.length,
          receipts: receipts.length,
          totalBilled: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
          totalPaid: invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0),
          totalWaived: invoices.reduce((sum, invoice) => sum + invoice.waivedAmount, 0),
          totalOutstanding: invoices.reduce(
            (sum, invoice) => sum + Math.max(invoice.balanceAmount, 0),
            0,
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "[API] GET /api/v2/schools/portal/parent/children/[studentId]/fees error:",
      error,
    );
    return errorResponse("Failed to fetch child fee details");
  }
}
