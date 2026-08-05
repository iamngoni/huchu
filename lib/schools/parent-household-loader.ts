import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolvePortalGuardian } from "@/lib/schools/portal-identity";

/**
 * What a parent's portal is about: their household.
 *
 * S-6.2/S-6.3. Read on the server, from the signed-in user, before the shell
 * paints — the same rule the student portal follows. A parent portal that fetched
 * its own identity would flash somebody else's empty state at whoever is holding
 * the phone, and a portal that took a child id from the URL would be a portal
 * where any parent could read any child by editing it.
 *
 * One load, every child, with the four figures a parent opens the app for: what is
 * owed, whether their child was in school, whether there are marks to read, and
 * whether the school has said anything. Per child rather than summed across the
 * household, because a parent with two children is asked for two different
 * amounts by two different classes and a single total answers neither.
 *
 * `canReceiveFinancials` and `canReceiveAcademicResults` are honoured HERE rather
 * than in the screens. A separated parent who may see attendance but not fees is a
 * real arrangement schools make, and a balance loaded "for the layout" is a
 * balance one query away from a screen that shows it.
 */

export type ParentChild = {
  id: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  status: string;
  isBoarding: boolean;
  avatarUrl: string | null;
  accent: string | null;
  relationship: string;
  isPrimary: boolean;
  /** What this guardian is allowed to be told. */
  canSeeFees: boolean;
  canSeeResults: boolean;
  currentClass: { id: string; code: string; name: string } | null;
  currentStream: { id: string; name: string } | null;
  /** Null when this guardian may not see fees, so a screen cannot render it. */
  fees: { currency: string; outstanding: string; overdue: string; invoices: number } | null;
  attendance: { present: number; absent: number; late: number; sessions: number };
  /** Whether there is anything published to read this term. */
  hasPublishedMarks: boolean;
};

export type ParentHousehold = {
  guardian: {
    id: string;
    guardianNo: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  } | null;
  term: { id: string; code: string; name: string } | null;
  children: ParentChild[];
  /** School notices the household has not opened yet. */
  unreadNotices: number;
};

export async function loadParentHousehold(input: {
  companyId: string;
  userId: string;
  role?: string | null;
  /** Oversight only — a member of staff looking at a parent's view. */
  requestedGuardianId?: string | null;
}): Promise<ParentHousehold> {
  const { companyId } = input;

  const resolution = await resolvePortalGuardian(
    {
      companyId,
      userId: input.userId,
      role: input.role,
      requestedId: input.requestedGuardianId ?? null,
    },
    {
      select: {
        id: true,
        guardianNo: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
    },
  );

  const guardian = resolution.kind === "forbidden" ? null : resolution.subject;
  const term = await prisma.schoolTerm.findFirst({
    where: { companyId, isActive: true },
    select: { id: true, code: true, name: true },
  });

  if (!guardian) {
    return { guardian: null, term, children: [], unreadNotices: 0 };
  }

  // Notices reach a parent as notifications, which already carry read state per
  // recipient — so this is a real count rather than a badge that always shows.
  const unreadNotices = await prisma.notificationRecipient.count({
    where: { userId: input.userId, isRead: false, isArchived: false },
  });

  const links = await prisma.schoolStudentGuardian.findMany({
    where: { companyId, guardianId: guardian.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      relationship: true,
      isPrimary: true,
      canReceiveFinancials: true,
      canReceiveAcademicResults: true,
      student: {
        select: {
          id: true,
          studentNo: true,
          firstName: true,
          lastName: true,
          status: true,
          isBoarding: true,
          avatarUrl: true,
          accent: true,
          currentClass: { select: { id: true, code: true, name: true } },
          currentStream: { select: { id: true, name: true } },
        },
      },
    },
  });

  const children = await Promise.all(
    links.map(async (link): Promise<ParentChild> => {
      const student = link.student;

      const [invoices, attendance, published] = await Promise.all([
        link.canReceiveFinancials
          ? prisma.schoolFeeInvoice.findMany({
              where: {
                companyId,
                studentId: student.id,
                status: { in: ["ISSUED", "PART_PAID"] },
              },
              select: { currency: true, balanceAmount: true, dueDate: true },
            })
          : Promise.resolve(null),
        // This term's register, not all time: "was my child in school" is a
        // question about now, and a three-year total is a number nobody acts on.
        term
          ? prisma.schoolAttendanceSessionLine.groupBy({
              by: ["status"],
              where: {
                companyId,
                studentId: student.id,
                session: { termId: term.id },
              },
              _count: { _all: true },
            })
          : Promise.resolve([]),
        link.canReceiveAcademicResults && term
          ? prisma.schoolResultLine.count({
              where: {
                companyId,
                studentId: student.id,
                sheet: { termId: term.id, status: "PUBLISHED" },
              },
            })
          : Promise.resolve(0),
      ]);

      const counts = new Map(
        (attendance as Array<{ status: string; _count: { _all: number } }>).map((row) => [
          row.status,
          row._count._all,
        ]),
      );
      const sessions = [...counts.values()].reduce((sum, value) => sum + value, 0);

      const now = new Date();
      const fees = invoices
        ? {
            currency: invoices[0]?.currency ?? "USD",
            // Strings, not numbers: this crosses a server/client boundary and a
            // balance that goes through a float on the way is a balance that can
            // print wrong. The screens format the string.
            outstanding: invoices
              .reduce((sum, invoice) => sum.plus(invoice.balanceAmount), new Prisma.Decimal(0))
              .toFixed(2),
            overdue: invoices
              .filter((invoice) => invoice.dueDate < now)
              .reduce((sum, invoice) => sum.plus(invoice.balanceAmount), new Prisma.Decimal(0))
              .toFixed(2),
            invoices: invoices.length,
          }
        : null;

      return {
        id: student.id,
        studentNo: student.studentNo,
        firstName: student.firstName,
        lastName: student.lastName,
        status: student.status,
        isBoarding: student.isBoarding,
        avatarUrl: student.avatarUrl,
        accent: student.accent,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        canSeeFees: link.canReceiveFinancials,
        canSeeResults: link.canReceiveAcademicResults,
        currentClass: student.currentClass,
        currentStream: student.currentStream,
        fees,
        attendance: {
          present: counts.get("PRESENT") ?? 0,
          absent: counts.get("ABSENT") ?? 0,
          late: counts.get("LATE") ?? 0,
          sessions,
        },
        hasPublishedMarks: published > 0,
      };
    }),
  );

  return { guardian, term, children, unreadNotices };
}
