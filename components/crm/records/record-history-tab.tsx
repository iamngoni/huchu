"use client";

import { ClientDate } from "@/components/ui/client-date";
import { ArrowRight } from "@/lib/icons";
import { describeChange, isHistoryActivity, type FieldChange } from "@/lib/crm/history";

type Activity = {
  id: string;
  type: string;
  subject: string;
  body: string | null;
  metadata: unknown;
  occurredAt: string;
};

/**
 * Field-level history: who changed what, from what, to what.
 *
 * Reads the same activity rows as the timeline, filtered to the system entries
 * — so a stage change appears in both places without being written twice.
 */
export function RecordHistoryTab({ activities }: { activities: Activity[] }) {
  const entries = activities.filter(isHistoryActivity);

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--text-muted)]">
        Nothing has been changed on this record yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {entries.map((entry) => {
        const metadata = entry.metadata as { changes?: FieldChange[] } | null;
        const changes = metadata?.changes ?? [];
        return (
          <li key={entry.id} className="flex gap-3 py-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{entry.subject}</p>
              {changes.length > 0 ? (
                <ul className="mt-0.5 space-y-0.5">
                  {changes.map((change) => (
                    <li key={change.field} className="text-xs text-[var(--text-muted)]">
                      {describeChange(change)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-[var(--text-muted)]">
                <ClientDate value={entry.occurredAt} />
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
