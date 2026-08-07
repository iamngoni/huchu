"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Badge, StatCard } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTable } from "@/components/ui/data-table";
import { NumericCell } from "@/components/ui/numeric-cell";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  fetchSchoolsClasses,
  fetchSchoolsSubjects,
  fetchSchoolsTerms,
} from "@/lib/schools/admin-v2";

/** Kept in step with `AssignmentState` in `lib/schools/assignments.ts`. */
type AssignmentState = "DRAFT" | "SET" | "DUE_WEEK" | "OVERDUE";

type OversightRow = {
  id: string;
  title: string;
  dueAt: string | null;
  setOn: string;
  isPublished: boolean;
  classId: string;
  className: string;
  streamName: string | null;
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  onRoll: number;
  handedIn: number;
  late: number;
  marked: number;
  state: AssignmentState;
};

type OversightResponse = {
  termId: string;
  rows: OversightRow[];
  summary: {
    open: number;
    dueThisWeek: number;
    overdue: number;
    onRoll: number;
    handedIn: number;
  };
};

const STATE_OPTIONS = [
  { value: "SET", label: "Set and running" },
  { value: "DUE_WEEK", label: "Due this week" },
  { value: "OVERDUE", label: "Overdue" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

function stateBadge(state: AssignmentState) {
  if (state === "OVERDUE") return <Badge tone="danger">Overdue</Badge>;
  if (state === "DUE_WEEK") return <Badge tone="warn">Due this week</Badge>;
  if (state === "DRAFT") return <Badge tone="neutral">Not set yet</Badge>;
  return <Badge tone="success">Running</Badge>;
}

/**
 * What the whole school has been set, and what has come back.
 *
 * A teacher already sees their own homework and a child sees their own; nobody
 * could see across classes, so "which class is drowning this week" had no
 * answer anywhere in the product. The column that answers it is handed-in *of
 * the roll* — 4 of 32 and 4 of 5 are the same submission count and completely
 * different Tuesdays — which is why the roll travels with every row rather
 * than a bare tally of what arrived.
 *
 * The tiles count the term-and-filter scope, not the state filter below them:
 * a head reads "6 overdue", then narrows the table to see which six. Narrowing
 * the tiles too would leave every tile reading its own filter back at itself.
 */
export function HomeworkOversightContent() {
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [state, setState] = useState("");

  const termsQuery = useQuery({
    queryKey: ["schools", "terms", "homework-oversight"],
    queryFn: () => fetchSchoolsTerms({ page: 1, limit: 100 }),
  });
  const classesQuery = useQuery({
    queryKey: ["schools", "grades", "homework-oversight"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });
  const subjectsQuery = useQuery({
    queryKey: ["schools", "subjects", "homework-oversight"],
    queryFn: () => fetchSchoolsSubjects({ page: 1, limit: 200 }),
  });

  const query = useQuery({
    queryKey: ["schools", "homework", "oversight", termId, classId, subjectId],
    queryFn: () =>
      fetchJson<OversightResponse>(
        `/api/v2/schools/assignments/oversight?${new URLSearchParams({
          ...(termId ? { termId } : {}),
          ...(classId ? { classId } : {}),
          ...(subjectId ? { subjectId } : {}),
        }).toString()}`,
      ),
  });

  const termOptions = useMemo(
    () =>
      (termsQuery.data?.data ?? []).map((term) => ({
        value: term.id,
        label: `${term.name} · ${term.academicYear.name}`,
      })),
    [termsQuery.data],
  );
  const classOptions = useMemo(
    () =>
      (classesQuery.data?.data ?? []).map((row) => ({
        value: row.id,
        label: row.name,
      })),
    [classesQuery.data],
  );
  const subjectOptions = useMemo(
    () =>
      (subjectsQuery.data?.data ?? []).map((row) => ({
        value: row.id,
        label: row.name,
      })),
    [subjectsQuery.data],
  );

  const summary = query.data?.summary;
  const rows = useMemo(() => {
    const all = query.data?.rows ?? [];
    if (!state) return all;
    // "Set and running" holds the drafts back: a head asking what is set means
    // what the children can see.
    return all.filter((row) => row.state === state);
  }, [query.data, state]);

  const columns = useMemo<ColumnDef<OversightRow>[]>(
    () => [
      {
        id: "subject",
        header: "Subject and class",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium">{row.original.subjectName}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.className}
              {row.original.streamName ? ` · ${row.original.streamName}` : ""}
            </div>
          </div>
        ),
      },
      {
        id: "title",
        header: "Homework",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium">{row.original.title}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.marked > 0
                ? `${row.original.marked} marked`
                : "Nothing marked yet"}
              {row.original.late > 0 ? ` · ${row.original.late} in late` : ""}
            </div>
          </div>
        ),
      },
      {
        id: "teacher",
        header: "Teacher",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.teacherName ?? "Unassigned"}</span>
        ),
      },
      {
        id: "setOn",
        header: "Set",
        cell: ({ row }) => <NumericCell>{formatDate(row.original.setOn)}</NumericCell>,
      },
      {
        id: "dueAt",
        header: "Due",
        cell: ({ row }) => (
          <NumericCell
            className={
              row.original.state === "OVERDUE"
                ? "font-semibold text-[color:var(--tone-danger)]"
                : undefined
            }
          >
            {row.original.dueAt ? formatDate(row.original.dueAt) : "No deadline"}
          </NumericCell>
        ),
      },
      {
        id: "handedIn",
        header: "Handed in",
        cell: ({ row }) => {
          const { handedIn, onRoll, state: rowState } = row.original;
          // Colour only where it means something: a class past its deadline
          // with work still missing. Everything else stays plain, so the red
          // in the column is a shortlist rather than decoration.
          const tone =
            rowState === "OVERDUE"
              ? "text-[color:var(--tone-danger)]"
              : onRoll > 0 && handedIn >= onRoll
                ? "text-[color:var(--tone-success)]"
                : undefined;
          return (
            <NumericCell className={tone}>
              {handedIn} of {onRoll}
            </NumericCell>
          );
        },
      },
      {
        id: "state",
        header: "State",
        cell: ({ row }) => stateBadge(row.original.state),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the homework</AlertTitle>
          <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Set and running"
          value={query.isPending ? "—" : (summary?.open ?? 0)}
          footer="Published, deadline not yet passed"
        />
        <StatCard
          label="Due this week"
          value={query.isPending ? "—" : (summary?.dueThisWeek ?? 0)}
          tone="warn"
          footer="Monday to Sunday"
        />
        <StatCard
          label="Overdue"
          value={query.isPending ? "—" : (summary?.overdue ?? 0)}
          tone="danger"
          footer="Past the deadline with work still missing"
        />
      </div>

      <FilterBar>
        <FilterSelect
          label="Term"
          allLabel="This term"
          value={termId}
          options={termOptions}
          onChange={setTermId}
        />
        <FilterSelect
          label="Year group"
          allLabel="Every year"
          value={classId}
          options={classOptions}
          onChange={setClassId}
        />
        <FilterSelect
          label="Subject"
          allLabel="Every subject"
          value={subjectId}
          options={subjectOptions}
          onChange={setSubjectId}
        />
        <FilterSelect
          label="State"
          allLabel="Anything set"
          value={state}
          options={STATE_OPTIONS}
          onChange={setState}
        />
      </FilterBar>

      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Search homework, subject or teacher"
        searchSubmitLabel="Search"
        pagination={{ enabled: true }}
        emptyState={
          query.isPending
            ? "Loading the term's homework…"
            : query.error
              ? "Nothing to show while the homework cannot be loaded."
              : state
                ? "No homework in that state. Widen the filters to see the rest of the term."
                : "No homework has been set this term. Anything a teacher sets appears here with the class roll beside it."
        }
      />
    </div>
  );
}
