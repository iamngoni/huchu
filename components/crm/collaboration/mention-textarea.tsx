"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/api-client";
import { activeMentionQuery, insertMention, type MentionCandidate } from "@/lib/crm/mentions";
import { cn } from "@/lib/utils";

type TeamResponse = { data: { id: string; name: string | null; email: string }[] };

/**
 * A textarea that turns "@" into a person picker.
 *
 * The team list is small and cached, so filtering happens in the browser: a
 * request per keystroke would make the picker feel slower than typing the name
 * out by hand.
 */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  const { data } = useQuery({
    queryKey: ["crm-team"],
    queryFn: () => fetchJson<TeamResponse>("/api/v2/crm/team"),
    staleTime: 5 * 60_000,
  });

  const candidates: MentionCandidate[] = (data?.data ?? []).filter((user) => {
    if (query === null) return false;
    if (!query) return true;
    const needle = query.toLowerCase();
    return (
      (user.name ?? "").toLowerCase().includes(needle) ||
      user.email.toLowerCase().includes(needle)
    );
  });
  const visible = candidates.slice(0, 6);

  const sync = (next: string, caret: number) => {
    onChange(next);
    setQuery(activeMentionQuery(next, caret));
    setHighlighted(0);
  };

  const pick = (user: MentionCandidate) => {
    const caret = ref.current?.selectionStart ?? value.length;
    const result = insertMention(value, caret, query ?? "", user);
    onChange(result.body);
    setQuery(null);
    // Put the caret after the inserted name so typing continues naturally.
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(result.caret, result.caret);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        rows={rows}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(event) => sync(event.target.value, event.target.selectionStart)}
        onClick={(event) =>
          setQuery(activeMentionQuery(value, event.currentTarget.selectionStart))
        }
        onBlur={() => setQuery(null)}
        onKeyDown={(event) => {
          if (query !== null && visible.length) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlighted((index) => (index + 1) % visible.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlighted((index) => (index - 1 + visible.length) % visible.length);
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              pick(visible[highlighted]);
              return;
            }
            if (event.key === "Escape") {
              setQuery(null);
              return;
            }
          }
          if (onSubmit && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />

      {query !== null && visible.length ? (
        <ul
          className="absolute z-20 mt-1 w-64 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-lg"
          role="listbox"
        >
          {visible.map((user, index) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                // Mouse-down fires before the textarea's blur, so the click
                // isn't swallowed by the picker closing.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(user);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                  index === highlighted ? "bg-[var(--surface-hover)]" : "",
                )}
              >
                <span className="font-medium">{user.name ?? user.email}</span>
                <span className="text-sm text-[var(--text-muted)]">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
