"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { Button } from "@/components/ui/button";
import { formatSchoolMoney } from "@/lib/schools/format";

import { useParentPortal } from "./parent-portal-context";

/**
 * S-6.2 (all my children) and the account itself.
 *
 * Every child is listed here with what each is owed and how each is doing, because
 * the switcher answers "show me one" and a parent of three sometimes wants "show
 * me all three". Tapping one selects it everywhere, which is the same act as the
 * chip in the app bar.
 *
 * Sign out is a real sign-out through next-auth rather than a link to a login page:
 * a shared phone is normal here, and a "sign out" that leaves the session alive is
 * the worst kind of lie for a portal holding another family's data.
 */
export function ParentProfileScreen() {
  const { guardian, children, child, selectChild } = useParentPortal();

  if (!guardian) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        This account is not linked to a family yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PersonAvatar
          name={`${guardian.firstName} ${guardian.lastName}`}
          size="lg"
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold">
            {guardian.firstName} {guardian.lastName}
          </p>
          <p className="truncate text-sm text-[var(--text-muted)]">
            {[guardian.phone, guardian.email].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
          My children
        </h2>
        {children.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            The school has not linked any children to your account.
          </p>
        ) : (
          <ul className="space-y-2">
            {children.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => selectChild(candidate.id)}
                  aria-pressed={candidate.id === child?.id}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 text-left"
                >
                  <PersonAvatar
                    firstName={candidate.firstName}
                    lastName={candidate.lastName}
                    src={candidate.avatarUrl}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {candidate.firstName} {candidate.lastName}
                    </span>
                    <span className="block text-sm text-[var(--text-muted)]">
                      {[
                        candidate.currentClass?.name,
                        candidate.relationship.toLowerCase(),
                        candidate.fees && Number(candidate.fees.outstanding) > 0
                          ? `${formatSchoolMoney(Number(candidate.fees.outstanding), candidate.fees.currency)} owed`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {candidate.id === child?.id ? (
                    <span className="shrink-0 text-sm text-[var(--text-muted)]">viewing</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
          Account
        </h2>
        <Link
          href="/portal/parent/help"
          className="block rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
        >
          Help and common questions
        </Link>
        <Button
          type="button"
          variant="outline"
          className="w-full text-[var(--status-error-text)]"
          onClick={() => signOut({ callbackUrl: "/portal/parent/login" })}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}
