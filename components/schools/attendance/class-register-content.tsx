"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  fetchSchoolsClasses,
  fetchSchoolsStudents,
  type SchoolsStudentRecord,
} from "@/lib/schools/admin-v2";

type EntryStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUSES: Array<{ value: EntryStatus; label: string }> = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
];

function today() {
  // Local date, not UTC: a register is taken on the school's day, and
  // `toISOString()` would file an 08:00 register in Harare as the previous day
  // for anyone west of the meridian.
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Taking the register for one class.
 *
 * The everyday workflow, and the one that has to survive being done on a phone
 * in a corridor at 07:30. Everyone starts present, because in a class of forty
 * that is thirty-eight fewer taps than the alternative, and a register is a
 * record of exceptions. The teacher changes the ones who are not, and submits.
 *
 * Present-by-default is a real decision with a real risk: a register submitted
 * without being read marks an absent child present. It is still right — the
 * alternative is a teacher tapping forty times every morning, and a form that
 * tedious gets filled in at lunchtime from memory, which is worse than the
 * default being wrong occasionally.
 */
export function ClassRegisterContent({
  classId,
  initialStreamId,
}: {
  classId: string;
  initialStreamId?: string;
}) {
  const queryClient = useQueryClient();
  const [streamFilter, setStreamFilter] = useState(initialStreamId ?? "");
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, EntryStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  const classesQuery = useQuery({
    queryKey: ["schools", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const studentsQuery = useQuery({
    queryKey: ["schools", "register", classId, streamFilter],
    queryFn: () =>
      fetchSchoolsStudents({
        page: 1,
        limit: 200,
        classId,
        streamId: streamFilter || undefined,
        // A withdrawn or graduated student is not in the room.
        status: "ACTIVE",
      }),
  });

  const students = useMemo(
    () => studentsQuery.data?.data ?? [],
    [studentsQuery.data],
  );
  const schoolClass = useMemo(
    () => (classesQuery.data?.data ?? []).find((row) => row.id === classId) ?? null,
    [classesQuery.data, classId],
  );
  const streams = schoolClass?.streams ?? [];

  function statusOf(student: SchoolsStudentRecord): EntryStatus {
    return marks[student.id] ?? "PRESENT";
  }

  function setStatus(studentId: string, status: EntryStatus) {
    setSaved(null);
    setMarks((current) => ({ ...current, [studentId]: status }));
  }

  // A plain tally over a class list. No memo: it is forty items read once per
  // render, and wrapping it cost the whole component its compiler optimisation
  // because the dependency the closure actually reads is not the one written.
  const counts: Record<EntryStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
  };
  for (const student of students) counts[statusOf(student)] += 1;

  const submit = useMutation({
    mutationFn: async () =>
      fetchJson("/api/v2/schools/attendance/sessions", {
        method: "POST",
        body: JSON.stringify({
          classId,
          streamId: streamFilter || null,
          attendanceDate: date,
          lines: students.map((student) => ({
            studentId: student.id,
            status: statusOf(student),
          })),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "attendance"] });
      setSaved(students.length);
      setError(null);
    },
    onError: (mutationError) => {
      setSaved(null);
      setError(getApiErrorMessage(mutationError));
    },
  });

  if (studentsQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load the class</AlertTitle>
        <AlertDescription>{getApiErrorMessage(studentsQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        {streams.length > 0 ? (
          <FilterSelect
            label="Class"
            allLabel="Every class"
            value={streamFilter}
            options={streams.map((stream) => ({ value: stream.id, label: stream.name }))}
            onChange={(value) => {
              setStreamFilter(value);
              setMarks({});
              setSaved(null);
            }}
          />
        ) : null}
        <div className="min-w-0 flex-1 sm:max-w-[200px]">
          <Label htmlFor="register-date" className="text-sm text-muted-foreground">
            Date
          </Label>
          <Input
            id="register-date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSaved(null);
            }}
          />
        </div>
      </FilterBar>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Register not saved</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {saved !== null ? (
        <Alert>
          <AlertTitle>Register saved</AlertTitle>
          <AlertDescription>
            {saved} student{saved === 1 ? "" : "s"} recorded for {date}.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {counts.PRESENT} present · {counts.ABSENT} absent · {counts.LATE} late ·{" "}
          {counts.EXCUSED} excused
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={Object.keys(marks).length === 0}
            onClick={() => {
              setMarks({});
              setSaved(null);
            }}
          >
            All present
          </Button>
          <Button
            size="sm"
            disabled={students.length === 0 || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Saving…" : "Save register"}
          </Button>
        </div>
      </div>

      {/* One row per student, the four states as buttons rather than a
          dropdown: marking a register is a sequence of single taps down a
          list, and a select that has to be opened and closed for each child
          turns forty taps into a hundred and twenty. */}
      <MobileList>
        {students.length === 0 ? (
          <MobileListEmpty>
            {studentsQuery.isLoading
              ? "Loading the class…"
              : "No active students in this class."}
          </MobileListEmpty>
        ) : (
          students.map((student) => {
            const status = statusOf(student);
            return (
              <MobileList.Row
                key={student.id}
                static
                title={`${student.lastName}, ${student.firstName}`}
                subtitle={
                  <span className="mt-1 flex flex-wrap gap-1">
                    {STATUSES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={status === option.value}
                        onClick={() => setStatus(student.id, option.value)}
                        className={
                          status === option.value
                            ? "rounded-md border border-[var(--brand)] bg-[var(--brand-soft)] px-2 py-1 text-sm text-[var(--brand-strong)]"
                            : "rounded-md border border-[var(--edge-subtle)] px-2 py-1 text-sm text-muted-foreground"
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </span>
                }
              />
            );
          })
        )}
      </MobileList>
    </div>
  );
}
