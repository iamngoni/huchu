"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientDate } from "@/components/ui/client-date";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { Check, Pencil, X } from "@/lib/icons";
import { cn } from "@/lib/utils";

import type { LeadFilterOwner } from "@/components/crm/leads/leads-filters";
import { CRM_CHANNEL_LABELS } from "@/components/crm/leads/stage-config";
import type { LeadDetail } from "./lead-types";

function Row({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="group flex items-start justify-between gap-2 py-1.5">
      <dt className="w-28 shrink-0 pt-0.5 text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-start justify-end gap-1 text-right text-sm">
        <span className="min-w-0 break-words">{children}</span>
        {action}
      </dd>
    </div>
  );
}

/** An inline text field that only becomes an input once you choose to edit it. */
function EditableText({
  label,
  value,
  placeholder = "—",
  numeric,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  placeholder?: string;
  numeric?: boolean;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (!editing) {
    return (
      <Row
        label={label}
        action={
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 shrink-0 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Edit ${label.toLowerCase()}`}
            onClick={() => {
              setDraft(value ?? "");
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      >
        <span className={cn(numeric && "font-mono", !value && "text-[var(--text-muted)]")}>
          {value || placeholder}
        </span>
      </Row>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== (value ?? "")) onSave(draft);
  };

  return (
    <Row label={label}>
      <span className="flex items-center gap-1">
        <Input
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setEditing(false);
          }}
          className={cn("h-7 text-right", numeric && "font-mono")}
          inputMode={numeric ? "decimal" : undefined}
        />
        <Button size="sm" variant="ghost" className="h-6 w-6 px-0" aria-label="Save" onClick={commit}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 px-0"
          aria-label="Cancel"
          onClick={() => setEditing(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </span>
    </Row>
  );
}

export function AttributesPanel({
  lead,
  owners,
}: {
  lead: LeadDetail;
  owners: LeadFilterOwner[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      fetchJson(`/api/v2/crm/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "board"] });
    },
    onError: (error) =>
      toast({
        title: "Could not save that change",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  // Empty input means "clear this field", which the API takes as an explicit null.
  const saveText = (field: string) => (next: string) =>
    update.mutate({ [field]: next.trim() || null });

  const saveNumber = (field: string) => (next: string) => {
    const trimmed = next.trim();
    if (!trimmed) {
      update.mutate({ [field]: null });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast({ title: "That needs to be a number", variant: "destructive" });
      return;
    }
    update.mutate({ [field]: field === "probability" ? Math.round(parsed) : parsed });
  };

  return (
    <dl className="divide-y divide-[var(--border)]">
      <Row label="Client">
        {lead.client ? (
          <Link href="/crm/clients" className="hover:underline">
            {lead.client.name}
          </Link>
        ) : (
          <span className="text-[var(--text-muted)]">No client</span>
        )}
      </Row>

      <EditableText
        label="Contact"
        value={lead.contactName}
        onSave={saveText("contactName")}
      />
      <EditableText
        label="Email"
        value={lead.contactEmail}
        onSave={saveText("contactEmail")}
      />
      <EditableText
        label="Phone"
        value={lead.contactPhone}
        onSave={saveText("contactPhone")}
      />

      <EditableText
        label="Value"
        value={lead.estimatedValue !== null ? String(lead.estimatedValue) : ""}
        placeholder="Not sized"
        numeric
        onSave={saveNumber("estimatedValue")}
      />
      <Row label="Currency">
        <span className="font-mono">{lead.currency}</span>
      </Row>
      <EditableText
        label="Probability"
        value={lead.probability !== null ? String(lead.probability) : ""}
        numeric
        onSave={saveNumber("probability")}
      />

      <Row label="Owner">
        <Select
          value={lead.assignedTo?.id ?? "__unassigned"}
          onValueChange={(value) =>
            update.mutate({ assignedToId: value === "__unassigned" ? null : value })
          }
        >
          <SelectTrigger className="h-7 w-full max-w-40 border-none bg-transparent px-1 text-right shadow-none">
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
      </Row>

      <Row label="Services">
        {lead.services.length > 0 ? (
          <span className="flex flex-wrap justify-end gap-1">
            {lead.services.map((service) => (
              <Badge key={service} variant="secondary">
                {service}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </Row>

      <EditableText label="Source" value={lead.source} onSave={saveText("source")} />
      <Row label="Channel">
        <span className="text-[var(--text-muted)]">
          {CRM_CHANNEL_LABELS[lead.sourceChannel ?? ""] ?? lead.sourceChannel ?? "—"}
        </span>
      </Row>

      {lead.utmSource || lead.utmCampaign ? (
        <Row label="Campaign">
          <span className="text-[var(--text-muted)]">
            {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}
          </span>
        </Row>
      ) : null}

      {lead.lostReason ? (
        <Row label="Lost because">
          <span className="text-[var(--status-error-text)]">{lead.lostReason}</span>
        </Row>
      ) : null}

      <Row label="Created">
        <span className="text-[var(--text-muted)]">
          <ClientDate value={lead.createdAt} mode="date" />
        </span>
      </Row>
      <Row label="Updated">
        <span className="text-[var(--text-muted)]">
          <ClientDate value={lead.updatedAt} />
        </span>
      </Row>
    </dl>
  );
}
