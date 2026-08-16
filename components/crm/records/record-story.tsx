"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { Avatar } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { FileText } from "@/lib/icons";
import {
  EVENT_KIND,
  QUIET_KINDS,
  type EventKind,
  eventKindStyle,
} from "@/components/crm/records/event-kind";
import { RichTextRenderer } from "@/components/crm/collaboration/rich-text-renderer";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

/**
 * The time of day, and nothing else.
 *
 * Same hydration contract as `ClientDate`: the first paint is a slice of the
 * raw ISO string, so the server bytes and the first client render are
 * identical, and only afterwards does the reader's locale come into it.
 * `ClientDate` has no time-only mode, hence the dozen lines.
 */
const NO_RESUBSCRIBE = () => () => {};

function ClientTime({ value }: { value: string }) {
  // useSyncExternalStore rather than a mount effect: the server snapshot and
  // the client's first snapshot are both `false`, so hydration matches without
  // a render-triggering setState.
  const hydrated = useSyncExternalStore(
    NO_RESUBSCRIBE,
    () => true,
    () => false,
  );

  const date = new Date(value);
  if (!hydrated || Number.isNaN(date.getTime())) return <>{value.slice(11, 16)}</>;
  return <>{date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</>;
}

/**
 * One thing that happened, whatever kind of thing it was.
 *
 * The feed's whole job is to be the record's story, and a story told from one
 * table is not the story — it is whichever chapter that table happened to
 * keep. Site visits, tasks, comments and documents each live in their own
 * table for good reasons, and none of those reasons are the reader's problem.
 */
export type StoryEvent = {
  id: string;
  kind: EventKind;
  /** The sentence: "Nicolas Sharp created a task". */
  title: string;
  /** What was said, if anything was. */
  body?: string | null;
  occurredAt: string;
  actorName?: string | null;
  /** People on it, for an email or a meeting. */
  participants?: string[];
  /** Files, shown as chips. */
  attachments?: Array<{ name: string; href?: string }>;
  /** A quiet trailing note — "Created 8 days ago", a due date. */
  meta?: string | null;
  href?: string;
};

/** Events that carry a body worth boxing rather than running as one line. */
const BOXED: ReadonlySet<EventKind> = new Set([
  "email",
  "note",
  "comment",
  "visit",
]);

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(iso) === dayKey(now.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function StoryRow({ event }: { event: StoryEvent }) {
  const { icon: Icon, accent } = eventKindStyle(event.kind);
  const quiet = QUIET_KINDS.has(event.kind);
  const boxed = BOXED.has(event.kind) && Boolean(event.body);

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {event.actorName ? (
          // Coloured by who wrote it, not by what kind of event it is — that
          // second channel is the chip on the rail. The design system hashes
          // the name for us, so two colleagues in one day's worth of rows come
          // out as two colours rather than two identical discs. Solid, to match
          // the chip beside it.
          <Avatar size="sm" name={event.actorName} solid />
        ) : null}
        <span
          className={cn(
            "text-sm",
            quiet ? "text-[var(--text-muted)]" : "font-medium text-[var(--text-strong)]",
          )}
        >
          {event.title}
        </span>
        {/* The day is already the section heading, so the row only needs the
            time of day — a full "8/4/2026, 9:06:53 PM" on every one of a
            hundred rows repeats the heading and adds a second nobody reads. */}
        <span className="text-sm tabular-nums text-[var(--text-subtle)]">
          <ClientTime value={event.occurredAt} />
        </span>
      </div>

      {event.participants && event.participants.length > 0 ? (
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {event.participants.join(", ")}
        </p>
      ) : null}

      {event.body ? (
        // Bodies are written in the CRM's one text format, so a note that
        // mentions a colleague or links a deal reads the same on a timeline as
        // it does in the comment thread it might have been written in.
        <RichTextRenderer
          body={event.body}
          className={cn("mt-1", quiet && "text-[var(--text-muted)]")}
        />
      ) : null}

      {event.attachments && event.attachments.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {event.attachments.slice(0, 3).map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-2 py-1 text-sm">
                <FileText className="size-3.5 text-[var(--text-subtle)]" />
                <span className="max-w-40 truncate">{file.name}</span>
              </span>
            </li>
          ))}
          {event.attachments.length > 3 ? (
            <li className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border)] px-2 py-1 text-sm text-[var(--text-muted)]">
              +{event.attachments.length - 3}
            </li>
          ) : null}
        </ul>
      ) : null}

      {event.meta ? (
        <p className="mt-1 text-sm text-[var(--text-subtle)]">{event.meta}</p>
      ) : null}
    </>
  );

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {/* The rail. Drawn per row rather than once behind the list so the last
          row's line stops at its own icon instead of running into the gap. */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-[11px] top-6 w-px bg-[var(--border-subtle)] last:hidden"
      />

      {/* The kind, as a colour and a glyph. `data-accent` is how the design
          system swaps a hue — it rebinds `--accent-*` on this element, so the
          classes below stay static and only the attribute changes.

          Solid, not a tint inside a ring. A 24px disc has room for one thing,
          and a pale wash behind a pale glyph inside a pale outline spends all
          three on the same weak signal — at arm's length the whole rail read as
          one grey column again. `.solid-mark` owns the fill-and-glyph pairing
          for every mark in the product; see `globals.css` for why three of the
          thirteen hues are darkened rather than reversed. */}
      <span
        data-accent={accent}
        title={EVENT_KIND[event.kind]?.label}
        className="solid-mark relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
      >
        <Icon className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        {boxed ? (
          // What somebody actually wrote gets a box, and the box takes the
          // event's colour on its leading edge — so a scrolled feed shows at a
          // glance which paragraphs are the client's and which are ours,
          // without reading a word of any of them.
          <div
            data-accent={accent}
            className="rounded-[var(--card-radius)] border border-[var(--border)] border-l-2 border-l-[var(--accent-solid)] p-3"
          >
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </li>
  );
}

/**
 * A record's whole story, day by day.
 *
 * Callers merge their own sources into `events` rather than this component
 * fetching them, because which sources exist depends on what the record is —
 * a site has visits and no quotes, a person has comments and no stages.
 */
export function RecordStory({
  events,
  emptyMessage = "Nothing has happened here yet.",
  header,
}: {
  events: StoryEvent[];
  emptyMessage?: string;
  header?: ReactNode;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const groups = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    const shown = sorted.slice(0, visible);
    const map = new Map<string, StoryEvent[]>();
    for (const event of shown) {
      const key = dayKey(event.occurredAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()];
  }, [events, visible]);

  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  // One instant for every heading, so a feed rendered across midnight does not
  // label half its rows "Today" and half by date.
  const now = new Date();

  return (
    <div className="space-y-5">
      {header}

      {groups.map(([key, entries]) => (
        <section key={key} className="space-y-2">
          <h4 className="text-sm font-semibold">{dayLabel(entries[0].occurredAt, now)}</h4>
          <ul className="relative">
            {entries.map((event) => (
              <StoryRow key={`${event.kind}-${event.id}`} event={event} />
            ))}
          </ul>
        </section>
      ))}

      {visible < events.length ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setVisible((current) => current + PAGE_SIZE)}
        >
          Show older
        </Button>
      ) : null}
    </div>
  );
}
