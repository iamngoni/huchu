"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { CrmLeadStage } from "@prisma/client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientDate } from "@/components/ui/client-date";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  ArrowRight,
  Building2,
  Funnel,
  Payments,
  TrendingUp,
  UserRound,
} from "@/lib/icons";
import {
  fetchCrmFieldDefinitions,
  updateCrmLeadStage,
  type CrmFieldDefinitionRecord,
} from "@/lib/crm/crm-v2";
import { visitItemsToQuotationLines } from "@/lib/crm/site-visits";
import type { CrmDocumentLineInput } from "@/lib/crm/accounting-bridge";

import { DocumentList } from "@/components/crm/documents/document-list";
import { EntityLink } from "@/components/crm/records/entity-link";
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
import { commentsTab, mentionsTab, tasksTab } from "@/components/crm/records/record-tabs";
import { RecordStory } from "@/components/crm/records/record-story";
import { customFieldAttributes } from "@/components/crm/records/custom-field-attributes";
import { RecordAttributes } from "@/components/crm/records/record-attributes";
import { RecordPageShell } from "@/components/crm/records/record-page-shell";
import { RelationAttribute } from "@/components/crm/records/relation-attribute";
import { useAttributeEditor } from "@/components/crm/records/use-attribute-editor";
import { buildStory } from "@/lib/crm/story";
import { AttributesPanel } from "./attributes-panel";
import { StageProgress } from "./stage-progress";
import { VisitsTab } from "./visits-tab";
import { LeadScoreCard } from "./lead-score-card";
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
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-muted)]">
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
    queryFn: () => fetchJson<LeadDetail>(`/api/v2/crm/leads/${leadId}`),
  });

  const fieldsQuery = useQuery({
    queryKey: ["crm", "field-definitions", "LEAD"],
    queryFn: () => fetchCrmFieldDefinitions("LEAD"),
  });
  const edit = useAttributeEditor({
    path: `/api/v2/crm/leads/${leadId}`,
    invalidate: [["crm-lead", leadId], ["crm", "leads"]],
  });

  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: LeadFilterOwner[] }>("/api/v2/crm/team"),
  });

  const owners = useMemo(() => teamQuery.data?.data ?? [], [teamQuery.data]);
  const definitions: CrmFieldDefinitionRecord[] = fieldsQuery.data?.data ?? [];
  const lead = leadQuery.data;

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
    <RecordPageShell
      icon={Funnel}
      backHref="/crm/leads"
      backLabel="All leads"
      title={lead.title ?? lead.leadNo}
      reference={lead.leadNo}
      status={{ status: CRM_STAGE_STATUS[lead.stage], label: CRM_STAGE_LABELS[lead.stage] }}
      subtitle={
        <>
          <EntityLink href={lead.clientId ? `/crm/companies/${lead.clientId}` : null} muted>
            {lead.client?.name ?? "No client"}
          </EntityLink>
          {" · "}
          <EntityLink href={lead.assignedTo ? `/crm/reps/${lead.assignedTo.id}` : null} muted>
            {lead.assignedTo?.name ?? "Unassigned"}
          </EntityLink>
        </>
      }
      primaryAction={
        // Converting is the one thing a qualified lead exists to do.
        <Button size="sm" className="gap-1.5" onClick={() => setConvertOpen(true)}>
          <ArrowRight className="h-3.5 w-3.5" />
          Convert to deal
        </Button>
      }
      actions={[
        { label: "Edit", onSelect: () => setEditOpen(true) },
        { label: "Schedule a visit", onSelect: () => setScheduleOpen(true) },
      ]}
      attributes={
        // A lead had no property list at all, which is why nothing on it
        // could be corrected without opening the edit form.
        <RecordAttributes
          attributes={[
            {
              id: "value",
              label: "Value",
              icon: Payments,
              mono: true,
              placeholder: "Not sized",
              ...edit.numeric("estimatedValue", lead.estimatedValue),
            },
            {
              id: "probability",
              label: "Likelihood",
              icon: TrendingUp,
              mono: true,
              placeholder: "0",
              ...edit.numeric("probability", lead.probability),
            },
            {
              id: "company",
              label: "Company",
              icon: Building2,
              display: (
                <RelationAttribute
                  value={lead.client?.name ?? null}
                  href={lead.clientId ? `/crm/companies/${lead.clientId}` : null}
                  types={["COMPANY"]}
                  placeholder="No company"
                  searchPlaceholder="Search companies"
                  onPick={(record) => edit.save.mutate({ clientId: record.id })}
                  onClear={() => edit.save.mutate({ clientId: null })}
                />
              ),
            },
            {
              id: "contact",
              label: "Contact",
              icon: UserRound,
              placeholder: "Nobody named",
              ...edit.text("contactName", lead.contactName),
            },
            {
              id: "phone",
              label: "Phone",
              placeholder: "Not recorded",
              ...edit.text("contactPhone", lead.contactPhone),
            },
            {
              id: "email",
              label: "Email",
              placeholder: "Not recorded",
              ...edit.text("contactEmail", lead.contactEmail),
            },
            {
              id: "source",
              label: "Source",
              placeholder: "Not recorded",
              ...edit.text("source", lead.source),
            },
            ...customFieldAttributes({
              definitions,
              values: lead.customFields ?? null,
              onCommit: (key, value) =>
                edit.save.mutate({ customFields: { [key]: value } }),
            }),
          ]}
        />
      }
      beforeTabs={
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
      }
      activeTab={tab}
      onTabChange={setTab}
      tabs={[
        {
          value: "timeline",
          label: "Timeline",
          content: (
            <div className="space-y-4">
              <ActivityComposer target={{ kind: "lead", id: leadId }} />
              {/* The whole story, not just the activity table: visits, tasks,
                  documents and the day it arrived, in one order. */}
              <RecordStory
                events={buildStory({
                  activities: lead.activities,
                  tasks: lead.followUps,
                  visits: lead.appointments,
                  documents: lead.documents,
                  createdAt: lead.createdAt,
                  createdLabel: `Lead ${lead.leadNo} came in`,
                })}
                emptyMessage="Nothing has happened on this lead yet. Log a call or a note above to start the trail."
              />
            </div>
          ),
        },
        {
          value: "documents",
          label: "Documents",
          count: lead.documents.length,
          content: (
            <DocumentList
              basePath={`/api/v2/crm/leads/${leadId}`}
              currency={lead.currency}
              documents={lead.documents}
              // A lead with a name to bill can be quoted; the company is
              // created from the contact if there is not one already.
              canCreate={Boolean(lead.clientId || lead.contactName || lead.title)}
              prefillLines={quotationPrefill}
              onPrefillConsumed={() => setQuotationPrefill(undefined)}
            />
          ),
        },
        {
          value: "visits",
          label: "Visits",
          count: lead.appointments.length,
          content: (
            <VisitsTab
              appointments={lead.appointments}
              onSchedule={() => setScheduleOpen(true)}
              onOpenReport={setReportFor}
            />
          ),
        },
        tasksTab({ ref: { kind: "lead", id: leadId }, currentUserId }),
        commentsTab({ ref: { kind: "lead", id: leadId }, currentUserId }),
        mentionsTab({ ref: { kind: "lead", id: leadId } }),
      ]}
      rail={
        <>
          <RailSection title="Deal">
            <p className="font-mono text-2xl">
              {formatLeadValue(lead.estimatedValue, lead.currency)}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {lead.probability ?? 0}% likely · {CRM_STAGE_LABELS[lead.stage]}
            </p>
          </RailSection>

          {lead.scoreBreakdown ? (
            <RailSection title="Score">
              <LeadScoreCard score={lead.scoreBreakdown} />
            </RailSection>
          ) : null}

          {nextTask ? (
            <RailSection title="Next task">
              <p className="text-sm">{nextTask.title}</p>
              <p
                className={
                  isOverdue(nextTask.dueAt)
                    ? "text-sm font-medium text-[var(--status-error-text)]"
                    : "text-sm text-[var(--text-muted)]"
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
              <p className="text-sm text-[var(--text-muted)]">
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
        </>
      }
    >


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
        subject={{ leadId, clientId: lead.clientId }}
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
    </RecordPageShell>
  );
}
