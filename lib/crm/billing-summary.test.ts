import { describe, it, expect } from "vitest";

import type { LeadDocument } from "@/components/crm/documents/document-types";
import { summariseBilling } from "./billing-summary";

function invoice(
  over: Partial<LeadDocument["invoice"]> & { total: number; amountPaid: number },
  createdAt = "2026-01-10T00:00:00.000Z",
): LeadDocument {
  return {
    id: `inv-${createdAt}-${over.total}`,
    type: "INVOICE",
    quotationId: null,
    invoiceId: "i1",
    receiptId: null,
    amount: over.total,
    currency: "USD",
    version: 1,
    supersedesId: null,
    revisionNote: null,
    createdAt,
    approval: null,
    quotation: null,
    invoice: {
      id: "i1",
      invoiceNumber: "INV-0001",
      status: "ISSUED",
      dueDate: null,
      creditTotal: 0,
      writeOffTotal: 0,
      ...over,
    } as LeadDocument["invoice"],
    receipt: null,
  };
}

function receipt(amount: number, createdAt: string): LeadDocument {
  return {
    id: `rec-${createdAt}`,
    type: "RECEIPT",
    quotationId: null,
    invoiceId: null,
    receiptId: "r1",
    amount,
    currency: "USD",
    version: 1,
    supersedesId: null,
    revisionNote: null,
    createdAt,
    approval: null,
    quotation: null,
    invoice: null,
    receipt: {
      id: "r1",
      receiptNumber: "REC-0001",
      receivedAt: createdAt,
      amount,
      method: "CASH",
    },
  };
}

function quote(total: number, version: number, createdAt: string): LeadDocument {
  return {
    id: `qtn-${version}`,
    type: "QUOTATION",
    quotationId: "q1",
    invoiceId: null,
    receiptId: null,
    amount: total,
    currency: "USD",
    version,
    supersedesId: null,
    revisionNote: null,
    createdAt,
    approval: null,
    quotation: {
      id: "q1",
      quotationNumber: `QTN-000${version}`,
      status: "SENT",
      validUntil: null,
      total,
    },
    invoice: null,
    receipt: null,
  };
}

describe("summariseBilling", () => {
  it("answers the question the deal exists to answer", () => {
    const summary = summariseBilling(
      [invoice({ total: 1000, amountPaid: 400 })],
      "USD",
    );
    expect(summary.invoiced).toBe(1000);
    expect(summary.paid).toBe(400);
    expect(summary.outstanding).toBe(600);
    expect(summary.settled).toBe(false);
    expect(summary.openInvoices).toBe(1);
  });

  it("does not count a voided invoice as money owed", () => {
    // Voiding is how a mistake is undone. Leaving it in the total makes every
    // corrected deal look like it is carrying a debt.
    const summary = summariseBilling(
      [
        invoice({ total: 1000, amountPaid: 0, status: "VOIDED" }),
        invoice({ total: 800, amountPaid: 800, status: "PAID" }),
      ],
      "USD",
    );
    expect(summary.invoiced).toBe(800);
    expect(summary.outstanding).toBe(0);
    expect(summary.settled).toBe(true);
  });

  it("treats a payment taken before any invoice as a deposit", () => {
    const summary = summariseBilling(
      [
        receipt(300, "2026-01-01T00:00:00.000Z"),
        invoice({ total: 1000, amountPaid: 300 }, "2026-01-10T00:00:00.000Z"),
      ],
      "USD",
    );
    expect(summary.deposits).toBe(300);
    expect(summary.outstanding).toBe(700);
  });

  it("counts a payment against an invoice as settlement, not a deposit", () => {
    const summary = summariseBilling(
      [
        invoice({ total: 1000, amountPaid: 300 }, "2026-01-10T00:00:00.000Z"),
        receipt(300, "2026-01-15T00:00:00.000Z"),
      ],
      "USD",
    );
    expect(summary.deposits).toBe(0);
    expect(summary.paid).toBe(300);
  });

  it("takes money down with nothing billed yet as a deposit", () => {
    const summary = summariseBilling([receipt(500, "2026-01-01T00:00:00.000Z")], "USD");
    expect(summary.deposits).toBe(500);
    expect(summary.invoiced).toBe(0);
    // No invoice means nothing has been settled — not that everything has.
    expect(summary.settled).toBe(false);
  });

  it("quotes the latest revision, not the sum of every revision", () => {
    const summary = summariseBilling(
      [
        quote(1000, 1, "2026-01-01T00:00:00.000Z"),
        quote(1200, 2, "2026-01-05T00:00:00.000Z"),
      ],
      "USD",
    );
    expect(summary.quoted).toBe(1200);
  });

  it("credits and write-offs come off what is still to collect", () => {
    const summary = summariseBilling(
      [invoice({ total: 1000, amountPaid: 500, creditTotal: 200, writeOffTotal: 100 })],
      "USD",
    );
    expect(summary.outstanding).toBe(200);
  });

  it("says nothing rather than something wrong when there are no documents", () => {
    const summary = summariseBilling([], "ZWL");
    expect(summary).toMatchObject({
      currency: "ZWL",
      quoted: 0,
      invoiced: 0,
      paid: 0,
      outstanding: 0,
      deposits: 0,
      settled: false,
    });
  });
});
