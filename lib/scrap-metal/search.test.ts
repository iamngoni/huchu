/**
 * Scrap metal's search arm, against a real Postgres.
 *
 * The case that matters most here is a negative one: typing a seller's national
 * ID must find nothing. `ScrapSellerProfile.nationalId` is indexed and adding it
 * to the `OR` would take one line and look like an improvement — so the rule is
 * written down as a test rather than as a comment, because a comment does not
 * fail.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { searchScrapMetal } from "./search";

let companyId: string;
let otherCompanyId: string;
let sellerId: string;
let ticketId: string;

const NATIONAL_ID = "63-1234567-K-42";

async function makeTenant(stamp: string, label: string) {
  const company = await prisma.company.create({
    data: { name: `${label} ${stamp}`, slug: `${label}-${stamp}` },
    select: { id: true },
  });
  const site = await prisma.site.create({
    data: { companyId: company.id, name: `${label} yard`, code: `Y-${stamp}` },
    select: { id: true },
  });
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      email: `counter-${label}-${stamp}@example.invalid`,
      name: "Counter clerk",
      role: "CLERK",
    },
    select: { id: true },
  });
  const employee = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeId: `E-${stamp}`,
      name: "Buyer",
      phone: "0770000000",
      nextOfKinName: "Kin",
      nextOfKinPhone: "0770000001",
      passportPhotoUrl: "https://example.invalid/p.jpg",
      villageOfOrigin: "Village",
      position: "CLERK",
    },
    select: { id: true },
  });
  return { companyId: company.id, siteId: site.id, userId: user.id, employeeId: employee.id };
}

beforeAll(async () => {
  const stamp = String(Date.now());
  const yard = await makeTenant(stamp, "scrap-search");
  const rival = await makeTenant(`${stamp}b`, "scrap-rival");
  companyId = yard.companyId;
  otherCompanyId = rival.companyId;

  const seller = await prisma.scrapSellerProfile.create({
    data: {
      companyId,
      fullName: "Tapiwa Mudzingwa",
      phone: "0772223334",
      nationalId: NATIONAL_ID,
      address: "14 Steel Road, Bulawayo",
    },
    select: { id: true },
  });
  sellerId = seller.id;

  const ticket = await prisma.scrapMetalPurchase.create({
    data: {
      companyId,
      siteId: yard.siteId,
      employeeId: yard.employeeId,
      createdById: yard.userId,
      sellerProfileId: seller.id,
      purchaseNumber: `SMP-${stamp}`,
      purchaseDate: new Date("2026-08-03T09:00:00Z"),
      category: "STEEL",
      weight: 320,
      pricePerKg: 0.35,
      totalAmount: 112,
    },
    select: { id: true },
  });
  ticketId = ticket.id;

  // A walk-in with no saved profile: the seller's name lives on the ticket only.
  await prisma.scrapMetalPurchase.create({
    data: {
      companyId,
      siteId: yard.siteId,
      employeeId: yard.employeeId,
      createdById: yard.userId,
      purchaseNumber: `SMP-W-${stamp}`,
      purchaseDate: new Date("2026-08-04T09:00:00Z"),
      category: "COPPER",
      weight: 18,
      pricePerKg: 4.2,
      totalAmount: 75.6,
      sellerName: "Blessing Ncube",
      sellerPhone: "0779998887",
    },
  });

  // The same seller name on another tenant.
  await prisma.scrapSellerProfile.create({
    data: {
      companyId: otherCompanyId,
      fullName: "Tapiwa Mudzingwa",
      phone: "0772223334",
      nationalId: NATIONAL_ID,
    },
  });
});

afterAll(async () => {
  const companies = { in: [companyId, otherCompanyId] };
  await prisma.scrapMetalPurchase.deleteMany({ where: { companyId: companies } });
  await prisma.scrapSellerProfile.deleteMany({ where: { companyId: companies } });
  await prisma.employee.deleteMany({ where: { companyId: companies } });
  await prisma.user.deleteMany({ where: { companyId: companies } });
  await prisma.site.deleteMany({ where: { companyId: companies } });
  await prisma.company.deleteMany({ where: { id: companies } });
});

describe("searchScrapMetal", () => {
  it("finds a ticket by its number", async () => {
    const results = await searchScrapMetal(prisma, {
      companyId,
      query: "SMP-",
      types: ["SCRAP_TICKET"],
    });

    expect(results.map((row) => row.id)).toContain(ticketId);
  });

  it("finds a ticket through the seller's saved profile", async () => {
    const results = await searchScrapMetal(prisma, {
      companyId,
      query: "mudzingwa",
      types: ["SCRAP_TICKET"],
    });

    expect(results.map((row) => row.id)).toEqual([ticketId]);
    expect(results[0].subtitle).toContain("Tapiwa Mudzingwa");
  });

  it("finds a walk-in's ticket, whose seller has no profile at all", async () => {
    // Searching only the profile relation would lose every walk-in — which on a
    // scrap counter is most of the day.
    const results = await searchScrapMetal(prisma, {
      companyId,
      query: "ncube",
      types: ["SCRAP_TICKET"],
    });

    expect(results).toHaveLength(1);
    expect(results[0].subtitle).toContain("Blessing Ncube");
  });

  it("finds a seller and counts what they have brought in", async () => {
    const results = await searchScrapMetal(prisma, {
      companyId,
      query: "tapiwa",
      types: ["SCRAP_SELLER"],
    });

    expect(results.map((row) => row.id)).toEqual([sellerId]);
    expect(results[0].facts).toEqual(
      expect.arrayContaining([{ label: "Tickets", value: "1 ticket" }]),
    );
  });

  it("does not find a seller by their national ID", async () => {
    // Deliberate. It is a state identity number, and a box in the app bar that
    // turns one into a name and an address is the register leaked to anyone
    // signed in. The clerk who needs to check an ID has the seller's record open.
    const byId = await searchScrapMetal(prisma, {
      companyId,
      query: NATIONAL_ID,
      types: ["SCRAP_SELLER", "SCRAP_TICKET"],
    });
    const byIdFragment = await searchScrapMetal(prisma, {
      companyId,
      query: "1234567",
      types: ["SCRAP_SELLER", "SCRAP_TICKET"],
    });

    expect(byId).toEqual([]);
    expect(byIdFragment).toEqual([]);
  });

  it("never crosses tenants", async () => {
    const results = await searchScrapMetal(prisma, {
      companyId,
      query: "mudzingwa",
      types: ["SCRAP_SELLER"],
    });

    expect(results.map((row) => row.id)).toEqual([sellerId]);
  });
});
