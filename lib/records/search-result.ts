/**
 * What a search result is, for every module that has records.
 *
 * S-4.5. The shape and the grouping used to live in `lib/crm/search.ts`
 * alongside the CRM's own queries, which was fine while the CRM was the only
 * thing anybody searched. A school needs the same thing — one box, one query,
 * results that tell two similar records apart — and copying the shape into a
 * `lib/schools/search.ts` would have given the product two search engines that
 * drift: one with a preview pane and one without, one that understands a
 * reference number and one that does not.
 *
 * So the shape lives here, module-neutral, and each module contributes arms:
 * `searchCrm` and `searchSchools`. `lib/records/search.ts` runs the arms a
 * tenant is entitled to and hands back one list. Types are here rather than in
 * `search.ts` so a module's arm file can import them without importing the
 * orchestrator that imports it.
 */

export type SearchResultType =
  // CRM and the shared ledgers
  | "PERSON"
  | "COMPANY"
  | "LEAD"
  | "DEAL"
  | "SITE"
  | "QUOTATION"
  | "INVOICE"
  | "RECEIPT"
  | "PRODUCT"
  | "CUSTOMER"
  // People — the workforce, whatever the vertical
  | "EMPLOYEE"
  | "SHIFT_GROUP"
  // Schools (S-4.5)
  | "STUDENT"
  | "GUARDIAN"
  | "TEACHER"
  | "CLASS"
  | "SUBJECT"
  | "HOSTEL";

export type SearchFact = { label: string; value: string };

export type SearchResult = {
  type: SearchResultType;
  id: string;
  /** The record number, shown alongside the title. */
  reference: string | null;
  title: string;
  /** One line of disambiguating detail, for the list row. */
  subtitle: string | null;
  /**
   * The same detail, labelled, for the preview pane.
   *
   * A preview showing one line is a list row in a bigger box. The command bar
   * gathered all of this already and then joined it with a middle dot, so the
   * pane beside the results had nothing to say that the row had not.
   */
  facts: SearchFact[];
  href: string;
};

/** Labelled facts, minus the ones with nothing in them. */
export function facts(
  entries: Array<[string, string | number | null | undefined]>,
): SearchFact[] {
  return entries
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => ({ label, value: String(value) }));
}

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  PERSON: "People",
  COMPANY: "Companies",
  LEAD: "Leads",
  DEAL: "Deals",
  SITE: "Sites",
  QUOTATION: "Quotations",
  INVOICE: "Invoices",
  RECEIPT: "Receipts",
  PRODUCT: "Catalogue",
  CUSTOMER: "Accounts",
  EMPLOYEE: "Staff",
  SHIFT_GROUP: "Crews",
  STUDENT: "Students",
  GUARDIAN: "Guardians",
  // "Staff" rather than "Teachers": the profile is the school's view of a
  // member of staff, and a bursar looking for the science HOD types a name
  // without first deciding what to call her.
  TEACHER: "Staff",
  CLASS: "Classes",
  SUBJECT: "Subjects",
  HOSTEL: "Hostels",
};

/**
 * Order groups appear in: the records people look for most, first.
 *
 * School types lead. No tenant has both modules switched on today, so this only
 * decides the order *within* a module — but a school's searches are
 * overwhelmingly for a pupil, and if the two ever do meet on one tenant a
 * registrar's pupil should not sit under a catalogue item.
 */
export const SEARCH_TYPE_ORDER: SearchResultType[] = [
  // Staff first. Every vertical has a workforce — it is the one group that
  // appears on a mine, a school and a bureau alike — and on a payroll tenant it
  // is the only group there is.
  "EMPLOYEE",
  "SHIFT_GROUP",
  "STUDENT",
  "GUARDIAN",
  "TEACHER",
  "CLASS",
  "SUBJECT",
  "HOSTEL",
  "DEAL",
  "PERSON",
  "COMPANY",
  "LEAD",
  "SITE",
  "PRODUCT",
  "QUOTATION",
  "INVOICE",
  "RECEIPT",
  "CUSTOMER",
];

export const SEARCH_PER_TYPE_LIMIT = 5;

/** A query that looks like "QTN-0042" or "CRMD-7" is a record number, not a name. */
export function looksLikeReference(query: string): boolean {
  return /^[a-z]{2,6}-?\d{1,8}$/i.test(query.trim());
}

export function pluralise(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/** Group flat results for rendering, in the order defined by SEARCH_TYPE_ORDER. */
export function groupSearchResults(results: SearchResult[]) {
  return SEARCH_TYPE_ORDER.map((type) => ({
    type,
    label: SEARCH_TYPE_LABELS[type],
    results: results.filter((result) => result.type === type),
  })).filter((group) => group.results.length > 0);
}
