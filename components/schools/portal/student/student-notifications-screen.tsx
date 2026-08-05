"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Card,
  ClientDate,
  EmptyState,
  IconTile,
  MobileList,
  MobileListRow,
  StatusState,
} from "@corelithzw/react";
import { dsConfirm } from "@/components/ui/ds-confirm";
import { getApiErrorMessage, isFeatureDisabledError } from "@/lib/api-client";
import {
  archiveNotifications,
  fetchNotifications,
  markNotificationsRead,
  type NotificationListItem,
} from "@/lib/api";
import { AlertTriangle, Bell, Info, ShieldAlert } from "@/lib/icons";
import { useStudentPortal } from "./student-portal-context";

const QUERY_KEY = ["notifications", "student", "inbox"] as const;

/**
 * How loud a message is, said with an icon and a word as well as a colour.
 *
 * Never colour alone: a red tile and a grey tile look the same to a child who
 * cannot tell them apart, so the tile carries a shape and the row carries a
 * label.
 */
function toneOf(item: NotificationListItem) {
  if (item.severity === "CRITICAL") {
    return { accent: "red" as const, Icon: ShieldAlert, label: "Important" };
  }
  if (item.severity === "WARNING") {
    return { accent: "amber" as const, Icon: AlertTriangle, label: "Worth reading" };
  }
  return { accent: "blue" as const, Icon: Info, label: "News" };
}

/**
 * What the school has told this pupil, newest first.
 *
 * The demo invents a message feed. This one is the platform's real notification
 * centre, which already does the two things that matter: it is addressed to a
 * user rather than fetched by an id, and it keeps read state per recipient. So
 * a pupil sees their own messages because the row is theirs, not because the
 * phone asked for their id — the same S-0.2 rule the rest of the portal keeps,
 * enforced one layer down.
 *
 * Tapping a message marks it read, which is the only thing a message here can
 * do. The notification centre supports typed actions, but every one it can
 * build today points at payroll, incidents and work orders — nothing a child is
 * ever the recipient of — so the row deliberately renders no action buttons
 * rather than showing a pupil a link into the back office.
 *
 * "Clear" archives rather than deletes: a cleared message is out of the way and
 * still on the record, which is the right answer when the thing cleared might
 * have been a detention notice.
 */
export function StudentNotificationsScreen() {
  const { student } = useStudentPortal();
  const queryClient = useQueryClient();

  const inbox = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchNotifications({ limit: 50 }),
    enabled: Boolean(student),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const read = useMutation({
    mutationFn: (recipientIds: string[]) => markNotificationsRead({ recipientIds }),
    onSuccess: invalidate,
  });

  const clear = useMutation({
    mutationFn: (recipientIds: string[]) => archiveNotifications({ recipientIds }),
    onSuccess: invalidate,
  });

  if (!student) {
    return (
      <EmptyState
        title="This account is not linked to a pupil"
        body="Ask the school office to link your sign-in to your student record. Until they do, the school cannot send you anything here."
      />
    );
  }

  const messages = inbox.data?.data ?? [];
  const unread = messages.filter((item) => !item.isRead);

  // A school that has not switched the notification centre on is not an error a
  // child should read as broken. Say what is true and stop.
  if (isFeatureDisabledError(inbox.error)) {
    return (
      <EmptyState
        icon={<Bell className="size-5" aria-hidden />}
        title="Messages are switched off at your school"
        body="Your school has not turned this part of the app on. Notices still go up the usual way — ask your form teacher."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {inbox.error ? (
        <Alert tone="danger" title="Your messages would not load">
          {getApiErrorMessage(inbox.error)}
        </Alert>
      ) : null}
      {read.error ? (
        <Alert tone="danger" title="That message would not open">
          {getApiErrorMessage(read.error)}
        </Alert>
      ) : null}
      {clear.error ? (
        <Alert tone="danger" title="Those messages would not clear">
          {getApiErrorMessage(clear.error)}
        </Alert>
      ) : null}

      <Card
        title="Messages"
        subtitle={
          inbox.isPending
            ? undefined
            : `${messages.length} message${messages.length === 1 ? "" : "s"} · ${unread.length} unread`
        }
        actions={
          messages.length > 0 ? (
            <span className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={unread.length === 0}
                loading={read.isPending}
                onClick={() => read.mutate(unread.map((item) => item.recipientId))}
              >
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={clear.isPending}
                onClick={() => {
                  void (async () => {
                    const confirmed = await dsConfirm({
                      title: `Clear ${messages.length} message${messages.length === 1 ? "" : "s"}`,
                      description:
                        "They come off this list. The school still has them, so nothing is lost.",
                      confirmLabel: "Clear them",
                      variant: "warning",
                    });
                    if (!confirmed) return;
                    clear.mutate(messages.map((item) => item.recipientId));
                  })();
                }}
              >
                Clear
              </Button>
            </span>
          ) : undefined
        }
        flush
      >
        {inbox.isPending ? (
          <StatusState
            variant="loading"
            title="Getting your messages…"
            body="Reading what the school has sent you."
          />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-5" aria-hidden />}
            title="Nothing new"
            body="Messages from the school land here — marks going up, homework set, notices from the office."
          />
        ) : (
          <MobileList>
            {messages.map((item) => {
              const tone = toneOf(item);
              return (
                <MobileListRow
                  key={item.recipientId}
                  className="min-h-[var(--h-control-lg)]"
                  leading={
                    <IconTile accent={tone.accent}>
                      <tone.Icon className="size-4" aria-hidden />
                    </IconTile>
                  }
                  title={
                    <span className={item.isRead ? undefined : "t-strong"}>
                      {item.title}
                    </span>
                  }
                  subtitle={item.summary}
                  trailing={
                    <span className="flex flex-col items-end gap-1">
                      {item.isRead ? null : <Badge tone="info">Unread</Badge>}
                      <span className="t-mono t-subtle tabular-nums">
                        <ClientDate value={item.createdAt} mode="datetime" />
                      </span>
                    </span>
                  }
                  aria-label={`${tone.label}: ${item.title}${item.isRead ? "" : ", unread"}`}
                  onClick={() => {
                    if (item.isRead) return;
                    read.mutate([item.recipientId]);
                  }}
                />
              );
            })}
          </MobileList>
        )}
      </Card>
    </div>
  );
}
