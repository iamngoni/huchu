"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchCrmFieldDefinitions, type CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";

import { formatMoney } from "@/components/crm/documents/document-types";
import { CommentThread } from "@/components/crm/collaboration/comment-thread";
import { RecordTasksTab } from "@/components/crm/tasks/record-tasks-tab";
import { ActivityTimeline } from "@/components/crm/lead-detail/activity-timeline";
import type { LeadActivity } from "@/components/crm/lead-detail/lead-types";

import { CustomFieldDisplay } from "./custom-field-display";
import { RecordMark } from "./record-mark";
import { EntityLink } from "./entity-link";
import { Users } from "@/lib/icons";

import { RailSection, RecordPageShell, RelatedList } from "./record-page-shell";
import { PersonFormSheet } from "./person-form-sheet";
import { RecordHistoryTab } from "./record-history-tab";
import { MergeDialog } from "./merge-dialog";

const ROLE_LABELS: Record<string, string> = {
  PRIMARY: "Primary contact",
  DECISION_MAKER: "Decision-maker",
  FINANCE: "Finance",
  SITE: "Site contact",
  TECHNICAL: "Technical",
  INFLUENCER: "Influencer",
  REFERRER: "Referrer",
};

const CONTACT_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  DECISION_MAKER: "Decision-maker",
  SITE_CONTACT: "Site contact",
  FINANCE_CONTACT: "Finance contact",
  SUPPLIER_CONTACT: "Supplier",
  REFERRAL_PARTNER: "Referral partner",
  OTHER: "Other",
};

const CHANNEL_LABELS: Record<string, string> = {
  PHONE: "Phone",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  IN_PERSON: "In person",
};

type PersonDetail = {
  id: string;
  avatarUrl: string | null;
  emoji: string | null;
  personNo: string;
  fullName: string;
  firstName: string;
  lastName: string | null;
  jobTitle: string | null;
  addressLine: string | null;
  city: string | null;
  notes: string | null;
  email: string | null;
  phone: string | null;
  contactType: string;
  preferredChannel: string | null;
  customFields: Record<string, unknown> | null;
  client: { id: string; name: string } | null;
  assignedTo: { id: string; name: string | null } | null;
  companyLinks: Array<{
    id: string;
    jobTitle: string | null;
    isPrimary: boolean;
    client: { id: string; name: string };
  }>;
  dealContacts: Array<{
    id: string;
    role: string;
    deal: {
      id: string;
      title: string;
      value: number | null;
      currency: string;
      stage: { id: string; name: string };
    };
  }>;
  activities: LeadActivity[];
  /** Present only when this person was merged away. */
  redirectTo?: string;
};

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <dt className="w-32 shrink-0 text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-sm">
        {value ? value : <span className="text-[var(--text-muted)]">—</span>}
      </dd>
    </div>
  );
}

export function PersonDetailPage({ personId }: { personId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("timeline");

  const personQuery = useQuery({
    queryKey: ["crm", "person", personId],
    queryFn: () => fetchJson<PersonDetail>(`/api/v2/crm/people/${personId}`),
  });
  const fieldsQuery = useQuery({
    queryKey: ["crm", "field-definitions", "PERSON"],
    queryFn: () => fetchCrmFieldDefinitions("PERSON"),
  });

  const definitions: CrmFieldDefinitionRecord[] = fieldsQuery.data?.data ?? [];
  const person = personQuery.data;

  if (personQuery.isLoading) {
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

  if (personQuery.error || !person) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Person not found</AlertTitle>
        <AlertDescription>
          {personQuery.error ? getApiErrorMessage(personQuery.error) : "It may have been deleted."}
        </AlertDescription>
      </Alert>
    );
  }

  // This record was merged into another one, so its old id still answers.
  // Send the reader to the survivor rather than showing a dead duplicate.
  if (person.redirectTo) {
    router.replace(`/crm/people/${person.redirectTo}`);
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

  const subtitle = (
    <>
      {person.jobTitle ? <>{person.jobTitle} · </> : null}
      {person.client ? (
        <>
          <EntityLink href={`/crm/companies/${person.client.id}`} muted>
            {person.client.name}
          </EntityLink>
          {" · "}
        </>
      ) : null}
      <EntityLink
        href={person.assignedTo ? `/crm/reps/${person.assignedTo.id}` : null}
        muted
      >
        {person.assignedTo?.name ?? "Unassigned"}
      </EntityLink>
    </>
  );

  return (
    <>
    <RecordPageShell
      icon={Users}
      backHref="/crm/people"
      backLabel="All people"
      actions={[{ label: "Merge a duplicate", onSelect: () => setMergeOpen(true) }]}
      leading={
        <RecordMark
          kind="person"
          name={person.fullName}
          emoji={person.emoji}
          avatarUrl={person.avatarUrl}
          size="md"
        />
      }
      title={person.fullName}
      reference={person.personNo}
      subtitle={subtitle}
      activeTab={tab}
      onTabChange={setTab}
      tabs={[
        {
          value: "timeline",
          label: "Timeline",
          content: <ActivityTimeline activities={person.activities} />,
        },
        {
          value: "deals",
          label: "Deals",
          count: person.dealContacts.length,
          content: (
            <RelatedList
              items={person.dealContacts}
              emptyMessage="This person isn't on any deals yet."
              renderItem={(contact) => ({
                href: `/crm/deals/${contact.deal.id}`,
                title: contact.deal.title,
                subtitle:
                  [ROLE_LABELS[contact.role] ?? contact.role, contact.deal.stage.name]
                    .filter(Boolean)
                    .join(" · ") || null,
                meta:
                  contact.deal.value !== null
                    ? formatMoney(contact.deal.value, contact.deal.currency)
                    : undefined,
              })}
            />
          ),
        },
        {
          value: "tasks",
          label: "Tasks",
          content: (
            <RecordTasksTab record={{ personId }} currentUserId={session?.user?.id} />
          ),
        },
        {
          value: "comments",
          label: "Comments",
          content: (
            <CommentThread
              entity="PERSON"
              recordId={personId}
              currentUserId={session?.user?.id}
            />
          ),
        },
        {
          value: "history",
          label: "History",
          content: <RecordHistoryTab activities={person.activities} />,
        },
      ]}
      rail={
        <>
          <RailSection title="Contact">
            <dl className="divide-y divide-[var(--border)]">
              <DetailRow label="Email" value={person.email} />
              <DetailRow label="Phone" value={person.phone} />
              <DetailRow
                label="Prefers"
                value={
                  person.preferredChannel
                    ? CHANNEL_LABELS[person.preferredChannel] ?? person.preferredChannel
                    : null
                }
              />
              <DetailRow
                label="Contact type"
                value={CONTACT_TYPE_LABELS[person.contactType] ?? person.contactType}
              />
            </dl>
          </RailSection>

          <RailSection title="Company">
            {person.client ? (
              <EntityLink href={`/crm/companies/${person.client.id}`} className="text-sm">
                {person.client.name}
              </EntityLink>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No company</p>
            )}
          </RailSection>

          {person.companyLinks.length > 1 ? (
            <RailSection title="Companies">
              <ul className="space-y-1.5">
                {person.companyLinks.map((link) => (
                  <li key={link.id} className="text-sm">
                    <EntityLink href={`/crm/companies/${link.client.id}`}>
                      {link.client.name}
                    </EntityLink>
                    {link.jobTitle ? (
                      <span className="text-sm text-[var(--text-muted)]"> · {link.jobTitle}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </RailSection>
          ) : null}

          <CustomFieldDisplay definitions={definitions} values={person.customFields} />
        </>
      }
    />

    <PersonFormSheet
      open={editOpen}
      onOpenChange={setEditOpen}
      record={{
        id: person.id,
        emoji: person.emoji ?? "",
        avatarUrl: person.avatarUrl ?? "",
        firstName: person.firstName,
        lastName: person.lastName ?? "",
        jobTitle: person.jobTitle ?? "",
        email: person.email ?? "",
        phone: person.phone ?? "",
        contactType: person.contactType,
        addressLine: person.addressLine ?? "",
        city: person.city ?? "",
        notes: person.notes ?? "",
        clientId: person.client?.id ?? "",
        assignedToId: person.assignedTo?.id ?? "",
      }}
      onSaved={() => personQuery.refetch()}
    />

    <MergeDialog
      entity="PERSON"
      survivorId={personId}
      survivorLabel={person.fullName}
      open={mergeOpen}
      onOpenChange={setMergeOpen}
    />
    </>
  );
}
