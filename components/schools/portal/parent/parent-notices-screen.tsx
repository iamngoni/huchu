"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { formatSchoolDate } from "@/lib/schools/format";

/**
 * S-6.12 — what the school has said, with read state.
 *
 * Unread is a weight, not a badge: an unread notice is bolder and carries a dot,
 * and opening it marks it read. "Mark all read" exists because a parent who has
 * been away for a week wants the dot gone, and clearing them one at a time to
 * achieve that is the behaviour that makes people ignore the dot entirely.
 */

type Notice = {
  id: string;
  title: string;
  summary: string | null;
  severity: string;
  type: string;
  sentAt: string;
  isRead: boolean;
};

export function ParentNoticesScreen() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["portal", "parent", "notices"],
    queryFn: () =>
      fetchJson<{ notices: Notice[]; unread: number }>(
        "/api/v2/schools/portal/parent/notices",
      ),
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) =>
      fetchJson<{ marked: number }>("/api/v2/schools/portal/parent/notices", {
        method: "POST",
        body: JSON.stringify(ids && ids.length > 0 ? { ids } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "parent", "notices"] });
    },
  });

  if (query.isPending) return <Skeleton className="h-48 w-full" />;

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Notices could not be loaded</AlertTitle>
        <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const notices = query.data?.notices ?? [];
  const unread = query.data?.unread ?? 0;

  if (notices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        The school has not sent you anything yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {unread > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={markRead.isPending}
          onClick={() => markRead.mutate(undefined)}
        >
          {markRead.isPending ? "Marking…" : `Mark all ${unread} as read`}
        </Button>
      ) : null}

      <ul className="space-y-2">
        {notices.map((notice) => (
          <li key={notice.id}>
            <button
              type="button"
              onClick={() => {
                if (!notice.isRead) markRead.mutate([notice.id]);
              }}
              className="flex w-full items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-left"
            >
              <span
                className={
                  notice.isRead
                    ? "mt-1.5 size-2 shrink-0 rounded-full bg-transparent"
                    : "mt-1.5 size-2 shrink-0 rounded-full bg-[var(--status-error-border)]"
                }
                aria-hidden
              />
              <span className="min-w-0">
                <span className={notice.isRead ? "block" : "block font-semibold"}>
                  {notice.title}
                </span>
                {notice.summary ? (
                  <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
                    {notice.summary}
                  </span>
                ) : null}
                <span className="mt-1 block text-sm text-[var(--text-subtle)]">
                  {formatSchoolDate(notice.sentAt)}
                  {notice.isRead ? "" : " · new"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
