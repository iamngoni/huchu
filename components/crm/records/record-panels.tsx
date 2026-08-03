"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, Chip, Stack } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { ClientDate } from "@/components/ui/client-date";
import { EntityLink } from "@/components/crm/records/entity-link";
import { richTextToPlain } from "@/lib/crm/rich-text";
import { fileMark, formatFileSize, meetingPlace, timeToStart } from "@/lib/crm/panels";
import {
  CalendarCheck,
  Download,
  Mail,
  MapPin,
  Phone,
  Video,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * The compact panels that sit beside a record.
 *
 * The rail was a stack of headings with a sentence under each: a date as a
 * date, an address as a string, a file as a filename. All correct, all inert.
 * Somebody looking at "14 March 2026, 09:00" still has to work out whether
 * that is today, and somebody looking at eleven filenames still has to read
 * eleven filenames to find the PDF.
 *
 * So each panel does the small piece of work the reader was doing: how long
 * until it, where exactly, which one is the photo. The primitives are the
 * house ones — this is composition, not a second design system.
 */

export type PanelMeeting = {
  id: string;
  title: string;
  scheduledStart: string;
  location?: string | null;
  attendeeName?: string | null;
};

/**
 * The next meeting, and what to press when it starts.
 *
 * The countdown is the point. A start time answers "when is it" and leaves
 * "should I be doing something about it right now" to the reader and their
 * own watch, which is the question they actually opened the page with.
 */
export function MeetingCard({
  meeting,
  action,
}: {
  meeting: PanelMeeting;
  action?: ReactNode;
}) {
  const countdown = timeToStart(meeting.scheduledStart);
  const place = meetingPlace(meeting.location);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-[var(--text-strong)]">
          {meeting.title}
        </p>
        <Badge tone={countdown.imminent ? "warn" : countdown.past ? "neutral" : "info"}>
          {countdown.label}
        </Badge>
      </div>

      <p className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
        <CalendarCheck className="size-4 shrink-0" aria-hidden="true" />
        <ClientDate value={meeting.scheduledStart} mode="datetime" />
      </p>

      {place.kind === "map" ? (
        <p className="flex items-start gap-1.5 text-sm text-[var(--text-muted)]">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{place.text}</span>
        </p>
      ) : null}

      {meeting.attendeeName ? (
        <p className="text-sm text-[var(--text-muted)]">{meeting.attendeeName} is going</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {place.kind === "join" ? (
          <Button asChild size="sm" variant={countdown.imminent ? "primary" : "secondary"}>
            <a href={place.url} target="_blank" rel="noreferrer">
              <Video className="size-4" />
              Join
            </a>
          </Button>
        ) : null}
        {place.kind === "map" ? (
          <Button asChild size="sm" variant="secondary">
            <a href={place.url} target="_blank" rel="noreferrer">
              <MapPin className="size-4" />
              Directions
            </a>
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}

export type ActivityCount = { label: string; count: number; icon?: ReactNode };

/**
 * How much has been going on, at a glance.
 *
 * A strip rather than a chart: the question is "has anybody spoken to these
 * people" and the answer is a handful of small numbers, which a chart would
 * spend two hundred pixels failing to say more clearly.
 */
export function ActivityStrip({ counts }: { counts: ActivityCount[] }) {
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Nothing logged yet.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {counts
        .filter((entry) => entry.count > 0)
        .map((entry) => (
          <li key={entry.label}>
            <Chip asChild accent="gray" leading={entry.icon}>
              <span>
                <span className="font-mono">{entry.count}</span> {entry.label}
              </span>
            </Chip>
          </li>
        ))}
    </ul>
  );
}

export type PanelAttachment = {
  id: string;
  name: string;
  url: string;
  size?: number | null;
  uploadedAt?: string | null;
};

/**
 * Files, scannable by type.
 *
 * The coloured mark is doing real work: a rail of eleven attachments is
 * searched for "the PDF" or "the photo", and colour answers that without
 * reading a single filename.
 */
export function AttachmentsPanel({
  attachments,
  emptyMessage = "Nothing attached yet.",
}: {
  attachments: PanelAttachment[];
  emptyMessage?: string;
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  return (
    <Stack as="ul" gap="xs">
      {attachments.map((attachment) => {
        const mark = fileMark(attachment.name);
        const size = formatFileSize(attachment.size);
        return (
          <li key={attachment.id}>
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] py-1 hover:bg-[var(--surface-hover)]"
            >
              <span
                data-accent={mark.accent}
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-bg)] font-mono text-sm font-medium text-[var(--accent-fg)]"
              >
                {mark.label}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[var(--text-strong)]">
                  {attachment.name}
                </span>
                <span className="block text-sm text-[var(--text-muted)]">
                  {size}
                  {size && attachment.uploadedAt ? " · " : ""}
                  {attachment.uploadedAt ? <ClientDate value={attachment.uploadedAt} /> : null}
                </span>
              </span>

              <Download
                className="size-4 shrink-0 text-[var(--text-subtle)] opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100"
                aria-hidden="true"
              />
            </a>
          </li>
        );
      })}
    </Stack>
  );
}

export type NextInteraction = {
  kind: "task" | "visit" | "follow-up";
  title: string;
  at: string;
  href?: string;
  assigneeName?: string | null;
};

const INTERACTION_LABEL: Record<NextInteraction["kind"], string> = {
  task: "Task",
  visit: "Site visit",
  "follow-up": "Follow-up",
};

/**
 * The next thing due, whatever kind of thing it is.
 *
 * One card rather than three, because "what is next on this" does not care
 * whether the answer is a task, a visit or a follow-up — and three panels each
 * showing its own next item makes the reader do the comparison.
 */
export function NextInteractionCard({
  interaction,
  emptyMessage = "Nothing scheduled.",
  action,
}: {
  interaction: NextInteraction | null;
  emptyMessage?: string;
  action?: ReactNode;
}) {
  if (!interaction) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
        {action}
      </div>
    );
  }

  const countdown = timeToStart(interaction.at);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-[var(--text-muted)]">
          {INTERACTION_LABEL[interaction.kind]}
        </span>
        <Badge tone={countdown.past ? "danger" : countdown.imminent ? "warn" : "neutral"}>
          {countdown.past ? `Overdue ${countdown.label}` : countdown.label}
        </Badge>
      </div>

      {interaction.href ? (
        <EntityLink href={interaction.href}>{interaction.title}</EntityLink>
      ) : (
        <p className="text-sm font-medium text-[var(--text-strong)]">{interaction.title}</p>
      )}

      <p className="text-sm text-[var(--text-muted)]">
        <ClientDate value={interaction.at} mode="datetime" />
        {interaction.assigneeName ? ` · ${interaction.assigneeName}` : ""}
      </p>

      {action}
    </div>
  );
}

export type PanelMessage = {
  id: string;
  subject: string | null;
  body: string | null;
  at: string;
  actorName?: string | null;
};

/**
 * The last email, enough of it to know whether to open it.
 *
 * Two lines of the body rather than none: a subject alone is how somebody
 * clicks through to discover it was the automatic one.
 */
export function EmailPreview({
  message,
  href,
  emptyMessage = "No email logged yet.",
}: {
  message: PanelMessage | null;
  href?: string;
  emptyMessage?: string;
}) {
  if (!message) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  const snippet = richTextToPlain(message.body ?? "", 160);

  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <Mail className="size-4 shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-[var(--text-strong)]">
            {message.subject?.trim() || "No subject"}
          </span>
        </span>
        <span className="shrink-0 text-sm text-[var(--text-muted)]">
          <ClientDate value={message.at} />
        </span>
      </div>
      {snippet ? (
        <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{snippet}</p>
      ) : null}
      {message.actorName ? (
        <p className="mt-1 text-sm text-[var(--text-subtle)]">{message.actorName}</p>
      ) : null}
    </>
  );

  return href ? (
    <Link href={href} className="block rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)]">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

export type PanelCall = {
  id: string;
  at: string;
  actorName?: string | null;
  summary?: string | null;
  /** Somebody rang and nobody answered — worth showing differently. */
  missed?: boolean;
};

/**
 * Who has rung, and when.
 *
 * Separated from the timeline because "when did we last actually speak to
 * them" is the question that decides whether to ring now, and answering it
 * from a mixed feed means scrolling past every note and stage change.
 */
export function CallList({
  calls,
  emptyMessage = "Nobody has logged a call.",
}: {
  calls: PanelCall[];
  emptyMessage?: string;
}) {
  if (calls.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  return (
    <Stack as="ul" gap="xs">
      {calls.map((call) => (
        <li key={call.id} className="flex items-start gap-2">
          <Phone
            className={cn(
              "mt-0.5 size-4 shrink-0",
              call.missed ? "text-[var(--status-error-text)]" : "text-[var(--text-subtle)]",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-[var(--text-strong)]">
                {call.actorName ?? "Someone"}
                {call.missed ? " · no answer" : ""}
              </span>
              <span className="shrink-0 text-sm text-[var(--text-muted)]">
                <ClientDate value={call.at} />
              </span>
            </span>
            {call.summary ? (
              <span className="block truncate text-sm text-[var(--text-muted)]">
                {richTextToPlain(call.summary, 120)}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </Stack>
  );
}
