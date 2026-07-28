"use client";

import Link from "next/link";
import { Fragment } from "react";

import {
  parseInline,
  referenceHref,
  segmentRichText,
  type Reference,
} from "@/lib/crm/rich-text";
import { cn } from "@/lib/utils";

/**
 * Everything written anywhere in the CRM, drawn.
 *
 * Notes, comments, descriptions and activity bodies all use one renderer so a
 * reference to a deal looks and behaves the same wherever somebody typed it.
 * Two renderers for one format is how you end up with a mention that is a link
 * in comments and grey text on a timeline.
 */

function ReferenceChip({ reference }: { reference: Reference }) {
  const href = referenceHref(reference);
  const label = reference.kind === "user" ? `@${reference.label}` : reference.label;

  const chip = (
    <span
      className={cn(
        "rounded px-1 font-medium",
        reference.kind === "user"
          ? "bg-[var(--accent-subtle)]"
          : "underline decoration-[var(--border)] underline-offset-2",
      )}
    >
      {label}
    </span>
  );

  if (!href) return chip;

  return (
    <Link href={href} className="hover:decoration-[var(--text)]">
      {chip}
    </Link>
  );
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, index) => {
        switch (token.kind) {
          case "bold":
            return <strong key={index}>{token.text}</strong>;
          case "italic":
            return <em key={index}>{token.text}</em>;
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-[var(--surface-subtle)] px-1 font-mono text-sm"
              >
                {token.text}
              </code>
            );
          default:
            return <Fragment key={index}>{token.text}</Fragment>;
        }
      })}
    </>
  );
}

/** One line, which may be a bullet or a quote. */
function Line({ text }: { text: string }) {
  if (text.startsWith("- ")) {
    return (
      <span className="flex gap-2">
        <span aria-hidden="true" className="text-[var(--text-subtle)]">
          •
        </span>
        <span className="min-w-0 flex-1">
          <Inline text={text.slice(2)} />
        </span>
      </span>
    );
  }

  if (text.startsWith("> ")) {
    return (
      <span className="block border-l-2 border-[var(--border)] pl-2 text-[var(--text-muted)]">
        <Inline text={text.slice(2)} />
      </span>
    );
  }

  return <Inline text={text} />;
}

export function RichTextRenderer({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  // References are resolved first so a reference label containing an asterisk
  // is not read as emphasis — the label is data, not prose.
  const segments = segmentRichText(body);

  const lines: Array<Array<{ text?: string; reference?: Reference }>> = [[]];
  for (const segment of segments) {
    if (segment.kind === "reference") {
      lines[lines.length - 1].push({ reference: segment.reference });
      continue;
    }
    const parts = segment.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part });
    });
  }

  return (
    <div className={cn("space-y-1 text-sm text-[var(--text-body)]", className)}>
      {lines.map((line, lineIndex) => (
        <p key={lineIndex} className="whitespace-pre-wrap break-words">
          {line.map((piece, pieceIndex) =>
            piece.reference ? (
              <ReferenceChip key={pieceIndex} reference={piece.reference} />
            ) : (
              <Line key={pieceIndex} text={piece.text ?? ""} />
            ),
          )}
          {/* An empty line is a paragraph break somebody typed on purpose. */}
          {line.length === 0 ? <span>&nbsp;</span> : null}
        </p>
      ))}
    </div>
  );
}
