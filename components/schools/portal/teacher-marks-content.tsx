"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchTeacherPortalClasses } from "@/lib/schools/schools-v2";
import {
  ASSESSMENT_KIND_LABELS,
  createSchoolAssessment,
  fetchSchoolAssessments,
  type AssessmentKind,
  type SchoolsAssessmentRecord,
} from "@/lib/schools/assessments-v2";
import { AssessmentFormSheet, type AssessmentFormValues } from "../assessments/assessment-form-sheet";
import { MarkEntrySheet } from "../assessments/mark-entry-sheet";
import { HomeworkContent } from "../assessments/homework-content";

const KIND_OPTIONS = (Object.keys(ASSESSMENT_KIND_LABELS) as AssessmentKind[]).map(
  (kind) => ({ value: kind, label: ASSESSMENT_KIND_LABELS[kind] }),
);

function heading(assessment: SchoolsAssessmentRecord) {
  const { subject, class: schoolClass, stream } = assessment.classSubject;
  return `${schoolClass.name}${stream ? ` ${stream.name}` : ""} — ${subject.name}`;
}

/**
 * A teacher's own mark book.
 *
 * The admin screen is organised by year group, because an office thinks in year
 * groups. A teacher does not: she thinks in the classes she takes, which for a
 * primary class teacher is one class and every subject in it, and for a
 * secondary subject teacher is one subject across six classes. Both are the
 * same list here — her assignments — grouped by class and subject, and both
 * arrive from `mine=1` rather than from a class id she could type.
 *
 * The entry sheet is shared with the admin side. Two implementations of "type
 * thirty marks and save" is two places for the absent-versus-zero rule to drift.
 */
export function TeacherMarksContent() {
  const queryClient = useQueryClient();
  const [classFilter, setClassFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: ["portal", "teacher", "classes"],
    queryFn: () => fetchTeacherPortalClasses(),
  });

  const assessmentsQuery = useQuery({
    queryKey: ["portal", "teacher", "assessments"],
    queryFn: () => fetchSchoolAssessments({ mine: true }),
  });

  const assignments = useMemo(
    () => classesQuery.data?.assignments ?? [],
    [classesQuery.data],
  );
  const assessments = useMemo(
    () => assessmentsQuery.data?.assessments ?? [],
    [assessmentsQuery.data],
  );

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const assignment of assignments) {
      seen.set(
        assignment.class.id,
        assignment.stream
          ? `${assignment.class.name} ${assignment.stream.name}`
          : assignment.class.name,
      );
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assignments]);

  // The form wants the same shape the admin side passes it. A teacher's
  // assignments already carry class, stream and subject, so this is a rename
  // rather than another fetch.
  const subjectOptions = useMemo(
    () =>
      assignments.map((assignment) => ({
        id: assignment.id,
        subject: assignment.subject,
        class: assignment.class,
        stream: assignment.stream,
        teacherProfile: { id: "", user: { id: "", name: null } },
      })),
    [assignments],
  );

  const visible = useMemo(
    () =>
      assessments.filter((assessment) => {
        if (classFilter && assessment.classSubject.class.id !== classFilter) return false;
        if (kindFilter && assessment.kind !== kindFilter) return false;
        return true;
      }),
    [assessments, classFilter, kindFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SchoolsAssessmentRecord[]>();
    for (const assessment of visible) {
      const key = heading(assessment);
      const bucket = map.get(key);
      if (bucket) bucket.push(assessment);
      else map.set(key, [assessment]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const createMutation = useMutation({
    mutationFn: (values: AssessmentFormValues) =>
      createSchoolAssessment({
        classSubjectId: values.classSubjectId,
        kind: values.kind,
        title: values.title.trim(),
        maxScore: Number(values.maxScore),
        weight: Number(values.weight),
        assessedOn: values.assessedOn || null,
      }),
    onSuccess: () => {
      setFormOpen(false);
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["portal", "teacher"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const unmarked = visible.filter((assessment) => assessment._count.scores === 0).length;

  return (
    <div className="space-y-4">
      {assessmentsQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load your mark book</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(assessmentsQuery.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>That did not work</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FilterBar>
          <FilterSelect
            label="Class"
            allLabel="All my classes"
            value={classFilter}
            options={classOptions}
            onChange={setClassFilter}
          />
          <FilterSelect
            label="Kind"
            allLabel="Anything"
            value={kindFilter}
            options={KIND_OPTIONS}
            onChange={setKindFilter}
          />
        </FilterBar>
        <Button onClick={() => setFormOpen(true)} disabled={assignments.length === 0}>
          Set work
        </Button>
      </div>

      {assignments.length === 0 && !classesQuery.isLoading ? (
        <Alert>
          <AlertTitle>No classes assigned to you yet</AlertTitle>
          <AlertDescription>
            The office allocates subjects to teachers. Once yours are in, they
            appear here.
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {visible.length} piece{visible.length === 1 ? "" : "s"} of work
        {unmarked > 0 ? `, ${unmarked} with no marks in yet` : ""}.
      </p>

      <MobileList>
        {grouped.length === 0 ? (
          <MobileListEmpty>
            {assessmentsQuery.isLoading
              ? "Loading your mark book…"
              : "Nothing set yet. Use “Set work” to add a test or an exam."}
          </MobileListEmpty>
        ) : (
          grouped.map(([label, rows]) => (
            <div key={label}>
              <MobileListSectionHeader>{label}</MobileListSectionHeader>
              {rows.map((assessment) => (
                <MobileList.Row
                  key={assessment.id}
                  static
                  title={assessment.title}
                  subtitle={
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span>
                        {ASSESSMENT_KIND_LABELS[assessment.kind]} · out of{" "}
                        {Number(assessment.maxScore)}
                        {assessment.assessedOn
                          ? ` · ${assessment.assessedOn.slice(0, 10)}`
                          : ""}
                      </span>
                      <Badge variant="outline">
                        {assessment._count.scores} marked
                      </Badge>
                      {assessment.status === "LOCKED" ? (
                        <Badge variant="secondary">Locked</Badge>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMarkingId(assessment.id)}
                      >
                        {assessment._count.scores > 0 ? "Marks" : "Enter marks"}
                      </Button>
                    </span>
                  }
                />
              ))}
            </div>
          ))
        )}
      </MobileList>

      <AssessmentFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        subjects={subjectOptions}
        isSubmitting={createMutation.isPending}
        error={createMutation.isError ? actionError : null}
        onSubmit={(values) => createMutation.mutate(values)}
      />

      {/* A teacher's homework sits alongside her marks rather than on a
          different page: both are "the work I have set", and splitting them
          means two places to look on the same evening. */}
      <div className="pt-2">
        <h2 className="text-section-title">Homework</h2>
        <HomeworkContent subjects={subjectOptions} />
      </div>

      <MarkEntrySheet
        assessmentId={markingId}
        open={markingId !== null}
        onOpenChange={(open) => {
          if (!open) setMarkingId(null);
        }}
      />
    </div>
  );
}
