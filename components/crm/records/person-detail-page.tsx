"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchCrmFieldDefinitions, type CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";

import { formatMoney } from "@/components/crm/documents/document-types";
import { RecordStory } from "@/components/crm/records/record-story";
import { buildStory } from "@/lib/crm/story";
import type { LeadActivity } from "@/components/crm/lead-detail/lead-types";

import { customFieldAttributes } from "@/components/records/custom-field-attributes";
import { CustomFieldDisplay } from "./custom-field-display";
import { RecordMark } from "@/components/records/record-mark";
import { automationTab, commentsTab, filesTab, mentionsTab, tasksTab } from "./record-tabs";
import { RecordAttributes } from "@/components/records/record-attributes";
import { useAttributeEditor } from "@/components/records/use-attribute-editor";
import { EntityLink } from "@/components/records/entity-link";
import {
  AddressBook,
  Building2,
  Mail,
  Phone,
  Plus,
  UserRound,
  Users,
} from "@/lib/icons";

import { RailSection, RecordPageShell, RelatedList } from "@/components/records/record-page-shell";
import { DealFormSheet } from "./deal-form-sheet";
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
  // `editOpen` had no way of ever becoming true: the sheet was mounted and the
  // state was declared, but no action set it, so a person's edit form was
  // unreachable. It is in the overflow menu now, beside Merge.
  const [editOpen, setEditOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [tab, setTab] = useState("timeline");

  const personQuery = useQuery({
    queryKey: ["crm", "person", personId],
    queryFn: () => fetchJson<PersonDetail>(`/api/v2/crm/people/${personId}`),
  });
  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: Array<{ id: string; name: string | null }> }>(
      "/api/v2/crm/team",
    ),
  });
  const ownerOptions = (teamQuery.data?.data ?? []).map((member) => ({
    value: member.id,
    label: member.name ?? "Unnamed",
  }));
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

  /**
   * The rail, or nothing at all.
   *
   * Both its sections are conditional — a second company, and the
   * administrator's own fields — and most people have neither. Passed as an
   * always-present fragment, that produced an "Overview" tab on a phone with
   * four hundred pixels of blank under it, landed on by default: you opened a
   * person and were shown an empty screen. `undefined` is how the shell is
   * told there is no summary to offer, and it opens on the timeline instead.
   */
  const railSections = [
    person.companyLinks.length > 1 ? (
      <RailSection key="companies" title="Companies">
        <Stack as="ul" gap="xs">
          {person.companyLinks.map((link) => (
            <li key={link.id} className="text-sm">
              <EntityLink href={`/crm/companies/${link.client.id}`}>{link.client.name}</EntityLink>
              {link.jobTitle ? (
                <span className="text-sm text-[var(--text-muted)]"> · {link.jobTitle}</span>
              ) : null}
            </li>
          ))}
        </Stack>
      </RailSection>
    ) : null,
    definitions.length > 0 ? (
      <CustomFieldDisplay key="custom" definitions={definitions} values={person.customFields} />
    ) : null,
  ].filter(Boolean);

  const rail = railSections.length > 0 ? <>{railSections}</> : undefined;

  return (
    <>
    <RecordPageShell
      icon={Users}
      backHref="/crm/people"
      backLabel="All people"
      primaryAction={
        // The same verb as a company, because a person is who you sell
        // through — and the deal opens already attached to whichever company
        // they belong to, which is the whole reason to start it from here.
        <Button size="sm" className="gap-1.5" onClick={() => setDealOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New deal
        </Button>
      }
      actions={[
        { label: "Edit", onSelect: () => setEditOpen(true) },
        { label: "Merge a duplicate", onSelect: () => setMergeOpen(true) },
      ]}
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
              placeholder: "Unassigned",
              // A choice, not a label: who owns a record is the property that
              // changes most and was the one you could not change from here.
              ...edit.choice(
                "assignedToId",
                person.assignedTo?.id ?? null,
                ownerOptions,
                "Leave unassigned",
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
            ...customFieldAttributes({
              definitions,
              values: person.customFields,
              onCommit: (key, value) =>
                edit.save.mutate({ customFields: { [key]: value } }),
            }),
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
        mentionsTab({ ref: { kind: "person", id: personId } }),
        filesTab({ ref: { kind: "person", id: personId } }),
        automationTab({ ref: { kind: "person", id: personId } }),
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
      rail={rail}
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

    <DealFormSheet
      open={dealOpen}
      onOpenChange={setDealOpen}
      defaultClientId={person.client?.id}
      onCreated={() => personQuery.refetch()}
    />
    </>
  );
}
