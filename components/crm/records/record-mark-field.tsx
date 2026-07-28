"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RecordMark, type RecordKind } from "./record-mark";

/**
 * A handful of marks that cover most of what a flooring business files.
 * Not a picker — a picker over the whole emoji set is a search problem, and
 * the field takes free text anyway for anyone who wants something else.
 */
const SUGGESTIONS = ["🏢", "🏗️", "🏠", "🏬", "🏭", "⭐", "🔥", "🧵", "🪵", "🧰", "📐", "🚚"];

/**
 * Sets a record's emoji or display picture.
 *
 * The two are one control because they answer the same question — what should
 * stand for this record — and only one of them can win. The preview shows what
 * the record will actually look like in a list, including the fallback, so
 * "leave it alone" is a visible choice rather than an empty box.
 */
export function RecordMarkField({
  kind,
  name,
  emoji,
  avatarUrl,
  onChange,
}: {
  kind: RecordKind;
  name: string;
  emoji: string;
  avatarUrl: string;
  onChange: (next: { emoji: string; avatarUrl: string }) => void;
}) {
  const [showUrl, setShowUrl] = useState(Boolean(avatarUrl));

  return (
    <div className="space-y-2">
      <Label>Mark</Label>
      <div className="flex flex-wrap items-center gap-3">
        <RecordMark
          kind={kind}
          name={name}
          emoji={emoji || null}
          avatarUrl={avatarUrl || null}
          size="lg"
        />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Input
            value={emoji}
            onChange={(event) => onChange({ emoji: event.target.value, avatarUrl })}
            placeholder="Emoji"
            aria-label="Emoji for this record"
            maxLength={16}
            className="h-9 w-24 text-center"
          />
          {SUGGESTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Use ${option}`}
              onClick={() => onChange({ emoji: option, avatarUrl })}
              className="flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-muted)]"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {showUrl ? (
        <Input
          value={avatarUrl}
          onChange={(event) => onChange({ emoji, avatarUrl: event.target.value })}
          placeholder="https://…"
          aria-label="Link to a display picture"
          className="h-9"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (showUrl) onChange({ emoji, avatarUrl: "" });
            setShowUrl((previous) => !previous);
          }}
        >
          {showUrl ? "Use an emoji instead" : "Use a picture"}
        </Button>
        {emoji || avatarUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange({ emoji: "", avatarUrl: "" });
              setShowUrl(false);
            }}
          >
            Clear
          </Button>
        ) : null}
        <p className="text-sm text-[var(--text-muted)]">
          {/* Saying what happens when it is left empty, since that is the
              state most records will be in. */}
          A picture wins over an emoji. With neither, the record shows its
          {kind === "person" || kind === "rep" ? " initials." : " entity icon."}
        </p>
      </div>
    </div>
  );
}
