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
import { RecordStory } from "@/components/crm/records/record-story";
import { buildStory } from "@/lib/crm/story";
import type { LeadActivity } from "@/components/crm/lead-detail/lead-types";

import { CustomFieldDisplay } from "./custom-field-display";
import { RecordMark } from "./record-mark";
import { commentsTab, tasksTab } from "./record-tabs";
import { RecordAttributes } from "./record-attributes";
import { useAttributeEditor } from "./use-attribute-editor";
import { EntityLink } from "./entity-link";
import {
  AddressBook,
  Building2,
  Mail,
  Phone,
  UserRound,
  Users,
} from "@/lib/icons";

import { RailSection, RecordPageShell, RelatedList } from "./record-page-shell";
import { PersonFormSheet } from "./person-form-sheet";
import { RecordHistoryTab } from "./record-history-tab";
import { MergeDialog } from "./merge-dialog";
import { FieldHistoryTab } from "@/components/crm/records/field-history-tab";

import { Stack } from "@corelithzw/react";

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
  const edit = useAttributeEditor({
    path: `/api/v2/crm/people/${personId}`,
    invalidate: [["crm", "person", personId], ["crm", "people"]],
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
      attributes={
        <RecordAttributes
          attributes={[
            {
              id: "email",
              label: "Email",
              icon: Mail,
              placeholder: "Not recorded",
              ...edit.text("email", person.email),
            },
            {
              id: "phone",
              label: "Phone",
              icon: Phone,
              placeholder: "Not recorded",
              ...edit.text("phone", person.phone),
            },
            {
              id: "company",
              label: "Company",
              icon: Building2,
              display: person.client ? (
                <EntityLink
                  href={`/crm/companies/${person.client.id}`}
                  className="text-sm"
                >
                  {person.client.name}
                </EntityLink>
              ) : undefined,
              value: null,
              placeholder: "No company",
            },
            {
              id: "owner",
              label: "Owner",
              icon: UserRound,
              display: (
                <EntityLink
                  href={person.assignedTo ? `/crm/reps/${person.assignedTo.id}` : null}
                  className="text-sm"
                >
                  {person.assignedTo?.name ?? "Unassigned"}
                </EntityLink>
              ),
            },
            {
              id: "contactType",
              label: "Contact type",
              icon: AddressBook,
              value: CONTACT_TYPE_LABELS[person.contactType] ?? person.contactType,
            },
            {
              id: "role",
              label: "Job title",
              placeholder: "Not recorded",
              ...edit.text("jobTitle", person.jobTitle),
            },
            {
              id: "prefers",
              label: "Prefers",
              value: person.preferredChannel
                ? CHANNEL_LABELS[person.preferredChannel] ?? person.preferredChannel
                : null,
              placeholder: "No preference",
            },
            {
              id: "city",
              label: "City",
              placeholder: "Not recorded",
              ...edit.text("city", person.city),
            },
          ]}
        />
      }
      tabs={[
        {
          value: "timeline",
          label: "Timeline",
          content: (
            <RecordStory
              events={buildStory({
                activities: person.activities,
                createdLabel: "Person added",
              })}
            />
          ),
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
        tasksTab({ ref: { kind: "person", id: personId }, currentUserId: session?.user?.id }),
        commentsTab({ ref: { kind: "person", id: personId }, currentUserId: session?.user?.id }),
        {
          value: "history",
          label: "History",
          content: <RecordHistoryTab activities={person.activities} />,
        },
        {
          value: "changes",
          label: "Field history",
          content: <FieldHistoryTab entity="PERSON" recordId={personId} />,
        },
      ]}
      rail={
        <>
          {person.companyLinks.length > 1 ? (
            <RailSection title="Companies">
              <Stack as="ul" gap="xs">
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
              </Stack>
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
