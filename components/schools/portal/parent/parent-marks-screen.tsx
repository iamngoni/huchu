"use client";

import { useQuery } from "@tanstack/react-query";

import { PrintDocumentButton } from "@/components/schools/common/print-document-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { MedusaBookOpenIcon } from "@/lib/icons";

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
 * (S-1.3), so a single school-wide line would be wrong on one of them. The bar
 * under each subject is toned the same way — brand for a mark with no pass mark to
 * judge it by, success or danger once there is one.
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
    return (
      <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No child selected.</p>
    );
  }

  if (!child.canSeeResults) {
    return (
      <div className="p-4">
        <Alert>
          <AlertTitle>Marks are not shown on your account</AlertTitle>
          <AlertDescription>
            The school has set your account up without academic access for {child.firstName}.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="p-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Marks could not be loaded</AlertTitle>
          <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const marks = query.data?.marks ?? [];

  if (marks.length === 0) {
    return (
      <div className="space-y-2 px-6 py-10 text-center">
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
    <div className="pp-page">
      {[...byTerm.entries()].map(([termName, rows]) => (
        <section key={termName}>
          <div className="section-h">
            {termName}
            <span className="mono-note">
              {rows.length} {rows.length === 1 ? "subject" : "subjects"}
            </span>
          </div>
          <div className="px-4">
            {rows.map((mark) => {
              const passed = mark.passMark == null ? null : mark.score >= mark.passMark;
              const tone = passed === null ? "" : passed ? "good" : "bad";
              const width = Math.max(0, Math.min(100, mark.score));
              return (
                <div key={mark.id} className="subj-card">
                  <div className="hd">
                    <span className="ic-tile brand">
                      <MedusaBookOpenIcon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="nm">{mark.subjectName}</div>
                      <div className="sb">
                        {[mark.grade, mark.remarks].filter(Boolean).join(" · ") ||
                          mark.subjectCode}
                      </div>
                    </div>
                    <span className={tone ? `v ${tone}` : "v"}>
                      {mark.score.toFixed(0)}
                      <span className="unit">%</span>
                    </span>
                  </div>
                  <div className="bar">
                    <span className={tone} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {term?.id ? (
        <div className="px-4 pt-2">
          <PrintDocumentButton
            sourceKey="schools.report-card"
            recordId={child.id}
            filters={{ termId: term.id }}
            label="Download report card"
          />
        </div>
      ) : null}
    </div>
  );
}
