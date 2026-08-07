"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { getApiErrorMessage } from "@/lib/api-client";
import { CALENDAR_KIND_LABELS } from "@/lib/schools/calendar-kinds";
import {
  createSchoolsCalendarEvent,
  deleteSchoolsCalendarEvent,
  fetchSchoolsCalendar,
  type SchoolsCalendarEventRecord,
} from "@/lib/schools/admin-v2";
import {
  CalendarEventFormSheet,
  CALENDAR_KIND_OPTIONS,
  type CalendarEventFormValues,
} from "./calendar-event-form-sheet";

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

function day(value: string) {
  return value.slice(0, 10);
}

function monthKey(value: string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function range(value: SchoolsCalendarEventRecord) {
  const start = day(value.startDate);
  const end = day(value.endDate);
  return start === end ? start : `${start} → ${end}`;
}

/**
 * The school year's shape: holidays, half terms, exam weeks, staff days.
 *
 * This is what turns "no register for Form 2 on Tuesday" into either a
 * question for the class teacher or a public holiday nobody needs to chase.
 * Everything downstream — the attendance oversight page, term-day counts,
 * anything that says "school days" — reads its answer from these rows.
 *
 * Grouped by month rather than listed flat, because a year is eighty rows and
 * the only navigation anyone attempts on a calendar is "scroll to April".
 */
export function SchoolDaysContent() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const calendarQuery = useQuery({
    queryKey: ["schools", "calendar", "events"],
    queryFn: () => fetchSchoolsCalendar(),
  });

  const events = useMemo(
    () => calendarQuery.data?.events ?? [],
    [calendarQuery.data],
  );

  const years = useMemo(() => {
    const seen = new Set<string>();
    for (const event of events) seen.add(day(event.startDate).slice(0, 4));
    return [...seen].sort().reverse();
  }, [events]);

  const visible = useMemo(
    () =>
      events.filter((event) => {
        if (kindFilter && event.kind !== kindFilter) return false;
        if (yearFilter && !day(event.startDate).startsWith(yearFilter)) return false;
        return true;
      }),
    [events, kindFilter, yearFilter],
  );

  // Sorted by date rather than by name: a calendar read out of order is not a
  // calendar. Everything else in the pack sorts alphabetically; this is the
  // one place where the date *is* the identity.
  const grouped = useMemo(() => {
    const map = new Map<string, SchoolsCalendarEventRecord[]>();
    const sorted = [...visible].sort((a, b) =>
      day(a.startDate).localeCompare(day(b.startDate)),
    );
    for (const event of sorted) {
      const key = monthKey(event.startDate);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()];
  }, [visible]);

  const createMutation = useMutation({
    mutationFn: (values: CalendarEventFormValues) =>
      createSchoolsCalendarEvent({
        title: values.title.trim(),
        kind: values.kind,
        startDate: values.startDate,
        endDate: values.endDate,
        isTeachingDay: values.isTeachingDay,
        notes: values.notes.trim() || null,
      }),
    onSuccess: () => {
      setSheetOpen(false);
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["schools", "calendar"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchoolsCalendarEvent(id),
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["schools", "calendar"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const closedDays = visible.filter((event) => !event.isTeachingDay).length;

  return (
    <div className="space-y-4">
      {calendarQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the calendar</AlertTitle>
          <AlertDescription>{getApiErrorMessage(calendarQuery.error)}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>That did not save</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FilterBar>
          <FilterSelect
            label="Kind"
            allLabel="Anything"
            value={kindFilter}
            options={CALENDAR_KIND_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={setKindFilter}
          />
          {years.length > 1 ? (
            <FilterSelect
              label="Year"
              allLabel="Every year"
              value={yearFilter}
              options={years.map((year) => ({ value: year, label: year }))}
              onChange={setYearFilter}
            />
          ) : null}
        </FilterBar>
        <Button onClick={() => setSheetOpen(true)}>Add a day</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {visible.length} entr{visible.length === 1 ? "y" : "ies"}, {closedDays} of
        which close the school.
      </p>

      <MobileList>
        {grouped.length === 0 ? (
          <MobileListEmpty>
            {calendarQuery.isLoading
              ? "Loading the calendar…"
              : "Nothing on the calendar yet. Add the public holidays first — they are the ones that make registers look missing."}
          </MobileListEmpty>
        ) : (
          grouped.map(([key, monthEvents]) => (
            <div key={key}>
              <MobileListSectionHeader>{monthLabel(key)}</MobileListSectionHeader>
              {monthEvents.map((event) => (
                <MobileList.Row
                  key={event.id}
                  static
                  title={event.title}
                  subtitle={
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span>
                        {range(event)} · {CALENDAR_KIND_LABELS[event.kind]}
                        {event.term ? ` · ${event.term.name}` : ""}
                      </span>
                      {event.isTeachingDay ? (
                        <Badge variant="secondary">School open</Badge>
                      ) : (
                        <Badge variant="outline">School closed</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(event.id)}
                      >
                        Remove
                      </Button>
                    </span>
                  }
                />
              ))}
            </div>
          ))
        )}
      </MobileList>

      <CalendarEventFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSubmitting={createMutation.isPending}
        error={createMutation.isError ? actionError : null}
        onSubmit={(values) => createMutation.mutate(values)}
      />
    </div>
  );
}
