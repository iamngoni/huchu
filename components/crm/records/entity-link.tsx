"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A named reference to another record.
 *
 * Detail pages are mostly made of other records — a deal names a company, a
 * site, the people on it, whoever owns it. Those were plain text, so the page
 * told you the name and then made you go and find it. Every one of them is now
 * the way there.
 *
 * Underlined, not just coloured. A colour shift alone is easy to miss against
 * a page of near-black text, and on a screen in daylight on a site it is
 * invisible; the underline is the part that says "this goes somewhere" without
 * relying on anyone noticing a hue.
 */
export function EntityLink({
  href,
  children,
  className,
  muted,
}: {
  /** Where the record lives. Pass null for a reference with no page yet. */
  href: string | null | undefined;
  children: ReactNode;
  className?: string;
  /** For references in supporting text, which should not shout. */
  muted?: boolean;
}) {
  if (!href) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        "underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--text)]",
        muted ? "text-[var(--text-muted)] hover:text-[var(--text)]" : "hover:text-[var(--text)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
