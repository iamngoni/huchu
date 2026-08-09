/**
 * Global search across whichever modules a tenant is entitled to.
 *
 * S-4.5. There is one search box in the app bar, one command bar behind ⌘K, and
 * one mention picker. Before this they all called `/api/v2/crm/search`, which is
 * gated on `crm.core` by URL prefix — so on a school tenant the box in the app
 * bar returned 403 and showed nothing. The same trap S-4.2 and S-4.4 hit: making
 * a school record a first-class record type changes the data model and changes
 * nothing about who can reach it.
 *
 * The fix is not a second search engine. Each module contributes an arm
 * (`searchCrm`, `searchSchools`, `searchPeople`) returning the shared result shape, this decides
 * which arms the caller may run, and the callers see one grouped list. A tenant
 * with both modules gets both; a tenant with neither gets an empty list rather
 * than an error, because a search box that refuses is worse than one that finds
 * nothing.
 *
 * Entitlement is resolved by the caller — `app/api/v2/records/search/route.ts` —
 * because it holds the session, and a library that reads features from a global
 * is a library you cannot test.
 */
import type { Prisma } from "@prisma/client";

import { searchCrm } from "@/lib/crm/search";
import { searchPeople, type PeopleSearchType } from "@/lib/people/search";
import { groupSearchResults, type SearchResult } from "@/lib/records/search-result";
import { searchSchools, type SchoolSearchType } from "@/lib/schools/search";

type Tx = Prisma.TransactionClient;

export type SearchScope = {
  /** CRM records, the shared catalogue and the accounting customers. */
  crm: boolean;
  /** The school arms this caller may run — empty means no school search. */
  schools: readonly SchoolSearchType[];
  /** The People arms this caller may run — empty means no workforce search. */
  people: readonly PeopleSearchType[];
};

export async function searchRecords(
  db: Tx,
  input: { companyId: string; query: string; limitPerType?: number; scope: SearchScope },
): Promise<SearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];

  const arms: Array<Promise<SearchResult[]>> = [];

  if (input.scope.crm) {
    arms.push(
      searchCrm(db, {
        companyId: input.companyId,
        query,
        limitPerType: input.limitPerType,
      }),
    );
  }

  if (input.scope.schools.length > 0) {
    arms.push(
      searchSchools(db, {
        companyId: input.companyId,
        query,
        limitPerType: input.limitPerType,
        types: input.scope.schools,
      }),
    );
  }

  if (input.scope.people.length > 0) {
    arms.push(
      searchPeople(db, {
        companyId: input.companyId,
        query,
        limitPerType: input.limitPerType,
        types: input.scope.people,
      }),
    );
  }

  const results = await Promise.all(arms);
  return results.flat();
}

export { groupSearchResults };
