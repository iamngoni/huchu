"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchSchoolsClasses } from "@/lib/schools/admin-v2";
import { fetchSchoolsResultsData } from "@/lib/schools/schools-v2";

type SheetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "HOD_APPROVED"
  | "HOD_REJECTED"
  | "PUBLISHED";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "HOD_APPROVED", label: "Approved" },
  { value: "HOD_REJECTED", label: "Sent back" },
  { value: "PUBLISHED", label: "Published" },
];

function statusBadge(status: SheetStatus) {
  if (status === "PUBLISHED") return <Badge variant="secondary">Published</Badge>;
  if (status === "HOD_APPROVED") return <Badge variant="secondary">Approved</Badge>;
  if (status === "HOD_REJECTED") return <Badge variant="destructive">Sent back</Badge>;
  if (status === "SUBMITTED") return <Badge variant="outline">Submitted</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

/**
 * One year group's mark sheets.
 *
 * A result sheet already belongs to a class, so listing every sheet in the
 * school and asking a head of department to find theirs was the same
 * one-giant-list problem the student directory had. The class is the route;
 * status is the filter, because "what is still in draft in Form 2" is the
 * question a HOD is actually asking in the week before reports go out.
 */
export function ClassResultsContent({
  classId,
  initialStreamId,
}: {
  classId: string;
  initialStreamId?: string;
}) {
  const [streamFilter, setStreamFilter] = useState(initialStreamId ?? "");
  const [statusFilter, setStatusFilter] = useState("");

  const classesQuery = useQuery({
    queryKey: ["schools", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const resultsQuery = useQuery({
    queryKey: ["schools", "results", "by-class", classId, streamFilter, statusFilter],
    queryFn: () =>
      fetchSchoolsResultsData({
        page: 1,
        limit: 200,
        classId,
        streamId: streamFilter || undefined,
        status: (statusFilter || undefined) as SheetStatus | undefined,
      }),
  });

  const sheets = useMemo(() => resultsQuery.data?.data ?? [], [resultsQuery.data]);
  const schoolClass = useMemo(
    () => (classesQuery.data?.data ?? []).find((row) => row.id === classId) ?? null,
    [classesQuery.data, classId],
  );
  const streams = schoolClass?.streams ?? [];

  if (resultsQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load mark sheets</AlertTitle>
        <AlertDescription>{getApiErrorMessage(resultsQuery.error)}</AlertDescription>
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
      </FilterBar>

      <MobileList>
        {sheets.length === 0 ? (
          <MobileListEmpty>
            {resultsQuery.isLoading
              ? "Loading mark sheets…"
              : "No mark sheets for this year group yet."}
          </MobileListEmpty>
        ) : (
          sheets.map((sheet) => (
            <MobileList.Row
              key={sheet.id}
              static
              title={sheet.title}
              subtitle={
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <span>
                    {[sheet.stream?.name, sheet.term.name, `${sheet._count.lines} marks`]
                      .filter(Boolean)
                      .join(" · ")}
                    {sheet.stats.averageScore !== null
                      ? ` · average ${sheet.stats.averageScore.toFixed(1)}`
                      : ""}
                  </span>
                  {statusBadge(sheet.status)}
                </span>
              }
            />
          ))
        )}
      </MobileList>

      <p className="text-sm text-muted-foreground">
        Moderation and publishing act on these sheets —{" "}
        <Link href="/schools/results/moderation" className="hover:underline">
          moderation queue
        </Link>{" "}
        and{" "}
        <Link href="/schools/results/publish" className="hover:underline">
          publishing
        </Link>
        .
      </p>
    </div>
  );
}
