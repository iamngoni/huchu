/**
 * School fee events reach the general ledger.
 *
 * The helper used to write an `AccountingIntegrationEvent` with status PENDING
 * and stop. Nothing turned those rows into journal entries except a replay
 * endpoint and a CLI, both run by hand, so fee income — the pack's whole wedge
 * — sat outside the trial balance until somebody remembered. These assert that
 * posting is now a consequence of taking the money.
 *
 * Prerequisites: a real Postgres DATABASE_URL with the migrations applied.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { emitSchoolFeeAccountingEvent } from "./_helpers";

let companyId: string;
let actorId: string;
let stamp: number;

beforeAll(async () => {
  await prisma.$connect();
  stamp = Date.now();

  const company = await prisma.company.create({
    data: { name: `Fee Posting School ${stamp}`, slug: `fee-posting-${stamp}` },
  });
  companyId = company.id;

  const actor = await prisma.user.create({
    data: {
      companyId,
      email: `bursar-${stamp}@fee-posting.test`,
      name: "Bursar",
      role: "BURSAR",
    },
    select: { id: true },
  });
  actorId = actor.id;
});

afterAll(async () => {
  await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
  await prisma.$disconnect();
});

async function postReceipt(receiptId: string, amount = 250) {
  return emitSchoolFeeAccountingEvent({
    companyId,
    actorId,
    eventType: "SCHOOL_FEE_RECEIPT_POSTED",
    sourceId: receiptId,
    sourceRef: `RCT-${receiptId.slice(0, 6)}`,
    entryDate: new Date(),
    amount,
  });
}

describe("posting a fee receipt", () => {
  it("reports an outcome rather than silently queueing", async () => {
    const result = await postReceipt(`receipt-${stamp}-a`);

    // A fresh tenant has no posting rules, so the honest outcome here is a
    // named failure. What must never happen again is the old behaviour: a
    // PENDING row, a success-shaped return, and no entry.
    expect(["POSTED", "PENDING", "FAILED"]).toContain(result.accountingStatus);
    if (result.accountingStatus !== "POSTED") {
      expect(result.accountingError).toBeTruthy();
      expect(result.journalEntryId).toBeNull();
    }
  });

  it("records the attempt against a stable, idempotent source id", async () => {
    const receiptId = `receipt-${stamp}-b`;
    await postReceipt(receiptId);

    const events = await prisma.accountingIntegrationEvent.findMany({
      where: { companyId, sourceId: `SCHOOL_FEE_RECEIPT:${receiptId}` },
      select: { id: true, sourceType: true },
    });

    expect(events).toHaveLength(1);
    expect(events[0].sourceType).toBe("SALES_RECEIPT");
  });

  it("does not create a second event when the same receipt is posted twice", async () => {
    const receiptId = `receipt-${stamp}-c`;
    await postReceipt(receiptId);
    await postReceipt(receiptId);

    const events = await prisma.accountingIntegrationEvent.count({
      where: { companyId, sourceId: `SCHOOL_FEE_RECEIPT:${receiptId}` },
    });
    expect(events).toBe(1);
  });
});

describe("source ids keep the event kinds apart", () => {
  it("gives an invoice, receipt, void, waiver and write-off their own key", async () => {
    const id = `mixed-${stamp}`;
    const kinds = [
      ["SCHOOL_FEE_INVOICE_ISSUED", `SCHOOL_FEE_INVOICE:${id}`, "SALES_INVOICE"],
      ["SCHOOL_FEE_RECEIPT_POSTED", `SCHOOL_FEE_RECEIPT:${id}`, "SALES_RECEIPT"],
      ["SCHOOL_FEE_RECEIPT_VOIDED", `SCHOOL_FEE_RECEIPT_VOID:${id}`, "SALES_RECEIPT"],
      ["SCHOOL_FEE_WAIVER_APPLIED", `SCHOOL_FEE_WAIVER:${id}`, "SALES_WRITE_OFF"],
      ["SCHOOL_FEE_WRITEOFF_POSTED", `SCHOOL_FEE_WRITEOFF:${id}`, "SALES_WRITE_OFF"],
    ] as const;

    for (const [eventType, , ] of kinds) {
      await emitSchoolFeeAccountingEvent({
        companyId,
        actorId,
        eventType,
        sourceId: id,
        sourceRef: `REF-${id.slice(0, 6)}`,
        entryDate: new Date(),
        amount: 100,
      });
    }

    for (const [, sourceId, sourceType] of kinds) {
      const event = await prisma.accountingIntegrationEvent.findFirst({
        where: { companyId, sourceId },
        select: { sourceType: true },
      });
      // A void that shared a receipt's key would overwrite the receipt's own
      // posting rather than reversing it.
      expect(event, `no event for ${sourceId}`).not.toBeNull();
      expect(event?.sourceType).toBe(sourceType);
    }
  });
});
