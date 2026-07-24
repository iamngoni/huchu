"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchJson } from "@/lib/api-client";

type FollowUp = {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  lead: { id: string; leadNo: string; title: string | null } | null;
  client: { id: string; name: string } | null;
};

export function CrmFollowUpsContent() {
  const queryClient = useQueryClient();
  // Snapshot "now" once at mount so render stays pure.
  const [now] = useState(() => Date.now());
  const followUps = useQuery({
    queryKey: ["crm-followups-all"],
    queryFn: () =>
      fetchJson<{ data: FollowUp[] }>("/api/v2/crm/follow-ups?status=PENDING").then((r) => r.data),
  });

  const complete = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/v2/crm/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify({ status: "COMPLETED" }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-followups-all"] }),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-[var(--border)]">
          {(followUps.data ?? []).map((f) => {
            const overdue = new Date(f.dueAt).getTime() < now;
            return (
              <li key={f.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  {overdue ? <Badge variant="outline" className="mr-2 text-red-600">Overdue</Badge> : null}
                  {f.title}
                  {f.lead ? (
                    <Link href={`/crm/leads/${f.lead.id}`} className="ml-2 text-[var(--text-muted)] underline">
                      {f.lead.leadNo}
                    </Link>
                  ) : null}
                  <span className="ml-2 text-[var(--text-muted)]">{new Date(f.dueAt).toLocaleString()}</span>
                </span>
                <Button size="sm" variant="outline" onClick={() => complete.mutate(f.id)}>
                  Done
                </Button>
              </li>
            );
          })}
          {followUps.data && followUps.data.length === 0 ? (
            <li className="p-3 text-sm text-[var(--text-muted)]">No pending follow-ups.</li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}
