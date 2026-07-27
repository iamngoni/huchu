import { describe, expect, it } from "vitest";

import {
  allowedTransitions,
  canTransition,
  completionBlockers,
  completionPercent,
  isOverdueToStart,
  quoteLinesToWorkItems,
} from "./work-orders";

describe("canTransition", () => {
  it("follows the ordinary path", () => {
    expect(canTransition("DRAFT", "SCHEDULED")).toBe(true);
    expect(canTransition("SCHEDULED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("refuses to reopen a finished job", () => {
    // A signature would otherwise stand against work that changed afterwards.
    expect(canTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("COMPLETED", "SCHEDULED")).toBe(false);
    expect(allowedTransitions("COMPLETED")).toEqual([]);
  });

  it("refuses to revive a cancelled job", () => {
    expect(allowedTransitions("CANCELLED")).toEqual([]);
  });

  it("won't send a job straight to done without anyone being on site", () => {
    expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransition("SCHEDULED", "COMPLETED")).toBe(false);
  });

  it("lets a blocked job get going again", () => {
    expect(canTransition("BLOCKED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("BLOCKED", "SCHEDULED")).toBe(true);
  });

  it("lets a scheduled job go back to draft but not an in-progress one", () => {
    expect(canTransition("SCHEDULED", "DRAFT")).toBe(true);
    expect(canTransition("IN_PROGRESS", "DRAFT")).toBe(false);
  });
});

describe("completionBlockers", () => {
  const done = [{ quantity: 2, completedQuantity: 2 }];

  it("insists on a signature", () => {
    expect(completionBlockers({ items: done })).toContain("Nobody has signed the job off");
    expect(completionBlockers({ items: done, signedByName: "  " })).toContain(
      "Nobody has signed the job off",
    );
  });

  it("names unfinished work", () => {
    const blockers = completionBlockers({
      items: [
        { quantity: 2, completedQuantity: 2 },
        { quantity: 5, completedQuantity: 3 },
      ],
      signedByName: "A. Moyo",
    });
    expect(blockers).toEqual(["1 item is not fully done"]);
  });

  it("pluralises properly", () => {
    const blockers = completionBlockers({
      items: [
        { quantity: 2, completedQuantity: 0 },
        { quantity: 5, completedQuantity: 3 },
      ],
      signedByName: "A. Moyo",
    });
    expect(blockers[0]).toBe("2 items are not fully done");
  });

  it("lets a finished, signed job through", () => {
    expect(completionBlockers({ items: done, signedByName: "A. Moyo" })).toEqual([]);
  });

  it("lets a job with no checklist through once signed", () => {
    expect(completionBlockers({ items: [], signedByName: "A. Moyo" })).toEqual([]);
  });
});

describe("completionPercent", () => {
  it("measures by quantity, not by line count", () => {
    // One tiny line done out of two shouldn't read as half the job.
    expect(
      completionPercent([
        { quantity: 1, completedQuantity: 1 },
        { quantity: 99, completedQuantity: 0 },
      ]),
    ).toBe(1);
  });

  it("is zero for an empty checklist rather than dividing by nothing", () => {
    expect(completionPercent([])).toBe(0);
  });

  it("caps an over-reported line at what was asked for", () => {
    expect(completionPercent([{ quantity: 2, completedQuantity: 10 }])).toBe(100);
  });
});

describe("isOverdueToStart", () => {
  const now = new Date("2026-03-10T14:00:00Z");

  it("flags a scheduled job whose slot has passed", () => {
    expect(isOverdueToStart({ status: "SCHEDULED", scheduledStart: "2026-03-10T09:00:00Z" }, now)).toBe(
      true,
    );
  });

  it("says nothing about a job already under way", () => {
    expect(
      isOverdueToStart({ status: "IN_PROGRESS", scheduledStart: "2026-03-10T09:00:00Z" }, now),
    ).toBe(false);
  });

  it("says nothing about a job with no slot booked", () => {
    expect(isOverdueToStart({ status: "SCHEDULED", scheduledStart: null }, now)).toBe(false);
  });

  it("says nothing about a slot still to come", () => {
    expect(
      isOverdueToStart({ status: "SCHEDULED", scheduledStart: "2026-03-11T09:00:00Z" }, now),
    ).toBe(false);
  });
});

describe("quoteLinesToWorkItems", () => {
  it("leaves off anything with nothing to install", () => {
    // A delivery charge belongs on the invoice, not on a crew's sheet.
    const items = quoteLinesToWorkItems([
      { description: "Panel", quantity: 4 },
      { description: "Delivery", quantity: 0 },
    ]);
    expect(items).toEqual([{ description: "Panel", quantity: 4 }]);
  });
});
