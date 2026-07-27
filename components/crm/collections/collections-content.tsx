"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClientDate } from "@/components/ui/client-date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { formatMoney } from "@/components/crm/documents/document-types";
import {
  AGEING_LABELS,
  COLLECTION_OUTCOMES,
  COLLECTION_OUTCOME_LABELS,
  validateCollectionNote,
  type AgeingBucket,
} from "@/lib/crm/collections";
import { cn } from "@/lib/utils";

type ChaseRow = {
  documentId: string;
  invoiceNumber: string;
  currency: string;
  total: number;
  outstanding: number;
  dueDate: string | null;
  daysOverdue: number;
  bucket: AgeingBucket;
  record: { kind: "lead" | "deal"; id: string; label: string } | null;
  lastNote: {
    outcome: keyof typeof COLLECTION_OUTCOME_LABELS;
    promisedAt: string | null;
    notes: string | null;
    createdAt: string;
  } | null;
  urgency: number;
};

type CollectionsResponse = {
  data: {
    data: ChaseRow[];
    ageing: { bucket: AgeingBucket; label: string; count: number; amount: number }[];
    totalOutstanding: number;
  };
};

export function CollectionsContent({ currency = "USD" }: { currency?: string }) {
  const [chasing, setChasing] = useState<ChaseRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-collections"],
    queryFn: () => fetchJson<CollectionsResponse>("/api/v2/crm/collections"),
  });

  const report = data?.data;

  return (
    <div className="space-y-5">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load the chase list</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading || !report ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-[var(--card-radius)] border border-[var(--border)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Outstanding
              </p>
              <p className="mt-1 font-mono text-2xl">
                {formatMoney(report.totalOutstanding, currency)}
              </p>
            </div>
            {report.ageing.map((band) => (
              <div
                key={band.bucket}
                className={cn(
                  "rounded-[var(--card-radius)] border p-4",
                  band.bucket === "D90_PLUS" && band.amount > 0
                    ? "border-[var(--status-error-border)]"
                    : "border-[var(--border)]",
                )}
              >
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  {AGEING_LABELS[band.bucket]}
                </p>
                <p className="mt-1 font-mono text-lg">{formatMoney(band.amount, currency)}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {band.count} invoice{band.count === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>

          {report.data.length === 0 ? (
            <p className="rounded-[var(--card-radius)] border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
              Nothing outstanding. Everything issued has been paid.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--card-radius)] border border-[var(--border)]">
              {report.data.map((row) => (
                <li key={row.documentId} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{row.invoiceNumber}</span>
                      {row.record ? (
                        <Link
                          href={`/crm/${row.record.kind === "deal" ? "deals" : "leads"}/${row.record.id}`}
                          className="text-sm hover:underline"
                        >
                          {row.record.label}
                        </Link>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {row.daysOverdue > 0 ? (
                        <span className="font-medium text-[var(--status-error-text)]">
                          {row.daysOverdue} day{row.daysOverdue === 1 ? "" : "s"} late
                        </span>
                      ) : (
                        <>
                          Due <ClientDate value={row.dueDate} />
                        </>
                      )}
                      {row.lastNote ? (
                        <>
                          {" · "}
                          {COLLECTION_OUTCOME_LABELS[row.lastNote.outcome]}
                          {row.lastNote.promisedAt ? (
                            <>
                              {" by "}
                              <ClientDate value={row.lastNote.promisedAt} />
                            </>
                          ) : null}
                        </>
                      ) : (
                        " · never chased"
                      )}
                    </p>
                  </div>

                  <span className="font-mono text-sm">
                    {formatMoney(row.outstanding, row.currency)}
                  </span>

                  <Button type="button" size="sm" variant="outline" onClick={() => setChasing(row)}>
                    Log a chase
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ChaseDialog row={chasing} onOpenChange={(open) => !open && setChasing(null)} />
    </div>
  );
}

function ChaseDialog({
  row,
  onOpenChange,
}: {
  row: ChaseRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [outcome, setOutcome] =
    useState<(typeof COLLECTION_OUTCOMES)[number]>("NO_ANSWER");
  const [promisedAt, setPromisedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [seededFor, setSeededFor] = useState<string | null>(row?.documentId ?? null);
  if (row?.documentId !== seededFor) {
    setSeededFor(row?.documentId ?? null);
    setOutcome("NO_ANSWER");
    setPromisedAt("");
    setNotes("");
    setError(null);
  }

  const save = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/crm/collections", {
        method: "POST",
        body: JSON.stringify({
          documentId: row!.documentId,
          outcome,
          promisedAt: promisedAt ? new Date(promisedAt).toISOString() : null,
          notes: notes.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast({
        title: "Chase logged",
        description:
          outcome === "PROMISED_TO_PAY"
            ? "A task is booked for the day they promised."
            : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["crm-collections"] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      onOpenChange(false);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Dialog open={Boolean(row)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a chase</DialogTitle>
          <DialogDescription>
            {row ? `${row.invoiceNumber} — ${row.record?.label ?? "no record"}` : ""}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>What happened</Label>
            <Select
              value={outcome}
              onValueChange={(value) =>
                setOutcome(value as (typeof COLLECTION_OUTCOMES)[number])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLECTION_OUTCOMES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {COLLECTION_OUTCOME_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {outcome === "PROMISED_TO_PAY" ? (
            <div className="space-y-1.5">
              <Label htmlFor="promised-at">By when *</Label>
              <Input
                id="promised-at"
                type="date"
                value={promisedAt}
                onChange={(event) => setPromisedAt(event.target.value)}
              />
              <p className="text-xs text-[var(--text-muted)]">
                A task lands on this date so somebody actually checks.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="chase-notes">Notes</Label>
            <Textarea
              id="chase-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => {
              const problem = validateCollectionNote({
                outcome,
                promisedAt: promisedAt || null,
              });
              if (problem) {
                setError(problem);
                return;
              }
              setError(null);
              save.mutate();
            }}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
