/**
 * Global CRM search.
 *
 * One query across every record type a user might be looking for, including
 * document numbers — someone holding a printed quotation should be able to
 * type QTN-0042 and land on the deal.
 *
 * Results carry enough context to tell two similar records apart. "John Dube"
 * alone is useless when there are three; "John Dube — Finance Manager, Delta
 * Interiors, 2 active deals" is not.
 */
import type { Prisma } from "@prisma/client";

import { normalizePhoneE164 } from "@/lib/crm/phone";

type Tx = Prisma.TransactionClient;

export type SearchResultType =
  | "PERSON"
  | "COMPANY"
  | "LEAD"
  | "DEAL"
  | "SITE"
  | "QUOTATION"
  | "INVOICE"
  | "RECEIPT";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  /** The record number, shown alongside the title. */
  reference: string | null;
  title: string;
  /** One line of disambiguating detail. */
  subtitle: string | null;
  href: string;
};

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  PERSON: "People",
  COMPANY: "Companies",
  LEAD: "Leads",
  DEAL: "Deals",
  SITE: "Sites",
  QUOTATION: "Quotations",
  INVOICE: "Invoices",
  RECEIPT: "Receipts",
};

/** Order groups appear in: the records people look for most, first. */
export const SEARCH_TYPE_ORDER: SearchResultType[] = [
  "DEAL",
  "PERSON",
  "COMPANY",
  "LEAD",
  "SITE",
  "QUOTATION",
  "INVOICE",
  "RECEIPT",
];

const PER_TYPE_LIMIT = 5;

/** A query that looks like "QTN-0042" or "CRMD-7" is a record number, not a name. */
export function looksLikeReference(query: string): boolean {
  return /^[a-z]{2,6}-?\d{1,8}$/i.test(query.trim());
}

function pluralise(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/**
 * Search across the CRM. Every query is tenant-scoped; the caller supplies the
 * companyId and no result can cross that boundary.
 */
export async function searchCrm(
  db: Tx,
  input: { companyId: string; query: string; limitPerType?: number },
): Promise<SearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];

  const take = input.limitPerType ?? PER_TYPE_LIMIT;
  const contains = { contains: query, mode: "insensitive" as const };
  const phoneE164 = normalizePhoneE164(query);
  const companyId = input.companyId;

  const [people, companies, leads, deals, sites, quotations, invoices, receipts] =
    await Promise.all([
      db.crmPerson.findMany({
        where: {
          companyId,
          archivedAt: null,
          mergedIntoId: null,
          OR: [
            { fullName: contains },
            { email: contains },
            { personNo: contains },
            { phone: contains },
            ...(phoneE164 ? [{ phoneE164 }] : []),
          ],
        },
        select: {
          id: true,
          personNo: true,
          fullName: true,
          jobTitle: true,
          client: { select: { name: true } },
          _count: { select: { dealContacts: true } },
        },
        take,
      }),

      db.crmClient.findMany({
        where: {
          companyId,
          archivedAt: null,
          mergedIntoId: null,
          OR: [
            { name: contains },
            { tradingName: contains },
            { clientNo: contains },
            { email: contains },
            { phone: contains },
            { registrationNumber: contains },
            { city: contains },
            ...(phoneE164 ? [{ phoneE164 }] : []),
          ],
        },
        select: {
          id: true,
          clientNo: true,
          name: true,
          city: true,
          accountStatus: true,
          _count: { select: { deals: true, people: true } },
        },
        take,
      }),

      db.crmLead.findMany({
        where: {
          companyId,
          convertedAt: null,
          OR: [
            { leadNo: contains },
            { title: contains },
            { contactName: contains },
            { contactEmail: contains },
            { contactPhone: contains },
          ],
        },
        select: {
          id: true,
          leadNo: true,
          title: true,
          contactName: true,
          stage: true,
        },
        take,
      }),

      db.crmDeal.findMany({
        where: {
          companyId,
          archivedAt: null,
          OR: [{ dealNo: contains }, { title: contains }, { client: { name: contains } }],
        },
        select: {
          id: true,
          dealNo: true,
          title: true,
          value: true,
          currency: true,
          client: { select: { name: true } },
          stage: { select: { name: true } },
        },
        take,
      }),

      db.crmSite.findMany({
        where: {
          companyId,
          archivedAt: null,
          OR: [
            { siteNo: contains },
            { name: contains },
            { addressLine: contains },
            { city: contains },
          ],
        },
        select: {
          id: true,
          siteNo: true,
          name: true,
          addressLine: true,
          city: true,
          client: { select: { name: true } },
        },
        take,
      }),

      // Sales documents are reached through the CrmLeadDocument that links
      // them to a lead or deal, which keeps the tenant scope explicit.
      db.crmLeadDocument.findMany({
        where: {
          companyId,
          type: "QUOTATION",
          quotation: { quotationNumber: contains },
        },
        select: {
          id: true,
          leadId: true,
          dealId: true,
          amount: true,
          currency: true,
          quotation: { select: { quotationNumber: true, customer: { select: { name: true } } } },
        },
        take,
      }),

      db.crmLeadDocument.findMany({
        where: { companyId, type: "INVOICE", invoice: { invoiceNumber: contains } },
        select: {
          id: true,
          leadId: true,
          dealId: true,
          amount: true,
          currency: true,
          invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } },
        },
        take,
      }),

      db.crmLeadDocument.findMany({
        where: { companyId, type: "RECEIPT", receipt: { receiptNumber: contains } },
        select: {
          id: true,
          leadId: true,
          dealId: true,
          amount: true,
          currency: true,
          receipt: { select: { receiptNumber: true } },
        },
        take,
      }),
    ]);

  const results: SearchResult[] = [];

  for (const person of people) {
    const context = [
      person.jobTitle,
      person.client?.name,
      person._count.dealContacts > 0 ? pluralise(person._count.dealContacts, "deal") : null,
    ].filter(Boolean);
    results.push({
      type: "PERSON",
      id: person.id,
      reference: person.personNo,
      title: person.fullName,
      subtitle: context.length > 0 ? context.join(" · ") : null,
      href: `/crm/people/${person.id}`,
    });
  }

  for (const company of companies) {
    const context = [
      company.city,
      company._count.people > 0 ? pluralise(company._count.people, "contact") : null,
      company._count.deals > 0 ? pluralise(company._count.deals, "deal") : null,
      company.accountStatus !== "ACTIVE" ? company.accountStatus.toLowerCase() : null,
    ].filter(Boolean);
    results.push({
      type: "COMPANY",
      id: company.id,
      reference: company.clientNo,
      title: company.name,
      subtitle: context.length > 0 ? context.join(" · ") : null,
      href: `/crm/companies/${company.id}`,
    });
  }

  for (const lead of leads) {
    results.push({
      type: "LEAD",
      id: lead.id,
      reference: lead.leadNo,
      title: lead.title ?? lead.contactName ?? lead.leadNo,
      subtitle: [lead.contactName, lead.stage].filter(Boolean).join(" · ") || null,
      href: `/crm/leads/${lead.id}`,
    });
  }

  for (const deal of deals) {
    const context = [
      deal.client?.name,
      deal.stage?.name,
      typeof deal.value === "number" ? `${deal.currency} ${deal.value.toLocaleString()}` : null,
    ].filter(Boolean);
    results.push({
      type: "DEAL",
      id: deal.id,
      reference: deal.dealNo,
      title: deal.title,
      subtitle: context.length > 0 ? context.join(" · ") : null,
      href: `/crm/deals/${deal.id}`,
    });
  }

  for (const site of sites) {
    const context = [site.client?.name, site.addressLine, site.city].filter(Boolean);
    results.push({
      type: "SITE",
      id: site.id,
      reference: site.siteNo,
      title: site.name,
      subtitle: context.length > 0 ? context.join(" · ") : null,
      href: `/crm/sites/${site.id}`,
    });
  }

  const documentHref = (doc: { leadId: string | null; dealId: string | null }) =>
    doc.dealId ? `/crm/deals/${doc.dealId}` : `/crm/leads/${doc.leadId}`;

  for (const doc of quotations) {
    results.push({
      type: "QUOTATION",
      id: doc.id,
      reference: doc.quotation?.quotationNumber ?? null,
      title: doc.quotation?.quotationNumber ?? "Quotation",
      subtitle: [doc.quotation?.customer?.name, `${doc.currency} ${doc.amount.toLocaleString()}`]
        .filter(Boolean)
        .join(" · "),
      href: documentHref(doc),
    });
  }

  for (const doc of invoices) {
    results.push({
      type: "INVOICE",
      id: doc.id,
      reference: doc.invoice?.invoiceNumber ?? null,
      title: doc.invoice?.invoiceNumber ?? "Invoice",
      subtitle: [doc.invoice?.customer?.name, `${doc.currency} ${doc.amount.toLocaleString()}`]
        .filter(Boolean)
        .join(" · "),
      href: documentHref(doc),
    });
  }

  for (const doc of receipts) {
    results.push({
      type: "RECEIPT",
      id: doc.id,
      reference: doc.receipt?.receiptNumber ?? null,
      title: doc.receipt?.receiptNumber ?? "Receipt",
      subtitle: `${doc.currency} ${doc.amount.toLocaleString()}`,
      href: documentHref(doc),
    });
  }

  return results;
}

/** Group flat results for rendering, in the order defined by SEARCH_TYPE_ORDER. */
export function groupSearchResults(results: SearchResult[]) {
  return SEARCH_TYPE_ORDER.map((type) => ({
    type,
    label: SEARCH_TYPE_LABELS[type],
    results: results.filter((result) => result.type === type),
  })).filter((group) => group.results.length > 0);
}
