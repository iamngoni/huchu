"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { DAY_NAMES, formatMinute } from "@/lib/schools/timetable-format";
import {
  fetchSchoolsPeriods,
  fetchSchoolsRooms,
  fetchSchoolsTimetable,
  fetchTeacherAssignments,
  fetchTeacherProfiles,
  fetchSchoolsClasses,
  fetchSchoolsTerms,
  type SchoolsTimetableSlotRecord,
} from "@/lib/schools/admin-v2";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { LessonFormSheet, type LessonFormValues } from "./lesson-form-sheet";
import {
  AutoFillSheet,
  type AutoFillResult,
  type AutoFillValues,
} from "./auto-fill-sheet";
import {
  CopyForwardSheet,
  type CopyForwardResult,
  type CopyForwardValues,
} from "./copy-forward-sheet";

/**
 * The week, as a timetabler reads it.
 *
 * Two viewpoints on the same lessons — by class and by teacher — because
 * "what is Form 2 doing on Tuesday" and "where is Ms Banda at 10:20" are the
 * two questions a timetable is asked, and answering only the first is what
 * makes a school keep a second copy in a spreadsheet.
 *
 * The grid is desktop-only. A week of periods against days does not survive a
 * 390px screen at a legible size, and shrinking it to fit produces something
 * nobody can read rather than something mobile. Below `lg` the same lessons are
 * a day at a time: pick a day, read the list down. That is genuinely how a
 * phone is used on the way to a lesson.
 */

/** Monday to Friday. Weekend columns appear only if something is scheduled. */
const WEEKDAYS = [1, 2, 3, 4, 5];

type Viewpoint = "class" | "teacher";

const VIEWPOINT_OPTIONS = [
  { value: "class", label: "By class" },
  { value: "teacher", label: "By teacher" },
];

function todayIsoDay() {
  // `getDay()` is 0-6 with Sunday first; the timetable is ISO 1-7 with Monday
  // first, which is also how a school talks about its week.
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

function describeSlot(slot: SchoolsTimetableSlotRecord) {
  return {
    className: [slot.classSubject.class.name, slot.classSubject.stream?.name]
      .filter(Boolean)
      .join(" "),
    subject: slot.classSubject.subject.name,
    teacher: slot.classSubject.teacherProfile.user.name ?? "Unassigned",
    room: slot.room?.name ?? null,
  };
}

export function SchoolsTimetableContent() {
  const queryClient = useQueryClient();

  const [viewpoint, setViewpoint] = useState<Viewpoint>("class");
  const [classFilter, setClassFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [selectedDay, setSelectedDay] = useState(todayIsoDay());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDefaults, setSheetDefaults] = useState({ dayOfWeek: 1, periodId: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<CopyForwardResult | null>(null);
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [autoFillResult, setAutoFillResult] = useState<AutoFillResult | null>(null);

  const timetableQuery = useQuery({
    queryKey: ["schools", "timetable", viewpoint, classFilter, teacherFilter],
    queryFn: () =>
      fetchSchoolsTimetable({
        classId: viewpoint === "class" && classFilter ? classFilter : undefined,
        teacherProfileId:
          viewpoint === "teacher" && teacherFilter ? teacherFilter : undefined,
      }),
  });
  const classesQuery = useQuery({
    queryKey: ["schools", "timetable", "classes"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });
  const teachersQuery = useQuery({
    queryKey: ["schools", "timetable", "teachers"],
    queryFn: () => fetchTeacherProfiles({ page: 1, limit: 200, isActive: true }),
  });
  const roomsQuery = useQuery({
    queryKey: ["schools", "timetable", "rooms"],
    queryFn: () => fetchSchoolsRooms({ page: 1, limit: 200, isActive: true }),
  });
  const assignmentsQuery = useQuery({
    queryKey: ["schools", "timetable", "assignments"],
    queryFn: () => fetchTeacherAssignments({ page: 1, limit: 400 }),
  });
  const periodsQuery = useQuery({
    queryKey: ["schools", "timetable", "periods"],
    queryFn: () => fetchSchoolsPeriods({ page: 1, limit: 100 }),
  });
  const termsQuery = useQuery({
    queryKey: ["schools", "timetable", "terms"],
    queryFn: () => fetchSchoolsTerms({ page: 1, limit: 100 }),
  });

  const timetable = timetableQuery.data;
  const slots = useMemo(() => timetable?.slots ?? [], [timetable]);
  const periods = useMemo(
    () => timetable?.periods ?? periodsQuery.data?.data ?? [],
    [timetable, periodsQuery.data],
  );
  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const teachers = useMemo(() => teachersQuery.data?.data ?? [], [teachersQuery.data]);
  const rooms = useMemo(() => roomsQuery.data?.data ?? [], [roomsQuery.data]);
  const assignments = useMemo(
    () => assignmentsQuery.data?.data ?? [],
    [assignmentsQuery.data],
  );
  const terms = useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data]);

  /** Weekend columns only when the school actually teaches then. */
  const days = useMemo(() => {
    const scheduled = new Set(slots.map((slot) => slot.dayOfWeek));
    const weekend = [6, 7].filter((day) => scheduled.has(day));
    return [...WEEKDAYS, ...weekend];
  }, [slots]);

  const byDayAndPeriod = useMemo(() => {
    const map = new Map<string, SchoolsTimetableSlotRecord[]>();
    for (const slot of slots) {
      const key = `${slot.dayOfWeek}:${slot.periodId}`;
      const existing = map.get(key);
      if (existing) existing.push(slot);
      else map.set(key, [slot]);
    }
    return map;
  }, [slots]);

  const daySlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.dayOfWeek === selectedDay)
        .sort((a, b) => a.period.sequence - b.period.sequence),
    [slots, selectedDay],
  );

  const addLesson = useMutation({
    mutationFn: async (values: LessonFormValues) =>
      fetchJson("/api/v2/schools/timetable", {
        method: "POST",
        body: JSON.stringify({
          classSubjectId: values.classSubjectId,
          periodId: values.periodId,
          dayOfWeek: values.dayOfWeek,
          roomId: values.roomId || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "timetable"] });
      setSheetOpen(false);
      setSubmitError(null);
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error)),
  });

  const removeLesson = useMutation({
    mutationFn: async (slotId: string) =>
      fetchJson(`/api/v2/schools/timetable/${slotId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "timetable"] });
    },
  });

  const copyForward = useMutation({
    mutationFn: async (values: CopyForwardValues) =>
      fetchJson<CopyForwardResult>("/api/v2/schools/timetable/copy-forward", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (result) => {
      // The sheet stays open holding the counts. Closing on success would hide
      // "12 lessons skipped, the target term has no assignment for them",
      // which is the part the timetabler has to act on.
      queryClient.invalidateQueries({ queryKey: ["schools", "timetable"] });
      setCopyResult(result);
      setCopyError(null);
    },
    onError: (error) => {
      setCopyResult(null);
      setCopyError(getApiErrorMessage(error));
    },
  });

  const autoFill = useMutation({
    mutationFn: async (values: AutoFillValues) =>
      fetchJson<AutoFillResult>("/api/v2/schools/timetable/auto-fill", {
        method: "POST",
        body: JSON.stringify({
          classId: values.classId || undefined,
          days: values.days,
          periodsPerSubject: values.periodsPerSubject,
        }),
      }),
    onSuccess: (result) => {
      // Held open on purpose, like copy-forward: "9 assignments could not be
      // given a full week" is the part the timetabler has to act on, and
      // closing the sheet would throw it away.
      queryClient.invalidateQueries({ queryKey: ["schools", "timetable"] });
      setAutoFillResult(result);
      setAutoFillError(null);
    },
    onError: (error) => {
      setAutoFillResult(null);
      setAutoFillError(getApiErrorMessage(error));
    },
  });

  function openSheet(dayOfWeek: number, periodId: string) {
    setSubmitError(null);
    setSheetDefaults({ dayOfWeek, periodId });
    setSheetOpen(true);
  }

  if (timetableQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load the timetable</AlertTitle>
        <AlertDescription>{getApiErrorMessage(timetableQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  const teachingPeriods = periods.filter((period) => period.isTeaching);
  const firstTeachingPeriodId = teachingPeriods[0]?.id ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-section-title">The week</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={periods.length === 0 || assignments.length === 0}
            onClick={() => {
              setAutoFillError(null);
              setAutoFillResult(null);
              setAutoFillOpen(true);
            }}
          >
            Build timetable
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={terms.length < 2}
            onClick={() => {
              setCopyError(null);
              setCopyResult(null);
              setCopyOpen(true);
            }}
          >
            Copy forward
          </Button>
          <Button
            size="sm"
            disabled={periods.length === 0 || assignments.length === 0}
            onClick={() => openSheet(selectedDay, firstTeachingPeriodId)}
          >
            Add lesson
          </Button>
        </div>
      </div>

      {periods.length === 0 ? (
        <Alert>
          <AlertTitle>No periods yet</AlertTitle>
          <AlertDescription>
            A timetable is a grid of days against periods. Set the school day up under
            Academics before adding lessons.
          </AlertDescription>
        </Alert>
      ) : null}

      <FilterBar>
        <FilterSelect
          label="Show"
          allLabel="By class"
          value={viewpoint === "class" ? "" : viewpoint}
          options={VIEWPOINT_OPTIONS}
          onChange={(value) => setViewpoint((value || "class") as Viewpoint)}
        />
        {viewpoint === "class" ? (
          <FilterSelect
            label="Class"
            allLabel="All classes"
            value={classFilter}
            options={classes.map((schoolClass) => ({
              value: schoolClass.id,
              label: schoolClass.name,
            }))}
            onChange={setClassFilter}
          />
        ) : (
          <FilterSelect
            label="Teacher"
            allLabel="All teachers"
            value={teacherFilter}
            options={teachers.map((teacher) => ({
              value: teacher.id,
              label: teacher.user.name,
            }))}
            onChange={setTeacherFilter}
          />
        )}
      </FilterBar>

      {/* Phone and tablet: one day at a time. */}
      <div className="space-y-2 lg:hidden">
        <FilterBar>
          <FilterSelect
            label="Day"
            allLabel={DAY_NAMES[selectedDay]}
            value={String(selectedDay)}
            options={days.map((day) => ({ value: String(day), label: DAY_NAMES[day] }))}
            onChange={(value) => setSelectedDay(Number(value) || selectedDay)}
          />
        </FilterBar>
        <MobileList>
          {daySlots.length === 0 ? (
            <MobileListEmpty>
              {timetableQuery.isLoading
                ? "Loading the timetable…"
                : `Nothing scheduled on ${DAY_NAMES[selectedDay]}.`}
            </MobileListEmpty>
          ) : (
            daySlots.map((slot) => {
              const described = describeSlot(slot);
              return (
                <MobileList.Row
                  key={slot.id}
                  static
                  title={`${described.subject} · ${described.className}`}
                  subtitle={[
                    `${formatMinute(slot.period.startMinute)}–${formatMinute(slot.period.endMinute)}`,
                    described.teacher,
                    described.room,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              );
            })
          )}
        </MobileList>
      </div>

      {/* Desktop: the whole week at once. */}
      <div className="hidden lg:block">
        <div className="table-rail table-scroll">
          <div
            className="grid min-w-[900px] gap-px bg-[var(--border-subtle)]"
            style={{
              gridTemplateColumns: `minmax(140px, 1fr) repeat(${days.length}, minmax(150px, 1fr))`,
            }}
          >
            <div className="bg-[var(--surface-muted)] p-2 text-sm font-semibold text-muted-foreground">
              Period
            </div>
            {days.map((day) => (
              <div
                key={day}
                className="bg-[var(--surface-muted)] p-2 text-sm font-semibold text-muted-foreground"
              >
                {DAY_NAMES[day]}
              </div>
            ))}

            {periods.map((period) => (
              <Fragment key={period.id}>
                <div className="bg-[var(--surface)] p-2">
                  <div className="text-sm font-medium">{period.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatMinute(period.startMinute)}–{formatMinute(period.endMinute)}
                  </div>
                </div>
                {days.map((day) => {
                  const cellSlots = byDayAndPeriod.get(`${day}:${period.id}`) ?? [];
                  return (
                    <div key={`${day}:${period.id}`} className="bg-[var(--surface)] p-2">
                      {!period.isTeaching ? (
                        <span className="text-sm text-muted-foreground">
                          {period.name}
                        </span>
                      ) : cellSlots.length === 0 ? (
                        <button
                          type="button"
                          className="w-full rounded-md border border-dashed border-[var(--edge-subtle)] p-2 text-sm text-muted-foreground hover:bg-[var(--surface-muted)]"
                          onClick={() => openSheet(day, period.id)}
                        >
                          Add
                        </button>
                      ) : (
                        <div className="space-y-1">
                          {cellSlots.map((slot) => {
                            const described = describeSlot(slot);
                            return (
                              <div
                                key={slot.id}
                                className="rounded-md border border-[var(--edge-subtle)] p-2"
                              >
                                <div className="text-sm font-medium">
                                  {described.subject}
                                </div>
                                {/* Both, always. Showing only the teacher in
                                    the class view left a cell holding three
                                    classes' lessons with nothing saying which
                                    class each belonged to. */}
                                <div className="text-sm text-muted-foreground">
                                  {described.className}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {described.teacher}
                                </div>
                                {described.room ? (
                                  <Badge variant="outline">{described.room}</Badge>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLesson.mutate(slot.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <LessonFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSubmitError(null);
        }}
        assignments={assignments}
        periods={periods}
        rooms={rooms}
        defaultDayOfWeek={sheetDefaults.dayOfWeek}
        defaultPeriodId={sheetDefaults.periodId || firstTeachingPeriodId}
        isSubmitting={addLesson.isPending}
        error={submitError}
        onSubmit={(values) => addLesson.mutate(values)}
      />

      <AutoFillSheet
        open={autoFillOpen}
        onOpenChange={(open) => {
          setAutoFillOpen(open);
          if (!open) {
            setAutoFillError(null);
            setAutoFillResult(null);
          }
        }}
        classes={classes}
        isSubmitting={autoFill.isPending}
        error={autoFillError}
        result={autoFillResult}
        onSubmit={(values) => autoFill.mutate(values)}
      />

      <CopyForwardSheet
        open={copyOpen}
        onOpenChange={(open) => {
          setCopyOpen(open);
          if (!open) {
            setCopyError(null);
            setCopyResult(null);
          }
        }}
        terms={terms}
        currentTermId={timetable?.termId ?? null}
        isSubmitting={copyForward.isPending}
        error={copyError}
        result={copyResult}
        onSubmit={(values) => copyForward.mutate(values)}
      />
    </div>
  );
}
