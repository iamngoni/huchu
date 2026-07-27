/**
 * CRM client SDK — typed fetchers over the /api/v2/crm endpoints.
 * Mirrors the lib/autos/autos-v2.ts pattern.
 */
import { fetchJson } from "@/lib/api-client";
import type { CrmLeadStage } from "@prisma/client";
import type { LeadSort, LeadViewFilters } from "@/lib/crm/views";
import type { SiteVisitItemInput, SiteVisitReportInput } from "@/lib/crm/site-visits";

export type CrmClientRecord = {
  id: string;
  clientNo: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  assignedToId: string | null;
  customerId: string | null;
  createdAt: string;
};

export type CrmLeadRecord = {
  id: string;
  leadNo: string;
  title: string | null;
  clientId: string | null;
  stage: CrmLeadStage;
  probability: number | null;
  estimatedValue: number | null;
  currency: string;
  services: string[];
  source: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmFollowUpRecord = {
  id: string;
  title: string;
  dueAt: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  leadId: string | null;
  clientId: string | null;
  assignedToId: string;
};

export type CrmAppointmentRecord = {
  id: string;
  appointmentNo: string;
  title: string;
  leadId: string | null;
  clientId: string | null;
  assignedToId: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  location: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
};

export type CrmLeadOwner = { id: string; name: string | null };

export type CrmNextFollowUp = { id: string; title: string; dueAt: string };

/** A lead as the table renders it: owner, client, and what's owed next. */
export type CrmLeadListRecord = CrmLeadRecord & {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sourceChannel: string | null;
  client: { id: string; name: string } | null;
  assignedTo: CrmLeadOwner | null;
  nextFollowUp: CrmNextFollowUp | null;
};

export type CrmBoardCard = {
  id: string;
  leadNo: string;
  title: string | null;
  stage: CrmLeadStage;
  estimatedValue: number | null;
  currency: string;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
  stageEnteredAt: string;
  client: { id: string; name: string } | null;
  assignedTo: CrmLeadOwner | null;
  nextFollowUp: CrmNextFollowUp | null;
};

export type CrmBoardColumn = {
  stage: CrmLeadStage;
  count: number;
  totalValue: number;
  hasMore: boolean;
  leads: CrmBoardCard[];
};

export type CrmSavedViewRecord = {
  id: string;
  name: string;
  entity: string;
  viewType: "TABLE" | "BOARD";
  filters: LeadViewFilters;
  sort: LeadSort | null;
  isShared: boolean;
  createdById: string;
  createdBy: CrmLeadOwner | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmVisitItemRecord = SiteVisitItemInput & {
  id: string;
  appointmentId: string;
  position: number;
};

export type CrmVisitChecklistItem = {
  key: string;
  label: string;
  checked: boolean;
  notes?: string | null;
};

export type CrmVisitPhoto = {
  url: string;
  fileName?: string | null;
  contentType?: string | null;
  size?: number | null;
  kind: "PHOTO" | "FILE";
  caption?: string | null;
};

export type CrmVisitReportRecord = CrmAppointmentRecord & {
  checklist: CrmVisitChecklistItem[] | null;
  photos: CrmVisitPhoto[] | null;
  siteConditions: string | null;
  reportNotes: string | null;
  outcomeNotes: string | null;
  reportCompletedAt: string | null;
  completedAt: string | null;
  visitItems: CrmVisitItemRecord[];
};

type ListResponse<T> = { data: T[]; total?: number; page?: number; limit?: number };
type Envelope<T> = { data: T };

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Flatten a filter set into query params. Arrays are comma-joined and booleans
 * only sent when true, so a default view produces a clean URL.
 */
export function leadFiltersToParams(
  filters: LeadViewFilters,
): Record<string, string | number | boolean | undefined> {
  return {
    q: filters.q,
    stages: filters.stages?.join(","),
    assignedToIds: filters.assignedToIds?.join(","),
    unassigned: filters.unassigned ? "1" : undefined,
    mineOnly: filters.mineOnly ? "1" : undefined,
    channels: filters.channels?.join(","),
    sources: filters.sources?.join(","),
    valueMin: filters.valueMin,
    valueMax: filters.valueMax,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    overdueOnly: filters.overdueOnly ? "1" : undefined,
  };
}

export function fetchCrmLeads(
  params: {
    filters?: LeadViewFilters;
    sort?: LeadSort;
    page?: number;
    limit?: number;
  } = {},
) {
  const query = qs({
    ...leadFiltersToParams(params.filters ?? {}),
    sortField: params.sort?.field,
    sortDir: params.sort?.direction,
    page: params.page,
    limit: params.limit,
  });
  return fetchJson<ListResponse<CrmLeadListRecord>>(`/api/v2/crm/leads${query}`);
}

export function fetchCrmLeadsBoard(filters: LeadViewFilters = {}) {
  const query = qs(leadFiltersToParams(filters));
  return fetchJson<Envelope<{ columns: CrmBoardColumn[]; cardsPerColumn: number }>>(
    `/api/v2/crm/leads/board${query}`,
  );
}

export type CrmBulkLeadAction =
  | { action: "assign"; ids: string[]; assignedToId: string | null }
  | { action: "stage"; ids: string[]; stage: CrmLeadStage; lostReason?: string };

export function bulkUpdateCrmLeads(body: CrmBulkLeadAction) {
  return fetchJson<
    Envelope<{ updated: number; unchanged?: number; skipped: number; notFound: number }>
  >(`/api/v2/crm/leads/bulk`, { method: "POST", body: JSON.stringify(body) });
}

export function fetchCrmSavedViews() {
  return fetchJson<Envelope<{ data: CrmSavedViewRecord[] }>>(`/api/v2/crm/saved-views`);
}

export function createCrmSavedView(body: {
  name: string;
  viewType?: "TABLE" | "BOARD";
  filters: LeadViewFilters;
  sort?: LeadSort | null;
  isShared?: boolean;
}) {
  return fetchJson<Envelope<CrmSavedViewRecord>>(`/api/v2/crm/saved-views`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCrmSavedView(
  id: string,
  body: Partial<{
    name: string;
    viewType: "TABLE" | "BOARD";
    filters: LeadViewFilters;
    sort: LeadSort | null;
    isShared: boolean;
  }>,
) {
  return fetchJson<Envelope<CrmSavedViewRecord>>(`/api/v2/crm/saved-views/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteCrmSavedView(id: string) {
  return fetchJson<Envelope<{ id: string }>>(`/api/v2/crm/saved-views/${id}`, {
    method: "DELETE",
  });
}

export function fetchCrmVisitReport(appointmentId: string) {
  return fetchJson<Envelope<CrmVisitReportRecord>>(
    `/api/v2/crm/appointments/${appointmentId}/report`,
  );
}

export function saveCrmVisitReport(appointmentId: string, body: SiteVisitReportInput) {
  return fetchJson<Envelope<CrmVisitReportRecord>>(
    `/api/v2/crm/appointments/${appointmentId}/report`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function updateCrmFollowUp(
  id: string,
  body: Partial<{
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    title: string;
    notes: string | null;
    dueAt: string;
    assignedToId: string;
  }>,
) {
  return fetchJson<Envelope<CrmFollowUpRecord>>(`/api/v2/crm/follow-ups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchCrmLead(id: string) {
  return fetchJson<Envelope<CrmLeadRecord & Record<string, unknown>>>(`/api/v2/crm/leads/${id}`);
}

export function createCrmLead(body: Partial<CrmLeadRecord> & { title?: string }) {
  return fetchJson<Envelope<CrmLeadRecord>>(`/api/v2/crm/leads`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCrmLeadStage(id: string, stage: CrmLeadStage, lostReason?: string) {
  return fetchJson<Envelope<CrmLeadRecord>>(`/api/v2/crm/leads/${id}/stage`, {
    method: "POST",
    body: JSON.stringify({ stage, lostReason }),
  });
}

export function fetchCrmClients(params: { q?: string; page?: number } = {}) {
  return fetchJson<ListResponse<CrmClientRecord>>(`/api/v2/crm/clients${qs(params)}`);
}

export function createCrmClient(body: Partial<CrmClientRecord> & { name: string }) {
  return fetchJson<Envelope<CrmClientRecord>>(`/api/v2/crm/clients`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchCrmFollowUps(params: { status?: string; overdue?: boolean; assignedToId?: string } = {}) {
  return fetchJson<ListResponse<CrmFollowUpRecord>>(`/api/v2/crm/follow-ups${qs(params)}`);
}

export function fetchCrmAppointments(params: { from?: string; to?: string; assignedToId?: string } = {}) {
  return fetchJson<ListResponse<CrmAppointmentRecord>>(`/api/v2/crm/appointments${qs(params)}`);
}

export function fetchCrmInsightsSummary(params: { from?: string; to?: string } = {}) {
  return fetchJson<Envelope<Record<string, unknown>>>(`/api/v2/crm/insights/summary${qs(params)}`);
}
