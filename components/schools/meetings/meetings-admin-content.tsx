"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  StatCard,
} from "@corelithzw/react";

import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { dsConfirm } from "@/components/ui/ds-confirm";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  fetchSchoolsClasses,
  fetchSchoolsTerms,
  fetchTeacherProfiles,
} from "@/lib/schools/admin-v2";
import { OpenSlotsDialog, type OpenSlotsForm } from "./open-slots-dialog";

/**
 * Parent meetings, from the office.
 *
 * A parents' evening is a whole-school event and every screen that existed for
 * it was one teacher's. A teacher can open their own evening and see their own
 * bookings; nobody could see the school's, which is the view the office needs —
 * to open Thursday for a dozen staff at once, to answer "has anyone booked Mr
 * Moyo", and to free the 17:30 when a family rings to cancel.
 *
 * The term is the window rather than a date, because that is the unit the
 * office thinks in and a parents' evening is not always one night. Free slots
 * are rows here exactly as they are in the portal: the point of the model is
 * that an unbooked ten minutes is a thing, and the office's most common
 * question — where is there still room — cannot be answered by a list of
 * bookings.
 */

type Slot = {
  id: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  bookedAt: string | null;
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    currentClass: { id: string; name: string } | null;
  } | null;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  teacherProfile: {
    id: string;
    user: { name: string; image: string | null };
  };
};

type Schedule = { slots: Slot[] };

type OpenResult = { created: number; skipped: number };

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD` for a local-time date — the key an evening is grouped on. */
function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "12 March 2026" — day, month, year, no zero padding. */
function formatDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "17:00" — 24-hour, from an instant. */
function formatTime(iso: string) {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MeetingsAdminContent() {
  const queryClient = useQueryClient();

  const [chosenTermId, setChosenTermId] = useState("");
  const [teacherProfileId, setTeacherProfileId] = useState("");
  const [classId, setClassId] = useState("");
  const [opening, setOpening] = useState(false);
  const [openResult, setOpenResult] = useState<OpenResult | null>(null);
  const [released, setReleased] = useState<string | null>(null);

  const termsQuery = useQuery({
    queryKey: ["schools", "terms", "for-meetings"],
    queryFn: () => fetchSchoolsTerms({ limit: 50 }),
  });
  const teachersQuery = useQuery({
    queryKey: ["schools", "teacher-profiles", "for-meetings"],
    queryFn: () => fetchTeacherProfiles({ limit: 200, isActive: true }),
  });
  const classesQuery = useQuery({
    queryKey: ["schools", "classes", "for-meetings"],
    queryFn: () => fetchSchoolsClasses({ limit: 200 }),
  });

  const terms = useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data]);
  const teachers = teachersQuery.data?.data ?? [];
  const classes = classesQuery.data?.data ?? [];

  /**
   * The term on screen, derived rather than stored: what the office picked, or
   * the running term until they pick. Seeding state from the query would need
   * an effect that fires after the first paint, and the screen would flash an
   * empty term picker on every load.
   */
  const term = useMemo(() => {
    const chosen = terms.find((row) => row.id === chosenTermId);
    return chosen ?? terms.find((row) => row.isActive) ?? terms[0] ?? null;
  }, [terms, chosenTermId]);

  const from = term ? term.startDate.slice(0, 10) : null;
  const to = term ? term.endDate.slice(0, 10) : null;

  const scheduleQuery = useQuery({
    queryKey: ["schools", "meetings", "admin", from, to, teacherProfileId],
    queryFn: () => {
      const params = new URLSearchParams({ from: from!, to: to! });
      if (teacherProfileId) params.set("teacherProfileId", teacherProfileId);
      return fetchJson<Schedule>(`/api/v2/schools/meetings?${params.toString()}`);
    },
    enabled: Boolean(from && to),
  });

  const allSlots = scheduleQuery.data?.slots ?? [];

  /**
   * The year-group filter narrows the bookings, not the evening.
   *
   * A free slot belongs to no year group — any family can take it — so hiding
   * the free rows when the office asks "who from Form 1 is booked with Ms
   * Banda" would answer a different question and hide the room that is left.
   */
  const slots = classId
    ? allSlots.filter(
        (slot) => !slot.bookedAt || slot.student?.currentClass?.id === classId,
      )
    : allSlots;

  const booked = slots.filter((slot) => slot.bookedAt).length;
  const free = slots.length - booked;

  // Teacher, then time. The API already orders by time, so pushing in order
  // keeps each teacher's evening in sequence without a second sort.
  const byTeacher = useMemo(() => {
    const groups = new Map<string, { name: string; image: string | null; slots: Slot[] }>();
    for (const slot of slots) {
      const key = slot.teacherProfile.id;
      const group = groups.get(key) ?? {
        name: slot.teacherProfile.user.name,
        image: slot.teacherProfile.user.image,
        slots: [],
      };
      group.slots.push(slot);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [slots]);

  const openSlots = useMutation({
    mutationFn: (form: OpenSlotsForm) =>
      fetchJson<OpenResult>("/api/v2/schools/meetings", {
        method: "POST",
        body: JSON.stringify({
          action: "open",
          teacherProfileId: form.teacherProfileId,
          from: new Date(`${form.onDate}T${form.startsAt}`).toISOString(),
          to: new Date(`${form.onDate}T${form.endsAt}`).toISOString(),
          minutesEach: form.minutesEach,
          location: form.location.trim() || null,
        }),
      }),
    onSuccess: (result) => {
      setOpenResult(result);
      setReleased(null);
      void queryClient.invalidateQueries({ queryKey: ["schools", "meetings", "admin"] });
    },
  });

  const release = useMutation({
    mutationFn: (meetingId: string) =>
      fetchJson("/api/v2/schools/meetings", {
        method: "POST",
        body: JSON.stringify({ action: "release", meetingId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["schools", "meetings", "admin"] });
    },
  });

  const askToRelease = async (slot: Slot) => {
    const who = slot.student
      ? `${slot.student.firstName} ${slot.student.lastName}`
      : "this booking";
    const confirmed = await dsConfirm({
      title: `Release ${formatTime(slot.startsAt)} with ${slot.teacherProfile.user.name}`,
      description: `The meeting about ${who} is cancelled and the slot goes back on the list as free, so another family can take it. Nobody is told automatically — ring them.`,
      confirmLabel: "Release the slot",
      variant: "warning",
    });
    if (confirmed) {
      setOpenResult(null);
      setReleased(
        `${formatTime(slot.startsAt)} with ${slot.teacherProfile.user.name} is free again.`,
      );
      release.mutate(slot.id);
    }
  };

  const filtersPending =
    termsQuery.isPending || teachersQuery.isPending || classesQuery.isPending;

  return (
    <div className="space-y-4">
      {termsQuery.error ? (
        <Alert tone="danger" title="The terms would not load">
          {getApiErrorMessage(termsQuery.error)}
        </Alert>
      ) : null}
      {teachersQuery.error ? (
        <Alert tone="danger" title="The teachers would not load">
          {getApiErrorMessage(teachersQuery.error)}
        </Alert>
      ) : null}
      {scheduleQuery.error ? (
        <Alert tone="danger" title="The schedule would not load">
          {getApiErrorMessage(scheduleQuery.error)}
        </Alert>
      ) : null}
      {release.error ? (
        <Alert tone="danger" title="The slot was not released">
          {getApiErrorMessage(release.error)}
        </Alert>
      ) : null}
      {released && !release.isPending && !release.error ? (
        <Alert tone="success" title={released} onDismiss={() => setReleased(null)} />
      ) : null}

      <FilterBar>
        <FilterSelect
          label="Term"
          allLabel="The current term"
          value={term?.id ?? ""}
          options={terms.map((row) => ({
            value: row.id,
            label: `${row.name} · ${row.academicYear.name}${row.isActive ? " (current)" : ""}`,
          }))}
          onChange={(value) => {
            setChosenTermId(value);
            setOpenResult(null);
            setReleased(null);
          }}
        />
        <FilterSelect
          label="Teacher"
          allLabel="Every teacher"
          value={teacherProfileId}
          options={teachers.map((row) => ({ value: row.id, label: row.user.name }))}
          onChange={(value) => {
            setTeacherProfileId(value);
            setReleased(null);
          }}
        />
        <FilterSelect
          label="Year group"
          allLabel="Every year group"
          value={classId}
          options={classes.map((row) => ({ value: row.id, label: row.name }))}
          onChange={(value) => {
            setClassId(value);
            setReleased(null);
          }}
        />
        <div className="ml-auto">
          <Button
            variant="primary"
            disabled={teachers.length === 0}
            onClick={() => {
              setOpenResult(null);
              setReleased(null);
              setOpening(true);
            }}
          >
            Open slots
          </Button>
        </div>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Slots open"
          value={<span className="tabular-nums">{slots.length}</span>}
          footer={term ? `${term.name} · ${term.academicYear.name}` : "No term"}
        />
        <StatCard
          label="Booked"
          tone={booked > 0 ? "success" : "neutral"}
          value={<span className="tabular-nums">{booked}</span>}
          footer={
            slots.length > 0
              ? `${Math.round((booked / slots.length) * 100)}% of the slots taken`
              : "Nothing open to book yet"
          }
        />
        <StatCard
          label="Free"
          tone={free > 0 ? "brand" : "neutral"}
          value={<span className="tabular-nums">{free}</span>}
          footer={
            slots.length === 0
              ? "Nothing open to book yet"
              : free > 0
                ? "still available to families"
                : "Every slot is taken"
          }
        />
      </div>

      {filtersPending || scheduleQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !term ? (
        <EmptyState
          title="No term has been set up"
          body="A parents' evening is booked inside a term. Create one under Years and terms, and this screen has a window to open slots in."
        />
      ) : teachers.length === 0 ? (
        <EmptyState
          title="No teachers on the staff list"
          body="Slots are opened against a teacher's profile. Add staff under Teachers first."
        />
      ) : byTeacher.length === 0 ? (
        <EmptyState
          title={
            allSlots.length > 0
              ? "No slots match those filters"
              : `No parents' evening is open in ${term.name}`
          }
          body={
            allSlots.length > 0
              ? "Nothing is booked for that year group in this window. Clear the filters to see the whole evening."
              : "Open a window against a teacher and every ten minutes inside it becomes a free row a family can take from their portal."
          }
          action={
            allSlots.length > 0 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setTeacherProfileId("");
                  setClassId("");
                }}
              >
                Clear the filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setOpening(true)}>
                Open slots
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {byTeacher.map((group) => {
            const teacherBooked = group.slots.filter((slot) => slot.bookedAt).length;
            return (
              <Card
                key={group.name + group.slots[0]!.teacherProfile.id}
                title={
                  <span className="flex items-center gap-2">
                    <PersonAvatar name={group.name} src={group.image} size="sm" />
                    {group.name}
                  </span>
                }
                subtitle={`${group.slots.length} slot${group.slots.length === 1 ? "" : "s"} · ${teacherBooked} booked · ${group.slots.length - teacherBooked} free`}
                flush
              >
                <ul className="flex flex-col">
                  {group.slots.map((slot, index) => {
                    const key = dayKey(new Date(slot.startsAt));
                    const previous = group.slots[index - 1];
                    const newDay =
                      !previous || dayKey(new Date(previous.startsAt)) !== key;
                    return (
                      <li key={slot.id}>
                        {newDay ? (
                          <p className="border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-4 py-2 text-[length:var(--type-caption)] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                            {formatDay(key)}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--border-subtle)] px-4 py-3">
                          <span className="w-[8.5rem] shrink-0 font-[family-name:var(--font-mono)] text-[length:var(--type-body-sm)] tabular-nums text-[color:var(--text-strong)]">
                            {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                          </span>

                          {slot.student ? (
                            <PersonAvatar
                              firstName={slot.student.firstName}
                              lastName={slot.student.lastName}
                              size="xs"
                            />
                          ) : null}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[length:var(--type-body-sm)] font-medium text-[color:var(--text-strong)]">
                              {slot.student
                                ? `${slot.student.lastName}, ${slot.student.firstName}`
                                : slot.bookedAt
                                  ? "Booked, but the pupil record has gone"
                                  : "Free — nobody has taken this slot"}
                            </p>
                            <p className="truncate font-[family-name:var(--font-mono)] text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                              {[
                                slot.student?.studentNo,
                                slot.student?.currentClass?.name,
                                slot.location ?? "No room set",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {slot.guardian ? (
                              <p className="truncate text-[length:var(--type-caption)] text-[color:var(--text-body)]">
                                {slot.guardian.firstName} {slot.guardian.lastName} ·{" "}
                                <span className="font-[family-name:var(--font-mono)] tabular-nums">
                                  {slot.guardian.phone}
                                </span>
                              </p>
                            ) : slot.bookedAt ? (
                              <p className="truncate text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                                No guardian named on the booking
                              </p>
                            ) : null}
                            {slot.notes ? (
                              <p className="truncate text-[length:var(--type-caption)] text-[color:var(--text-body)]">
                                {slot.notes}
                              </p>
                            ) : null}
                          </div>

                          {slot.bookedAt ? (
                            <>
                              <Badge tone="success" dot>
                                Booked
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={
                                  release.isPending && release.variables === slot.id
                                }
                                onClick={() => void askToRelease(slot)}
                              >
                                Release
                              </Button>
                            </>
                          ) : (
                            <Badge tone="neutral" dot>
                              Free
                            </Badge>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {/*
        Mounted only while it is open, so its fields start fresh each time and
        the date it defaults to is computed in the browser. `new Date()` during
        a server render would disagree with the browser's today for any school
        not on UTC, which is a hydration mismatch.
      */}
      {opening ? (
        <OpenSlotsDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              setOpening(false);
              setOpenResult(null);
              openSlots.reset();
            }
          }}
          teachers={teachers.map((row) => ({ id: row.id, name: row.user.name }))}
          defaultDate={term ? clampToTerm(term.startDate, term.endDate) : ""}
          defaultTeacherProfileId={teacherProfileId}
          isSubmitting={openSlots.isPending}
          error={openSlots.error ? getApiErrorMessage(openSlots.error) : null}
          result={openResult}
          onSubmit={(form) => openSlots.mutate(form)}
        />
      ) : null}
    </div>
  );
}

/**
 * A sensible date to open against: today when the term is running, otherwise
 * the day the term starts. An evening opened last Tuesday by accident is a
 * screen full of slots nobody can book.
 */
function clampToTerm(startDate: string, endDate: string) {
  const today = dayKey(new Date());
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  if (today < start) return start;
  if (today > end) return end;
  return today;
}
