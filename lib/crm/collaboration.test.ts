import { describe, expect, it } from "vitest";

import {
  COLLAB_ENTITIES,
  collabRecordPath,
  commentAudience,
  commentRecordColumns,
  commentRecordWhere,
  isValidParent,
} from "./collaboration";
import {
  activeMentionQuery,
  extractMentionedUserIds,
  insertMention,
  renderMentionText,
  segmentMentions,
} from "./mentions";

const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

describe("mentions", () => {
  it("only counts the editor's markup, not a bare @name in prose", () => {
    const body = `hey @john, can @[Alice](${ALICE}) take this?`;
    expect(extractMentionedUserIds(body)).toEqual([ALICE]);
  });

  it("notifies a person once however many times they are named", () => {
    const body = `@[Alice](${ALICE}) and again @[Alice](${ALICE})`;
    expect(extractMentionedUserIds(body)).toEqual([ALICE]);
  });

  it("renders stored markup back to readable text", () => {
    expect(renderMentionText(`ping @[Alice](${ALICE}) now`)).toBe("ping @Alice now");
  });

  it("splits a body into text and mention segments", () => {
    const segments = segmentMentions(`hi @[Bob](${BOB})!`);
    expect(segments).toEqual([
      { kind: "text", text: "hi " },
      { kind: "mention", text: "Bob", userId: BOB },
      { kind: "text", text: "!" },
    ]);
  });

  it("replaces the typed query rather than appending to it", () => {
    const body = "please ask @al";
    const result = insertMention(body, body.length, "al", {
      id: ALICE,
      name: "Alice",
      email: "alice@example.com",
    });
    expect(result.body).toBe(`please ask @[Alice](${ALICE}) `);
    expect(result.caret).toBe(result.body.length);
  });

  it("does not open the picker mid-sentence or inside a finished mention", () => {
    expect(activeMentionQuery("hello there", 11)).toBeNull();
    expect(activeMentionQuery("mail me @ some time", 19)).toBeNull();
    expect(activeMentionQuery(`done @[Alice](${ALICE})`, 30)).toBeNull();
    expect(activeMentionQuery("ask @ali", 8)).toBe("ali");
  });
});

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
