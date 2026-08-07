"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { NumericCell } from "@/components/ui/numeric-cell";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

import { SendNoticeDialog, type NoticeDraft } from "./send-notice-dialog";

/**
 * What the school has told people, and the way to tell them something.
 *
 * This screen used to be the signed-in administrator's own inbox — the notices
 * *they* had received — which is a strange thing to put under a school's
 * Notices heading and left the office with no way to send anything at all. The
 * portals have rendered a notice board since S-6.x; nothing could write to it.
 *
 * So it is the sent list now, with the reach beside each row. "Read by 12 of
 * 58" is the only honest measure of whether a notice landed, and the count of
 * families with no portal account is the school's to-do list: a notice cannot
 * reach a guardian who was never invited.
 */

type SentNotice = {
  id: string;
  title: string;
  summary: string;
  severity: string;
  audience: string;
  createdAt: string;
  expiresAt: string | null;
  recipients: number;
  read: number;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

function severityBadge(severity: string) {
  if (severity === "CRITICAL") return <Badge variant="destructive">Urgent</Badge>;
  if (severity === "WARNING") return <Badge variant="secondary">Important</Badge>;
  return <Badge variant="outline">Notice</Badge>;
}

export function SchoolsNoticesContent() {
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["schools", "notices", "sent"],
    queryFn: () => fetchJson<{ data: SentNotice[] }>("/api/v2/schools/notices?scope=sent"),
  });

  const send = useMutation({
    mutationFn: (draft: NoticeDraft) =>
      fetchJson<{ recipients: number; withoutAccount: number }>("/api/v2/schools/notices", {
        method: "POST",
        body: JSON.stringify({
          title: draft.title.trim(),
          body: draft.body.trim(),
          audience: draft.audience,
          classId: draft.classId || null,
          severity: draft.severity,
        }),
      }),
    onSuccess: (result) => {
      setComposing(false);
      setSent(
        `Sent to ${result.recipients} ${result.recipients === 1 ? "person" : "people"}.` +
          (result.withoutAccount > 0
            ? ` ${result.withoutAccount} ${result.withoutAccount === 1 ? "person has" : "people have"} no portal account yet and did not get it — invite them from Guardians or Students.`
            : ""),
      );
      void queryClient.invalidateQueries({ queryKey: ["schools", "notices"] });
    },
  });

  const rows = useMemo(() => query.data?.data ?? [], [query.data]);

  const columns = useMemo<ColumnDef<SentNotice>[]>(
    () => [
      {
        id: "createdAt",
        header: "Sent",
        cell: ({ row }) => <NumericCell>{formatDate(row.original.createdAt)}</NumericCell>,
      },
      {
        id: "title",
        header: "Notice",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium">{row.original.title}</div>
            <div className="line-clamp-1 text-xs text-muted-foreground">
              {row.original.summary}
            </div>
          </div>
        ),
      },
      {
        id: "audience",
        header: "Audience",
        cell: ({ row }) => <NumericCell align="left">{row.original.audience}</NumericCell>,
      },
      {
        id: "severity",
        header: "Importance",
        cell: ({ row }) => severityBadge(row.original.severity),
      },
      {
        id: "reach",
        header: "Read",
        cell: ({ row }) => (
          <NumericCell>
            {row.original.read} of {row.original.recipients}
          </NumericCell>
        ),
      },
      {
        id: "expiresAt",
        header: "Expires",
        cell: ({ row }) => <NumericCell>{formatDate(row.original.expiresAt)}</NumericCell>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load what has been sent</AlertTitle>
          <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : null}
      {sent ? (
        <Alert>
          <AlertTitle>Notice sent</AlertTitle>
          <AlertDescription>{sent}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section-title">Notices the school has sent</h2>
        <Button onClick={() => { setSent(null); setComposing(true); }}>Send a notice</Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Search sent notices"
        searchSubmitLabel="Search"
        pagination={{ enabled: true }}
        emptyState={
          query.isPending
            ? "Loading…"
            : "The school has not sent a notice yet. Anything you send appears in parents' and pupils' portals straight away."
        }
      />

      <SendNoticeDialog
        open={composing}
        onOpenChange={setComposing}
        isSending={send.isPending}
        error={send.error ? getApiErrorMessage(send.error) : null}
        onSend={(draft) => send.mutate(draft)}
      />
    </div>
  );
}
