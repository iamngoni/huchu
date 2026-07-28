"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, Badge, EmptyState } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { ClientDate } from "@/components/ui/client-date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageChrome } from "@/components/layout/page-chrome";
import { RecordDialog } from "@/components/crm/records/record-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  TEMPLATE_KINDS,
  TEMPLATE_KIND_DESCRIPTIONS,
  TEMPLATE_KIND_LABELS,
  type TemplateKind,
} from "@/lib/crm/blocks";
import { FileText, Plus } from "@/lib/icons";

import { AttributeChips } from "./attribute-header";

type TemplateRow = {
  id: string;
  name: string;
  kind: TemplateKind;
  attributes: { emoji?: string | null; description?: string | null; custom?: Record<string, string> } | null;
  isShared: boolean;
  isActive: boolean;
  viewCount: number;
  submitCount: number;
  lastSubmitAt: string | null;
  updatedAt: string;
  createdBy?: { id: string; name: string | null } | null;
};

/**
 * The template library.
 *
 * Grouped by kind rather than listed flat because "our quote layout" and "the
 * site-survey form" are different questions asked on different days, and a
 * single alphabetical list makes you read past one to find the other.
 */
export function TemplatesContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftKind, setDraftKind] = useState<TemplateKind>("FORM");
  const [errors, setErrors] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-templates"],
    queryFn: () => fetchJson<{ data: TemplateRow[] }>("/api/v2/crm/templates"),
  });

  const templates = data?.data ?? [];

  const create = useMutation({
    mutationFn: () =>
      fetchJson<{ id: string }>("/api/v2/crm/templates", {
        method: "POST",
        body: JSON.stringify({
          name: draftName.trim(),
          kind: draftKind,
          attributes: { custom: {} },
          // A new template starts with one heading rather than empty: an empty
          // canvas is where people put the thing down and never come back.
          blocks: [
            { id: "title", type: "heading", text: draftName.trim(), level: 1 },
            ...(draftKind === "FORM"
              ? [
                  {
                    id: "name",
                    type: "field" as const,
                    key: "name",
                    label: "Your name",
                    fieldType: "text" as const,
                    required: true,
                  },
                ]
              : []),
          ],
        }),
      }),
    onSuccess: (created) => {
      setCreateOpen(false);
      setDraftName("");
      queryClient.invalidateQueries({ queryKey: ["crm-templates"] });
      router.push(`/crm/templates/${created.id}`);
    },
    onError: (err) => setErrors([getApiErrorMessage(err)]),
  });

  const groups = TEMPLATE_KINDS.map((kind) => ({
    kind,
    rows: templates.filter((template) => template.kind === kind),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="space-y-5">
      <PageChrome title="Templates" icon={FileText}>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden="true" />
          New template
        </Button>
      </PageChrome>

      {error ? (
        <Alert tone="danger" title="Couldn't load templates">
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          body="Forms, quotes, invoices, receipts and emails are all designed here, out of the same blocks."
        />
      ) : (
        groups.map((group) => (
          <section key={group.kind} className="space-y-1">
            <div>
              <h2 className="text-sm font-semibold">{TEMPLATE_KIND_LABELS[group.kind]}</h2>
              <p className="text-sm text-[var(--text-muted)]">
                {TEMPLATE_KIND_DESCRIPTIONS[group.kind]}
              </p>
            </div>

            <ul className="space-y-1">
              {group.rows.map((template) => (
                <li
                  key={template.id}
                  className="flex flex-col gap-2 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors hover:bg-[var(--surface-subtle)] sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span aria-hidden="true">{template.attributes?.emoji ?? "📄"}</span>
                      <Link
                        href={`/crm/templates/${template.id}`}
                        className="text-sm font-medium underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--text)]"
                      >
                        {template.name}
                      </Link>
                      {template.isShared ? null : <Badge tone="neutral">Draft</Badge>}
                      {template.isActive ? null : <Badge tone="warn">Retired</Badge>}
                    </div>

                    {template.attributes?.description ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        {template.attributes.description}
                      </p>
                    ) : null}

                    <AttributeChips custom={template.attributes?.custom ?? {}} />
                  </div>

                  <p className="shrink-0 text-sm text-[var(--text-muted)]">
                    {template.viewCount} view{template.viewCount === 1 ? "" : "s"} ·{" "}
                    {template.submitCount} sent
                    {template.lastSubmitAt ? (
                      <>
                        {" · last "}
                        <ClientDate value={template.lastSubmitAt} mode="date" />
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <RecordDialog
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next) setErrors([]);
        }}
        title="New template"
        description="Pick what it is for. The blocks on offer follow from that."
        size="md"
        errors={errors}
        onSubmit={(event) => {
          event.preventDefault();
          if (!draftName.trim()) {
            setErrors(["Give it a name."]);
            return;
          }
          setErrors([]);
          create.mutate();
        }}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="template-name">Name</Label>
          <Input
            id="template-name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Site survey form"
          />
        </div>

        <div className="space-y-1.5">
          <Label>What is it for</Label>
          <Select
            value={draftKind}
            onValueChange={(value) => setDraftKind(value as TemplateKind)}
          >
            <SelectTrigger aria-label="Template kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {TEMPLATE_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-[var(--text-muted)]">
            {TEMPLATE_KIND_DESCRIPTIONS[draftKind]}
          </p>
        </div>
      </RecordDialog>
    </div>
  );
}
