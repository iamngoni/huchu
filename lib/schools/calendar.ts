import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Academic year and term resolution.
 *
 * Every term-scoped entity in the schools pack — enrolment, fee structure,
 * invoice, waiver, result sheet, publish window, boarding allocation,
 * class-subject assignment — is keyed by `termId`. Before this module there was
 * no way to create a year or a term at all, and call sites resolved "the
 * current term" by repeating `findFirst({ where: { isActive: true } })`.
 *
 * The single active year per company, and the single active term per year, are
 * enforced by partial unique indexes in the database, so `getCurrentTerm` can
 * trust that at most one row comes back.
 */

export type SchoolTermSummary = {
  id: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  academicYear: {
    id: string;
    code: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
};

const termSummarySelect = {
  id: true,
  code: true,
  name: true,
  startDate: true,
  endDate: true,
  isActive: true,
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  },
} satisfies Prisma.SchoolTermSelect;

/** The company's active term, or null when the school has not opened one. */
export async function getCurrentTerm(
  companyId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<SchoolTermSummary | null> {
  return db.schoolTerm.findFirst({
    where: { companyId, isActive: true },
    select: termSummarySelect,
  });
}

export class NoActiveTermError extends Error {
  constructor() {
    super(
      "This school has no active term. Open an academic year and term under Academics before continuing.",
    );
    this.name = "NoActiveTermError";
  }
}

/**
 * The company's active term, or a throw. Use in write paths that cannot
 * meaningfully proceed without a term; the message is written for the person
 * setting the school up, not for a log.
 */
export async function requireCurrentTerm(
  companyId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<SchoolTermSummary> {
  const term = await getCurrentTerm(companyId, db);
  if (!term) throw new NoActiveTermError();
  return term;
}

/** The term containing `at`, preferring the active one when they overlap. */
export async function getTermForDate(
  companyId: string,
  at: Date,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<SchoolTermSummary | null> {
  return db.schoolTerm.findFirst({
    where: {
      companyId,
      startDate: { lte: at },
      endDate: { gte: at },
    },
    select: termSummarySelect,
    orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
  });
}

export function isDateRangeValid(startDate: Date, endDate: Date) {
  return (
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    startDate < endDate
  );
}

/** True when [startA, endA] and [startB, endB] share at least one day. */
export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA <= endB && startB <= endA;
}

/**
 * Terms within one academic year may not overlap — a date must resolve to a
 * single term for registers, invoices and result sheets to be unambiguous.
 */
export async function findOverlappingTerm(
  input: {
    companyId: string;
    academicYearId: string;
    startDate: Date;
    endDate: Date;
    excludeTermId?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return db.schoolTerm.findFirst({
    where: {
      companyId: input.companyId,
      academicYearId: input.academicYearId,
      ...(input.excludeTermId ? { id: { not: input.excludeTermId } } : {}),
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
    select: { id: true, code: true, name: true },
  });
}

/** Academic years may not overlap either — a year is the enclosing period. */
export async function findOverlappingAcademicYear(
  input: {
    companyId: string;
    startDate: Date;
    endDate: Date;
    excludeYearId?: string;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return db.schoolAcademicYear.findFirst({
    where: {
      companyId: input.companyId,
      ...(input.excludeYearId ? { id: { not: input.excludeYearId } } : {}),
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
    select: { id: true, code: true, name: true },
  });
}

/**
 * Make one academic year active, standing the previous one down first. The
 * partial unique index rejects two active rows, so both writes share a
 * transaction.
 */
export async function activateAcademicYear(input: {
  companyId: string;
  academicYearId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.schoolAcademicYear.updateMany({
      where: {
        companyId: input.companyId,
        isActive: true,
        id: { not: input.academicYearId },
      },
      data: { isActive: false },
    });

    return tx.schoolAcademicYear.update({
      where: { id: input.academicYearId },
      data: { isActive: true },
    });
  });
}

/**
 * Make one term active. Activating a term in a different year activates that
 * year too — a term cannot be current while its year is not.
 */
export async function activateTerm(input: { companyId: string; termId: string }) {
  return prisma.$transaction(async (tx) => {
    const term = await tx.schoolTerm.findFirst({
      where: { id: input.termId, companyId: input.companyId },
      select: { id: true, academicYearId: true },
    });
    if (!term) return null;

    await tx.schoolTerm.updateMany({
      where: {
        companyId: input.companyId,
        isActive: true,
        id: { not: term.id },
      },
      data: { isActive: false },
    });

    await tx.schoolAcademicYear.updateMany({
      where: {
        companyId: input.companyId,
        isActive: true,
        id: { not: term.academicYearId },
      },
      data: { isActive: false },
    });

    await tx.schoolAcademicYear.update({
      where: { id: term.academicYearId },
      data: { isActive: true },
    });

    return tx.schoolTerm.update({
      where: { id: term.id },
      data: { isActive: true },
      select: termSummarySelect,
    });
  });
}
