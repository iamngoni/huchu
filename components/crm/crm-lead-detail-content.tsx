"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { CRM_LEAD_STAGES, CRM_STAGE_LABELS } from "@/lib/crm/pipeline";
import type { CrmLeadStage } from "@prisma/client";

type Document = {
  id: string;
  type: "QUOTATION" | "INVOICE" | "RECEIPT";
  quotationId: string | null;
  invoiceId: string | null;
  receiptId: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  approval: { token: string; status: string; respondedAt: string | null } | null;
};

function documentPdfHref(doc: Document): string | null {
  if (doc.type === "QUOTATION" && doc.quotationId) {
    return `/api/accounting/sales/quotations/${doc.quotationId}/pdf`;
  }
  if (doc.type === "INVOICE" && doc.invoiceId) {
    return `/api/accounting/sales/invoices/${doc.invoiceId}/pdf`;
  }
  if (doc.type === "RECEIPT" && doc.receiptId) {
    return `/api/accounting/sales/receipts/${doc.receiptId}/pdf`;
  }
  return null;
}

type Activity = { id: string; type: string; subject: string; body: string | null; occurredAt: string };
type FollowUp = { id: string; title: string; dueAt: string; status: string };
type IntakeSubmission = {
  id: string;
  photoUrls: string[];
  message: string | null;
  selectedServices: string[];
  createdAt: string;
};

type LeadDetail = {
  id: string;
  leadNo: string;
  title: string | null;
  stage: CrmLeadStage;
  probability: number | null;
  estimatedValue: number | null;
  currency: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  documents: Document[];
  activities: Activity[];
  followUps: FollowUp[];
  appointments: Array<{ id: string; appointmentNo: string; scheduledStart: string; status: string }>;
  intakeSubmissions: IntakeSubmission[];
};

type LineDraft = { description: string; quantity: string; unitPrice: string };

export function CrmLeadDetailContent({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] });

  const lead = useQuery({
    queryKey: ["crm-lead", leadId],
    queryFn: () => fetchJson<LeadDetail>(`/api/v2/crm/leads/${leadId}`),
  });

  const changeStage = useMutation({
    mutationFn: (stage: CrmLeadStage) =>
      fetchJson(`/api/v2/crm/leads/${leadId}/stage`, { method: "POST", body: JSON.stringify({ stage }) }),
    onSuccess: invalidate,
  });

  const data = lead.data;
  if (lead.isLoading) return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;
  if (!data) return <p className="text-sm text-red-600">Lead not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/crm/leads" className="text-sm text-[var(--text-muted)] underline">
            ← All leads
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{data.title ?? data.leadNo}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {data.leadNo} · {data.client?.name ?? "No client"} · {data.assignedTo?.name ?? "Unassigned"}
          </p>
        </div>
        <div className="sm:text-right">
          {data.estimatedValue ? (
            <p className="text-lg font-semibold">
              {data.currency} {data.estimatedValue.toLocaleString()}
            </p>
          ) : null}
          <p className="text-sm text-[var(--text-muted)]">{data.probability ?? 0}% likely</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CRM_LEAD_STAGES.map((stage) => (
          <Badge
            key={stage}
            variant={stage === data.stage ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => changeStage.mutate(stage)}
          >
            {CRM_STAGE_LABELS[stage]}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="timeline">
        <div className="scroll-rail max-w-full">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="visits">Site Visits</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline">
          <div className="space-y-4">
            {data.intakeSubmissions.some((s) => s.photoUrls.length > 0) ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Photos from intake</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {data.intakeSubmissions.flatMap((s) =>
                    s.photoUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Intake photo" className="h-24 w-24 rounded-lg object-cover" />
                      </a>
                    )),
                  )}
                </CardContent>
              </Card>
            ) : null}
            <TimelineTab leadId={leadId} activities={data.activities} onChange={invalidate} />
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab lead={data} onChange={invalidate} />
        </TabsContent>

        <TabsContent value="followups">
          <FollowUpsTab leadId={leadId} followUps={data.followUps} onChange={invalidate} />
        </TabsContent>

        <TabsContent value="visits">
          <VisitsTab leadId={leadId} clientId={data.clientId} appointments={data.appointments} onChange={invalidate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimelineTab({
  leadId,
  activities,
  onChange,
}: {
  leadId: string;
  activities: Activity[];
  onChange: () => void;
}) {
  const [subject, setSubject] = useState("");
  const add = useMutation({
    mutationFn: () =>
      fetchJson(`/api/v2/crm/leads/${leadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type: "NOTE", subject }),
      }),
    onSuccess: () => {
      setSubject("");
      onChange();
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-2">
          <Input placeholder="Add a note…" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Button onClick={() => add.mutate()} disabled={!subject || add.isPending}>
            Add
          </Button>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {activities.map((a) => (
            <li key={a.id} className="py-2">
              <p className="text-sm font-medium">{a.subject}</p>
              {a.body ? <p className="text-sm text-[var(--text-muted)]">{a.body}</p> : null}
              <p className="text-xs text-[var(--text-muted)]">
                {a.type} · {new Date(a.occurredAt).toLocaleString()}
              </p>
            </li>
          ))}
          {activities.length === 0 ? <li className="py-2 text-sm text-[var(--text-muted)]">No activity yet.</li> : null}
        </ul>
      </CardContent>
    </Card>
  );
}

function LineEditor({ lines, setLines }: { lines: LineDraft[]; setLines: (l: LineDraft[]) => void }) {
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-4 gap-2 sm:grid-cols-12">
          <Input
            className="col-span-4 sm:col-span-6"
            placeholder="Description"
            value={line.description}
            onChange={(e) => {
              const next = [...lines];
              next[index] = { ...line, description: e.target.value };
              setLines(next);
            }}
          />
          <Input
            className="col-span-2 sm:col-span-3"
            type="number"
            placeholder="Qty"
            value={line.quantity}
            onChange={(e) => {
              const next = [...lines];
              next[index] = { ...line, quantity: e.target.value };
              setLines(next);
            }}
          />
          <Input
            className="col-span-2 sm:col-span-3"
            type="number"
            placeholder="Unit price"
            value={line.unitPrice}
            onChange={(e) => {
              const next = [...lines];
              next[index] = { ...line, unitPrice: e.target.value };
              setLines(next);
            }}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setLines([...lines, { description: "", quantity: "1", unitPrice: "" }])}>
        Add line
      </Button>
    </div>
  );
}

function DocumentsTab({ lead, onChange }: { lead: LeadDetail; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [lines, setLines] = useState<LineDraft[]>([{ description: "", quantity: "1", unitPrice: "" }]);

  function toLines() {
    return lines
      .filter((l) => l.description && l.unitPrice)
      .map((l) => ({ description: l.description, quantity: Number(l.quantity || 1), unitPrice: Number(l.unitPrice) }));
  }

  const createQuote = useMutation({
    mutationFn: () =>
      fetchJson(`/api/v2/crm/leads/${lead.id}/quotation`, {
        method: "POST",
        body: JSON.stringify({ lines: toLines(), sendApproval: true }),
      }),
    onSuccess: () => {
      setQuoteOpen(false);
      setLines([{ description: "", quantity: "1", unitPrice: "" }]);
      setError(null);
      onChange();
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const createInvoice = useMutation({
    mutationFn: () =>
      fetchJson(`/api/v2/crm/leads/${lead.id}/invoice`, {
        method: "POST",
        body: JSON.stringify({ lines: toLines(), sendApproval: true }),
      }),
    onSuccess: () => {
      setInvoiceOpen(false);
      setLines([{ description: "", quantity: "1", unitPrice: "" }]);
      setError(null);
      onChange();
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const disabled = !lead.clientId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {disabled ? (
          <p className="text-sm text-[var(--text-muted)]">Attach a client to this lead before quoting or invoicing.</p>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setQuoteOpen(true)}>
              New quotation
            </Button>
            <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New quotation</DialogTitle>
                </DialogHeader>
                <LineEditor lines={lines} setLines={setLines} />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <DialogFooter>
                  <Button onClick={() => createQuote.mutate()} disabled={createQuote.isPending}>
                    Create & share
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="sm" variant="outline" onClick={() => setInvoiceOpen(true)}>
              New invoice
            </Button>
            <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New invoice</DialogTitle>
                </DialogHeader>
                <LineEditor lines={lines} setLines={setLines} />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <DialogFooter>
                  <Button onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending}>
                    Issue invoice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <ul className="divide-y divide-[var(--border)]">
          {lead.documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <Badge variant="outline">{doc.type}</Badge>{" "}
                <span className="text-[var(--text-muted)]">
                  {doc.currency} {doc.amount.toLocaleString()}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {doc.approval ? (
                  <>
                    <Badge variant={doc.approval.status === "APPROVED" ? "default" : "outline"}>
                      {doc.approval.status}
                    </Badge>
                    <button
                      className="text-[var(--text-muted)] underline"
                      onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/a/${doc.approval?.token}`)}
                    >
                      Copy link
                    </button>
                  </>
                ) : null}
                {documentPdfHref(doc) ? (
                  <a
                    href={`${documentPdfHref(doc)}?download=1`}
                    className="text-[var(--text-muted)] underline"
                  >
                    PDF
                  </a>
                ) : null}
              </span>
            </li>
          ))}
          {lead.documents.length === 0 ? (
            <li className="py-2 text-sm text-[var(--text-muted)]">No documents yet.</li>
          ) : null}
        </ul>
        <Link href="/accounting/sales?view=invoices" className="text-sm text-[var(--text-muted)] underline">
          View in Accounting →
        </Link>
      </CardContent>
    </Card>
  );
}

function FollowUpsTab({
  leadId,
  followUps,
  onChange,
}: {
  leadId: string;
  followUps: FollowUp[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const add = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/crm/follow-ups", {
        method: "POST",
        body: JSON.stringify({ title, dueAt: new Date(dueAt).toISOString(), leadId }),
      }),
    onSuccess: () => {
      setTitle("");
      setDueAt("");
      onChange();
    },
  });
  const complete = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/v2/crm/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify({ status: "COMPLETED" }) }),
    onSuccess: onChange,
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input placeholder="Follow-up…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <Button onClick={() => add.mutate()} disabled={!title || !dueAt || add.isPending}>
            Add
          </Button>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {followUps.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className={f.status === "COMPLETED" ? "line-through text-[var(--text-muted)]" : ""}>
                {f.title} · {new Date(f.dueAt).toLocaleString()}
              </span>
              {f.status === "PENDING" ? (
                <Button size="sm" variant="outline" onClick={() => complete.mutate(f.id)}>
                  Done
                </Button>
              ) : (
                <Badge variant="outline">{f.status}</Badge>
              )}
            </li>
          ))}
          {followUps.length === 0 ? <li className="py-2 text-sm text-[var(--text-muted)]">No follow-ups.</li> : null}
        </ul>
      </CardContent>
    </Card>
  );
}

function VisitsTab({
  leadId,
  clientId,
  appointments,
  onChange,
}: {
  leadId: string;
  clientId: string | null;
  appointments: LeadDetail["appointments"];
  onChange: () => void;
}) {
  const [start, setStart] = useState("");
  const [location, setLocation] = useState("");
  const book = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/crm/appointments", {
        method: "POST",
        body: JSON.stringify({
          leadId,
          clientId: clientId ?? undefined,
          scheduledStart: new Date(start).toISOString(),
          location: location || undefined,
        }),
      }),
    onSuccess: () => {
      setStart("");
      setLocation("");
      onChange();
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Button onClick={() => book.mutate()} disabled={!start || book.isPending}>
            Book site visit
          </Button>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {appointments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                {a.appointmentNo} · {new Date(a.scheduledStart).toLocaleString()}
              </span>
              <Badge variant="outline">{a.status}</Badge>
            </li>
          ))}
          {appointments.length === 0 ? <li className="py-2 text-sm text-[var(--text-muted)]">No site visits.</li> : null}
        </ul>
      </CardContent>
    </Card>
  );
}
