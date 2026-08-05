import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { schoolPermissionDenial } from "@/lib/schools/permissions";
import { resolveBaseCurrency, toNumberOrZero } from "@/lib/schools/money";

/**
 * What each year group owes.
 *
 * S-4.6. The year group is a route in this module, not a filter, and a route has
 * to be worth choosing before you take it. For students the line under a year
 * group is a headcount; for fees a headcount is the one thing a bursar already
 * knows. What decides which form they open is **how much is outstanding and how
 * much of it is late**, so that is what this answers.
 *
 * Grouped through the pupil's current class rather than a column on the invoice.
 * The class belongs to the child (S-1.5 moves it at roll-up) and copying it onto
 * every invoice would give two answers the first time somebody moved up mid-year.
 * The cost is a join; the benefit is one truth.
 *
 * Raw SQL for the same reason `GET /api/v2/schools/fees` is: a school that bills
 * in two currencies has no meaningful single total, so each row is divided by the
 * rate stamped on that document — not today's — and `Prisma.aggregate` cannot
 * express the division. Everything below stays `numeric` in the database, so no
 * money passes through a float on the way out.
 */

type Row = {
  id: string;
  code: string;
  name: string;
  level: number | null;
  outstanding: Prisma.Decimal | null;
  overdue: Prisma.Decimal | null;
  owing: bigint;
  invoices: bigint;
};

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const denied = schoolPermissionDenial(session, "schools.fees", "view");
    if (denied) return errorResponse(denied, 403);
    const companyId = session.user.companyId;

    const [rows, currency] = await Promise.all([
      prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT
          c."id",
          c."code",
          c."name",
          c."level",
          COALESCE(SUM(
            CASE WHEN i."status" IN ('ISSUED', 'PART_PAID')
                 THEN ROUND(i."balanceAmount" / i."exchangeRate", 2)
                 ELSE 0 END
          ), 0) AS "outstanding",
          COALESCE(SUM(
            CASE WHEN i."status" IN ('ISSUED', 'PART_PAID')
                  AND i."dueDate" < NOW()
                  AND i."balanceAmount" > 0
                 THEN ROUND(i."balanceAmount" / i."exchangeRate", 2)
                 ELSE 0 END
          ), 0) AS "overdue",
          -- Families, not invoices: "9 owing" is a list of conversations to have,
          -- where "23 invoices" counts the paperwork behind them.
          COUNT(DISTINCT CASE
            WHEN i."status" IN ('ISSUED', 'PART_PAID') AND i."balanceAmount" > 0
            THEN i."studentId" END) AS "owing",
          COUNT(i."id") AS "invoices"
        FROM "SchoolClass" c
        LEFT JOIN "SchoolStudent" s
          ON s."currentClassId" = c."id" AND s."companyId" = c."companyId"
        LEFT JOIN "SchoolFeeInvoice" i
          ON i."studentId" = s."id" AND i."companyId" = c."companyId"
        WHERE c."companyId" = ${companyId}
        GROUP BY c."id", c."code", c."name", c."level"
        ORDER BY c."level" ASC NULLS LAST, c."code" ASC
      `),
      resolveBaseCurrency(companyId),
    ]);

    return successResponse({
      currency,
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        level: row.level,
        outstanding: toNumberOrZero(row.outstanding ?? 0),
        overdue: toNumberOrZero(row.overdue ?? 0),
        // `COUNT` comes back as bigint, which `JSON.stringify` refuses outright —
        // a 500 on a working query.
        owing: Number(row.owing),
        invoices: Number(row.invoices),
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/v2/schools/fees/by-class error:", error);
    return errorResponse("Failed to fetch fees by year group");
  }
}
