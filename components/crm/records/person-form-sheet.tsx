"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { FormShell } from "@/components/shared/form-shell";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  fetchCrmCompanies,
  fetchCrmFieldDefinitions,
  type CrmFieldDefinitionRecord,
} from "@/lib/crm/crm-v2";
import type { LeadFilterOwner } from "@/components/crm/leads/leads-filters";

import { CustomFieldInputs } from "./custom-field-inputs";
import { DuplicateWarningDialog, type DuplicateEntry } from "./duplicate-warning-dialog";

const CONTACT_TYPES = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "DECISION_MAKER", label: "Decision-maker" },
  { value: "SITE_CONTACT", label: "Site contact" },
  { value: "FINANCE_CONTACT", label: "Finance contact" },
  { value: "SUPPLIER_CONTACT", label: "Supplier contact" },
  { value: "REFERRAL_PARTNER", label: "Referral partner" },
  { value: "OTHER", label: "Other" },
];

const CHANNELS = [
  { value: "PHONE", label: "Phone" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "IN_PERSON", label: "In person" },
];

type FormState = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  contactType: string;
  preferredChannel: string;
  addressLine: string;
  city: string;
  notes: string;
  clientId: string;
  assignedToId: string;
};

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  email: "",
  phone: "",
  contactType: "CUSTOMER",
  preferredChannel: "",
  addressLine: "",
  city: "",
  notes: "",
  clientId: "",
  assignedToId: "",
};

export function PersonFormSheet({
  open,
  onOpenChange,
  defaultClientId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  onCreated?: (personId: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateEntry[] | null>(null);

  // Reset as the sheet opens, adjusting state during render rather than in an
  // effect so there is no flash of the previous person's details.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({ ...EMPTY, clientId: defaultClientId ?? "" });
      setCustomValues({});
      setErrors([]);
      setDuplicates(null);
    }
  }

  const companiesQuery = useQuery({
    queryKey: ["crm", "companies", "options"],
    queryFn: () => fetchCrmCompanies({ limit: 200 }),
    enabled: open,
  });

  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: LeadFilterOwner[] }>("/api/v2/crm/team"),
    enabled: open,
  });

  const fieldsQuery = useQuery({
    queryKey: ["crm", "field-definitions", "PERSON"],
    queryFn: () => fetchCrmFieldDefinitions("PERSON"),
    enabled: open,
  });

  const companyOptions = useMemo<SearchableOption[]>(
    () =>
      (companiesQuery.data?.data ?? []).map((company) => ({
        value: company.id,
        label: company.name,
        description: company.city ?? undefined,
      })),
    [companiesQuery.data],
  );
  const owners = teamQuery.data?.data ?? [];
  const definitions: CrmFieldDefinitionRecord[] = fieldsQuery.data?.data ?? [];

  const buildBody = (force: boolean) => ({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim() || null,
    jobTitle: form.jobTitle.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    contactType: form.contactType,
    preferredChannel: form.preferredChannel || null,
    addressLine: form.addressLine.trim() || null,
    city: form.city.trim() || null,
    notes: form.notes.trim() || null,
    clientId: form.clientId || null,
    assignedToId: form.assignedToId || null,
    customFields: customValues,
    force,
  });

  const save = useMutation({
    mutationFn: async (force: boolean) => {
      const response = await fetch("/api/v2/crm/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(force)),
      });
      const payload = await response.json();
      if (response.status === 409 && payload?.code === "DUPLICATE_CANDIDATES") {
        return { kind: "duplicates" as const, duplicates: (payload.duplicates ?? []) as DuplicateEntry[] };
      }
      if (!response.ok) throw new Error(payload?.error ?? "Failed to create person");
      return { kind: "created" as const, record: payload.data as { id: string; fullName: string } };
    },
    onSuccess: (result) => {
      if (result.kind === "duplicates") {
        setDuplicates(result.duplicates);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["crm", "people"] });
      toast({ title: "Person created", description: result.record.fullName });
      setDuplicates(null);
      onOpenChange(false);
      onCreated?.(result.record.id);
    },
    onError: (error) => setErrors([getApiErrorMessage(error)]),
  });

  const validate = (): string[] => {
    const found: string[] = [];
    if (!form.firstName.trim()) found.push("A first name is required.");
    if (form.email.trim() && !form.email.includes("@")) {
      found.push("That email doesn't look like an email address.");
    }
    return found;
  };

  const patch = (next: Partial<FormState>) => setForm((prev) => ({ ...prev, ...next }));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent size="lg" className="w-full overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>New person</SheetTitle>
            <SheetDescription>
              A contact you can attach to any number of deals and sites without re-typing them.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <FormShell
              variant="bare"
              errors={errors}
              requiredHint="A first name is required."
              onSubmit={(event) => {
                event.preventDefault();
                const found = validate();
                setErrors(found);
                if (found.length === 0) save.mutate(false);
              }}
              actions={
                <>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : "Create person"}
                  </Button>
                </>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="person-first">First name *</Label>
                  <Input
                    id="person-first"
                    value={form.firstName}
                    onChange={(event) => patch({ firstName: event.target.value })}
                    maxLength={120}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="person-last">Last name</Label>
                  <Input
                    id="person-last"
                    value={form.lastName}
                    onChange={(event) => patch({ lastName: event.target.value })}
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="person-email">Email</Label>
                  <Input
                    id="person-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => patch({ email: event.target.value })}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="person-phone">Phone</Label>
                  <Input
                    id="person-phone"
                    value={form.phone}
                    onChange={(event) => patch({ phone: event.target.value })}
                    maxLength={40}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <SearchableSelect
                  label="Company"
                  value={form.clientId}
                  options={companyOptions}
                  placeholder={companiesQuery.isLoading ? "Loading companies…" : "Search companies"}
                  onValueChange={(clientId) => patch({ clientId })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="person-title">Job title</Label>
                  <Input
                    id="person-title"
                    value={form.jobTitle}
                    onChange={(event) => patch({ jobTitle: event.target.value })}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="person-type">Contact type</Label>
                  <Select
                    value={form.contactType}
                    onValueChange={(value) => patch({ contactType: value })}
                  >
                    <SelectTrigger id="person-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="person-channel">Preferred channel</Label>
                  <Select
                    value={form.preferredChannel || "__none"}
                    onValueChange={(value) =>
                      patch({ preferredChannel: value === "__none" ? "" : value })
                    }
                  >
                    <SelectTrigger id="person-channel">
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No preference</SelectItem>
                      {CHANNELS.map((channel) => (
                        <SelectItem key={channel.value} value={channel.value}>
                          {channel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="person-owner">Owner</Label>
                  <Select
                    value={form.assignedToId || "__unassigned"}
                    onValueChange={(value) =>
                      patch({ assignedToId: value === "__unassigned" ? "" : value })
                    }
                  >
                    <SelectTrigger id="person-owner">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned">Unassigned</SelectItem>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name ?? "Unnamed"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="person-notes">Notes</Label>
                <Textarea
                  id="person-notes"
                  value={form.notes}
                  onChange={(event) => patch({ notes: event.target.value })}
                  rows={3}
                />
              </div>

              <CustomFieldInputs
                definitions={definitions}
                values={customValues}
                onChange={setCustomValues}
              />
            </FormShell>
          </div>
        </SheetContent>
      </Sheet>

      <DuplicateWarningDialog
        open={Boolean(duplicates)}
        onOpenChange={(next) => (!next ? setDuplicates(null) : undefined)}
        duplicates={duplicates ?? []}
        entityLabel="person"
        isPending={save.isPending}
        renderRecord={(record) => ({
          title: String(record.fullName ?? "Unnamed"),
          subtitle:
            [record.jobTitle, (record.client as { name?: string } | null)?.name, record.email]
              .filter(Boolean)
              .join(" · ") || null,
        })}
        onUseExisting={(id) => {
          setDuplicates(null);
          onOpenChange(false);
          router.push(`/crm/people/${id}`);
        }}
        onCreateAnyway={() => save.mutate(true)}
      />
    </>
  );
}
