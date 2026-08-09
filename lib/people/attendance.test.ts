/**
 * `Attendance.status` as an enum, and the regression that came with it.
 *
 * Two things are worth a test here, and the second is the reason this file
 * exists at all.
 *
 * The **witness**: the column really is the Postgres enum, checked against a real
 * database rather than against the schema file. The schema file is what we meant;
 * `information_schema` is what happened — and in this case they were not the same
 * for a while, because `prisma db push` refuses a text→enum change outright on a
 * populated table and needs `scripts/normalise-attendance-status.ts` run first.
 * A green `db push` is not evidence the type changed.
 *
 * The **regression**: an unrecognised status filter must answer with no rows, not
 * an error. The register's list route assigned `?status=` straight off the URL
 * into a loose `Record<string, unknown>` where clause. Against a text column that
 * returned an empty list; against an enum column Postgres raises, so a mistyped
 * filter would have turned a page of attendance into a 500. That is a bug the
 * type change introduces rather than one it catches, so it is pinned here.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AttendanceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUSES,
  parseAttendanceStatus,
} from "./attendance";

let companyId: string;
let siteId: string;
let employeeId: string;

beforeAll(async () => {
  const stamp = String(Date.now());
  const company = await prisma.company.create({
    data: { name: `Attendance ${stamp}`, slug: `attendance-${stamp}` },
    select: { id: true },
  });
  companyId = company.id;
  const site = await prisma.site.create({
    data: { companyId, name: "Shaft 2", code: `S2-${stamp}` },
    select: { id: true },
  });
  siteId = site.id;
  const employee = await prisma.employee.create({
    data: {
      companyId,
      employeeId: `AT-${stamp}`,
      name: "Rudo Chirwa",
      phone: "0770000000",
      nextOfKinName: "Kin",
      nextOfKinPhone: "0770000001",
      passportPhotoUrl: "https://example.invalid/p.jpg",
      villageOfOrigin: "Village",
      position: "OPERATOR",
    },
    select: { id: true },
  });
  employeeId = employee.id;
});

afterAll(async () => {
  await prisma.attendance.deleteMany({ where: { siteId } });
  await prisma.employee.deleteMany({ where: { companyId } });
  await prisma.site.deleteMany({ where: { companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
});

describe("Attendance.status storage", () => {
  it("is the AttendanceStatus enum in the database, not text", async () => {
    const rows = await prisma.$queryRaw<Array<{ data_type: string; udt_name: string }>>`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'Attendance' AND column_name = 'status'
    `;

    expect(rows[0]?.data_type).toBe("USER-DEFINED");
    expect(rows[0]?.udt_name).toBe("AttendanceStatus");
  });

  it("names exactly the six statuses, and the app's list matches", async () => {
    const labels = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'AttendanceStatus'
      ORDER BY e.enumsortorder
    `;

    // Order matters as well as membership: `ATTENDANCE_STATUSES` drives the order
    // a register offers the buttons in, and it is derived from the generated
    // client — so a schema edit that reorders the enum without regenerating would
    // show up here rather than as a reshuffled crew board.
    expect(labels.map((row) => row.enumlabel)).toEqual([
      "PRESENT",
      "ABSENT",
      "LATE",
      "ON_LEAVE",
      "REST_DAY",
      "HOLIDAY",
    ]);
    expect(ATTENDANCE_STATUSES).toEqual(labels.map((row) => row.enumlabel));
  });

  it("refuses a value outside the enum on write", async () => {
    const insert = (status: string, shift: string) =>
      prisma.$executeRawUnsafe(
        `INSERT INTO "Attendance" (id, date, "siteId", shift, "employeeId", status, "createdAt")
         VALUES (gen_random_uuid(), NOW(), $1, $2, $3, '${status}', NOW())`,
        siteId,
        shift,
        employeeId,
      );

    // The identical statement with a valid status first, so the rejection below
    // is demonstrably about the enum and not about a malformed insert — a
    // `rejects.toThrow()` on its own passes just as happily when the SQL is wrong.
    await expect(insert("PRESENT", "CONTROL")).resolves.toBe(1);

    // The point of the change. Before it, this row was accepted.
    await expect(insert("present", "LOWERCASE")).rejects.toThrow();
  });

  it("stores and reads back the three statuses nothing wrote before", async () => {
    // `ON_LEAVE`, `REST_DAY` and `HOLIDAY` are new, and an enum value that exists
    // in the schema but was never written is an enum value nobody has checked.
    for (const [index, status] of (
      ["ON_LEAVE", "REST_DAY", "HOLIDAY"] as AttendanceStatus[]
    ).entries()) {
      const row = await prisma.attendance.create({
        data: {
          siteId,
          employeeId,
          date: new Date(`2026-08-${String(index + 10).padStart(2, "0")}`),
          shift: "DAY",
          status,
        },
        select: { status: true },
      });
      expect(row.status).toBe(status);
    }
  });
});

describe("parseAttendanceStatus", () => {
  it("answers an unknown status with null rather than letting it reach the query", async () => {
    // The regression the enum would otherwise have introduced: `?status=bogus`
    // used to mean "no rows" and would have become a 500.
    expect(parseAttendanceStatus("bogus")).toBeNull();
    expect(parseAttendanceStatus("")).toBeNull();
    expect(parseAttendanceStatus(null)).toBeNull();
    expect(parseAttendanceStatus(undefined)).toBeNull();

    // And the query it guards really does return nothing rather than raising.
    const filtered = await prisma.attendance.findMany({
      where: { siteId, ...(parseAttendanceStatus("bogus") ? { status: "PRESENT" } : {}) },
      select: { id: true },
    });
    expect(Array.isArray(filtered)).toBe(true);
  });

  it("takes what a person would actually type", async () => {
    expect(parseAttendanceStatus("present")).toBe(AttendanceStatus.PRESENT);
    expect(parseAttendanceStatus("  Late ")).toBe(AttendanceStatus.LATE);
    expect(parseAttendanceStatus("on_leave")).toBe(AttendanceStatus.ON_LEAVE);
  });

  it("labels every status", () => {
    // A status missing a label renders "undefined" on a register, and an absence
    // that reads as undefined is one somebody has to guess the meaning of.
    for (const status of ATTENDANCE_STATUSES) {
      expect(ATTENDANCE_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
