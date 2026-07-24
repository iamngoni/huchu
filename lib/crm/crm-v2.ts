/**
 * CRM client SDK — typed fetchers over the /api/v2/crm endpoints.
 * Mirrors the lib/autos/autos-v2.ts pattern.
 */
import { fetchJson } from "@/lib/api-client";
import type { CrmLeadStage } from "@prisma/client";

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

export function fetchCrmLeads(params: { stage?: string; assignedToId?: string; q?: string; page?: number } = {}) {
  return fetchJson<ListResponse<CrmLeadRecord>>(`/api/v2/crm/leads${qs(params)}`);
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
