import { z } from "zod";

/**
 * The overview pages, and what can go on them.
 *
 * A widget instance is deliberately thin — a type, a span and a little config
 * — because the widget itself knows how to fetch what it needs. Storing the
 * data shape in the layout would mean a layout saved last month renders last
 * month's idea of a deal.
 */

export const OVERVIEW_SCOPES = [
  "HOME",
  "RECORD_DEAL",
  "RECORD_LEAD",
  "RECORD_COMPANY",
  "RECORD_PERSON",
  "RECORD_SITE",
] as const;

export type OverviewScope = (typeof OVERVIEW_SCOPES)[number];

/** How wide a widget sits on the twelve-column grid. */
export const WIDGET_SPANS = [3, 4, 6, 8, 12] as const;
export type WidgetSpan = (typeof WIDGET_SPANS)[number];

export const widgetInstanceSchema = z.object({
  /** Unique within a layout — the same type may appear twice. */
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(64),
  span: z.union([z.literal(3), z.literal(4), z.literal(6), z.literal(8), z.literal(12)]),
  /** Widget-specific settings; each widget validates its own. */
  config: z.record(z.string(), z.unknown()).optional(),
});

export type WidgetInstance = z.infer<typeof widgetInstanceSchema>;

export const overviewLayoutSchema = z.object({
  scope: z.enum(OVERVIEW_SCOPES),
  widgets: z.array(widgetInstanceSchema).max(40),
});

export type WidgetKind =
  | "metric"
  | "chart"
  | "list"
  | "attribute"
  | "activity"
  | "custom";

export type WidgetDefinition = {
  type: string;
  label: string;
  /** What it tells you, in the words somebody would use asking for it. */
  description: string;
  kind: WidgetKind;
  scopes: readonly OverviewScope[];
  defaultSpan: WidgetSpan;
};

const HOME = ["HOME"] as const;
const RECORDS = [
  "RECORD_DEAL",
  "RECORD_LEAD",
  "RECORD_COMPANY",
  "RECORD_PERSON",
  "RECORD_SITE",
] as const;
const EVERYWHERE = ["HOME", ...RECORDS] as const;

/**
 * Everything that can be dropped on an overview.
 *
 * Grouped by what question it answers rather than by where it came from —
 * somebody adding a widget is looking for "how much are we owed", not for
 * "the collections endpoint".
 */
export const WIDGET_CATALOGUE: WidgetDefinition[] = [
  // --- money ---------------------------------------------------------
  {
    type: "won-this-period",
    label: "Won this period",
    description: "What actually closed, against the period before it.",
    kind: "metric",
    scopes: HOME,
    defaultSpan: 4,
  },
  {
    type: "open-pipeline",
    label: "Open pipeline",
    description: "The gross value in flight, and how many are due to close this week.",
    kind: "metric",
    scopes: HOME,
    defaultSpan: 4,
  },
  {
    type: "owed-to-us",
    label: "Owed to us",
    description: "Outstanding invoices, and how much of it is overdue.",
    kind: "metric",
    scopes: HOME,
    defaultSpan: 4,
  },
  {
    type: "quotes-with-customers",
    label: "Out with customers",
    description: "Quotes awaiting a decision, and the age of the oldest.",
    kind: "metric",
    scopes: HOME,
    defaultSpan: 4,
  },
  {
    type: "ageing",
    label: "Ageing",
    description: "What we are owed, bucketed by how late it is.",
    kind: "chart",
    scopes: HOME,
    defaultSpan: 6,
  },

  // --- speed ---------------------------------------------------------
  {
    type: "first-contact",
    label: "Waiting on a first call",
    description: "Leads past the first-contact target, and how fast we usually answer.",
    kind: "metric",
    scopes: HOME,
    defaultSpan: 4,
  },
  {
    type: "stage-funnel",
    label: "Pipeline funnel",
    description: "How many survive each stage, and how long they sit there.",
    kind: "chart",
    scopes: HOME,
    defaultSpan: 8,
  },
  {
    type: "pipeline-by-stage",
    label: "Pipeline by stage",
    description: "Count and value in each stage, as a bar per stage.",
    kind: "chart",
    scopes: HOME,
    defaultSpan: 6,
  },

  // --- work ----------------------------------------------------------
  {
    type: "my-tasks",
    label: "My tasks",
    description: "What is due today and what is late.",
    kind: "list",
    scopes: EVERYWHERE,
    defaultSpan: 6,
  },
  {
    type: "upcoming-visits",
    label: "Upcoming visits",
    description: "Site visits booked in the next week.",
    kind: "list",
    scopes: EVERYWHERE,
    defaultSpan: 6,
  },
  {
    type: "work-in-the-field",
    label: "Work in the field",
    description: "Jobs scheduled or in progress.",
    kind: "metric",
    scopes: HOME,
    defaultSpan: 4,
  },

  // --- the record itself ---------------------------------------------
  {
    type: "record-value",
    label: "Value",
    description: "What this deal is worth.",
    kind: "attribute",
    scopes: ["RECORD_DEAL", "RECORD_LEAD"],
    defaultSpan: 4,
  },
  {
    type: "record-owner",
    label: "Owner",
    description: "Who is carrying this.",
    kind: "attribute",
    scopes: RECORDS,
    defaultSpan: 4,
  },
  {
    type: "record-stage",
    label: "Stage",
    description: "Where it has got to, as a strip you can read at a glance.",
    kind: "attribute",
    scopes: ["RECORD_DEAL", "RECORD_LEAD"],
    defaultSpan: 4,
  },
  {
    type: "record-company",
    label: "Company",
    description: "The company this belongs to, and where they are.",
    kind: "attribute",
    scopes: ["RECORD_DEAL", "RECORD_LEAD", "RECORD_PERSON", "RECORD_SITE"],
    defaultSpan: 4,
  },
  {
    type: "record-description",
    label: "Description",
    description: "The written summary of this record.",
    kind: "attribute",
    scopes: RECORDS,
    defaultSpan: 8,
  },
  {
    type: "associated-people",
    label: "Associated people",
    description: "Everybody attached to this record.",
    kind: "list",
    scopes: RECORDS,
    defaultSpan: 4,
  },
  {
    type: "next-interaction",
    label: "Next calendar interaction",
    description: "The next thing in the diary with this record.",
    kind: "attribute",
    scopes: RECORDS,
    defaultSpan: 4,
  },
  {
    type: "documents",
    label: "Documents",
    description: "Quotes, invoices and receipts raised against this record.",
    kind: "list",
    scopes: RECORDS,
    defaultSpan: 6,
  },

  // --- what has been happening ---------------------------------------
  {
    type: "activity-summary",
    label: "Activity summary",
    description: "What has happened lately, counted by kind.",
    kind: "activity",
    scopes: EVERYWHERE,
    defaultSpan: 6,
  },
  {
    type: "recent-activity",
    label: "Recent activity",
    description: "The last several things that happened, in order.",
    kind: "activity",
    scopes: EVERYWHERE,
    defaultSpan: 6,
  },
];

export function widgetsForScope(scope: OverviewScope): WidgetDefinition[] {
  return WIDGET_CATALOGUE.filter((widget) => widget.scopes.includes(scope));
}

export function widgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGET_CATALOGUE.find((widget) => widget.type === type);
}

/**
 * What a scope looks like before anybody has rearranged it.
 *
 * These are opinionated on purpose: an overview nobody has touched should
 * still answer the questions that surface most often, in the order they cost
 * money. An empty grid with an "add a widget" button is a chore, not a start.
 */
export const DEFAULT_LAYOUTS: Record<OverviewScope, WidgetInstance[]> = {
  HOME: [
    { id: "w-won", type: "won-this-period", span: 4 },
    { id: "w-pipeline", type: "open-pipeline", span: 4 },
    { id: "w-owed", type: "owed-to-us", span: 4 },
    { id: "w-first-contact", type: "first-contact", span: 4 },
    { id: "w-quotes", type: "quotes-with-customers", span: 4 },
    { id: "w-field", type: "work-in-the-field", span: 4 },
    { id: "w-funnel", type: "stage-funnel", span: 8 },
    { id: "w-ageing", type: "ageing", span: 4 },
    { id: "w-tasks", type: "my-tasks", span: 6 },
    { id: "w-activity", type: "activity-summary", span: 6 },
  ],
  RECORD_DEAL: [
    { id: "w-value", type: "record-value", span: 4 },
    { id: "w-owner", type: "record-owner", span: 4 },
    { id: "w-stage", type: "record-stage", span: 4 },
    { id: "w-company", type: "record-company", span: 4 },
    { id: "w-next", type: "next-interaction", span: 4 },
    { id: "w-people", type: "associated-people", span: 4 },
    { id: "w-docs", type: "documents", span: 6 },
    { id: "w-activity", type: "activity-summary", span: 6 },
  ],
  RECORD_LEAD: [
    { id: "w-value", type: "record-value", span: 4 },
    { id: "w-owner", type: "record-owner", span: 4 },
    { id: "w-stage", type: "record-stage", span: 4 },
    { id: "w-company", type: "record-company", span: 4 },
    { id: "w-next", type: "next-interaction", span: 4 },
    { id: "w-tasks", type: "my-tasks", span: 4 },
    { id: "w-activity", type: "activity-summary", span: 12 },
  ],
  RECORD_COMPANY: [
    { id: "w-owner", type: "record-owner", span: 4 },
    { id: "w-next", type: "next-interaction", span: 4 },
    { id: "w-people", type: "associated-people", span: 4 },
    { id: "w-docs", type: "documents", span: 6 },
    { id: "w-activity", type: "activity-summary", span: 6 },
  ],
  RECORD_PERSON: [
    { id: "w-company", type: "record-company", span: 4 },
    { id: "w-owner", type: "record-owner", span: 4 },
    { id: "w-next", type: "next-interaction", span: 4 },
    { id: "w-activity", type: "activity-summary", span: 12 },
  ],
  RECORD_SITE: [
    { id: "w-company", type: "record-company", span: 4 },
    { id: "w-next", type: "next-interaction", span: 4 },
    { id: "w-visits", type: "upcoming-visits", span: 4 },
    { id: "w-activity", type: "activity-summary", span: 12 },
  ],
};
