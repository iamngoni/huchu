"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilterChips, MobileList, MobileListEmpty } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { DAY_NAMES, formatMinute } from "@/lib/schools/timetable-format";
import {
  fetchSchoolsPeriods,
  fetchSchoolsRooms,
  fetchSchoolsTimetable,
  fetchTeacherAssignments,
  fetchTeacherProfiles,
  fetchSchoolsClasses,
  type SchoolsTimetableSlotRecord,
} from "@/lib/schools/admin-v2";
import { LessonFormSheet, type LessonFormValues } from "./lesson-form-sheet";

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

const VIEWPOINT_OPTIONS: Array<{ value: Viewpoint; label: string }> = [
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
        <Button
          size="sm"
          disabled={periods.length === 0 || assignments.length === 0}
          onClick={() => openSheet(selectedDay, firstTeachingPeriodId)}
        >
          Add lesson
        </Button>
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

      <FilterChips
        aria-label="Timetable viewpoint"
        value={viewpoint}
        options={VIEWPOINT_OPTIONS}
        onChange={(value) => setViewpoint(value as Viewpoint)}
      />

      {viewpoint === "class" ? (
        <Select
          value={classFilter || "all"}
          onValueChange={(value) => setClassFilter(value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((schoolClass) => (
              <SelectItem key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Select
          value={teacherFilter || "all"}
          onValueChange={(value) => setTeacherFilter(value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="All teachers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teachers</SelectItem>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Phone and tablet: one day at a time. */}
      <div className="space-y-2 lg:hidden">
        <FilterChips
          aria-label="Day of the week"
          value={String(selectedDay)}
          options={days.map((day) => ({
            value: String(day),
            label: DAY_NAMES[day].slice(0, 3),
          }))}
          onChange={(value) => setSelectedDay(Number(value))}
        />
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
    </div>
  );
}
