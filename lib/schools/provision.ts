import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activateTerm } from "@/lib/schools/calendar";

/**
 * Opening a school.
 *
 * Provisioning a tenant used to create a company, an administrator, a tier, a
 * bundle and a subdomain — and no school. The operator handed over a workspace
 * where the first screen a registrar opened could not be used, because every
 * term-scoped record needs a term and nothing created one.
 *
 * This is the smallest set of records that makes the pack usable on the first
 * morning: the current year and its three terms, the class ladder, a subject
 * catalogue, and one fee structure to invoice against. Everything is a
 * defensible default a school will edit, not a guess it has to unpick — the
 * ladder and the subject list are Zimbabwean, matching who the pack is sold to.
 *
 * Idempotent by code. Re-running adds what is missing and leaves the rest
 * alone, so an operator who runs it twice, or runs it after a school has
 * started editing, does no damage.
 */

export type SchoolLevel = "PRIMARY" | "SECONDARY" | "COMBINED";

export type ProvisionSchoolOptions = {
  companyId: string;
  /** Which class ladder to lay down. Combined covers Grade 1 to Form 6. */
  level?: SchoolLevel;
  /** The calendar year to open. Defaults to the year `now` falls in. */
  year?: number;
  /** Termly tuition on the starter fee structure, in the tenant's currency. */
  tuitionPerTerm?: number;
  createdById?: string | null;
};

export type ProvisionSchoolResult = {
  academicYear: { id: string; code: string; created: boolean };
  terms: Array<{ id: string; code: string; created: boolean; isActive: boolean }>;
  classesCreated: number;
  subjectsCreated: number;
  feeStructureCreated: boolean;
};

/**
 * Zimbabwean school terms. Roughly January–April, May–August, September–December,
 * which is what `TERMS_PER_YEAR` in the pricing model already assumes.
 */
const TERM_TEMPLATE = [
  { code: "T1", name: "Term 1", startMonth: 1, startDay: 8, endMonth: 4, endDay: 10 },
  { code: "T2", name: "Term 2", startMonth: 5, startDay: 6, endMonth: 8, endDay: 8 },
  { code: "T3", name: "Term 3", startMonth: 9, startDay: 9, endMonth: 12, endDay: 5 },
] as const;

const PRIMARY_CLASSES = [
  { code: "ECD-A", name: "ECD A", level: 0 },
  { code: "ECD-B", name: "ECD B", level: 0 },
  ...Array.from({ length: 7 }, (_, index) => ({
    code: `G${index + 1}`,
    name: `Grade ${index + 1}`,
    level: index + 1,
  })),
];

const SECONDARY_CLASSES = Array.from({ length: 6 }, (_, index) => ({
  code: `F${index + 1}`,
  name: `Form ${index + 1}`,
  level: index + 8,
}));

const PRIMARY_SUBJECTS = [
  { code: "ENG", name: "English", isCore: true },
  { code: "SHO", name: "Shona", isCore: true },
  { code: "MAT", name: "Mathematics", isCore: true },
  { code: "SCI", name: "Science and Technology", isCore: true },
  { code: "AGR", name: "Agriculture", isCore: false },
  { code: "HSO", name: "Heritage Social Studies", isCore: true },
  { code: "PED", name: "Physical Education", isCore: false },
  { code: "ICT", name: "ICT", isCore: false },
];

const SECONDARY_SUBJECTS = [
  { code: "ENG", name: "English Language", isCore: true },
  { code: "SHO", name: "Shona", isCore: false },
  { code: "MAT", name: "Mathematics", isCore: true },
  { code: "COM", name: "Combined Science", isCore: true },
  { code: "BIO", name: "Biology", isCore: false },
  { code: "CHE", name: "Chemistry", isCore: false },
  { code: "PHY", name: "Physics", isCore: false },
  { code: "GEO", name: "Geography", isCore: false },
  { code: "HIS", name: "History", isCore: false },
  { code: "ACC", name: "Principles of Accounts", isCore: false },
  { code: "BST", name: "Business Studies", isCore: false },
  { code: "CSC", name: "Computer Science", isCore: false },
  { code: "AGR", name: "Agriculture", isCore: false },
];

function classesFor(level: SchoolLevel) {
  if (level === "PRIMARY") return PRIMARY_CLASSES;
  if (level === "SECONDARY") return SECONDARY_CLASSES;
  return [...PRIMARY_CLASSES, ...SECONDARY_CLASSES];
}

function subjectsFor(level: SchoolLevel) {
  if (level === "PRIMARY") return PRIMARY_SUBJECTS;
  if (level === "SECONDARY") return SECONDARY_SUBJECTS;
  // Combined schools teach both ladders; the codes overlap deliberately, so
  // dedupe rather than creating ENG twice and failing the unique constraint.
  const merged = new Map<string, (typeof PRIMARY_SUBJECTS)[number]>();
  for (const subject of [...PRIMARY_SUBJECTS, ...SECONDARY_SUBJECTS]) {
    merged.set(subject.code, subject);
  }
  return [...merged.values()];
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

/** The term containing `at`, else the first that has not finished, else the last. */
function pickCurrentTerm(
  terms: Array<{ id: string; code: string; startDate: Date; endDate: Date }>,
  at: Date,
) {
  return (
    terms.find((term) => term.startDate <= at && at <= term.endDate) ??
    terms.find((term) => term.endDate >= at) ??
    terms[terms.length - 1]
  );
}

export async function provisionSchool(
  options: ProvisionSchoolOptions,
  at = new Date(),
): Promise<ProvisionSchoolResult> {
  const { companyId } = options;
  const level = options.level ?? "COMBINED";
  const year = options.year ?? at.getUTCFullYear();
  const tuition = options.tuitionPerTerm ?? 250;

  const yearCode = String(year);
  const existingYear = await prisma.schoolAcademicYear.findFirst({
    where: { companyId, code: yearCode },
    select: { id: true, code: true },
  });

  const academicYear =
    existingYear ??
    (await prisma.schoolAcademicYear.create({
      data: {
        companyId,
        code: yearCode,
        name: `${year} Academic Year`,
        startDate: utcDate(year, 1, 1),
        endDate: utcDate(year, 12, 31),
        isActive: false,
      },
      select: { id: true, code: true },
    }));

  const terms: ProvisionSchoolResult["terms"] = [];
  const termRows: Array<{ id: string; code: string; startDate: Date; endDate: Date }> = [];

  for (const template of TERM_TEMPLATE) {
    const existing = await prisma.schoolTerm.findFirst({
      where: { companyId, academicYearId: academicYear.id, code: template.code },
      select: { id: true, code: true, startDate: true, endDate: true },
    });

    const row =
      existing ??
      (await prisma.schoolTerm.create({
        data: {
          companyId,
          academicYearId: academicYear.id,
          code: template.code,
          name: template.name,
          startDate: utcDate(year, template.startMonth, template.startDay),
          endDate: utcDate(year, template.endMonth, template.endDay),
          isActive: false,
        },
        select: { id: true, code: true, startDate: true, endDate: true },
      }));

    termRows.push(row);
    terms.push({
      id: row.id,
      code: row.code,
      created: !existing,
      isActive: false,
    });
  }

  // Only open a term if the school has none. A school that has already chosen
  // its current term must not have that decision overwritten by a re-run.
  const alreadyActive = await prisma.schoolTerm.findFirst({
    where: { companyId, isActive: true },
    select: { id: true },
  });

  if (!alreadyActive) {
    const current = pickCurrentTerm(termRows, at);
    await activateTerm({ companyId, termId: current.id });
    const opened = terms.find((term) => term.id === current.id);
    if (opened) opened.isActive = true;
  }

  const classTemplates = classesFor(level);
  const existingClassCodes = new Set(
    (
      await prisma.schoolClass.findMany({
        where: { companyId },
        select: { code: true },
      })
    ).map((row) => row.code),
  );
  const newClasses = classTemplates.filter(
    (template) => !existingClassCodes.has(template.code),
  );
  if (newClasses.length > 0) {
    await prisma.schoolClass.createMany({
      data: newClasses.map((template) => ({
        companyId,
        code: template.code,
        name: template.name,
        level: template.level,
        academicYearId: academicYear.id,
      })),
    });
  }

  const subjectTemplates = subjectsFor(level);
  const existingSubjectCodes = new Set(
    (
      await prisma.schoolSubject.findMany({
        where: { companyId },
        select: { code: true },
      })
    ).map((row) => row.code),
  );
  const newSubjects = subjectTemplates.filter(
    (template) => !existingSubjectCodes.has(template.code),
  );
  if (newSubjects.length > 0) {
    await prisma.schoolSubject.createMany({
      data: newSubjects.map((template) => ({
        companyId,
        code: template.code,
        name: template.name,
        isCore: template.isCore,
      })),
    });
  }

  // A fee structure belongs to one class, so the starter attaches to the first
  // rung of the ladder. The school clones it up the years.
  const firstClass = await prisma.schoolClass.findFirst({
    where: { companyId },
    orderBy: [{ level: "asc" }, { code: "asc" }],
    select: { id: true },
  });

  const feeStructureCreated = firstClass
    ? await ensureStarterFeeStructure({
        companyId,
        termId: termRows[0].id,
        classId: firstClass.id,
        tuition,
      })
    : false;

  return {
    academicYear: {
      id: academicYear.id,
      code: academicYear.code,
      created: !existingYear,
    },
    terms,
    classesCreated: newClasses.length,
    subjectsCreated: newSubjects.length,
    feeStructureCreated,
  };
}

/**
 * One fee structure so the bursar has something to invoice against on day one.
 *
 * Deliberately thin — tuition and a development levy — because a school's real
 * fee sheet is theirs to write and a long invented one is more to delete than
 * to fill in.
 */
async function ensureStarterFeeStructure(input: {
  companyId: string;
  termId: string;
  classId: string;
  tuition: number;
}) {
  const existing = await prisma.schoolFeeStructure.findFirst({
    where: { companyId: input.companyId },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.schoolFeeStructure.create({
    data: {
      companyId: input.companyId,
      termId: input.termId,
      classId: input.classId,
      name: "Standard Tuition",
      status: "DRAFT",
      lines: {
        create: [
          {
            companyId: input.companyId,
            feeCode: "TUITION",
            description: "Tuition",
            amount: input.tuition,
          },
          {
            companyId: input.companyId,
            feeCode: "DEVLEVY",
            description: "Development levy",
            amount: Math.round(input.tuition * 0.1),
          },
        ],
      },
    } as Prisma.SchoolFeeStructureUncheckedCreateInput,
  });

  return true;
}
