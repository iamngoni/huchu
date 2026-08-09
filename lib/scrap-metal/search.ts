/**
 * Scrap metal's arm of global search.
 *
 * Two arms: the ticket and the seller. A yard's whole day is tickets, and the two
 * questions asked at a counter are "find ticket 4471" and "what has this man
 * brought in before" — the second being the one the compliance rules exist for.
 *
 * A seller's **national ID is deliberately not searched**, for the same reason
 * the People arm does not search an employee's. `ScrapSellerProfile.nationalId`
 * is indexed and it would work; it is a state identity number, and a box in the
 * app bar that turns one into a name is a box that leaks the register to anyone
 * signed in. The counter clerk who needs to check an ID has the seller's own
 * record open, where it belongs.
 *
 * Not searched either: `ScrapMetalBatch` and `ScrapMetalSale`. Both are found by
 * date on their own registers, and neither carries anything a person types.
 */
import type { Prisma } from "@prisma/client";

import {
  facts,
  pluralise,
  SEARCH_PER_TYPE_LIMIT,
  wordMatches,
  type SearchResult,
} from "@/lib/records/search-result";

type Tx = Prisma.TransactionClient;

/** The scrap record types global search can return. */
export const SCRAP_SEARCH_TYPES = ["SCRAP_TICKET", "SCRAP_SELLER"] as const;

export type ScrapSearchType = (typeof SCRAP_SEARCH_TYPES)[number];

/** Which feature each arm needs. Both are the purchases screen's. */
export const SCRAP_SEARCH_FEATURES: Record<ScrapSearchType, string> = {
  SCRAP_TICKET: "scrap-metal.purchases",
  SCRAP_SELLER: "scrap-metal.purchases",
};

export async function searchScrapMetal(
  db: Tx,
  input: {
    companyId: string;
    query: string;
    limitPerType?: number;
    /** The arms the caller is entitled to run. Anything absent is not searched. */
    types: readonly ScrapSearchType[];
  },
): Promise<SearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];

  const take = input.limitPerType ?? SEARCH_PER_TYPE_LIMIT;
  const contains = { contains: query, mode: "insensitive" as const };
  const companyId = input.companyId;
  const wanted = new Set(input.types);
  const arms: Array<Promise<SearchResult[]>> = [];

  if (wanted.has("SCRAP_TICKET")) {
    arms.push(
      db.scrapMetalPurchase
        .findMany({
          where: {
            companyId,
            OR: [
              { purchaseNumber: contains },
              { paymentReference: contains },
              // The seller may be a saved profile or a name typed at the
              // counter, and a ticket exists in both shapes. Searching only the
              // profile would lose every walk-in.
              { AND: wordMatches(query, ["sellerName"]) },
              { sellerProfile: { AND: wordMatches(query, ["fullName"]) } },
            ],
          },
          select: {
            id: true,
            purchaseNumber: true,
            purchaseDate: true,
            category: true,
            weight: true,
            totalAmount: true,
            currency: true,
            status: true,
            sellerName: true,
            sellerProfile: { select: { fullName: true } },
            material: { select: { name: true } },
          },
          orderBy: { purchaseDate: "desc" },
          take,
        })
        .then((rows) =>
          rows.map((row) => {
            const seller = row.sellerProfile?.fullName ?? row.sellerName;
            return {
              type: "SCRAP_TICKET" as const,
              id: row.id,
              reference: row.purchaseNumber,
              title: row.purchaseNumber,
              // Weight and money on the row, because two tickets from the same
              // seller on the same day are told apart by nothing else.
              subtitle: [seller, `${row.weight} kg`, `${row.currency} ${row.totalAmount}`]
                .filter(Boolean)
                .join(" · "),
              facts: facts([
                ["Ticket", row.purchaseNumber],
                ["Taken in", row.purchaseDate.toISOString().slice(0, 10)],
                ["Seller", seller],
                ["Material", row.material?.name ?? row.category],
                ["Weight", `${row.weight} kg`],
                ["Paid", `${row.currency} ${row.totalAmount}`],
                ["Status", row.status],
              ]),
              href: `/scrap-metal/tickets?purchaseId=${row.id}`,
            };
          }),
        ),
    );
  }

  if (wanted.has("SCRAP_SELLER")) {
    arms.push(
      db.scrapSellerProfile
        .findMany({
          where: {
            companyId,
            OR: [{ phone: contains }, { AND: wordMatches(query, ["fullName"]) }],
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
            address: true,
            isActive: true,
            _count: { select: { purchases: true } },
          },
          orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
          take,
        })
        .then((rows) =>
          rows.map((row) => ({
            type: "SCRAP_SELLER" as const,
            id: row.id,
            reference: null,
            title: row.fullName,
            // How many times they have been through the yard is the one thing
            // that distinguishes a regular from a first-timer, and it changes
            // how the counter treats the ticket.
            subtitle: `${row.phone} · ${pluralise(row._count.purchases, "ticket")}`,
            facts: facts([
              ["Phone", row.phone],
              ["Address", row.address],
              ["Tickets", pluralise(row._count.purchases, "ticket")],
              ["Status", row.isActive ? "Active" : "Blocked"],
            ]),
            href: `/scrap-metal/purchases?sellerProfileId=${row.id}`,
          })),
        ),
    );
  }

  const results = await Promise.all(arms);
  return results.flat();
}
