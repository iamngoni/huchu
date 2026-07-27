"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientDate } from "@/components/ui/client-date";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { Calendar, FileText, Plus } from "@/lib/icons";
import { fetchCrmFieldDefinitions, type CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";
import { isDealStale } from "@/lib/crm/pipelines";
import { visitItemsToQuotationLines } from "@/lib/crm/site-visits";
import type { CrmDocumentLineInput } from "@/lib/crm/accounting-bridge";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import { DocumentList } from "@/components/crm/documents/document-list";
import { formatMoney, invoiceOutstanding } from "@/components/crm/documents/document-types";
import type { LeadDocument } from "@/components/crm/documents/document-types";
import { CommentThread } from "@/components/crm/collaboration/comment-thread";
import { RecordTasksTab } from "@/components/crm/tasks/record-tasks-tab";
import { ActivityComposer } from "@/components/crm/lead-detail/activity-composer";
import { ActivityTimeline } from "@/components/crm/lead-detail/activity-timeline";
import { VisitsTab } from "@/components/crm/lead-detail/visits-tab";
import type { LeadActivity, LeadAppointment, LeadFollowUp } from "@/components/crm/lead-detail/lead-types";
import type { LeadFilterOwner } from "@/components/crm/leads/leads-filters";
import { isOverdue } from "@/components/crm/leads/stage-config";
import { VisitReportSheet, type MeasurementDraft } from "@/components/crm/visits/visit-report-sheet";
import { VisitScheduleSheet } from "@/components/crm/visits/visit-schedule-sheet";
import { RaiseJobSheet } from "@/components/crm/work-orders/raise-job-sheet";

import { CustomFieldDisplay } from "./custom-field-display";
import { DealStageBar } from "./deal-stage-bar";
import { RailSection, RecordPageShell, RelatedList } from "./record-page-shell";
import { RecordHistoryTab } from "./record-history-tab";

const STATUS_PRESENTATION: Record<string, CanonicalUiStatus> = {
  OPEN: "in_progress",
  WON: "passing",
  LOST: "failing",
};

const ROLE_LABELS: Record<string, string> = {
  PRIMARY: "Primary contact",
  DECISION_MAKER: "Decision-maker",
  FINANCE: "Finance",
  SITE: "Site contact",
  TECHNICAL: "Technical",
  INFLUENCER: "Influencer",
  REFERRER: "Referrer",
};

type DealDetail = {
  id: string;
  dealNo: string;
  title: string;
  status: "OPEN" | "WON" | "LOST";
  value: number | null;
  currency: string;
  probability: number | null;
  forecastCategory: string;
  expectedCloseDate: string | null;
  stageEnteredAt: string;
  lostReason: string | null;
  customFields: Record<string, unknown> | null;
  clientId: string | null;
  client: { id: string; name: string } | null;
  primaryContact: { id: string; fullName: string } | null;
  site: { id: string; name: string; addressLine: string | null; city: string | null } | null;
  assignedTo: { id: string; name: string | null } | null;
  stage: {
    id: string;
    name: string;
    status: "OPEN" | "WON" | "LOST";
    inactivityDays: number | null;
    checklist: Array<{ key: string; label: string }> | null;
  };
  pipeline: {
    id: string;
    name: string;
    stages: Array<{ id: string; name: string; status: "OPEN" | "WON" | "LOST"; position: number }>;
  };
  contacts: Array<{
    id: string;
    role: string;
    person: { id: string; fullName: string; jobTitle: string | null; email: string | null; phone: string | null };
  }>;
  activities: LeadActivity[];
  followUps: LeadFollowUp[];
  appointments: LeadAppointment[];
  documents: LeadDocument[];
};

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

export function DealDetailPage({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [tab, setTab] = useState("timeline");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [raiseJobOpen, setRaiseJobOpen] = useState(false);
  const [reportFor, setReportFor] = useState<LeadAppointment | null>(null);
  const [quotationPrefill, setQuotationPrefill] = useState<CrmDocumentLineInput[] | undefined>();

  const dealQuery = useQuery({
    queryKey: ["crm", "deal", dealId],
    queryFn: () => fetchJson<{ data: DealDetail }>(`/api/v2/crm/deals/${dealId}`),
  });
  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: LeadFilterOwner[] }>("/api/v2/crm/team"),
  });
  const fieldsQuery = useQuery({
    queryKey: ["crm", "field-definitions", "DEAL"],
    queryFn: () => fetchCrmFieldDefinitions("DEAL"),
  });

  const owners = useMemo(() => teamQuery.data?.data ?? [], [teamQuery.data]);
  const definitions: CrmFieldDefinitionRecord[] = fieldsQuery.data?.data.data ?? [];
  const deal = dealQuery.data?.data;

  if (dealQuery.isLoading) {
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

  if (dealQuery.error || !deal) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Deal not found</AlertTitle>
        <AlertDescription>
          {dealQuery.error ? getApiErrorMessage(dealQuery.error) : "It may have been deleted."}
        </AlertDescription>
      </Alert>
    );
  }

  const openTasks = deal.followUps.filter((task) => task.status === "PENDING");
  const nextTask = openTasks[0];
  const nextVisit = deal.appointments.find((visit) => visit.status === "SCHEDULED");
  const openInvoices = deal.documents.filter(
    (doc) => doc.type === "INVOICE" && doc.invoice && invoiceOutstanding(doc.invoice) > 0,
  );
  const totalOutstanding = openInvoices.reduce(
    (sum, doc) => sum + (doc.invoice ? invoiceOutstanding(doc.invoice) : 0),
    0,
  );
  const stale = isDealStale(
    { stageEnteredAt: deal.stageEnteredAt, status: deal.status },
    { inactivityDays: deal.stage.inactivityDays, status: deal.stage.status },
  );

  // The one obvious next action, chosen from where the deal actually is.
  const primaryAction = !nextTask ? (
    <Button size="sm" className="gap-1.5" onClick={() => setTab("tasks")}>
      <Plus className="h-3.5 w-3.5" />
      Add a task
    </Button>
  ) : deal.appointments.length === 0 ? (
    <Button size="sm" className="gap-1.5" onClick={() => setScheduleOpen(true)}>
      <Calendar className="h-3.5 w-3.5" />
      Schedule a visit
    </Button>
  ) : deal.documents.length === 0 ? (
    <Button
      size="sm"
      className="gap-1.5"
      disabled={!deal.clientId}
      title={deal.clientId ? undefined : "Attach a company before quoting"}
      onClick={() => setTab("documents")}
    >
      <FileText className="h-3.5 w-3.5" />
      Create a quotation
    </Button>
  ) : totalOutstanding > 0 ? (
    <Button size="sm" className="gap-1.5" onClick={() => setTab("documents")}>
      <FileText className="h-3.5 w-3.5" />
      Record a payment
    </Button>
  ) : null;

  return (
    <>
      <RecordPageShell
        backHref="/crm/deals"
        backLabel="All deals"
        title={deal.title}
        reference={deal.dealNo}
        status={{
          label: deal.stage.name,
          status: STATUS_PRESENTATION[deal.status] ?? "pending",
        }}
        subtitle={
          <>
            {deal.client?.name ?? "No company"}
            {" · "}
            {deal.assignedTo?.name ?? "Unassigned"}
            {stale ? " · going cold" : ""}
          </>
        }
        primaryAction={primaryAction}
        actions={[
          { label: "Schedule a site visit", onSelect: () => setScheduleOpen(true) },
          { label: "Raise a job", onSelect: () => setRaiseJobOpen(true) },
          { label: "Open documents", onSelect: () => setTab("documents") },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        tabs={[
          {
            value: "timeline",
            label: "Timeline",
            content: (
              <div className="space-y-4">
                <ActivityComposer target={{ kind: "deal", id: dealId }} />
                <ActivityTimeline activities={deal.activities} />
              </div>
            ),
          },
          {
            value: "documents",
            label: "Documents",
            count: deal.documents.length,
            content: (
              <DocumentList
                basePath={`/api/v2/crm/deals/${dealId}`}
                currency={deal.currency}
                documents={deal.documents}
                canCreate={Boolean(deal.clientId)}
                prefillLines={quotationPrefill}
                onPrefillConsumed={() => setQuotationPrefill(undefined)}
              />
            ),
          },
          {
            value: "visits",
            label: "Visits",
            count: deal.appointments.length,
            content: (
              <VisitsTab
                appointments={deal.appointments}
                onSchedule={() => setScheduleOpen(true)}
                onOpenReport={setReportFor}
              />
            ),
          },
          {
            value: "tasks",
            label: "Tasks",
            content: <RecordTasksTab record={{ dealId }} currentUserId={currentUserId} />,
          },
          {
            value: "people",
            label: "People",
            count: deal.contacts.length,
            content: (
              <RelatedList
                items={deal.contacts}
                emptyMessage="Nobody is attached to this deal yet."
                renderItem={(contact) => ({
                  href: `/crm/people/${contact.person.id}`,
                  title: contact.person.fullName,
                  subtitle:
                    [ROLE_LABELS[contact.role] ?? contact.role, contact.person.jobTitle]
                      .filter(Boolean)
                      .join(" · ") || null,
                  meta: contact.person.phone ?? undefined,
                })}
              />
            ),
          },
          {
            value: "comments",
            label: "Comments",
            content: (
              <CommentThread entity="DEAL" recordId={dealId} currentUserId={currentUserId} />
            ),
          },
          {
            value: "history",
            label: "History",
            content: <RecordHistoryTab activities={deal.activities} />,
          },
        ]}
        rail={
          <>
            <RailSection title="Deal">
              <p className="font-mono text-2xl">
                {deal.value !== null ? formatMoney(deal.value, deal.currency) : "Not sized"}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {deal.probability ?? 0}% likely · {deal.forecastCategory.toLowerCase().replace("_", " ")}
              </p>
              {deal.expectedCloseDate ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Expected <ClientDate value={deal.expectedCloseDate} mode="date" />
                </p>
              ) : null}
              {deal.lostReason ? (
                <p className="mt-1 text-sm text-[var(--status-error-text)]">
                  Lost: {deal.lostReason}
                </p>
              ) : null}
            </RailSection>

            <RailSection title="Stage">
              <DealStageBar
                dealId={dealId}
                stages={deal.pipeline.stages}
                currentStageId={deal.stage.id}
                checklist={deal.stage.checklist}
                pipelineName={deal.pipeline.name}
              />
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
                  Nothing scheduled — this deal will go quiet.
                </p>
              </RailSection>
            )}

            {nextVisit ? (
              <RailSection title="Next visit">
                <p className="text-sm">{nextVisit.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  <ClientDate value={nextVisit.scheduledStart} />
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

            {deal.site ? (
              <RailSection title="Site">
                <p className="text-sm">{deal.site.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {[deal.site.addressLine, deal.site.city].filter(Boolean).join(", ")}
                </p>
              </RailSection>
            ) : null}

            {totalOutstanding > 0 ? (
              <RailSection title="Billing">
                <p className="text-sm text-[var(--status-warning-text)]">
                  {formatMoney(totalOutstanding, deal.currency)} outstanding across{" "}
                  {openInvoices.length} invoice{openInvoices.length === 1 ? "" : "s"}
                </p>
              </RailSection>
            ) : null}

            {deal.contacts.length > 0 ? (
              <RailSection title="Contacts">
                <ul className="space-y-1.5">
                  {deal.contacts.map((contact) => (
                    <li key={contact.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{contact.person.fullName}</span>
                      <Badge variant="outline" className="shrink-0 text-[11px]">
                        {ROLE_LABELS[contact.role] ?? contact.role}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </RailSection>
            ) : null}

            <CustomFieldDisplay definitions={definitions} values={deal.customFields} />
          </>
        }
      />

      <VisitScheduleSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        leadId={dealId}
        clientId={deal.clientId}
        defaultLocation={
          [deal.site?.addressLine, deal.site?.city].filter(Boolean).join(", ") || null
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
          if (lines.length === 0 || !deal.clientId) return;
          setQuotationPrefill(lines);
          setTab("documents");
          toast({
            title: "Ready to quote",
            description: `${lines.length} measured item${lines.length === 1 ? "" : "s"} carried into a new quotation.`,
          });
        }}
      />

      <RaiseJobSheet
        open={raiseJobOpen}
        onOpenChange={setRaiseJobOpen}
        dealId={dealId}
        clientId={deal.clientId}
        siteId={deal.site?.id ?? null}
        defaultTitle={deal.title}
        quotationDocuments={deal.documents
          .filter((doc) => doc.type === "QUOTATION" && doc.quotation)
          .map((doc) => ({
            id: doc.id,
            label: `${doc.quotation!.quotationNumber}${doc.version > 1 ? ` (v${doc.version})` : ""}`,
          }))}
        currentUserId={currentUserId}
      />
    </>
  );
}
