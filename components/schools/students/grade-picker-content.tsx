"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchSchoolsClasses,
  type SchoolsClassRecord,
} from "@/lib/schools/admin-v2";

/**
 * Which year group, before which student.
 *
 * A school with 800 students has no use for a page listing 800 students — it is
 * not a directory anyone reads, it is a page you immediately filter. The year
 * group is how a school is actually organised and how every register, mark
 * sheet and fee run is scoped, so it belongs in the navigation rather than in a
 * dropdown above a list that has already loaded everything.
 *
 * Search is the exception and stays here: someone looking for one child by name
 * does not know or care which form they are in, and making them guess first
 * would be worse than the list this page replaces.
 */
export function GradePickerContent() {
  const [search, setSearch] = useState("");

  const classesQuery = useQuery({
    queryKey: ["schools", "students", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const classes = useMemo<SchoolsClassRecord[]>(
    () => classesQuery.data?.data ?? [],
    [classesQuery.data],
  );

  const matching = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter(
      (schoolClass) =>
        schoolClass.name.toLowerCase().includes(term) ||
        schoolClass.code.toLowerCase().includes(term),
    );
  }, [classes, search]);

  const totalStudents = classes.reduce(
    (sum, schoolClass) => sum + schoolClass._count.students,
    0,
  );

  if (classesQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load classes</AlertTitle>
        <AlertDescription>{getApiErrorMessage(classesQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 sm:max-w-[320px]">
          <Label htmlFor="grade-search" className="text-sm text-muted-foreground">
            Find a year group
          </Label>
          <Input
            id="grade-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Form 2, Grade 5…"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {totalStudents} student{totalStudents === 1 ? "" : "s"} across{" "}
          {classes.length} year group{classes.length === 1 ? "" : "s"}
        </p>
      </div>

      {classes.length === 0 && !classesQuery.isLoading ? (
        <Alert>
          <AlertTitle>No classes yet</AlertTitle>
          <AlertDescription>
            Students are organised by year group. Set the class ladder up under
            Academics first.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* One card per year group on anything with room, a list on a phone. The
          streams are links of their own: "Form 2 Blue" is where a class teacher
          actually works, and making them open Form 2 and filter again would put
          the thing they came for one level too deep. */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {matching.map((schoolClass) => (
          <div
            key={schoolClass.id}
            className="rounded-xl border border-[var(--edge-subtle)] bg-[var(--surface)] p-4"
          >
            <Link
              href={`/schools/students/class/${schoolClass.id}`}
              className="text-base font-medium hover:underline"
            >
              {schoolClass.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {schoolClass._count.students} student
              {schoolClass._count.students === 1 ? "" : "s"}
              {schoolClass.capacity ? ` of ${schoolClass.capacity}` : ""}
            </p>
            {schoolClass.streams && schoolClass.streams.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {schoolClass.streams.map((stream) => (
                  <Link
                    key={stream.id}
                    href={`/schools/students/class/${schoolClass.id}?streamId=${stream.id}`}
                    className="rounded-md border border-[var(--edge-subtle)] px-2 py-1 text-sm text-muted-foreground hover:bg-[var(--surface-muted)]"
                  >
                    {stream.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="sm:hidden">
        <MobileList>
          {matching.length === 0 ? (
            <MobileListEmpty>
              {classesQuery.isLoading ? "Loading year groups…" : "No year groups found."}
            </MobileListEmpty>
          ) : (
            matching.map((schoolClass) => (
              <MobileList.Row
                key={schoolClass.id}
                title={schoolClass.name}
                subtitle={[
                  `${schoolClass._count.students} student${schoolClass._count.students === 1 ? "" : "s"}`,
                  schoolClass._count.streams > 0
                    ? `${schoolClass._count.streams} class${schoolClass._count.streams === 1 ? "" : "es"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                onClick={() => {
                  window.location.href = `/schools/students/class/${schoolClass.id}`;
                }}
              />
            ))
          )}
        </MobileList>
      </div>
    </div>
  );
}
