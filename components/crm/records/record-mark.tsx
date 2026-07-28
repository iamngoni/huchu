"use client";

import { createElement } from "react";

import { Avatar } from "@corelithzw/react";
import {
  Building2,
  Checklist,
  FileText,
  Funnel,
  MapPin,
  Package,
  Receipt,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * The mark that stands for a record in a list, a card or a page header.
 *
 * Three rules, in order:
 *
 *   1. An uploaded picture wins. Somebody chose it.
 *   2. Otherwise, people and sales reps get an avatar — initials, or their
 *      photo. A person is the one kind of record where the reader is looking
 *      for a *who*, and a generic person glyph repeated down a list tells them
 *      nothing; two letters at least differ row to row.
 *   3. Everything else gets its emoji if it has one, and its entity icon if
 *      not. A company is a company; the icon says which column of the world
 *      this row belongs to, and the emoji is there for when somebody wants
 *      this particular company to be findable at a glance.
 */

export type RecordKind =
  | "person"
  | "rep"
  | "company"
  | "deal"
  | "lead"
  | "site"
  | "task"
  | "document"
  | "work-order"
  | "product"
  | "receipt";

const KIND_ICON: Record<RecordKind, LucideIcon> = {
  person: Users,
  rep: UserRound,
  company: Building2,
  deal: Funnel,
  lead: Funnel,
  site: MapPin,
  task: Checklist,
  document: FileText,
  "work-order": Wrench,
  product: Package,
  receipt: Receipt,
};

/**
 * A stand-in emoji per entity, used where a record has none of its own. These
 * are placeholders — the point today is that every kind of thing has *a* mark
 * rather than a blank space, and they are one edit away from being replaced.
 */
export const KIND_EMOJI: Record<RecordKind, string> = {
  person: "🧑",
  rep: "🧑‍💼",
  company: "🏢",
  deal: "📈",
  lead: "✨",
  site: "📍",
  task: "✅",
  document: "📄",
  "work-order": "🔧",
  product: "📦",
  receipt: "🧾",
};

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "size-7 text-sm",
  md: "size-9 text-base",
  lg: "size-11 text-lg",
};

const AVATAR_SIZE = { sm: "sm", md: "sm", lg: "md" } as const;

export function RecordMark({
  kind,
  name,
  emoji,
  avatarUrl,
  size = "sm",
  className,
}: {
  kind: RecordKind;
  /** Used for an avatar's initials and for the accessible label. */
  name?: string | null;
  /** The record's own emoji, if it has been given one. */
  emoji?: string | null;
  /** An uploaded display picture. Beats everything else. */
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const isPerson = kind === "person" || kind === "rep";

  if (avatarUrl) {
    return (
      <Avatar
        size={AVATAR_SIZE[size]}
        src={avatarUrl}
        name={name ?? undefined}
        className={className}
      />
    );
  }

  if (isPerson) {
    return <Avatar size={AVATAR_SIZE[size]} name={name || "?"} className={className} />;
  }

  const box = cn(
    "inline-flex flex-none items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
    SIZE[size],
    className,
  );

  if (emoji) {
    return (
      <span className={box} role="img" aria-label={name ?? undefined}>
        {emoji}
      </span>
    );
  }

  return (
    <span className={box} aria-hidden="true">
      {createElement(KIND_ICON[kind], { className: "size-4" })}
    </span>
  );
}
