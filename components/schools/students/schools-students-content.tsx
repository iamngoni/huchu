"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FilterChips,
  MobileList,
  MobileListEmpty,
  MobileListSectionHeader,
} from "@corelithzw/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumericCell } from "@/components/ui/numeric-cell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VerticalDataViews } from "@/components/ui/vertical-data-views";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  fetchSchoolsClasses,
  fetchSchoolsGuardians,
  fetchSchoolsStudents,
  type SchoolsClassRecord,
  type SchoolsGuardianRecord,
  type SchoolsStudentRecord,
} from "@/lib/schools/admin-v2";

type StudentsView = "students" | "guardians";

type StudentStatusFilter = "all" | "ACTIVE" | "APPLICANT" | "SUSPENDED" | "GRADUATED" | "WITHDRAWN";
type BoardingFilter = "all" | "boarding" | "day";
type GuardianAccountFilter = "all" | "with-account" | "without-account";

const STUDENT_STATUS_OPTIONS: Array<{ value: StudentStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "APPLICANT", label: "Applicant" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const BOARDING_OPTIONS: Array<{ value: BoardingFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "boarding", label: "Boarders" },
  { value: "day", label: "Day scholars" },
];

const GUARDIAN_ACCOUNT_OPTIONS: Array<{ value: GuardianAccountFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "with-account", label: "On the portal" },
  { value: "without-account", label: "Not invited" },
];

/**
 * The heading a student sits under, and the sort key that has to agree with it.
 *
 * `rowGroup` groups what is adjacent rather than reordering, so this has to
 * match `orderBy` in `/api/v2/schools/students` — class level, then class, then
 * stream. A student with no class is its own group at the end rather than an
 * unlabelled run, because "not placed yet" is a thing a registrar needs to see.
 */
function classGroupFor(student: SchoolsStudentRecord) {
  if (!student.currentClass) {
    return { key: "unplaced", label: "Not in a class" };
  }
  const stream = student.currentStream?.name;
  return {
    key: `${student.currentClass.id}:${student.currentStream?.id ?? ""}`,
    label: stream
      ? `${student.currentClass.name} · ${stream}`
      : student.currentClass.name,
  };
}

function statusBadge(status: string) {
  if (status === "ACTIVE") return <Badge variant="secondary">Active</Badge>;
  if (status === "APPLICANT") return <Badge variant="outline">Applicant</Badge>;
  if (status === "SUSPENDED") return <Badge variant="destructive">Suspended</Badge>;
  if (status === "GRADUATED") return <Badge variant="outline">Graduated</Badge>;
  return <Badge variant="destructive">Withdrawn</Badge>;
}

const initialStudentForm = { firstName: "", lastName: "", admissionNo: "", isBoarding: false };
const initialGuardianForm = { firstName: "", lastName: "", phone: "", email: "", nationalId: "" };

export function SchoolsStudentsContent() {
  const [activeView, setActiveView] = useState<StudentsView>("students");
  const queryClient = useQueryClient();

  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [studentForm, setStudentForm] = useState(initialStudentForm);

  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false);
  const [guardianForm, setGuardianForm] = useState(initialGuardianForm);

  const [classFilter, setClassFilter] = useState<string>("");
  const [streamFilter, setStreamFilter] = useState<string>("");
  // Both were already accepted by `/api/v2/schools/students` and neither had a
  // control, so a registrar could not answer "who has left?" or "who boards?"
  // without reading the whole directory.
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("all");
  const [boardingFilter, setBoardingFilter] = useState<BoardingFilter>("all");
  const [guardianAccountFilter, setGuardianAccountFilter] =
    useState<GuardianAccountFilter>("all");

  const createStudentMutation = useMutation({
    mutationFn: async (payload: typeof studentForm) =>
      fetchJson("/api/v2/schools/students", {
        method: "POST",
        body: JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          admissionNo: payload.admissionNo || undefined,
          isBoarding: payload.isBoarding,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "students", "directory"] });
      setStudentForm(initialStudentForm);
      setStudentDialogOpen(false);
    },
  });

  const createGuardianMutation = useMutation({
    mutationFn: async (payload: typeof guardianForm) =>
      fetchJson("/api/v2/schools/guardians", {
        method: "POST",
        body: JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
          email: payload.email || undefined,
          nationalId: payload.nationalId || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "guardians", "directory"] });
      setGuardianForm(initialGuardianForm);
      setGuardianDialogOpen(false);
    },
  });

  const handleStudentDialogOpenChange = (open: boolean) => {
    setStudentDialogOpen(open);
    if (!open) {
      setStudentForm(initialStudentForm);
      createStudentMutation.reset();
    }
  };

  const handleGuardianDialogOpenChange = (open: boolean) => {
    setGuardianDialogOpen(open);
    if (!open) {
      setGuardianForm(initialGuardianForm);
      createGuardianMutation.reset();
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.firstName || !studentForm.lastName) return;
    createStudentMutation.mutate(studentForm);
  };

  const handleGuardianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianForm.firstName || !guardianForm.lastName || !guardianForm.phone) return;
    createGuardianMutation.mutate(guardianForm);
  };

  const studentsQuery = useQuery({
    queryKey: [
      "schools",
      "students",
      "directory",
      classFilter,
      streamFilter,
      statusFilter,
      boardingFilter,
    ],
    queryFn: () =>
      fetchSchoolsStudents({
        page: 1,
        limit: 200,
        classId: classFilter || undefined,
        streamId: streamFilter || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        isBoarding:
          boardingFilter === "all" ? undefined : boardingFilter === "boarding",
      }),
  });
  const guardiansQuery = useQuery({
    queryKey: ["schools", "guardians", "directory", guardianAccountFilter],
    queryFn: () =>
      fetchSchoolsGuardians({
        page: 1,
        limit: 200,
        hasPortalAccount:
          guardianAccountFilter === "all"
            ? undefined
            : guardianAccountFilter === "with-account",
      }),
  });
  const classesQuery = useQuery({
    queryKey: ["schools", "classes", "list"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 100 }),
  });

  const students = useMemo(
    () => {
      const raw = studentsQuery.data;
      if (!raw) return [];
      return Array.isArray(raw) ? raw : raw.data ?? [];
    },
    [studentsQuery.data],
  );
  const guardians = useMemo(
    () => {
      const raw = guardiansQuery.data;
      if (!raw) return [];
      return Array.isArray(raw) ? raw : raw.data ?? [];
    },
    [guardiansQuery.data],
  );

  const classes = useMemo<SchoolsClassRecord[]>(() => {
    const raw = classesQuery.data;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : raw.data ?? [];
  }, [classesQuery.data]);

  const filteredStreams = useMemo(() => {
    if (!classFilter) return [];
    const cls = classes.find((c) => c.id === classFilter);
    return cls?.streams ?? [];
  }, [classFilter, classes]);

  const studentColumns = useMemo<ColumnDef<SchoolsStudentRecord>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => (
          <div>
            {/* Surname first, because that is the sort key. Rendered
                "Rudo Chirwa" over a list ordered by "Chirwa", the column read
                as unsorted and there was no way to tell it was not. */}
            <div className="font-medium">
              <Link href={`/schools/students/${row.original.id}`} className="hover:underline">
                {row.original.lastName}, {row.original.firstName}
              </Link>
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.studentNo}
              {row.original.admissionNo ? ` · Admission ${row.original.admissionNo}` : ""}
            </div>
          </div>
        ),
      },
      {
        id: "class",
        header: "Class / Stream",
        cell: ({ row }) => (
          <span>
            {row.original.currentClass ? (
              <Link href={`/schools/classes/${row.original.currentClass.id}`} className="hover:underline">
                {row.original.currentClass.name}
              </Link>
            ) : (
              "-"
            )}
            {row.original.currentStream ? ` / ${row.original.currentStream.name}` : ""}
          </span>
        ),
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
            {row.original.isBoarding ? "Boarder" : "Day Scholar"}
          </Badge>
        ),
      },
      {
        id: "guardians",
        header: "Guardians",
        cell: ({ row }) => <NumericCell>{row.original._count.guardianLinks}</NumericCell>,
      },
      {
        id: "enrollments",
        header: "Enrollments",
        cell: ({ row }) => <NumericCell>{row.original._count.enrollments}</NumericCell>,
      },
    ],
    [],
  );

  const guardianColumns = useMemo<ColumnDef<SchoolsGuardianRecord>[]>(
    () => [
      {
        id: "guardian",
        header: "Guardian",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.lastName}, {row.original.firstName}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.guardianNo} · {row.original.phone}
              {row.original.email ? ` · ${row.original.email}` : ""}
            </div>
          </div>
        ),
      },
      {
        id: "nationalId",
        header: "National ID",
        cell: ({ row }) => row.original.nationalId || "-",
      },
      {
        id: "linkedStudents",
        header: "Linked Students",
        cell: ({ row }) => <NumericCell>{row.original._count.studentLinks}</NumericCell>,
      },
    ],
    [],
  );

  const hasError = studentsQuery.error || guardiansQuery.error;

  return (
    <div className="space-y-4">
      {hasError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load student directory</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(studentsQuery.error || guardiansQuery.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      <VerticalDataViews
        items={[
          { id: "students", label: "Students", count: students.length },
          { id: "guardians", label: "Guardians", count: guardians.length },
        ]}
        value={activeView}
        onValueChange={(value) => setActiveView(value as StudentsView)}
        railLabel="Directory Views"
      >
        <div className={activeView === "students" ? "space-y-2" : "hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Student Directory</h2>
            <Button size="sm" onClick={() => setStudentDialogOpen(true)}>
              Add Student
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={classFilter}
              onValueChange={(value) => {
                setClassFilter(value === "all" ? "" : value);
                setStreamFilter("");
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classFilter && filteredStreams.length > 0 && (
              <Select
                value={streamFilter}
                onValueChange={(value) => setStreamFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by Stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  {filteredStreams.map((stream) => (
                    <SelectItem key={stream.id} value={stream.id}>
                      {stream.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Chips rather than more selects: both are short, closed lists, and
              `FilterChips` scrolls sideways on a phone instead of stacking two
              full-width dropdowns above the register. */}
          <div className="space-y-1">
            <FilterChips
              aria-label="Filter students by status"
              value={statusFilter}
              options={STUDENT_STATUS_OPTIONS}
              onChange={(value) => setStatusFilter(value as StudentStatusFilter)}
            />
            <FilterChips
              aria-label="Filter students by boarding"
              value={boardingFilter}
              options={BOARDING_OPTIONS}
              onChange={(value) => setBoardingFilter(value as BoardingFilter)}
            />
          </div>
          <DataTable
            data={students}
            columns={studentColumns}
            searchPlaceholder="Search students"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            rowGroup={classGroupFor}
            mobileListRenderer={({ rows }) => (
              <MobileList>
                {rows.length === 0 ? (
                  <MobileListEmpty>
                    {studentsQuery.isLoading
                      ? "Loading students…"
                      : "No students found."}
                  </MobileListEmpty>
                ) : (
                  rows.map(({ row }, index) => {
                    const group = classGroupFor(row);
                    const previous = index > 0 ? classGroupFor(rows[index - 1].row) : null;
                    return (
                      <Fragment key={row.id}>
                        {group.key !== previous?.key ? (
                          <MobileListSectionHeader>{group.label}</MobileListSectionHeader>
                        ) : null}
                        <MobileList.Row
                          title={`${row.lastName}, ${row.firstName}`}
                          // Status goes in the subtitle, not `trailing`. The
                          // design system's row is a `1fr 14px` grid — the
                          // trailing column is sized for a chevron — and
                          // `.mobile-list` is `overflow: clip`, so a badge there
                          // is cut mid-word rather than wrapped or scrolled.
                          // Class is omitted: it is the heading above the row.
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
              studentsQuery.isLoading ? "Loading students..." : "No students found."
            }
          />
        </div>

        <div className={activeView === "guardians" ? "space-y-2" : "hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Guardian Directory</h2>
            <Button size="sm" onClick={() => setGuardianDialogOpen(true)}>
              Add Guardian
            </Button>
          </div>
          <FilterChips
            aria-label="Filter guardians by portal account"
            value={guardianAccountFilter}
            options={GUARDIAN_ACCOUNT_OPTIONS}
            onChange={(value) => setGuardianAccountFilter(value as GuardianAccountFilter)}
          />
          <DataTable
            data={guardians}
            columns={guardianColumns}
            searchPlaceholder="Search guardians"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            mobileListRenderer={({ rows }) => (
              <MobileList>
                {rows.length === 0 ? (
                  <MobileListEmpty>
                    {guardiansQuery.isLoading
                      ? "Loading guardians…"
                      : "No guardians found."}
                  </MobileListEmpty>
                ) : (
                  rows.map(({ row }) => (
                    <MobileList.Row
                      key={row.id}
                      title={`${row.firstName} ${row.lastName}`}
                      subtitle={[
                        row.guardianNo,
                        row.phone,
                        `${row._count.studentLinks} linked`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      onClick={() => {
                        window.location.href = `/schools/guardians/${row.id}`;
                      }}
                    />
                  ))
                )}
              </MobileList>
            )}
            emptyState={
              guardiansQuery.isLoading ? "Loading guardians..." : "No guardians found."
            }
          />
        </div>
      </VerticalDataViews>

      {/* Create Student Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={handleStudentDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>Enter the student details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            {createStudentMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{getApiErrorMessage(createStudentMutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="student-firstName" className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="student-firstName"
                value={studentForm.firstName}
                onChange={(e) => setStudentForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="student-lastName" className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="student-lastName"
                value={studentForm.lastName}
                onChange={(e) => setStudentForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="student-admissionNo" className="text-sm font-medium">
                Admission No
              </label>
              <Input
                id="student-admissionNo"
                value={studentForm.admissionNo}
                onChange={(e) => setStudentForm((f) => ({ ...f, admissionNo: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="student-isBoarding"
                type="checkbox"
                checked={studentForm.isBoarding}
                onChange={(e) => setStudentForm((f) => ({ ...f, isBoarding: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="student-isBoarding" className="text-sm font-medium">
                Boarding Student
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleStudentDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStudentMutation.isPending}>
                {createStudentMutation.isPending ? "Saving…" : "Add Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Guardian Dialog */}
      <Dialog open={guardianDialogOpen} onOpenChange={handleGuardianDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guardian</DialogTitle>
            <DialogDescription>Enter the guardian details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGuardianSubmit} className="space-y-4">
            {createGuardianMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{getApiErrorMessage(createGuardianMutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="guardian-firstName" className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="guardian-firstName"
                value={guardianForm.firstName}
                onChange={(e) => setGuardianForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="guardian-lastName" className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="guardian-lastName"
                value={guardianForm.lastName}
                onChange={(e) => setGuardianForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="guardian-phone" className="text-sm font-medium">
                Phone <span className="text-destructive">*</span>
              </label>
              <Input
                id="guardian-phone"
                type="tel"
                value={guardianForm.phone}
                onChange={(e) => setGuardianForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="guardian-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="guardian-email"
                type="email"
                value={guardianForm.email}
                onChange={(e) => setGuardianForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="guardian-nationalId" className="text-sm font-medium">
                National ID
              </label>
              <Input
                id="guardian-nationalId"
                value={guardianForm.nationalId}
                onChange={(e) => setGuardianForm((f) => ({ ...f, nationalId: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleGuardianDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGuardianMutation.isPending}>
                {createGuardianMutation.isPending ? "Saving…" : "Add Guardian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
