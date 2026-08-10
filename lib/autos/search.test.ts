/**
 * Vehicle sales' search arm, against a real Postgres.
 *
 * The case worth a database is "toyota hilux": make and model are two columns,
 * and a query matched against either one alone finds nothing. That is what
 * `wordMatches` is for, and it is the first thing anybody standing on a forecourt
 * types.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { searchAutos } from "./search";

let companyId: string;
let otherCompanyId: string;
let hiluxId: string;
let dealId: string;
let leadId: string;

async function makeTenant(stamp: string, label: string) {
  const company = await prisma.company.create({
    data: { name: `${label} ${stamp}`, slug: `${label}-${stamp}` },
    select: { id: true },
  });
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      email: `sales-${label}-${stamp}@example.invalid`,
      name: "Sales exec",
      role: "SALES_EXEC",
    },
    select: { id: true },
  });
  return { companyId: company.id, userId: user.id };
}

async function makeHilux(company: string, stamp: string) {
  const vehicle = await prisma.carSalesVehicle.create({
    data: {
      companyId: company,
      stockNo: `STK-${stamp}`,
      vin: `AHTBB3CD${stamp}`,
      make: "Toyota",
      model: "Hilux",
      year: 2019,
      color: "White",
      mileageKm: 142_000,
      listingPrice: 24_500,
      minApprovalPrice: 22_000,
    },
    select: { id: true },
  });
  return vehicle.id;
}

beforeAll(async () => {
  const stamp = String(Date.now());
  const lot = await makeTenant(stamp, "autos-search");
  const rival = await makeTenant(`${stamp}b`, "autos-rival");
  companyId = lot.companyId;
  otherCompanyId = rival.companyId;

  hiluxId = await makeHilux(companyId, stamp);
  // A second white bakkie, so "white" alone cannot be the whole answer.
  await prisma.carSalesVehicle.create({
    data: {
      companyId,
      stockNo: `STK-N-${stamp}`,
      vin: `JN1TANI${stamp}`,
      make: "Nissan",
      model: "NP300",
      year: 2020,
      color: "White",
      listingPrice: 19_000,
      minApprovalPrice: 18_000,
    },
  });

  const lead = await prisma.carSalesLead.create({
    data: {
      companyId,
      leadNo: `LD-${stamp}`,
      customerName: "Rudo Chidzikwe",
      phone: "0775551234",
      vehicleInterest: "Double cab, diesel",
      budgetMin: 18_000,
      budgetMax: 26_000,
    },
    select: { id: true },
  });
  leadId = lead.id;

  const deal = await prisma.carSalesDeal.create({
    data: {
      companyId,
      dealNo: `DL-${stamp}`,
      leadId: lead.id,
      vehicleId: hiluxId,
      customerName: "Rudo Chidzikwe",
      customerPhone: "0775551234",
      salespersonId: lot.userId,
      quoteAmount: 24_500,
      netAmount: 24_500,
      paidAmount: 5_000,
      balanceAmount: 19_500,
    },
    select: { id: true },
  });
  dealId = deal.id;

  // The same model, same colour, next door.
  await makeHilux(otherCompanyId, `${stamp}b`);
});

afterAll(async () => {
  const companies = { in: [companyId, otherCompanyId] };
  await prisma.carSalesDeal.deleteMany({ where: { companyId: companies } });
  await prisma.carSalesLead.deleteMany({ where: { companyId: companies } });
  await prisma.carSalesVehicle.deleteMany({ where: { companyId: companies } });
  await prisma.user.deleteMany({ where: { companyId: companies } });
  await prisma.company.deleteMany({ where: { id: companies } });
});

describe("searchAutos", () => {
  it("finds a vehicle by make and model together", async () => {
    // The two words are two columns. Either one alone matches nothing.
    const results = await searchAutos(prisma, {
      companyId,
      query: "toyota hilux",
      types: ["VEHICLE"],
    });

    expect(results.map((row) => row.id)).toEqual([hiluxId]);
    expect(results[0].title).toBe("2019 Toyota Hilux");
  });

  it("finds a vehicle by its VIN and by its stock number", async () => {
    const byVin = await searchAutos(prisma, {
      companyId,
      query: "AHTBB3CD",
      types: ["VEHICLE"],
    });
    const byStock = await searchAutos(prisma, {
      companyId,
      query: "STK-",
      types: ["VEHICLE"],
    });

    expect(byVin.map((row) => row.id)).toEqual([hiluxId]);
    expect(byStock.map((row) => row.id)).toContain(hiluxId);
  });

  it("narrows on colour with a make, and does not pretend colour alone is an answer", async () => {
    const white = await searchAutos(prisma, {
      companyId,
      query: "white",
      types: ["VEHICLE"],
    });
    const whiteToyota = await searchAutos(prisma, {
      companyId,
      query: "white toyota",
      types: ["VEHICLE"],
    });

    expect(white).toHaveLength(2);
    expect(whiteToyota.map((row) => row.id)).toEqual([hiluxId]);
  });

  it("finds a deal by the car as well as by the buyer", async () => {
    const byCustomer = await searchAutos(prisma, {
      companyId,
      query: "chidzikwe",
      types: ["VEHICLE_DEAL"],
    });
    const byStockNumber = await searchAutos(prisma, {
      companyId,
      query: "STK-",
      types: ["VEHICLE_DEAL"],
    });

    expect(byCustomer.map((row) => row.id)).toEqual([dealId]);
    expect(byStockNumber.map((row) => row.id)).toEqual([dealId]);
    // The balance is the number that decides whether the car leaves the lot.
    expect(byCustomer[0].facts).toEqual(
      expect.arrayContaining([{ label: "Balance", value: "USD 19,500.00" }]),
    );
  });

  it("finds an enquiry by what the customer said they wanted", async () => {
    const results = await searchAutos(prisma, {
      companyId,
      query: "double cab",
      types: ["VEHICLE_LEAD"],
    });

    expect(results.map((row) => row.id)).toEqual([leadId]);
  });

  it("keeps a deal and an enquiry in separate groups from the CRM's own", async () => {
    // An auto lot runs the CRM too, and "Deals" appearing twice in one result
    // list is a list that has to be read twice.
    const results = await searchAutos(prisma, {
      companyId,
      query: "chidzikwe",
      types: ["VEHICLE_DEAL", "VEHICLE_LEAD"],
    });

    expect(new Set(results.map((row) => row.type))).toEqual(
      new Set(["VEHICLE_DEAL", "VEHICLE_LEAD"]),
    );
  });

  it("never crosses tenants", async () => {
    const results = await searchAutos(prisma, {
      companyId,
      query: "toyota hilux",
      types: ["VEHICLE"],
    });

    expect(results.map((row) => row.id)).toEqual([hiluxId]);
  });
});
