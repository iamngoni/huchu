"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  FileText,
  Mail,
  NoteAdd,
  Payments,
  Phone,
  Send,
  User,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

import type { LeadActivity } from "./lead-types";

const PAGE_SIZE = 25;

const ACTIVITY_ICONS: Record<string, typeof NoteAdd> = {
  NOTE: NoteAdd,
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: Send,
  MEETING: Calendar,
  STAGE_CHANGE: ArrowRight,
  INTAKE_SUBMISSION: User,
  DOCUMENT_CREATED: FileText,
  DOCUMENT_SENT: Send,
  DOCUMENT_APPROVED: Check,
  DOCUMENT_DECLINED: AlertTriangle,
  PAYMENT_RECORDED: Payments,
  SYSTEM: ArrowRight,
};

/** System rows are quieter than things a person did — they're context, not news. */
const SYSTEM_TYPES = new Set([
  "STAGE_CHANGE",
  "SYSTEM",
  "DOCUMENT_CREATED",
  "DOCUMENT_SENT",
  "DOCUMENT_APPROVED",
  "DOCUMENT_DECLINED",
  "PAYMENT_RECORDED",
]);

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const groups = useMemo(() => {
    const shown = activities.slice(0, visible);
    const map = new Map<string, LeadActivity[]>();
    for (const activity of shown) {
      const key = dayKey(activity.occurredAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(activity);
      else map.set(key, [activity]);
    }
    return Array.from(map.entries());
  }, [activities, visible]);

  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--text-muted)]">
        Nothing has happened on this lead yet. Log a call or a note above to start the trail.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([key, entries]) => (
        <section key={key} className="space-y-2">
          <h4 className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {dayLabel(entries[0].occurredAt)}
          </h4>
          <ul className="space-y-2">
            {entries.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.type] ?? NoteAdd;
              const isSystem = SYSTEM_TYPES.has(activity.type);
              return (
                <li key={activity.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      isSystem
                        ? "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                        : "bg-[var(--surface-subtle)] text-[var(--text)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", isSystem && "text-[var(--text-muted)]")}>
                      {activity.subject}
                    </p>
                    {activity.body ? (
                      <p className="whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                        {activity.body}
                      </p>
                    ) : null}
                    <p className="text-sm text-[var(--text-muted)]">
                      {timeLabel(activity.occurredAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {visible < activities.length ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setVisible((current) => current + PAGE_SIZE)}
        >
          Show older activity
        </Button>
      ) : null}
    </div>
  );
}
