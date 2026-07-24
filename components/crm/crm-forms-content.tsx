"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchJson } from "@/lib/api-client";

type Form = {
  id: string;
  name: string;
  publicToken: string;
  isActive: boolean;
};

export function CrmFormsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const forms = useQuery({
    queryKey: ["crm-forms"],
    queryFn: () => fetchJson<{ data: Form[] }>("/api/v2/crm/intake-forms").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () =>
      fetchJson<Form>("/api/v2/crm/intake-forms", {
        method: "POST",
        body: JSON.stringify({ name: "New intake form", fields: [], services: [] }),
      }),
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: ["crm-forms"] });
      router.push(`/crm/forms/${form.id}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          New form
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-[var(--border)]">
            {(forms.data ?? []).map((f) => (
              <li key={f.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  <button className="font-medium underline" onClick={() => router.push(`/crm/forms/${f.id}`)}>
                    {f.name}
                  </button>
                  {!f.isActive ? <Badge variant="outline" className="ml-2">Inactive</Badge> : null}
                </span>
                <button
                  className="text-[var(--text-muted)] underline"
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/f/${f.publicToken}`)}
                >
                  Copy public link
                </button>
              </li>
            ))}
            {forms.data && forms.data.length === 0 ? (
              <li className="p-3 text-sm text-[var(--text-muted)]">No intake forms yet.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
