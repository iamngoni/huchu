/**
 * Opening a school.
 *
 * The promise is that a provisioned tenant can transact on the first morning,
 * so these check the two things that decide it: a term is current, and there is
 * something to enrol into and invoice against. Idempotency matters as much —
 * an operator who re-runs this against a school that has started work must not
 * undo any of it.
 *
 * Prerequisites: a real Postgres DATABASE_URL with the migrations applied.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCurrentTerm } from "./calendar";
import { provisionSchool } from "./provision";

let companyId: string;

const MID_TERM_TWO = new Date("2026-06-15T00:00:00.000Z");

beforeEach(async () => {
  const stamp = `${Date.now()}-${Math.floor(process.hrtime()[1] / 1000)}`;
  const company = await prisma.company.create({
    data: { name: `Provision School ${stamp}`, slug: `provision-${stamp}` },
  });
  companyId = company.id;
});

afterEach(async () => {
  await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("a freshly opened school", () => {
  it("has a current term, which is the one containing today", async () => {
    const result = await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);

    const current = await getCurrentTerm(companyId);
    expect(current).not.toBeNull();
    expect(current?.code).toBe("T2");
    expect(current?.academicYear.code).toBe("2026");

    const opened = result.terms.filter((term) => term.isActive);
    expect(opened).toHaveLength(1);
  });

  it("opens the next term that has not finished when today falls in a holiday", async () => {
    // Late April: Term 1 has ended, Term 2 has not begun.
    await provisionSchool({ companyId, year: 2026 }, new Date("2026-04-25T00:00:00.000Z"));

    const current = await getCurrentTerm(companyId);
    expect(current?.code).toBe("T2");
  });

  it("lays down three terms inside the academic year", async () => {
    await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);

    const year = await prisma.schoolAcademicYear.findFirst({
      where: { companyId },
      select: { startDate: true, endDate: true, terms: true },
    });

    expect(year?.terms).toHaveLength(3);
    for (const term of year!.terms) {
      expect(term.startDate >= year!.startDate).toBe(true);
      expect(term.endDate <= year!.endDate).toBe(true);
      expect(term.startDate < term.endDate).toBe(true);
    }
  });

  it("has classes, subjects and something to invoice against", async () => {
    const result = await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);

    expect(result.classesCreated).toBeGreaterThan(0);
    expect(result.subjectsCreated).toBeGreaterThan(0);
    expect(result.feeStructureCreated).toBe(true);

    const structure = await prisma.schoolFeeStructure.findFirst({
      where: { companyId },
      include: { lines: true },
    });
    expect(structure?.lines.length).toBeGreaterThan(0);
    expect(structure?.lines.some((line) => line.feeCode === "TUITION")).toBe(true);
  });
});

describe("the ladder follows the school's level", () => {
  it("gives a primary school grades and no forms", async () => {
    await provisionSchool({ companyId, level: "PRIMARY", year: 2026 }, MID_TERM_TWO);

    const codes = (
      await prisma.schoolClass.findMany({ where: { companyId }, select: { code: true } })
    ).map((row) => row.code);

    expect(codes).toContain("G1");
    expect(codes).toContain("ECD-A");
    expect(codes).not.toContain("F1");
  });

  it("gives a secondary school forms and no grades", async () => {
    await provisionSchool({ companyId, level: "SECONDARY", year: 2026 }, MID_TERM_TWO);

    const codes = (
      await prisma.schoolClass.findMany({ where: { companyId }, select: { code: true } })
    ).map((row) => row.code);

    expect(codes).toContain("F1");
    expect(codes).toContain("F6");
    expect(codes).not.toContain("G1");
  });

  it("gives a combined school both, without duplicating shared subject codes", async () => {
    await provisionSchool({ companyId, level: "COMBINED", year: 2026 }, MID_TERM_TWO);

    const codes = (
      await prisma.schoolClass.findMany({ where: { companyId }, select: { code: true } })
    ).map((row) => row.code);
    expect(codes).toContain("G1");
    expect(codes).toContain("F6");

    // ENG, MAT, SHO and AGR appear in both ladders.
    const subjects = await prisma.schoolSubject.findMany({
      where: { companyId },
      select: { code: true },
    });
    expect(new Set(subjects.map((s) => s.code)).size).toBe(subjects.length);
  });
});

describe("running it again", () => {
  it("creates nothing the second time", async () => {
    const first = await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);
    const second = await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);

    expect(first.classesCreated).toBeGreaterThan(0);
    expect(second.academicYear.created).toBe(false);
    expect(second.classesCreated).toBe(0);
    expect(second.subjectsCreated).toBe(0);
    expect(second.feeStructureCreated).toBe(false);
    expect(second.terms.every((term) => !term.created)).toBe(true);
  });

  it("does not move a term the school has already chosen", async () => {
    await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);

    // The school decides Term 3 is current — perhaps they are setting up late.
    const termThree = await prisma.schoolTerm.findFirst({
      where: { companyId, code: "T3" },
      select: { id: true },
    });
    await prisma.schoolTerm.updateMany({
      where: { companyId },
      data: { isActive: false },
    });
    await prisma.schoolTerm.update({
      where: { id: termThree!.id },
      data: { isActive: true },
    });

    await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);

    const current = await getCurrentTerm(companyId);
    expect(current?.code).toBe("T3");
  });

  it("adds a second academic year without disturbing the first", async () => {
    await provisionSchool({ companyId, year: 2026 }, MID_TERM_TWO);
    const next = await provisionSchool({ companyId, year: 2027 }, MID_TERM_TWO);

    expect(next.academicYear.created).toBe(true);

    const years = await prisma.schoolAcademicYear.findMany({
      where: { companyId },
      select: { code: true },
    });
    expect(years.map((y) => y.code).sort()).toEqual(["2026", "2027"]);

    // The 2026 term stays current; opening next year is not the same as
    // starting it.
    const current = await getCurrentTerm(companyId);
    expect(current?.academicYear.code).toBe("2026");
  });
});
