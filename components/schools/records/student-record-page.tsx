"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { customFieldAttributes } from "@/components/records/custom-field-attributes";
import { RecordAttributes, type RecordAttribute } from "@/components/records/record-attributes";
import { RecordMark } from "@/components/records/record-mark";
import {
  RailSection,
  RecordPageShell,
  RelatedList,
  type RecordTab,
} from "@/components/records/record-page-shell";
import { useAttributeEditor } from "@/components/records/use-attribute-editor";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { recordType } from "@/lib/records/registry";
import { formatSchoolDate, formatSchoolMoney } from "@/lib/schools/format";
import { normalizeUiStatus } from "@/lib/ui/status-map";

/**
 * A student, as a record.
 *
 * S-4.3. This replaces a 403-line page that composed `Card` and
 * `VerticalDataViews` by hand, with its own `InfoRow`, its own `statusBadge`,
 * its own date formatter and `const student: any`. None of that was wrong; it
 * was just the sixth independent implementation of a record page in this repo,
 * and the seventh would have been the guardian.
 *
 * Everything structural now comes from `components/records/`, which owes nothing
 * to any module: the shell, the identity strip, the property list with its
 * inline commits, and the mark. What is left here is the only part that is
 * genuinely about students — which queries to run and which relationships are
 * worth a tab.
 *
 * Four tabs are deliberately absent: tasks, comments, files and mentions. Those
 * hang off `CrmTask`/`CrmComment`/`CrmRecordFile`, which identify their subject
 * with a nullable foreign key per kind, so a student cannot be one until
 * S-4.2 re-keys them onto `(subjectType, subjectId)`. Adding a `studentId`
 * column to those three tables would be the shortcut that makes S-4.2 harder.
 */

/* The profile endpoint's response is assembled from a deep Prisma include and
 * has never had a type. Narrowed here to the parts this page reads, rather than
 * carrying the `any` the old page did. */
type Guardian = {
  id: string;
  relationship: string;
  isPrimary: boolean;
  guardian: {
    id: string;
    guardianNo: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
};

type Enrollment = {
  id: string;
  status: string;
  enrolledAt: string;
  term: { id: string; code: string; name: string } | null;
  class: { id: string; code: string; name: string } | null;
  stream: { id: string; code: string; name: string } | null;
};

type Invoice = {
  id: string;
  invoiceNo: string;
  status: string;
  totalAmount: string | number;
  balanceAmount: string | number;
  currency: string;
  issueDate: string;
  term: { id: string; name: string } | null;
};

type Allocation = {
  id: string;
  startDate: string;
  endDate: string | null;
  hostel: { id: string; name: string } | null;
  room: { id: string; code: string } | null;
  bed: { id: string; code: string } | null;
};

type ResultLine = {
  id: string;
  sheet: { id: string; title: string; term: { name: string } | null } | null;
};

type StudentRecord = {
  id: string;
  studentNo: string;
  admissionNo: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  status: string;
  isBoarding: boolean;
  admissionDate: string | null;
  avatarUrl: string | null;
  accent: string | null;
  currentClass: { id: string; code: string; name: string } | null;
  currentStream: { id: string; code: string; name: string } | null;
  guardianLinks: Guardian[];
  enrollments: Enrollment[];
  feeInvoices: Invoice[];
  boardingAllocations: Allocation[];
  resultLines: ResultLine[];
};

const STATUS_OPTIONS = [
  { value: "APPLICANT", label: "Applicant" },
  { value: "ACTIVE", label: "On the roll" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "GRADUATED", label: "Left — completed" },
  { value: "WITHDRAWN", label: "Left — withdrawn" },
];

export function StudentRecordPage({ studentId }: { studentId: string }) {
  const config = recordType("STUDENT");
  const [activeTab, setActiveTab] = useState("guardians");

  const query = useQuery({
    queryKey: config.queryKey(studentId),
    queryFn: () => fetchJson<StudentRecord>(config.apiPath(studentId)),
  });

  const edit = useAttributeEditor({
    path: config.apiPath(studentId),
    invalidate: [config.queryKey(studentId), ["schools", "students"]],
  });

  const student = query.data ?? null;

  const attributes = useMemo<RecordAttribute[]>(() => {
    if (!student) return [];
    return [
      {
        id: "studentNo",
        label: "Student number",
        mono: true,
        ...edit.required("studentNo", student.studentNo),
      },
      {
        id: "class",
        label: "Class",
        display: student.currentClass ? student.currentClass.name : null,
        value: student.currentClass?.name ?? null,
        placeholder: "Not in a class",
      },
      {
        id: "status",
        label: "Status",
        ...edit.choice("status", student.status, STATUS_OPTIONS),
      },
      {
        id: "dateOfBirth",
        label: "Date of birth",
        // Read-only: a text box that accepts "next tuesday" into a date column
        // is worse than no editor. The date picker belongs with the same work
        // that gives custom DATE fields one.
        display: formatSchoolDate(student.dateOfBirth),
      },
      { id: "gender", label: "Gender", ...edit.text("gender", student.gender ?? "") },
      {
        id: "admissionNo",
        label: "Admission number",
        mono: true,
        ...edit.text("admissionNo", student.admissionNo ?? ""),
      },
      { id: "admissionDate", label: "Admitted", display: formatSchoolDate(student.admissionDate) },
      {
        id: "boarding",
        label: "Boarder",
        display: student.isBoarding ? "Yes" : "No",
      },
    ];
  }, [student, edit]);

  // S-4.4's read side. The definitions endpoint is keyed by `CrmFieldEntity`,
  // which has no STUDENT member yet, so this is empty until that enum is
  // extended — deliberately wired now so the page does not need touching then.
  const customFields = useQuery({
    queryKey: ["records", "field-definitions", "STUDENT"],
    queryFn: () =>
      fetchJson<{ data: [] }>("/api/v2/crm/field-definitions?entity=STUDENT").catch(() => ({
        data: [] as [],
      })),
    retry: false,
  });

  if (query.isPending) {
    return (
      <div className="space-y-4" data-testid="student-record-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !student) {
    return (
      <Alert variant="destructive">
        <AlertTitle>This student could not be loaded</AlertTitle>
        <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const name = `${student.firstName} ${student.lastName}`.trim();

  const tabs: RecordTab[] = [
    {
      value: "guardians",
      label: "Guardians",
      count: student.guardianLinks?.length ?? 0,
      content: (
        <RelatedList
          items={student.guardianLinks ?? []}
          emptyMessage="Nobody is recorded as this child's guardian."
          renderItem={(link) => ({
            href: recordType("GUARDIAN").href(link.guardian.id),
            title: `${link.guardian.firstName} ${link.guardian.lastName}`,
            subtitle: [link.relationship, link.guardian.phone].filter(Boolean).join(" · "),
            meta: link.isPrimary ? "Primary" : undefined,
          })}
        />
      ),
    },
    {
      value: "enrollments",
      label: "Enrolments",
      count: student.enrollments?.length ?? 0,
      content: (
        <RelatedList
          items={student.enrollments ?? []}
          emptyMessage="No enrolment has been recorded. The year roll-up reads these, so a pupil without one has no history."
          renderItem={(enrollment) => ({
            href: enrollment.class
              ? recordType("CLASS").href(enrollment.class.id)
              : config.href(student.id),
            title: enrollment.class?.name ?? "No class",
            subtitle: [enrollment.term?.name, enrollment.stream?.name]
              .filter(Boolean)
              .join(" · "),
            meta: enrollment.status === "ACTIVE" ? "Current" : enrollment.status.toLowerCase(),
          })}
        />
      ),
    },
    {
      value: "fees",
      label: "Fees",
      count: student.feeInvoices?.length ?? 0,
      content: (
        <RelatedList
          items={student.feeInvoices ?? []}
          emptyMessage="Nothing has been billed to this pupil."
          renderItem={(invoice) => ({
            href: `/schools/finance?invoice=${invoice.id}`,
            title: invoice.invoiceNo,
            subtitle: [invoice.term?.name, formatSchoolDate(invoice.issueDate)]
              .filter(Boolean)
              .join(" · "),
            meta: `${formatSchoolMoney(invoice.balanceAmount, invoice.currency)} outstanding`,
          })}
        />
      ),
    },
    // Dropped by the shell when the array is empty, rather than advertising an
    // empty Boarding tab for a day pupil.
    ...(student.boardingAllocations?.length
      ? [
          {
            value: "boarding",
            label: "Boarding",
            count: student.boardingAllocations.length,
            content: (
              <RelatedList
                items={student.boardingAllocations}
                emptyMessage="No bed has been allocated."
                renderItem={(allocation) => ({
                  href: allocation.hostel
                    ? recordType("HOSTEL").href(allocation.hostel.id)
                    : "/schools/boarding",
                  title: allocation.hostel?.name ?? "Hostel",
                  subtitle: [allocation.room?.code, allocation.bed?.code]
                    .filter(Boolean)
                    .join(" · "),
                  meta: allocation.endDate ? "Ended" : "Current",
                })}
              />
            ),
          } satisfies RecordTab,
        ]
      : []),
    ...(student.resultLines?.length
      ? [
          {
            value: "results",
            label: "Results",
            count: student.resultLines.length,
            content: (
              <RelatedList
                items={student.resultLines}
                emptyMessage="No published results."
                renderItem={(line) => ({
                  href: `/schools/results/publish`,
                  title: line.sheet?.title ?? "Result sheet",
                  subtitle: line.sheet?.term?.name ?? null,
                })}
              />
            ),
          } satisfies RecordTab,
        ]
      : []),
  ];

  return (
    <RecordPageShell
      backHref={config.indexHref}
      backLabel={config.labelPlural}
      title={name}
      reference={student.studentNo}
      status={{
        label: STATUS_OPTIONS.find((option) => option.value === student.status)?.label ??
          student.status,
        status: normalizeUiStatus(student.status),
      }}
      subtitle={
        [student.currentClass?.name, student.isBoarding ? "Boarder" : "Day pupil"]
          .filter(Boolean)
          .join(" · ") || null
      }
      leading={
        <RecordMark
          kind={config.kind}
          name={name}
          avatarUrl={student.avatarUrl}
          accent={student.accent}
          size="lg"
        />
      }
      attributes={
        <RecordAttributes
          attributes={[
            ...attributes,
            ...customFieldAttributes({
              definitions: customFields.data?.data ?? [],
              values: null,
              onCommit: (key, value) => edit.save.mutate({ customFields: { [key]: value } }),
            }),
          ]}
        />
      }
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      rail={
        <RailSection title="At a glance">
          <dl className="space-y-2 text-sm">
            <Glance label="Guardians" value={String(student.guardianLinks?.length ?? 0)} />
            <Glance label="Enrolments" value={String(student.enrollments?.length ?? 0)} />
            <Glance label="Invoices" value={String(student.feeInvoices?.length ?? 0)} />
          </dl>
        </RailSection>
      }
    />
  );
}

function Glance({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--text-strong)]">{value}</dd>
    </div>
  );
}
