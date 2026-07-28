"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/api-client";
import {
  activeReferenceQuery,
  insertReference,
  referenceKindFromSearchType,
  toggleMarker,
  togglePrefix,
  type Reference,
} from "@/lib/crm/rich-text";
import { Eye, ListBullets, type LucideIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { RichTextRenderer } from "./rich-text-renderer";

type TeamResponse = { data: { id: string; name: string | null; email: string }[] };
type SearchResponse = {
  groups: Array<{
    type: string;
    label: string;
    results: Array<{
      id: string;
      title: string;
      reference: string | null;
      subtitle: string | null;
    }>;
  }>;
};

type Candidate = Reference & { hint: string | null; group: string };

/**
 * One composer for notes, comments and descriptions.
 *
 * The formatting is deliberately three buttons. Every marker you add is one
 * more thing somebody types by accident and then has to escape, and no CRM
 * note has ever needed a heading level.
 *
 * `@` searches people *and* records, which is the part that matters: half of
 * what somebody writes on a deal is about another deal, the site it is on, or
 * the company behind both, and a mention system that only knows colleagues
 * makes them paste a URL instead. Only people get notified — referring to a
 * deal is a link, not a summons.
 */

type Tool = {
  id: string;
  label: string;
  icon?: LucideIcon;
  glyph?: string;
  apply: (body: string, start: number, end: number) => {
    body: string;
    start: number;
    end: number;
  };
};

const TOOLS: Tool[] = [
  {
    id: "bold",
    label: "Bold",
    glyph: "B",
    apply: (body, start, end) => toggleMarker(body, start, end, "**"),
  },
  {
    id: "italic",
    label: "Italic",
    glyph: "I",
    apply: (body, start, end) => toggleMarker(body, start, end, "*"),
  },
  {
    id: "code",
    label: "Code",
    glyph: "‹›",
    apply: (body, start, end) => toggleMarker(body, start, end, "`"),
  },
  {
    id: "bullet",
    label: "Bulleted list",
    icon: ListBullets,
    apply: (body, start, end) => togglePrefix(body, start, end, "- "),
  },
  {
    id: "quote",
    label: "Quote",
    glyph: "❝",
    apply: (body, start, end) => togglePrefix(body, start, end, "> "),
  },
];

export function RichTextComposer({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  onSubmit,
  /** Turn off the record half of the picker where only people make sense. */
  peopleOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onSubmit?: () => void;
  peopleOnly?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [preview, setPreview] = useState(false);

  const { data: team } = useQuery({
    queryKey: ["crm-team"],
    queryFn: () => fetchJson<TeamResponse>("/api/v2/crm/team"),
    staleTime: 5 * 60_000,
  });

  // Records are searched on the server because there are too many to cache;
  // people are not, because a request per keystroke would make picking a
  // colleague slower than typing their name.
  const { data: records } = useQuery({
    queryKey: ["crm-reference-search", query],
    queryFn: () =>
      fetchJson<SearchResponse>(`/api/v2/crm/search?q=${encodeURIComponent(query ?? "")}&limit=4`),
    enabled: !peopleOnly && query !== null && query.trim().length >= 2,
    staleTime: 30_000,
  });

  const people: Candidate[] = (team?.data ?? [])
    .filter((user) => {
      if (query === null) return false;
      if (!query) return true;
      const needle = query.toLowerCase();
      return (
        (user.name ?? "").toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle)
      );
    })
    .slice(0, 5)
    .map((user) => ({
      kind: "user" as const,
      id: user.id,
      label: user.name ?? user.email,
      hint: user.email,
      group: "People",
    }));

  const recordCandidates: Candidate[] = (records?.groups ?? []).flatMap((group) => {
    const kind = referenceKindFromSearchType(group.type);
    if (!kind) return [];
    return group.results.slice(0, 3).map((result) => ({
      kind,
      id: result.id,
      label: result.title,
      hint: result.reference ?? result.subtitle,
      group: group.label,
    }));
  });

  const visible = [...people, ...recordCandidates].slice(0, 10);

  function sync(next: string, caret: number) {
    onChange(next);
    setQuery(activeReferenceQuery(next, caret));
    setHighlighted(0);
  }

  function pick(candidate: Candidate) {
    const caret = ref.current?.selectionStart ?? value.length;
    const result = insertReference(value, caret, query ?? "", candidate);
    onChange(result.body);
    setQuery(null);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(result.caret, result.caret);
    });
  }

  function runTool(tool: Tool) {
    const element = ref.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? start;
    const result = tool.apply(value, start, end);
    onChange(result.body);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(result.start, result.end);
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-0.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              type="button"
              variant="ghost"
              size="sm"
              aria-label={tool.label}
              title={tool.label}
              disabled={preview}
              onClick={() => runTool(tool)}
            >
              {Icon ? (
                <Icon className="size-4" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-sm",
                    tool.id === "bold" && "font-bold",
                    tool.id === "italic" && "italic",
                  )}
                >
                  {tool.glyph}
                </span>
              )}
            </Button>
          );
        })}

        <span className="flex-1" />

        <Button
          type="button"
          variant={preview ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setPreview((current) => !current)}
        >
          <Eye className="mr-1.5 size-4" aria-hidden="true" />
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>

      {preview ? (
        <div className="min-h-20 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          {value.trim() ? (
            <RichTextRenderer body={value} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <div className="relative">
          <Textarea
            ref={ref}
            rows={rows}
            className={className}
            placeholder={placeholder ?? "Write a note. Type @ to mention someone or link a record."}
            value={value}
            onChange={(event) => sync(event.target.value, event.target.selectionStart)}
            onClick={(event) =>
              setQuery(activeReferenceQuery(value, event.currentTarget.selectionStart))
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
              className="absolute z-20 mt-1 w-80 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-lg"
              role="listbox"
            >
              {visible.map((candidate, index) => {
                const newGroup = index === 0 || visible[index - 1].group !== candidate.group;
                return (
                  <li key={`${candidate.kind}-${candidate.id}`}>
                    {newGroup ? (
                      <p className="px-3 pb-0.5 pt-2 text-sm font-medium text-[var(--text-subtle)]">
                        {candidate.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlighted}
                      // Mouse-down beats the textarea's blur, so the click is
                      // not swallowed by the picker closing.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        pick(candidate);
                      }}
                      onMouseEnter={() => setHighlighted(index)}
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-1.5 text-left text-sm",
                        index === highlighted ? "bg-[var(--surface-hover)]" : "",
                      )}
                    >
                      <span className="truncate font-medium">{candidate.label}</span>
                      {candidate.hint ? (
                        <span className="truncate text-sm text-[var(--text-muted)]">
                          {candidate.hint}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
