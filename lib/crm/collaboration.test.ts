import { describe, expect, it } from "vitest";

import {
  COLLAB_ENTITIES,
  collabRecordPath,
  commentAudience,
  commentRecordColumns,
  commentRecordWhere,
  isValidParent,
} from "./collaboration";

describe("comment record mapping", () => {
  it("sets exactly one column per record type", () => {
    for (const entity of COLLAB_ENTITIES) {
      const columns = commentRecordColumns({ entity, recordId: "r-1" });
      expect(Object.values(columns).filter(Boolean)).toEqual(["r-1"]);
    }
  });

  it("pins the other columns to null so a shared id can't cross record types", () => {
    const where = commentRecordWhere({ entity: "DEAL", recordId: "r-1" });
    expect(where).toEqual({
      leadId: null,
      dealId: "r-1",
      clientId: null,
      personId: null,
      siteId: null,
    });
  });

  it("links every record type somewhere real", () => {
    for (const entity of COLLAB_ENTITIES) {
      expect(collabRecordPath({ entity, recordId: "r-1" })).toMatch(/^\/crm\/[a-z-]+\/r-1$/);
    }
  });
});

describe("isValidParent", () => {
  const base = {
    id: "c-1",
    parentId: null,
    leadId: null,
    dealId: "d-1",
    clientId: null,
    personId: null,
    siteId: null,
  };
  const record = { entity: "DEAL", recordId: "d-1" } as const;

  it("accepts a top-level comment on the same record", () => {
    expect(isValidParent(base, record)).toBe(true);
  });

  it("refuses a reply to a reply", () => {
    expect(isValidParent({ ...base, parentId: "c-0" }, record)).toBe(false);
  });

  it("refuses a parent from a different record", () => {
    expect(isValidParent({ ...base, dealId: "d-2" }, record)).toBe(false);
  });

  it("refuses a missing parent", () => {
    expect(isValidParent(null, record)).toBe(false);
  });
});

describe("commentAudience", () => {
  it("skips the author and anyone already mentioned", () => {
    const audience = commentAudience({
      followerIds: ["a", "b", "c"],
      participantIds: ["c", "d"],
      mentionedIds: ["b"],
      authorId: "a",
    });
    expect(audience.sort()).toEqual(["c", "d"]);
  });

  it("notifies each person once", () => {
    const audience = commentAudience({
      followerIds: ["x", "x"],
      participantIds: ["x"],
      mentionedIds: [],
      authorId: "author",
    });
    expect(audience).toEqual(["x"]);
  });

  it("is empty when the author is talking to themselves", () => {
    expect(
      commentAudience({
        followerIds: ["a"],
        participantIds: ["a"],
        mentionedIds: [],
        authorId: "a",
      }),
    ).toEqual([]);
  });
});
