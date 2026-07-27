"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { ClientDate } from "@/components/ui/client-date";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import { VisitReportSheet } from "@/components/crm/visits/visit-report-sheet";

type Appointment = {
  id: string;
  appointmentNo: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  location: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  reportCompletedAt: string | null;
  lead: { id: string; leadNo: string } | null;
  client: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
};

const VISIT_STATUS: Record<Appointment["status"], { label: string; status: CanonicalUiStatus }> = {
  SCHEDULED: { label: "Scheduled", status: "pending" },
  COMPLETED: { label: "Completed", status: "passing" },
  CANCELLED: { label: "Cancelled", status: "inactive" },
  NO_SHOW: { label: "No show", status: "failing" },
};

export function CrmAppointmentsContent() {
  const [reportFor, setReportFor] = useState<Appointment | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: ["crm", "appointments"],
    queryFn: () => fetchJson<{ data: Appointment[] }>("/api/v2/crm/appointments"),
  });

  const rows = useMemo(() => appointmentsQuery.data?.data ?? [], [appointmentsQuery.data]);

  const columns = useMemo<ColumnDef<Appointment>[]>(
    () => [
      {
        id: "when",
        header: "When",
        size: 190,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-sm">
              <ClientDate value={row.original.scheduledStart} />
            </div>
            <div className="truncate font-mono text-xs text-[var(--text-muted)]">
              {row.original.appointmentNo}
            </div>
          </div>
        ),
      },
      {
        id: "visit",
        header: "Visit",
        size: 220,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm">{row.original.title}</div>
            {row.original.location ? (
              <div className="truncate text-xs text-[var(--text-muted)]">
                {row.original.location}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "lead",
        header: "Lead",
        size: 160,
        cell: ({ row }) =>
          row.original.lead ? (
            <Link
              href={`/crm/leads/${row.original.lead.id}`}
              className="font-mono text-sm hover:underline"
            >
              {row.original.lead.leadNo}
            </Link>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">—</span>
          ),
      },
      {
        id: "client",
        header: "Client",
        size: 180,
        cell: ({ row }) => (
          <span className="truncate text-sm">{row.original.client?.name ?? "—"}</span>
        ),
      },
      {
        id: "assignee",
        header: "Assigned to",
        size: 160,
        cell: ({ row }) => (
          <span className="truncate text-sm">{row.original.assignedTo?.name ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        size: 150,
        cell: ({ row }) => {
          const status = VISIT_STATUS[row.original.status];
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusChip status={status.status} label={status.label} />
              {row.original.reportCompletedAt ? (
                <span className="text-xs text-[var(--text-muted)]">Written up</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        size: 120,
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => setReportFor(row.original)}>
            {row.original.reportCompletedAt ? "View report" : "Write up"}
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {appointmentsQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load site visits</AlertTitle>
          <AlertDescription>{getApiErrorMessage(appointmentsQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        edgeToEdge
        searchPlaceholder="Search site visits"
        pagination={{ enabled: true }}
        mobileCardRenderer={({ row }) => (
          <div className="flex flex-col gap-2 rounded-[var(--card-radius)] border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.title}</div>
                <div className="truncate font-mono text-xs text-[var(--text-muted)]">
                  {row.appointmentNo}
                </div>
              </div>
              <StatusChip
                status={VISIT_STATUS[row.status].status}
                label={VISIT_STATUS[row.status].label}
              />
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              <ClientDate value={row.scheduledStart} />
              {row.location ? ` · ${row.location}` : ""}
            </div>
            <Button size="sm" variant="outline" onClick={() => setReportFor(row)}>
              {row.reportCompletedAt ? "View report" : "Write up"}
            </Button>
          </div>
        )}
        emptyState={
          appointmentsQuery.isLoading
            ? "Loading site visits…"
            : "No site visits scheduled. Book one from a lead."
        }
      />

      <VisitReportSheet
        open={Boolean(reportFor)}
        onOpenChange={(next) => (!next ? setReportFor(null) : undefined)}
        appointmentId={reportFor?.id ?? null}
        appointmentNo={reportFor?.appointmentNo}
      />
    </div>
  );
}
