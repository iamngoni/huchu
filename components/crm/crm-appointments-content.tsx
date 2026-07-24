"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/api-client";

type Appointment = {
  id: string;
  appointmentNo: string;
  title: string;
  scheduledStart: string;
  location: string | null;
  status: string;
  lead: { id: string; leadNo: string } | null;
  client: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
};

function weekKey(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function CrmAppointmentsContent() {
  const appointments = useQuery({
    queryKey: ["crm-appointments"],
    queryFn: () => fetchJson<{ data: Appointment[] }>("/api/v2/crm/appointments").then((r) => r.data),
  });

  const grouped = new Map<string, Appointment[]>();
  for (const appt of appointments.data ?? []) {
    const key = weekKey(appt.scheduledStart);
    const list = grouped.get(key) ?? [];
    list.push(appt);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([day, appts]) => (
        <Card key={day}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{day}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-[var(--border)]">
              {appts.map((a) => (
                <li key={a.id} className="flex items-center justify-between p-3 text-sm">
                  <span>
                    {new Date(a.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {a.title}
                    {a.location ? <span className="text-[var(--text-muted)]"> @ {a.location}</span> : null}
                    {a.lead ? (
                      <Link href={`/crm/leads/${a.lead.id}`} className="ml-2 text-[var(--text-muted)] underline">
                        {a.lead.leadNo}
                      </Link>
                    ) : null}
                  </span>
                  <Badge variant="outline">{a.status}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      {appointments.data && appointments.data.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No site visits scheduled. Book one from a lead.</p>
      ) : null}
    </div>
  );
}
