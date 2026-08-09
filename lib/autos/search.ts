/**
 * Vehicle sales' arm of global search.
 *
 * The forecourt is the clearest case for a search box in the product: a customer
 * points at a car and asks about it, and the salesperson has a stock number, a
 * registration in their head, or nothing but "the white Hilux". All three have to
 * work from the same box.
 *
 * So the vehicle arm searches make and model through `wordMatches` — "toyota
 * hilux" spans two columns and neither alone matches it — plus the stock number
 * and the VIN, which are what is written on the windscreen and the logbook.
 *
 * Deals and enquiries are separate arms and separate groups, deliberately not
 * folded into the CRM's `DEAL` and `LEAD`. An auto lot runs both modules and a
 * list with "Deals" twice in it is a list that has to be read twice.
 */
import type { Prisma } from "@prisma/client";

import {
  facts,
  SEARCH_PER_TYPE_LIMIT,
  wordMatches,
  type SearchResult,
} from "@/lib/records/search-result";

type Tx = Prisma.TransactionClient;

/** The vehicle-sales record types global search can return. */
export const AUTOS_SEARCH_TYPES = ["VEHICLE", "VEHICLE_DEAL", "VEHICLE_LEAD"] as const;

export type AutosSearchType = (typeof AUTOS_SEARCH_TYPES)[number];

/** Which feature each arm needs. */
export const AUTOS_SEARCH_FEATURES: Record<AutosSearchType, string> = {
  VEHICLE: "autos.inventory",
  VEHICLE_DEAL: "autos.deals",
  VEHICLE_LEAD: "autos.leads",
};

/** "2019 Toyota Hilux" — the way anybody on a forecourt says it. */
function describe(vehicle: { year: number; make: string; model: string }): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function money(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString("en-ZW", { minimumFractionDigits: 2 })}`;
}

export async function searchAutos(
  db: Tx,
  input: {
    companyId: string;
    query: string;
    limitPerType?: number;
    /** The arms the caller is entitled to run. Anything absent is not searched. */
    types: readonly AutosSearchType[];
  },
): Promise<SearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];

  const take = input.limitPerType ?? SEARCH_PER_TYPE_LIMIT;
  const contains = { contains: query, mode: "insensitive" as const };
  const companyId = input.companyId;
  const wanted = new Set(input.types);
  const arms: Array<Promise<SearchResult[]>> = [];

  if (wanted.has("VEHICLE")) {
    arms.push(
      db.carSalesVehicle
        .findMany({
          where: {
            companyId,
            OR: [
              { stockNo: contains },
              { vin: contains },
              // Colour on its own is here because "the white one" is a real
              // question on a lot of six white bakkies — it narrows, and paired
              // with a make it narrows to one.
              { AND: wordMatches(query, ["make", "model", "color"]) },
            ],
          },
          select: {
            id: true,
            stockNo: true,
            vin: true,
            make: true,
            model: true,
            year: true,
            color: true,
            mileageKm: true,
            listingPrice: true,
            currency: true,
            status: true,
          },
          orderBy: { updatedAt: "desc" },
          take,
        })
        .then((rows) =>
          rows.map((row) => ({
            type: "VEHICLE" as const,
            id: row.id,
            reference: row.stockNo,
            title: describe(row),
            // Price and status on the row: whether it is still for sale is the
            // first thing asked after the car is identified.
            subtitle: [row.color, money(row.currency, row.listingPrice), row.status]
              .filter(Boolean)
              .join(" · "),
            facts: facts([
              ["Stock number", row.stockNo],
              ["VIN", row.vin],
              ["Colour", row.color],
              ["Mileage", row.mileageKm === null ? null : `${row.mileageKm.toLocaleString()} km`],
              ["Listing price", money(row.currency, row.listingPrice)],
              ["Status", row.status],
            ]),
            href: `/car-sales/inventory?vehicleId=${row.id}`,
          })),
        ),
    );
  }

  if (wanted.has("VEHICLE_DEAL")) {
    arms.push(
      db.carSalesDeal
        .findMany({
          where: {
            companyId,
            OR: [
              { dealNo: contains },
              { customerPhone: contains },
              { AND: wordMatches(query, ["customerName"]) },
              // Reachable by the car as well as by the buyer: "what happened to
              // stock 0412" is a question about the deal, not the vehicle.
              { vehicle: { OR: [{ stockNo: contains }, { vin: contains }] } },
            ],
          },
          select: {
            id: true,
            dealNo: true,
            customerName: true,
            customerPhone: true,
            status: true,
            netAmount: true,
            paidAmount: true,
            balanceAmount: true,
            vehicle: { select: { stockNo: true, make: true, model: true, year: true } },
          },
          orderBy: { updatedAt: "desc" },
          take,
        })
        .then((rows) =>
          rows.map((row) => ({
            type: "VEHICLE_DEAL" as const,
            id: row.id,
            reference: row.dealNo,
            title: row.customerName,
            subtitle: `${describe(row.vehicle)} · ${row.status}`,
            facts: facts([
              ["Deal", row.dealNo],
              ["Customer", row.customerName],
              ["Phone", row.customerPhone],
              ["Vehicle", `${describe(row.vehicle)} (${row.vehicle.stockNo})`],
              ["Status", row.status],
              ["Net", money("USD", row.netAmount)],
              ["Paid", money("USD", row.paidAmount)],
              // The one number that decides whether the car leaves the lot.
              ["Balance", money("USD", row.balanceAmount)],
            ]),
            href: `/car-sales/deals?dealId=${row.id}`,
          })),
        ),
    );
  }

  if (wanted.has("VEHICLE_LEAD")) {
    arms.push(
      db.carSalesLead
        .findMany({
          where: {
            companyId,
            OR: [
              { leadNo: contains },
              { phone: contains },
              { email: contains },
              { vehicleInterest: contains },
              { AND: wordMatches(query, ["customerName"]) },
            ],
          },
          select: {
            id: true,
            leadNo: true,
            customerName: true,
            phone: true,
            email: true,
            vehicleInterest: true,
            budgetMin: true,
            budgetMax: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
          take,
        })
        .then((rows) =>
          rows.map((row) => ({
            type: "VEHICLE_LEAD" as const,
            id: row.id,
            reference: row.leadNo,
            title: row.customerName,
            subtitle: [row.vehicleInterest, row.status].filter(Boolean).join(" · "),
            facts: facts([
              ["Enquiry", row.leadNo],
              ["Phone", row.phone],
              ["Email", row.email],
              ["Interested in", row.vehicleInterest],
              [
                "Budget",
                row.budgetMin !== null || row.budgetMax !== null
                  ? `USD ${row.budgetMin ?? 0} – ${row.budgetMax ?? "any"}`
                  : null,
              ],
              ["Status", row.status],
            ]),
            href: `/car-sales/leads?leadId=${row.id}`,
          })),
        ),
    );
  }

  const results = await Promise.all(arms);
  return results.flat();
}
