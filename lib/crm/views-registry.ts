/**
 * What a saved view or list can point at, and what each record type supports.
 *
 * The board view is only offered where there is a meaningful status to group
 * by — a board of people has no columns worth having.
 */
import type { CrmFieldEntity } from "@prisma/client";

export type ViewEntity = CrmFieldEntity;

export type ViewCapability = {
  label: string;
  plural: string;
  /** Route the list page lives at. */
  href: string;
  supportsBoard: boolean;
  supportsCalendar: boolean;
  /** Column keys the table offers, in default order. */
  columns: Array<{ key: string; label: string }>;
};

export const VIEW_ENTITIES: Record<ViewEntity, ViewCapability> = {
  LEAD: {
    label: "Lead",
    plural: "Leads",
    href: "/crm/leads",
    supportsBoard: true,
    supportsCalendar: false,
    columns: [
      { key: "leadNo", label: "Lead" },
      { key: "client", label: "Client" },
      { key: "stage", label: "Stage" },
      { key: "value", label: "Value" },
      { key: "owner", label: "Owner" },
      { key: "nextTask", label: "Next task" },
      { key: "source", label: "Source" },
      { key: "updatedAt", label: "Updated" },
    ],
  },
  DEAL: {
    label: "Deal",
    plural: "Deals",
    href: "/crm/deals",
    supportsBoard: true,
    supportsCalendar: true,
    columns: [
      { key: "deal", label: "Deal" },
      { key: "company", label: "Company" },
      { key: "stage", label: "Stage" },
      { key: "value", label: "Value" },
      { key: "close", label: "Expected close" },
      { key: "owner", label: "Owner" },
      { key: "next", label: "Next task" },
    ],
  },
  PERSON: {
    label: "Person",
    plural: "People",
    href: "/crm/people",
    supportsBoard: false,
    supportsCalendar: false,
    columns: [
      { key: "name", label: "Name" },
      { key: "company", label: "Company" },
      { key: "contact", label: "Contact" },
      { key: "type", label: "Type" },
      { key: "deals", label: "Deals" },
      { key: "owner", label: "Owner" },
      { key: "updated", label: "Updated" },
    ],
  },
  COMPANY: {
    label: "Company",
    plural: "Companies",
    href: "/crm/companies",
    supportsBoard: false,
    supportsCalendar: false,
    columns: [
      { key: "company", label: "Company" },
      { key: "type", label: "Type" },
      { key: "contact", label: "Contact" },
      { key: "location", label: "Location" },
      { key: "people", label: "People" },
      { key: "deals", label: "Deals" },
      { key: "status", label: "Status" },
      { key: "owner", label: "Owner" },
    ],
  },
  SITE: {
    label: "Site",
    plural: "Sites",
    href: "/crm/sites",
    supportsBoard: false,
    supportsCalendar: false,
    columns: [
      { key: "site", label: "Site" },
      { key: "company", label: "Company" },
      { key: "address", label: "Address" },
      { key: "contact", label: "Contact" },
      { key: "deals", label: "Deals" },
      { key: "visits", label: "Visits" },
    ],
  },
  WORK_ORDER: {
    label: "Work order",
    plural: "Work orders",
    href: "/crm/work-orders",
    supportsBoard: true,
    supportsCalendar: true,
    columns: [],
  },
};

export const VIEW_ENTITY_KEYS = Object.keys(VIEW_ENTITIES) as ViewEntity[];

/** View types this record type can meaningfully render. */
export function allowedViewTypes(entity: ViewEntity): Array<"TABLE" | "BOARD" | "CALENDAR"> {
  const capability = VIEW_ENTITIES[entity];
  const types: Array<"TABLE" | "BOARD" | "CALENDAR"> = ["TABLE"];
  if (capability.supportsBoard) types.push("BOARD");
  if (capability.supportsCalendar) types.push("CALENDAR");
  return types;
}

export type BuiltInView = {
  key: string;
  name: string;
  filters: Record<string, unknown>;
};

/**
 * Views everyone gets without creating them. Kept small and obviously useful —
 * a long list of built-ins is as unhelpful as none.
 */
export function builtInViews(entity: ViewEntity): BuiltInView[] {
  const shared: BuiltInView[] = [
    { key: "all", name: "All", filters: {} },
    { key: "mine", name: "Mine", filters: { mineOnly: true } },
    { key: "unassigned", name: "Unassigned", filters: { unassigned: true } },
  ];

  switch (entity) {
    case "LEAD":
      return [
        ...shared,
        {
          key: "open",
          name: "Open pipeline",
          filters: {
            stages: ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "QUOTED", "INVOICED"],
          },
        },
        { key: "overdue", name: "Needs attention", filters: { overdueOnly: true } },
      ];
    case "DEAL":
      return [
        ...shared,
        { key: "open", name: "Open", filters: { statuses: ["OPEN"] } },
        { key: "overdue", name: "Needs attention", filters: { overdueOnly: true } },
        { key: "won", name: "Won", filters: { statuses: ["WON"] } },
        { key: "lost", name: "Lost", filters: { statuses: ["LOST"] } },
      ];
    case "COMPANY":
      return [
        ...shared,
        { key: "customers", name: "Customers", filters: { companyTypes: ["CUSTOMER"] } },
        { key: "suppliers", name: "Suppliers", filters: { companyTypes: ["SUPPLIER"] } },
      ];
    case "SITE":
      // Sites have no owner, so the owner-based built-ins don't apply.
      return [{ key: "all", name: "All", filters: {} }];
    default:
      return shared;
  }
}
