"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { NumericCell } from "@/components/ui/numeric-cell";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchSchoolsClasses,
  fetchSchoolsStudents,
  type SchoolsStudentRecord,
} from "@/lib/schools/admin-v2";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "APPLICANT", label: "Applicant" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const BOARDING_OPTIONS = [
  { value: "boarding", label: "Boarders" },
  { value: "day", label: "Day scholars" },
];

function statusBadge(status: string) {
  if (status === "ACTIVE") return <Badge variant="secondary">Active</Badge>;
  if (status === "APPLICANT") return <Badge variant="outline">Applicant</Badge>;
  if (status === "SUSPENDED") return <Badge variant="destructive">Suspended</Badge>;
  if (status === "GRADUATED") return <Badge variant="outline">Graduated</Badge>;
  return <Badge variant="destructive">Withdrawn</Badge>;
}

/**
 * The register for one year group.
 *
 * Scoped by route rather than by a dropdown over everything, so the query asks
 * for one class's students and the page never holds the whole school. Within
 * the group the students are ordered by surname and headed by their class —
 * "Form 2 Blue", the unit a class teacher actually works in — unless a single
 * class is already chosen, in which case the heading would repeat itself.
 */
export function ClassStudentsContent({
  classId,
  initialStreamId,
}: {
  classId: string;
  initialStreamId?: string;
}) {
  const [streamFilter, setStreamFilter] = useState(initialStreamId ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [boardingFilter, setBoardingFilter] = useState("");

  const classesQuery = useQuery({
    queryKey: ["schools", "students", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const studentsQuery = useQuery({
    queryKey: [
      "schools",
      "students",
      "by-class",
      classId,
      streamFilter,
      statusFilter,
      boardingFilter,
    ],
    queryFn: () =>
      fetchSchoolsStudents({
        page: 1,
        limit: 200,
        classId,
        streamId: streamFilter || undefined,
        status: statusFilter || undefined,
        isBoarding:
          boardingFilter === "" ? undefined : boardingFilter === "boarding",
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

  /** Only worth a heading when more than one class is on screen. */
  const streamGroupFor = useMemo(() => {
    if (streamFilter) return undefined;
    return (student: SchoolsStudentRecord) =>
      student.currentStream
        ? { key: student.currentStream.id, label: student.currentStream.name }
        : { key: "unstreamed", label: "Not in a class yet" };
  }, [streamFilter]);

  const columns = useMemo<ColumnDef<SchoolsStudentRecord>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        // A face, then the name. A list of eight hundred children is scanned
        // rather than read, and the same child is the same colour wherever
        // they appear.
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <PersonAvatar
              firstName={row.original.firstName}
              lastName={row.original.lastName}
            />
            <div className="min-w-0">
              <div className="font-medium">
                <Link
                  href={`/schools/students/${row.original.id}`}
                  className="hover:underline"
                >
                  {row.original.lastName}, {row.original.firstName}
                </Link>
              </div>
              <div className="text-sm text-muted-foreground">
                {row.original.studentNo}
                {row.original.admissionNo ? ` · Admission ${row.original.admissionNo}` : ""}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "stream",
        header: "Class",
        cell: ({ row }) => row.original.currentStream?.name ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "boarding",
        header: "Boarding",
        cell: ({ row }) => (
          <Badge variant={row.original.isBoarding ? "secondary" : "outline"}>
            {row.original.isBoarding ? "Boarder" : "Day"}
          </Badge>
        ),
      },
      {
        id: "guardians",
        header: "Guardians",
        cell: ({ row }) => <NumericCell>{row.original._count.guardianLinks}</NumericCell>,
      },
    ],
    [],
  );

  if (studentsQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load students</AlertTitle>
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
            onChange={setStreamFilter}
          />
        ) : null}
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
        />
        <FilterSelect
          label="Boarding"
          allLabel="Boarders and day"
          value={boardingFilter}
          options={BOARDING_OPTIONS}
          onChange={setBoardingFilter}
        />
      </FilterBar>

      <DataTable
        data={students}
        columns={columns}
        searchPlaceholder="Search this year group"
        searchSubmitLabel="Search"
        pagination={{ enabled: true }}
        rowGroup={streamGroupFor}
        mobileListRenderer={({ rows }) => (
          <MobileList>
            {rows.length === 0 ? (
              <MobileListEmpty>
                {studentsQuery.isLoading ? "Loading students…" : "No students found."}
              </MobileListEmpty>
            ) : (
              rows.map(({ row }, index) => {
                const group = streamGroupFor?.(row);
                const previous =
                  index > 0 ? streamGroupFor?.(rows[index - 1].row) : undefined;
                return (
                  <Fragment key={row.id}>
                    {group && group.key !== previous?.key ? (
                      <MobileListSectionHeader>{group.label}</MobileListSectionHeader>
                    ) : null}
                    <MobileList.Row
                      leading={
                        <PersonAvatar firstName={row.firstName} lastName={row.lastName} />
                      }
                      title={`${row.lastName}, ${row.firstName}`}
                      subtitle={[
                        row.studentNo,
                        row.isBoarding ? "Boarder" : "Day scholar",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      onClick={() => {
                        window.location.href = `/schools/students/${row.id}`;
                      }}
                    />
                  </Fragment>
                );
              })
            )}
          </MobileList>
        )}
        emptyState={
          studentsQuery.isLoading ? "Loading students…" : "No students found."
        }
      />
    </div>
  );
}
