import { describe, it, expect, vi, beforeEach } from "vitest";

import { groupSearchResults, SEARCH_TYPE_ORDER } from "./search-result";
import { searchRecords } from "./search";
import { searchCrm } from "@/lib/crm/search";
import { searchSchools } from "@/lib/schools/search";

/**
 * S-4.5 — one search across whichever modules a tenant has.
 *
 * The arms are mocked because what this file decides is not what a deal or a
 * pupil looks like — those are tested where they are built — but which arms run
 * at all. A tenant without the CRM must not have `searchCrm` called: the whole
 * bug this replaced was a search box that returned `Feature disabled: crm.core`
 * on every keystroke a school typed.
 */

vi.mock("@/lib/crm/search", () => ({ searchCrm: vi.fn(async () => []) }));
vi.mock("@/lib/schools/search", () => ({ searchSchools: vi.fn(async () => []) }));

const db = {} as never;

beforeEach(() => {
  vi.mocked(searchCrm).mockClear();
  vi.mocked(searchSchools).mockClear();
});

describe("searchRecords", () => {
  it("does not touch the CRM on a school tenant", async () => {
    await searchRecords(db, {
      companyId: "c1",
      query: "moyo",
      scope: { crm: false, schools: ["STUDENT"] },
    });

    expect(searchCrm).not.toHaveBeenCalled();
    expect(searchSchools).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ companyId: "c1", query: "moyo", types: ["STUDENT"] }),
    );
  });

  it("does not touch the school on a CRM tenant", async () => {
    await searchRecords(db, {
      companyId: "c1",
      query: "delta",
      scope: { crm: true, schools: [] },
    });

    expect(searchSchools).not.toHaveBeenCalled();
    expect(searchCrm).toHaveBeenCalledOnce();
  });

  it("runs both arms for a tenant with both, and merges them", async () => {
    vi.mocked(searchCrm).mockResolvedValueOnce([
      {
        type: "DEAL",
        id: "d1",
        reference: "CRMD-1",
        title: "Roof job",
        subtitle: null,
        facts: [],
        href: "/crm/deals/d1",
      },
    ]);
    vi.mocked(searchSchools).mockResolvedValueOnce([
      {
        type: "STUDENT",
        id: "s1",
        reference: "S1002",
        title: "Tendai Moyo",
        subtitle: null,
        facts: [],
        href: "/schools/students/s1",
      },
    ]);

    const results = await searchRecords(db, {
      companyId: "c1",
      query: "moyo",
      scope: { crm: true, schools: ["STUDENT"] },
    });

    expect(results.map((result) => result.type)).toEqual(["DEAL", "STUDENT"]);
  });

  it("answers a tenant with neither module with nothing, not an error", async () => {
    // The box lives in the app bar on every page. One that refuses is worse than
    // one that finds nothing.
    const results = await searchRecords(db, {
      companyId: "c1",
      query: "anything",
      scope: { crm: false, schools: [] },
    });
    expect(results).toEqual([]);
  });

  it("refuses a query too short to mean anything, before any arm runs", async () => {
    const results = await searchRecords(db, {
      companyId: "c1",
      query: "a",
      scope: { crm: true, schools: ["STUDENT"] },
    });

    expect(results).toEqual([]);
    expect(searchCrm).not.toHaveBeenCalled();
    expect(searchSchools).not.toHaveBeenCalled();
  });
});

describe("groupSearchResults", () => {
  it("drops the types nothing matched", () => {
    const groups = groupSearchResults([
      {
        type: "STUDENT",
        id: "s1",
        reference: "S1002",
        title: "Tendai Moyo",
        subtitle: null,
        facts: [],
        href: "/schools/students/s1",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ type: "STUDENT", label: "Students" });
  });

  it("puts a pupil above a catalogue item", () => {
    // Only matters on a tenant with both, which none has today — but a
    // registrar's pupil under a product would be the wrong answer if one did.
    expect(SEARCH_TYPE_ORDER.indexOf("STUDENT")).toBeLessThan(
      SEARCH_TYPE_ORDER.indexOf("PRODUCT"),
    );
  });

  it("labels every type it can order", () => {
    // The two lists are edited by hand and a type missing from either is a group
    // that never renders or one that renders "undefined".
    const groups = groupSearchResults(
      SEARCH_TYPE_ORDER.map((type) => ({
        type,
        id: type,
        reference: null,
        title: type,
        subtitle: null,
        facts: [],
        href: "/",
      })),
    );

    expect(groups).toHaveLength(SEARCH_TYPE_ORDER.length);
    for (const group of groups) {
      expect(group.label).toBeTruthy();
    }
  });
});
