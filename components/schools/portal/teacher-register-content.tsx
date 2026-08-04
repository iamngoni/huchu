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
import { fetchSchoolsStudents, type SchoolsStudentRecord } from "@/lib/schools/admin-v2";
import { fetchTeacherPortalClasses } from "@/lib/schools/schools-v2";

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
 * Taking the register, in the teacher's portal.
 *
 * This lives here and not under `/schools` because taking a register is a
 * teacher's job, not an administrator's. The admin side answers "which
 * registers have been taken", which is a different question with a different
 * screen; the two were briefly the same page, which is how a school
 * administrator ended up able to mark any child in the school present.
 *
 * The classes come from `/portal/teacher/me/classes`, so a teacher is offered
 * their own and nobody else's — the portal identity rule from S-0.2, rather
 * than a picker over the whole school.
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
export function TeacherRegisterContent() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [streamFilter, setStreamFilter] = useState("");
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, EntryStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  const classesQuery = useQuery({
    queryKey: ["portal", "teacher", "classes"],
    queryFn: () => fetchTeacherPortalClasses(),
  });

  /** The teacher's own classes, one entry per class rather than per subject. */
  const myClasses = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const assignment of classesQuery.data?.assignments ?? []) {
      if (!seen.has(assignment.class.id)) {
        seen.set(assignment.class.id, {
          id: assignment.class.id,
          name: assignment.class.name,
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [classesQuery.data]);

  const studentsQuery = useQuery({
    enabled: Boolean(classId),
    queryKey: ["portal", "teacher", "register", classId, streamFilter],
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
        <FilterSelect
          label="Class"
          allLabel="Choose a class"
          value={classId}
          options={myClasses.map((row) => ({ value: row.id, label: row.name }))}
          onChange={(value) => {
            setClassId(value);
            setStreamFilter("");
            setMarks({});
            setSaved(null);
          }}
        />
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
            {!classId
              ? "Choose one of your classes to take its register."
              : studentsQuery.isLoading
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
