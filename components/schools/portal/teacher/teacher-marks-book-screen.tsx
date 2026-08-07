"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@corelithzw/react";
import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { useTeacherPortal } from "./teacher-portal-context";

type Band = { code: string; label: string | null; minScore: number; maxScore: number };

type Mark = {
  studentId: string;
  student: { id: string; studentNo: string; firstName: string; lastName: string };
  subject: { id: string; code: string; name: string };
  mark: number | null;
  continuous: number | null;
  exam: number | null;
  grade: Band | null;
  caveat: string | null;
};

type TermMarks = { termId: string; scheme: { name: string }; marks: Mark[] };

/** A grade's tone: the top band reads well, the bottom reads as needing work. */
function bandTone(band: Band | null): "success" | "warn" | "danger" | "neutral" {
  if (!band) return "neutral";
  if (band.minScore >= 70) return "success";
  if (band.minScore >= 50) return "warn";
  return "danger";
}

/**
 * The marks book: where every child stands this term.
 *
 * The demo's gradebook is a grid of assessment columns. This is the same
 * question answered one level up — the term mark each assessment feeds, with
 * its continuous and exam sides shown separately so a teacher can see *why* a
 * mark is what it is. Entering the marks is the other screen; this one is for
 * reading them.
 *
 * A child with nothing marked is a row saying so, not a row left out. And the
 * caveat the grading module produces — "no exam sat yet", say — is printed
 * rather than swallowed, because a mark that is two thirds of a picture should
 * announce it.
 */
export function TeacherMarksBookScreen() {
  const { selectedClass } = useTeacherPortal();

  const query = useQuery({
    queryKey: [
      "schools",
      "portal",
      "teacher",
      "term-marks",
      selectedClass?.classId,
      selectedClass?.classSubjectId,
    ],
    queryFn: () =>
      fetchJson<TermMarks>(
        `/api/v2/schools/assessments/term-marks?classId=${selectedClass?.classId}&classSubjectId=${selectedClass?.classSubjectId}`,
      ),
    enabled: Boolean(selectedClass),
  });

  if (!selectedClass) {
    return (
      <EmptyState
        title="Pick a class first"
        body="Choose one of your classes in the rail on the left and its marks book opens here."
      />
    );
  }

  const marks = query.data?.marks ?? [];
  const marked = marks.filter((row) => row.mark !== null);
  const average =
    marked.length === 0
      ? null
      : Math.round(marked.reduce((total, row) => total + (row.mark ?? 0), 0) / marked.length);

  return (
    <div className="flex flex-col gap-4">
      {query.error ? (
        <Alert tone="danger" title="The marks book would not load">
          {getApiErrorMessage(query.error)}
        </Alert>
      ) : null}

      <Card
        title={`${selectedClass.className}${selectedClass.streamName ? ` ${selectedClass.streamName}` : ""} · ${selectedClass.subjectName}`}
        subtitle={
          query.data
            ? `${query.data.scheme.name} · ${marked.length} of ${marks.length} with a mark${average !== null ? ` · class average ${average}%` : ""}`
            : undefined
        }
      >
        {query.isPending ? (
          <Skeleton variant="text" height={220} />
        ) : marks.length === 0 ? (
          <EmptyState
            title="Nothing has been marked yet"
            body="Term marks appear here as soon as an assessment for this class has scores against it."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse">
              <caption className="sr-only">
                Term marks for {selectedClass.className} {selectedClass.subjectName}
              </caption>
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  <th className="py-2 text-left text-[length:var(--type-caption)] uppercase text-[color:var(--text-subtle)]">
                    Pupil
                  </th>
                  <th className="py-2 text-right text-[length:var(--type-caption)] uppercase text-[color:var(--text-subtle)]">
                    Continuous
                  </th>
                  <th className="py-2 text-right text-[length:var(--type-caption)] uppercase text-[color:var(--text-subtle)]">
                    Exam
                  </th>
                  <th className="py-2 text-right text-[length:var(--type-caption)] uppercase text-[color:var(--text-subtle)]">
                    Term mark
                  </th>
                  <th className="py-2 text-right text-[length:var(--type-caption)] uppercase text-[color:var(--text-subtle)]">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {marks.map((row) => (
                  <tr
                    key={`${row.studentId}-${row.subject.id}`}
                    className="border-b border-[color:var(--border-subtle)] last:border-b-0"
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-3">
                        <PersonAvatar
                          firstName={row.student.firstName}
                          lastName={row.student.lastName}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[length:var(--type-body-sm)] text-[color:var(--text-strong)]">
                            {row.student.lastName}, {row.student.firstName}
                          </p>
                          {row.caveat ? (
                            <p className="truncate text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                              {row.caveat}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-right font-[family-name:var(--font-mono)] tabular-nums text-[color:var(--text-muted)]">
                      {row.continuous === null ? "—" : `${Math.round(row.continuous)}%`}
                    </td>
                    <td className="py-2 text-right font-[family-name:var(--font-mono)] tabular-nums text-[color:var(--text-muted)]">
                      {row.exam === null ? "—" : `${Math.round(row.exam)}%`}
                    </td>
                    <td className="py-2 text-right font-[family-name:var(--font-mono)] font-semibold tabular-nums text-[color:var(--text-strong)]">
                      {row.mark === null ? "Not marked" : `${Math.round(row.mark)}%`}
                    </td>
                    <td className="py-2 text-right">
                      {row.grade ? (
                        <Badge tone={bandTone(row.grade)}>{row.grade.code}</Badge>
                      ) : (
                        <span className="text-[color:var(--text-subtle)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
