"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { CrmLeadStage } from "@prisma/client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientDate } from "@/components/ui/client-date";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { ArrowRight, Calendar, FileText, Pencil } from "@/lib/icons";
import { updateCrmLeadStage } from "@/lib/crm/crm-v2";
import { visitItemsToQuotationLines } from "@/lib/crm/site-visits";
import type { CrmDocumentLineInput } from "@/lib/crm/accounting-bridge";

import { DocumentList } from "@/components/crm/documents/document-list";
import { formatMoney, invoiceOutstanding } from "@/components/crm/documents/document-types";
import { LeadFormSheet } from "@/components/crm/leads/lead-form-sheet";
import type { LeadFilterOwner } from "@/components/crm/leads/leads-filters";
import { LostReasonDialog } from "@/components/crm/leads/lost-reason-dialog";
import {
  CRM_STAGE_LABELS,
  CRM_STAGE_STATUS,
  formatLeadValue,
  isOverdue,
} from "@/components/crm/leads/stage-config";
import { ConvertLeadSheet } from "@/components/crm/leads/convert-lead-sheet";
import { VisitReportSheet, type MeasurementDraft } from "@/components/crm/visits/visit-report-sheet";
import { VisitScheduleSheet } from "@/components/crm/visits/visit-schedule-sheet";

import { ActivityComposer } from "./activity-composer";
import { ActivityTimeline } from "./activity-timeline";
import { AttributesPanel } from "./attributes-panel";
import { StageProgress } from "./stage-progress";
import { TasksTab } from "./tasks-tab";
import { VisitsTab } from "./visits-tab";
import type { LeadAppointment, LeadDetail } from "./lead-types";

/** Measurements captured on site, shaped into quotation lines for the builder. */
function draftsToLines(drafts: MeasurementDraft[]): CrmDocumentLineInput[] {
  return visitItemsToQuotationLines(
    drafts.map((draft) => ({
      category: draft.category || null,
      description: draft.description,
      quantity: Number(draft.quantity) || 1,
      widthMm: draft.widthMm ? Number(draft.widthMm) : null,
      heightMm: draft.heightMm ? Number(draft.heightMm) : null,
      depthMm: draft.depthMm ? Number(draft.depthMm) : null,
      specNotes: draft.specNotes || null,
      unitPrice: draft.unitPrice ? Number(draft.unitPrice) : null,
    })),
  );
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--card-radius)] border border-[var(--border)] p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function LeadDetailPage({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [reportFor, setReportFor] = useState<LeadAppointment | null>(null);
  const [pendingLost, setPendingLost] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [quotationPrefill, setQuotationPrefill] = useState<CrmDocumentLineInput[] | undefined>();
  const [tab, setTab] = useState("timeline");

  const leadQuery = useQuery({
    queryKey: ["crm-lead", leadId],
    queryFn: () => fetchJson<{ data: LeadDetail }>(`/api/v2/crm/leads/${leadId}`),
  });

  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: LeadFilterOwner[] }>("/api/v2/crm/team"),
  });

  const owners = useMemo(() => teamQuery.data?.data ?? [], [teamQuery.data]);
  const lead = leadQuery.data?.data;

  const changeStage = useMutation({
    mutationFn: ({ stage, lostReason }: { stage: CrmLeadStage; lostReason?: string }) =>
      updateCrmLeadStage(leadId, stage, lostReason),
    onSuccess: (_result, { stage }) => {
      queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "board"] });
      toast({ title: `Moved to ${CRM_STAGE_LABELS[stage]}` });
    },
    onError: (error) =>
      toast({
        title: "Could not change the stage",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  if (leadQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (leadQuery.error || !lead) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Lead not found</AlertTitle>
        <AlertDescription>
          {leadQuery.error ? getApiErrorMessage(leadQuery.error) : "It may have been deleted."}
        </AlertDescription>
      </Alert>
    );
  }

  const nextTask = lead.followUps.find((task) => task.status === "PENDING");
  const nextVisit = lead.appointments.find((visit) => visit.status === "SCHEDULED");
  const openInvoices = lead.documents.filter(
    (doc) => doc.type === "INVOICE" && doc.invoice && invoiceOutstanding(doc.invoice) > 0,
  );
  const totalOutstanding = openInvoices.reduce(
    (sum, doc) => sum + (doc.invoice ? invoiceOutstanding(doc.invoice) : 0),
    0,
  );
  const latestQuote = lead.documents.find((doc) => doc.type === "QUOTATION");

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <Link href="/crm/leads" className="text-sm text-[var(--text-muted)] hover:underline">
          ← All leads
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{lead.title ?? lead.leadNo}</h1>
              <StatusChip
                status={CRM_STAGE_STATUS[lead.stage]}
                label={CRM_STAGE_LABELS[lead.stage]}
              />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              <span className="font-mono">{lead.leadNo}</span>
              {" · "}
              {lead.client?.name ?? "No client"}
              {" · "}
              {lead.assignedTo?.name ?? "Unassigned"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setScheduleOpen(true)}
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule visit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!lead.clientId}
              title={lead.clientId ? undefined : "Attach a client before quoting"}
              onClick={() => setTab("documents")}
            >
              <FileText className="h-3.5 w-3.5" />
              Documents
            </Button>
            {/* Converting is the one thing a qualified lead exists to do, so it
                is the primary action until it has been done. */}
            <Button size="sm" className="gap-1.5" onClick={() => setConvertOpen(true)}>
              <ArrowRight className="h-3.5 w-3.5" />
              Convert to deal
            </Button>
          </div>
        </div>

        <StageProgress
          stage={lead.stage}
          disabled={changeStage.isPending}
          onChange={(stage) => {
            if (stage === lead.stage) return;
            if (stage === "LOST") {
              setPendingLost(true);
              return;
            }
            changeStage.mutate({ stage });
          }}
        />
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ActivityComposer leadId={leadId} />

          <Tabs value={tab} onValueChange={setTab}>
            <div className="scroll-rail max-w-full">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="documents">
                  Documents{lead.documents.length > 0 ? ` (${lead.documents.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="visits">
                  Visits{lead.appointments.length > 0 ? ` (${lead.appointments.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  Tasks
                  {lead.followUps.filter((task) => task.status === "PENDING").length > 0
                    ? ` (${lead.followUps.filter((task) => task.status === "PENDING").length})`
                    : ""}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="timeline" className="pt-4">
              <ActivityTimeline activities={lead.activities} />
            </TabsContent>

            <TabsContent value="documents" className="pt-4">
              <DocumentList
                leadId={leadId}
                currency={lead.currency}
                documents={lead.documents}
                canCreate={Boolean(lead.clientId)}
                prefillLines={quotationPrefill}
                onPrefillConsumed={() => setQuotationPrefill(undefined)}
              />
            </TabsContent>

            <TabsContent value="visits" className="pt-4">
              <VisitsTab
                appointments={lead.appointments}
                onSchedule={() => setScheduleOpen(true)}
                onOpenReport={setReportFor}
              />
            </TabsContent>

            <TabsContent value="tasks" className="pt-4">
              <TasksTab
                leadId={leadId}
                followUps={lead.followUps}
                owners={owners}
                currentUserId={currentUserId}
              />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-3">
          <RailSection title="Deal">
            <p className="font-mono text-2xl">
              {formatLeadValue(lead.estimatedValue, lead.currency)}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {lead.probability ?? 0}% likely · {CRM_STAGE_LABELS[lead.stage]}
            </p>
          </RailSection>

          {nextTask ? (
            <RailSection title="Next task">
              <p className="text-sm">{nextTask.title}</p>
              <p
                className={
                  isOverdue(nextTask.dueAt)
                    ? "text-xs font-medium text-[var(--status-error-text)]"
                    : "text-xs text-[var(--text-muted)]"
                }
              >
                {isOverdue(nextTask.dueAt) ? "Overdue · " : "Due "}
                <ClientDate value={nextTask.dueAt} />
              </p>
            </RailSection>
          ) : (
            <RailSection title="Next task">
              <p className="text-sm text-[var(--text-muted)]">
                Nothing scheduled — this lead will go quiet.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 gap-1.5"
                onClick={() => setTab("tasks")}
              >
                Add a task
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </RailSection>
          )}

          {nextVisit ? (
            <RailSection title="Next visit">
              <p className="text-sm">{nextVisit.title}</p>
              <p className="text-xs text-[var(--text-muted)]">
                <ClientDate value={nextVisit.scheduledStart} />
                {nextVisit.location ? ` · ${nextVisit.location}` : ""}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setReportFor(nextVisit)}
              >
                Write it up
              </Button>
            </RailSection>
          ) : null}

          {lead.documents.length > 0 ? (
            <RailSection title="Billing">
              {latestQuote ? (
                <p className="text-sm">
                  Latest quote{" "}
                  <span className="font-mono">{formatMoney(latestQuote.amount, latestQuote.currency)}</span>
                </p>
              ) : null}
              {totalOutstanding > 0 ? (
                <p className="text-sm text-[var(--status-warning-text)]">
                  {formatMoney(totalOutstanding, lead.currency)} outstanding across{" "}
                  {openInvoices.length} invoice{openInvoices.length === 1 ? "" : "s"}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Nothing outstanding.</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setTab("documents")}
              >
                Open documents
              </Button>
            </RailSection>
          ) : null}

          <RailSection title="Details">
            <AttributesPanel lead={lead} owners={owners} />
          </RailSection>
        </aside>
      </div>

      <LeadFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        owners={owners}
        initial={{
          id: lead.id,
          title: lead.title ?? "",
          clientId: lead.clientId ?? "",
          contactName: lead.contactName ?? "",
          contactEmail: lead.contactEmail ?? "",
          contactPhone: lead.contactPhone ?? "",
          stage: lead.stage,
          estimatedValue: lead.estimatedValue !== null ? String(lead.estimatedValue) : "",
          currency: lead.currency,
          probability: lead.probability !== null ? String(lead.probability) : "",
          services: lead.services,
          source: lead.source ?? "",
          sourceChannel: lead.sourceChannel ?? "MANUAL",
          assignedToId: lead.assignedTo?.id ?? "",
        }}
      />

      <VisitScheduleSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        leadId={leadId}
        clientId={lead.clientId}
        defaultLocation={
          [lead.client?.addressLine, lead.client?.city].filter(Boolean).join(", ") || null
        }
        owners={owners}
        currentUserId={currentUserId}
      />

      <VisitReportSheet
        open={Boolean(reportFor)}
        onOpenChange={(next) => (!next ? setReportFor(null) : undefined)}
        appointmentId={reportFor?.id ?? null}
        appointmentNo={reportFor?.appointmentNo}
        onCompleted={(items) => {
          const lines = draftsToLines(items);
          if (lines.length === 0 || !lead.clientId) return;
          // Straight from the site into a priced quotation — the whole point of
          // capturing measurements in a structured form.
          setQuotationPrefill(lines);
          setTab("documents");
          toast({
            title: "Ready to quote",
            description: `${lines.length} measured item${lines.length === 1 ? "" : "s"} carried into a new quotation.`,
          });
        }}
      />

      <ConvertLeadSheet open={convertOpen} onOpenChange={setConvertOpen} leadId={leadId} />

      <LostReasonDialog
        open={pendingLost}
        leadLabel={lead.title ?? lead.leadNo}
        isPending={changeStage.isPending}
        onCancel={() => setPendingLost(false)}
        onConfirm={(reason) =>
          changeStage.mutate(
            { stage: "LOST", lostReason: reason },
            { onSettled: () => setPendingLost(false) },
          )
        }
      />
    </div>
  );
}
