"use client";

import { useQuery } from "@tanstack/react-query";

import { PrintDocumentButton } from "@/components/schools/common/print-document-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

import { useParentPortal } from "./parent-portal-context";

/**
 * S-6.5 — the marks the school has released.
 *
 * Nothing appears here until a sheet is PUBLISHED, and the empty state says so in
 * those terms rather than "no marks": a parent whose child sat four papers and
 * sees "no marks" concludes the school lost them.
 *
 * Pass or not is judged against each subject's own pass mark, which travels with
 * the mark. 45 is a fail in Mathematics and a pass in Shona at the same school
 * (S-1.3), so a single school-wide line would be wrong on one of them.
 */

type Mark = {
  id: string;
  subjectCode: string;
  subjectName: string;
  passMark: number | null;
  score: number;
  grade: string | null;
  remarks: string | null;
  term: { id: string; name: string } | null;
  publishedAt: string | null;
};

export function ParentMarksScreen() {
  const { child, term } = useParentPortal();

  const query = useQuery({
    queryKey: ["portal", "parent", "marks", child?.id],
    queryFn: () =>
      fetchJson<{ marks: Mark[] }>(
        `/api/v2/schools/portal/parent/child/marks?childId=${child!.id}`,
      ),
    enabled: Boolean(child?.id),
  });

  if (!child) {
    return <p className="py-8 text-center text-sm text-[var(--text-muted)]">No child selected.</p>;
  }

  if (!child.canSeeResults) {
    return (
      <Alert>
        <AlertTitle>Marks are not shown on your account</AlertTitle>
        <AlertDescription>
          The school has set your account up without academic access for {child.firstName}.
        </AlertDescription>
      </Alert>
    );
  }

  if (query.isPending) return <Skeleton className="h-48 w-full" />;

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Marks could not be loaded</AlertTitle>
        <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const marks = query.data?.marks ?? [];

  if (marks.length === 0) {
    return (
      <div className="space-y-2 py-8 text-center">
        <p className="font-medium">Marks have not been released yet</p>
        <p className="text-sm text-[var(--text-muted)]">
          The school publishes marks once they have been checked. Nothing is missing — there is
          simply nothing to read yet.
        </p>
      </div>
    );
  }

  const byTerm = new Map<string, Mark[]>();
  for (const mark of marks) {
    const key = mark.term?.name ?? "This term";
    byTerm.set(key, [...(byTerm.get(key) ?? []), mark]);
  }

  return (
    <div className="space-y-5">
      {[...byTerm.entries()].map(([termName, rows]) => {
        const average = rows.reduce((sum, row) => sum + row.score, 0) / rows.length;
        return (
          <section key={termName} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
                {termName}
              </h2>
              <span className="text-sm text-[var(--text-muted)] tabular-nums">
                average {average.toFixed(1)}
              </span>
            </div>
            <ul className="space-y-2">
              {rows.map((mark) => {
                const passed = mark.passMark == null ? null : mark.score >= mark.passMark;
                return (
                  <li
                    key={mark.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{mark.subjectName}</span>
                      {mark.remarks ? (
                        <span className="block text-sm text-[var(--text-muted)]">{mark.remarks}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-lg font-semibold tabular-nums">
                        {mark.score.toFixed(0)}
                      </span>
                      <span
                        className={
                          passed === false
                            ? "block text-sm text-[var(--status-error-text)]"
                            : "block text-sm text-[var(--text-muted)]"
                        }
                      >
                        {mark.grade ?? "—"}
                        {passed === false ? " · below pass" : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {term?.id ? (
        <PrintDocumentButton
          sourceKey="schools.report-card"
          recordId={child.id}
          filters={{ termId: term.id }}
          label="Download report card"
        />
      ) : null}
    </div>
  );
}
