import { describe, expect, it } from "vitest";

import {
  buildLeadOrderBy,
  buildLeadWhere,
  DEFAULT_LEAD_SORT,
  hasActiveLeadFilters,
  leadViewFiltersSchema,
  parseLeadFiltersFromParams,
} from "./views";

const COMPANY = "company-1";
const USER = "user-1";

describe("buildLeadWhere", () => {
  it("always scopes to the company, even with no filters", () => {
    expect(buildLeadWhere(COMPANY, {}, USER)).toEqual({ companyId: COMPANY });
  });

  it("keeps the company scope alongside every filter", () => {
    const where = buildLeadWhere(COMPANY, { stages: ["NEW"], q: "roof" }, USER);
    expect(where.companyId).toBe(COMPANY);
    expect(where.AND).toHaveLength(2);
  });

  it("treats explicit owners and unassigned as alternatives", () => {
    const where = buildLeadWhere(
      COMPANY,
      { assignedToIds: ["user-2"], unassigned: true },
      USER,
    );
    expect(where.AND).toEqual([
      { OR: [{ assignedToId: { in: ["user-2"] } }, { assignedToId: null }] },
    ]);
  });

  it("applies a single owner clause directly rather than wrapping it in OR", () => {
    const where = buildLeadWhere(COMPANY, { assignedToIds: ["user-2"] }, USER);
    expect(where.AND).toEqual([{ assignedToId: { in: ["user-2"] } }]);
  });

  it("resolves mineOnly against the calling user", () => {
    const where = buildLeadWhere(COMPANY, { mineOnly: true }, USER);
    expect(where.AND).toEqual([{ assignedToId: USER }]);
  });

  it("builds a bounded value range", () => {
    const where = buildLeadWhere(COMPANY, { valueMin: 100, valueMax: 500 }, USER);
    expect(where.AND).toEqual([{ estimatedValue: { gte: 100, lte: 500 } }]);
  });

  it("builds an open-ended value range", () => {
    const where = buildLeadWhere(COMPANY, { valueMin: 100 }, USER);
    expect(where.AND).toEqual([{ estimatedValue: { gte: 100 } }]);
  });

  it("searches across lead number, title, contact and client name", () => {
    const where = buildLeadWhere(COMPANY, { q: "acme" }, USER);
    const or = (where.AND as Array<{ OR?: unknown[] }>)[0].OR;
    expect(or).toHaveLength(5);
  });

  it("filters to leads carrying an overdue follow-up", () => {
    const where = buildLeadWhere(COMPANY, { overdueOnly: true }, USER);
    const clause = (where.AND as Array<{ followUps?: { some?: { status?: string } } }>)[0];
    expect(clause.followUps?.some?.status).toBe("PENDING");
  });
});

describe("buildLeadOrderBy", () => {
  it("falls back to the default sort", () => {
    expect(buildLeadOrderBy(undefined)).toEqual({
      [DEFAULT_LEAD_SORT.field]: DEFAULT_LEAD_SORT.direction,
    });
  });

  it("honours an explicit sort", () => {
    expect(buildLeadOrderBy({ field: "estimatedValue", direction: "asc" })).toEqual({
      estimatedValue: "asc",
    });
  });
});

describe("parseLeadFiltersFromParams", () => {
  it("parses arrays, booleans and numbers out of a query string", () => {
    const filters = parseLeadFiltersFromParams(
      new URLSearchParams("stages=NEW,QUOTED&mineOnly=1&valueMin=250&q=roof"),
    );
    expect(filters).toEqual({
      stages: ["NEW", "QUOTED"],
      mineOnly: true,
      valueMin: 250,
      q: "roof",
    });
  });

  it("narrows nothing when the query string is malformed", () => {
    expect(parseLeadFiltersFromParams(new URLSearchParams("stages=NOT_A_STAGE"))).toEqual({});
  });

  it("ignores empty params rather than emitting blank filters", () => {
    expect(parseLeadFiltersFromParams(new URLSearchParams("q=&valueMin="))).toEqual({});
  });
});

describe("leadViewFiltersSchema", () => {
  it("rejects an unknown stage", () => {
    expect(leadViewFiltersSchema.safeParse({ stages: ["ARCHIVED"] }).success).toBe(false);
  });

  it("rejects a negative value bound", () => {
    expect(leadViewFiltersSchema.safeParse({ valueMin: -1 }).success).toBe(false);
  });
});

describe("hasActiveLeadFilters", () => {
  it("is false for an empty filter set", () => {
    expect(hasActiveLeadFilters({})).toBe(false);
  });

  it("is false for empty arrays, blank search and false booleans", () => {
    expect(hasActiveLeadFilters({ stages: [], q: "  ", mineOnly: false })).toBe(false);
  });

  it("is true once anything narrows the list", () => {
    expect(hasActiveLeadFilters({ stages: ["NEW"] })).toBe(true);
    expect(hasActiveLeadFilters({ mineOnly: true })).toBe(true);
    expect(hasActiveLeadFilters({ valueMin: 0 })).toBe(true);
  });
});
