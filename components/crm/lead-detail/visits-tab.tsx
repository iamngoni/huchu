"use client";

import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { ClientDate } from "@/components/ui/client-date";
import { Plus } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import type { LeadAppointment } from "./lead-types";

import { Stack } from "@corelithzw/react";

const VISIT_STATUS: Record<LeadAppointment["status"], { label: string; status: CanonicalUiStatus }> =
  {
    SCHEDULED: { label: "Scheduled", status: "pending" },
    COMPLETED: { label: "Completed", status: "passing" },
    CANCELLED: { label: "Cancelled", status: "inactive" },
    NO_SHOW: { label: "No show", status: "failing" },
  };

export function VisitsTab({
  appointments,
  onSchedule,
  onOpenReport,
}: {
  appointments: LeadAppointment[];
  onSchedule: () => void;
  onOpenReport: (appointment: LeadAppointment) => void;
}) {
  return (
    <div className="space-y-3">
      <Button size="sm" className="gap-1.5" onClick={onSchedule}>
        <Plus className="h-3.5 w-3.5" />
        Schedule visit
      </Button>

      {appointments.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">
          No site visits yet. The visit is where the job gets specified — book one before quoting
          anything substantial.
        </p>
      ) : (
        <Stack as="ul" gap="xs">
          {appointments.map((visit) => {
            const status = VISIT_STATUS[visit.status];
            return (
              <li key={visit.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{visit.appointmentNo}</span>
                    <StatusChip status={status.status} label={status.label} />
                    {visit.reportCompletedAt ? (
                      <span className="text-sm text-[var(--text-muted)]">Written up</span>
                    ) : null}
                  </div>
                  <p className="text-sm">{visit.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    <ClientDate value={visit.scheduledStart} />
                    {visit.location ? ` · ${visit.location}` : ""}
                  </p>
                </div>

                <Button size="sm" variant="outline" onClick={() => onOpenReport(visit)}>
                  {visit.reportCompletedAt ? "View report" : "Write up"}
                </Button>
              </li>
            );
          })}
        </Stack>
      )}
    </div>
  );
}
