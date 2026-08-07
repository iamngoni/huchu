"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { NumericCell } from "@/components/ui/numeric-cell";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  createSchoolsAcademicYear,
  createSchoolsTerm,
  fetchSchoolsAcademicYears,
  fetchSchoolsTerms,
  updateSchoolsAcademicYear,
  updateSchoolsTerm,
  type SchoolsAcademicYearRecord,
  type SchoolsTermRecord,
} from "@/lib/schools/admin-v2";
import { AcademicYearFormSheet } from "./academic-year-form-sheet";
import { TermFormSheet } from "./term-form-sheet";

/**
 * The academic calendar — years and terms.
 *
 * Every term-scoped record in the pack (enrolment, invoice, register, result
 * sheet, allocation) is keyed by `termId`, and until this surface existed there
 * was no way to create one. It is therefore the first screen a newly
 * provisioned school has to visit, which is why it leads the Academics rail and
 * says so plainly when the school has no active term.
 */

export type SchoolsCalendarView = "years" | "terms";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function formatRange(start: string, end: string) {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export function SchoolsCalendarContent({
  view,
  onCreatedTerm,
}: {
  view: SchoolsCalendarView;
  onCreatedTerm?: () => void;
}) {
  const queryClient = useQueryClient();
  const [yearSheetOpen, setYearSheetOpen] = useState(false);
  const [termSheetOpen, setTermSheetOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const yearsQuery = useQuery({
    queryKey: ["schools", "academic-years"],
    queryFn: () => fetchSchoolsAcademicYears({ page: 1, limit: 100 }),
  });
  const termsQuery = useQuery({
    queryKey: ["schools", "terms"],
    queryFn: () => fetchSchoolsTerms({ page: 1, limit: 200 }),
  });

  const years = useMemo(() => yearsQuery.data?.data ?? [], [yearsQuery.data]);
  const terms = useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data]);
  const activeTerm = useMemo(() => terms.find((term) => term.isActive), [terms]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["schools", "academic-years"] });
    queryClient.invalidateQueries({ queryKey: ["schools", "terms"] });
  }

  const activateYear = useMutation({
    mutationFn: (id: string) => updateSchoolsAcademicYear(id, { isActive: true }),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const activateTermMutation = useMutation({
    mutationFn: (id: string) => updateSchoolsTerm(id, { isActive: true }),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const createYear = useMutation({
    mutationFn: createSchoolsAcademicYear,
    onSuccess: () => {
      setActionError(null);
      setYearSheetOpen(false);
      invalidate();
    },
  });

  const createTerm = useMutation({
    mutationFn: createSchoolsTerm,
    onSuccess: () => {
      setActionError(null);
      setTermSheetOpen(false);
      invalidate();
      onCreatedTerm?.();
    },
  });

  const yearColumns = useMemo<ColumnDef<SchoolsAcademicYearRecord>[]>(
    () => [
      {
        id: "year",
        header: "Academic year",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.code} - {row.original.name}
            </div>
            <div className="text-muted-foreground font-mono">
              {formatRange(row.original.startDate, row.original.endDate)}
            </div>
          </div>
        ),
      },
      {
        id: "terms",
        header: "Terms",
        cell: ({ row }) => <NumericCell>{row.original._count.terms}</NumericCell>,
      },
      {
        id: "classes",
        header: "Classes",
        cell: ({ row }) => <NumericCell>{row.original._count.classes}</NumericCell>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="secondary">Current</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={activateYear.isPending}
              onClick={() => activateYear.mutate(row.original.id)}
            >
              Make current
            </Button>
          ),
      },
    ],
    [activateYear],
  );

  const termColumns = useMemo<ColumnDef<SchoolsTermRecord>[]>(
    () => [
      {
        id: "term",
        header: "Term",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.code} - {row.original.name}
            </div>
            <div className="text-muted-foreground font-mono">
              {formatRange(row.original.startDate, row.original.endDate)}
            </div>
          </div>
        ),
      },
      {
        id: "academicYear",
        header: "Academic year",
        cell: ({ row }) => row.original.academicYear.code,
      },
      {
        id: "enrollments",
        header: "Enrolled",
        cell: ({ row }) => <NumericCell>{row.original._count.enrollments}</NumericCell>,
      },
      {
        id: "invoices",
        header: "Invoices",
        cell: ({ row }) => <NumericCell>{row.original._count.feeInvoices}</NumericCell>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="secondary">Current</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={activateTermMutation.isPending}
              onClick={() => activateTermMutation.mutate(row.original.id)}
            >
              Make current
            </Button>
          ),
      },
    ],
    [activateTermMutation],
  );

  const hasError = yearsQuery.error || termsQuery.error;

  return (
    <div className="space-y-4">
      {hasError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the academic calendar</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(yearsQuery.error || termsQuery.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>That change was not applied</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {!yearsQuery.isLoading && !termsQuery.isLoading && !activeTerm ? (
        <Alert>
          <AlertTitle>This school has no current term</AlertTitle>
          <AlertDescription>
            Admissions, fees, registers and results are all recorded against a term.
            Open an academic year and make one of its terms current to start using them.
          </AlertDescription>
        </Alert>
      ) : null}

      {view === "years" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Academic years</h2>
            <Button size="sm" onClick={() => setYearSheetOpen(true)}>
              New academic year
            </Button>
          </div>
          <DataTable
            data={years}
            columns={yearColumns}
            searchPlaceholder="Search academic years"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            mobileListRenderer={({ rows }) => (
              <MobileList>
                {rows.length === 0 ? (
                  <MobileListEmpty>
                    {yearsQuery.isLoading
                      ? "Loading academic years…"
                      : "No academic years yet."}
                  </MobileListEmpty>
                ) : (
                  rows.map(({ row }) => (
                    <MobileList.Row
                      key={row.id}
                      static={row.isActive}
                      title={`${row.code} - ${row.name}`}
                      // "Current" reads on the subtitle line rather than as a
                      // badge in `trailing`: the design system's row is a
                      // `1fr 14px` grid sized for a chevron and `.mobile-list`
                      // is `overflow: clip`, so a badge there was cut mid-word.
                      subtitle={[
                        formatRange(row.startDate, row.endDate),
                        `${row._count.terms} terms`,
                        row.isActive ? "Current" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      onClick={
                        row.isActive ? undefined : () => activateYear.mutate(row.id)
                      }
                    />
                  ))
                )}
              </MobileList>
            )}
            emptyState={
              yearsQuery.isLoading
                ? "Loading academic years…"
                : "No academic years yet. Create one to open the school year."
            }
          />
        </div>
      ) : null}

      {view === "terms" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Terms</h2>
            <Button
              size="sm"
              disabled={years.length === 0}
              onClick={() => setTermSheetOpen(true)}
            >
              New term
            </Button>
          </div>
          {years.length === 0 ? (
            <Alert>
              <AlertTitle>Create an academic year first</AlertTitle>
              <AlertDescription>
                A term belongs to an academic year and has to fall inside its dates.
              </AlertDescription>
            </Alert>
          ) : null}
          <DataTable
            data={terms}
            columns={termColumns}
            searchPlaceholder="Search terms"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            mobileListRenderer={({ rows }) => (
              <MobileList>
                {rows.length === 0 ? (
                  <MobileListEmpty>
                    {termsQuery.isLoading ? "Loading terms…" : "No terms yet."}
                  </MobileListEmpty>
                ) : (
                  rows.map(({ row }) => (
                    <MobileList.Row
                      key={row.id}
                      static={row.isActive}
                      title={`${row.academicYear.code} · ${row.code} - ${row.name}`}
                      subtitle={[
                        formatRange(row.startDate, row.endDate),
                        row.isActive ? "Current" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      onClick={
                        row.isActive
                          ? undefined
                          : () => activateTermMutation.mutate(row.id)
                      }
                    />
                  ))
                )}
              </MobileList>
            )}
            emptyState={
              termsQuery.isLoading
                ? "Loading terms…"
                : "No terms yet. Add the terms that make up the academic year."
            }
          />
        </div>
      ) : null}

      <AcademicYearFormSheet
        open={yearSheetOpen}
        onOpenChange={setYearSheetOpen}
        isSubmitting={createYear.isPending}
        error={createYear.error ? getApiErrorMessage(createYear.error) : null}
        onSubmit={(values) => createYear.mutate(values)}
      />

      <TermFormSheet
        open={termSheetOpen}
        onOpenChange={setTermSheetOpen}
        years={years}
        isSubmitting={createTerm.isPending}
        error={createTerm.error ? getApiErrorMessage(createTerm.error) : null}
        onSubmit={(values) => createTerm.mutate(values)}
      />
    </div>
  );
}
