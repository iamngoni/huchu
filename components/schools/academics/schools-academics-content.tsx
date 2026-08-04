"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { NumericCell } from "@/components/ui/numeric-cell";
import { VerticalDataViews } from "@/components/ui/vertical-data-views";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchSchoolsClasses,
  fetchSchoolsSubjects,
  type SchoolsClassRecord,
  type SchoolsSubjectRecord,
} from "@/lib/schools/admin-v2";
import { SchoolsCalendarContent } from "./schools-calendar-content";

type AcademicsView = "years" | "terms" | "classes" | "subjects";

/** Whether a subject is still taught. A filter, not part of the sort order. */
type SubjectFilter = "all" | "core" | "optional" | "inactive";

const SUBJECT_OPTIONS = [
  { value: "core", label: "Core" },
  { value: "optional", label: "Optional" },
  { value: "inactive", label: "Retired" },
];

export function SchoolsAcademicsContent() {
  // The calendar leads the rail: a term has to exist before a class, an
  // enrolment or an invoice can be recorded against one.
  const [activeView, setActiveView] = useState<AcademicsView>("years");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");

  const classesQuery = useQuery({
    queryKey: ["schools", "academics", "classes"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });
  const subjectsQuery = useQuery({
    queryKey: ["schools", "academics", "subjects", subjectFilter],
    queryFn: () =>
      fetchSchoolsSubjects({
        page: 1,
        limit: 200,
        // `isCore` is not a query parameter on the route, so core/optional is
        // narrowed below rather than pretended to be a server filter.
        isActive: subjectFilter === "inactive" ? false : undefined,
      }),
  });

  const classes = useMemo(() => classesQuery.data?.data ?? [], [classesQuery.data]);
  const allSubjects = useMemo(
    () => subjectsQuery.data?.data ?? [],
    [subjectsQuery.data],
  );
  const subjects = useMemo(() => {
    if (subjectFilter === "core") return allSubjects.filter((s) => s.isCore);
    if (subjectFilter === "optional") return allSubjects.filter((s) => !s.isCore);
    return allSubjects;
  }, [allSubjects, subjectFilter]);
  const hasError = classesQuery.error || subjectsQuery.error;

  const classColumns = useMemo<ColumnDef<SchoolsClassRecord>[]>(
    () => [
      {
        id: "class",
        header: "Class",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              <Link
                href={`/schools/classes/${row.original.id}`}
                className="hover:underline"
              >
                {row.original.code} - {row.original.name}
              </Link>
            </div>
            <div className="text-xs text-muted-foreground">
              Level: {row.original.level ?? "-"}
            </div>
          </div>
        ),
      },
      {
        id: "capacity",
        header: "Capacity",
        cell: ({ row }) => <NumericCell>{row.original.capacity ?? "-"}</NumericCell>,
      },
      {
        id: "streams",
        header: "Streams",
        cell: ({ row }) => <NumericCell>{row.original._count.streams}</NumericCell>,
      },
      {
        id: "students",
        header: "Students",
        cell: ({ row }) => <NumericCell>{row.original._count.students}</NumericCell>,
      },
    ],
    [],
  );

  const subjectColumns = useMemo<ColumnDef<SchoolsSubjectRecord>[]>(
    () => [
      {
        id: "subject",
        header: "Subject",
        // Name first: the catalogue is sorted by name, and a column led by
        // the code reads as unsorted next to it.
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.code}</div>
          </div>
        ),
      },
      {
        id: "core",
        header: "Core",
        cell: ({ row }) => (
          <Badge variant={row.original.isCore ? "secondary" : "outline"}>
            {row.original.isCore ? "Core" : "Optional"}
          </Badge>
        ),
      },
      {
        id: "passMark",
        header: "Pass Mark",
        cell: ({ row }) => <NumericCell>{row.original.passMark.toFixed(2)}</NumericCell>,
      },
      {
        id: "mappedClasses",
        header: "Class Mappings",
        cell: ({ row }) => (
          <NumericCell>{row.original._count.classSubjects}</NumericCell>
        ),
      },
      {
        id: "active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "secondary" : "destructive"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {hasError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load academics setup</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(classesQuery.error || subjectsQuery.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      <VerticalDataViews
        items={[
          { id: "years", label: "Academic Years" },
          { id: "terms", label: "Terms" },
          { id: "classes", label: "Classes", count: classes.length },
          { id: "subjects", label: "Subjects", count: subjects.length },
        ]}
        value={activeView}
        onValueChange={(value) => setActiveView(value as AcademicsView)}
        railLabel="Academics Views"
      >
        {activeView === "years" || activeView === "terms" ? (
          <SchoolsCalendarContent view={activeView} />
        ) : null}

        <div className={activeView === "classes" ? "space-y-2" : "hidden"}>
          <h2 className="text-section-title">Class and Stream Structure</h2>
          <DataTable
            data={classes}
            columns={classColumns}
            searchPlaceholder="Search classes"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            mobileListRenderer={({ rows }) => (
              <MobileList>
                {rows.length === 0 ? (
                  <MobileListEmpty>
                    {classesQuery.isLoading
                      ? "Loading classes…"
                      : "No classes configured yet."}
                  </MobileListEmpty>
                ) : (
                  rows.map(({ row }) => (
                    <MobileList.Row
                      key={row.id}
                      title={`${row.code} - ${row.name}`}
                      subtitle={[
                        `${row._count.students} students`,
                        `${row._count.streams} streams`,
                        row.capacity ? `Capacity ${row.capacity}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      onClick={() => {
                        window.location.href = `/schools/classes/${row.id}`;
                      }}
                    />
                  ))
                )}
              </MobileList>
            )}
            emptyState={
              classesQuery.isLoading ? "Loading classes..." : "No classes configured yet."
            }
          />
        </div>

        <div className={activeView === "subjects" ? "space-y-2" : "hidden"}>
          <h2 className="text-section-title">Subject Catalog</h2>
          <FilterBar>
            <FilterSelect
              label="Subject type"
              allLabel="All subjects"
              value={subjectFilter === "all" ? "" : subjectFilter}
              options={SUBJECT_OPTIONS}
              onChange={(value) => setSubjectFilter((value || "all") as SubjectFilter)}
            />
          </FilterBar>
          <DataTable
            data={subjects}
            columns={subjectColumns}
            searchPlaceholder="Search subjects"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            mobileListRenderer={({ rows }) => (
              <MobileList>
                {rows.length === 0 ? (
                  <MobileListEmpty>
                    {subjectsQuery.isLoading
                      ? "Loading subjects…"
                      : "No subjects configured yet."}
                  </MobileListEmpty>
                ) : (
                  rows.map(({ row }) => (
                    <MobileList.Row
                      key={row.id}
                      static
                      title={row.name}
                      subtitle={[
                        row.code,
                        row.isCore ? "Core" : "Optional",
                        `Pass ${row.passMark.toFixed(0)}%`,
                        row.isActive ? null : "Retired",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  ))
                )}
              </MobileList>
            )}
            emptyState={
              subjectsQuery.isLoading
                ? "Loading subjects..."
                : "No subjects configured yet."
            }
          />
        </div>
      </VerticalDataViews>
    </div>
  );
}

