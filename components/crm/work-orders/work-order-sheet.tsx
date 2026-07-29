"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClientDate } from "@/components/ui/client-date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { Textarea } from "@/components/ui/textarea";
import { RecordDialog } from "@/components/crm/records/record-dialog";
import { EntityLink } from "@/components/crm/records/entity-link";
import { useToast } from "@/components/ui/use-toast";
import { WORK_ORDER_STATUS } from "@/lib/crm/tones";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  WORK_ORDER_STATUS_LABELS,
  completionPercent,
  type WorkOrderQueue,
} from "@/lib/crm/work-orders";
import { Clock, MapPin, Phone } from "@/lib/icons";

import { Stack } from "@corelithzw/react";

export type WorkOrderItem = {
  id: string;
  description: string;
  quantity: number;
  completedQuantity: number;
  unit: string | null;
  notes: string | null;
};

export type WorkOrderRecord = {
  id: string;
  workOrderNo: string;
  title: string;
  description: string | null;
  status: keyof typeof WORK_ORDER_STATUS_LABELS;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  addressLine: string | null;
  accessNotes: string | null;
  contactName: string | null;
  contactPhone: string | null;
  blockedReason: string | null;
  completionNotes: string | null;
  signedByName: string | null;
  customerRating: number | null;
  crewIds: string[];
  items: WorkOrderItem[];
  assignedTo: { id: string; name: string | null } | null;
  site: { id: string; name: string; addressLine: string | null; accessInstructions?: string | null } | null;
  client: { id: string; name: string } | null;
  deal: { id: string; dealNo: string; title: string } | null;
  allowedTransitions?: (keyof typeof WORK_ORDER_STATUS_LABELS)[];
};

/**
 * The job sheet, opened on site.
 *
 * Everything a crew needs in one scroll — where, who to ask for, what to do —
 * and the sign-off at the bottom, because a job with nobody's name against it
 * is a job the customer can still say never happened.
 */
export function WorkOrderSheet({
  workOrderId,
  onOpenChange,
  currentUserId,
}: {
  workOrderId: string | null;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [signedByName, setSignedByName] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [blockers, setBlockers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [seededFor, setSeededFor] = useState<string | null>(workOrderId);
  if (workOrderId !== seededFor) {
    setSeededFor(workOrderId);
    setProgress({});
    setSignedByName("");
    setCompletionNotes("");
    setBlockedReason("");
    setBlockers([]);
    setError(null);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["crm-work-order", workOrderId],
    enabled: Boolean(workOrderId),
    queryFn: () => fetchJson<WorkOrderRecord>(`/api/v2/crm/work-orders/${workOrderId}`),
  });

  const order = data;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-work-orders"] });
    queryClient.invalidateQueries({ queryKey: ["crm-work-order", workOrderId] });
  };

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetchJson<WorkOrderRecord>(`/api/v2/crm/work-orders/${workOrderId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      setBlockers([]);
      setError(null);
      toast({ title: `Job is now ${WORK_ORDER_STATUS_LABELS[result.status].toLowerCase()}` });
      refresh();
    },
    onError: (err: unknown) => {
      // The API answers a premature completion with what is still outstanding,
      // which is far more useful on site than "couldn't save".
      const payload = (err as { data?: { blockers?: string[]; error?: string } })?.data;
      if (payload?.blockers?.length) {
        setBlockers(payload.blockers);
        setError(null);
        return;
      }
      setError(getApiErrorMessage(err));
    },
  });

  const itemProgress = () =>
    Object.entries(progress)
      .filter(([, value]) => value !== "")
      .map(([id, value]) => ({ id, completedQuantity: Number(value) || 0 }));

  const canAct =
    order &&
    (order.assignedTo?.id === currentUserId ||
      order.crewIds.includes(currentUserId ?? "") ||
      !order.assignedTo);

  return (
    <RecordDialog
      open={Boolean(workOrderId)}
      onOpenChange={onOpenChange}
      title={order?.title ?? "Job"}
      description="What was agreed, what has been done, and who signed it off."
    >
      {isLoading || !order ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          {/* The reference and status sit here rather than in the dialog
              header, which only carries a name. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-[var(--text-muted)]">
              {order.workOrderNo}
            </span>
            <StatusChip
              status={WORK_ORDER_STATUS[order.status] ?? "inactive"}
              label={WORK_ORDER_STATUS_LABELS[order.status]}
            />
            {order.deal ? (
              <EntityLink href={`/crm/deals/${order.deal.id}`} muted className="text-sm">
                {order.deal.title}
              </EntityLink>
            ) : null}
          </div>

          <div className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {blockers.length ? (
              <Alert>
                <AlertTitle>Not ready to close</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-5">
                    {blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <section className="space-y-1.5 text-sm">
              {order.scheduledStart ? (
                <p className="flex items-center gap-2">
                  <Clock className="size-4 text-[var(--text-muted)]" />
                  <ClientDate value={order.scheduledStart} mode="datetime" />
                </p>
              ) : null}
              {order.site?.addressLine || order.addressLine ? (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
                  <span>
                    {order.site?.name ? <strong>{order.site.name}</strong> : null}
                    {order.site?.name ? " — " : ""}
                    {order.site?.addressLine ?? order.addressLine}
                  </span>
                </p>
              ) : null}
              {order.contactPhone ? (
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-[var(--text-muted)]" />
                  {/* Tappable, because this is read standing outside a gate. */}
                  <a href={`tel:${order.contactPhone}`} className="hover:underline">
                    {order.contactName ? `${order.contactName} — ` : ""}
                    {order.contactPhone}
                  </a>
                </p>
              ) : null}
              {order.accessNotes || order.site?.accessInstructions ? (
                <p className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-2 text-sm">
                  {order.accessNotes ?? order.site?.accessInstructions}
                </p>
              ) : null}
            </section>

            {order.description ? (
              <p className="whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                {order.description}
              </p>
            ) : null}

            {order.items.length > 0 ? (
              <section className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-semibold text-[var(--text-strong)]">What needs doing</h3>
                  <span className="text-sm text-[var(--text-muted)]">
                    {completionPercent(order.items)}% done
                  </span>
                </div>

                <Stack as="ul" gap="sm">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{item.description}</p>
                        {item.notes ? (
                          <p className="text-sm text-[var(--text-muted)]">{item.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Input
                          className="h-9 w-16 text-right"
                          type="number"
                          min={0}
                          max={item.quantity}
                          inputMode="decimal"
                          disabled={order.status === "COMPLETED"}
                          value={progress[item.id] ?? String(item.completedQuantity)}
                          onChange={(event) =>
                            setProgress((previous) => ({
                              ...previous,
                              [item.id]: event.target.value,
                            }))
                          }
                        />
                        <span className="text-[var(--text-muted)]">
                          / {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </Stack>
              </section>
            ) : null}

            {order.status === "COMPLETED" ? (
              <section className="space-y-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3 text-sm">
                <p className="font-medium">Signed off by {order.signedByName}</p>
                {order.customerRating ? (
                  <p className="text-[var(--text-muted)]">
                    Rated {order.customerRating} out of 5
                  </p>
                ) : null}
                {order.completionNotes ? (
                  <p className="text-[var(--text-muted)]">{order.completionNotes}</p>
                ) : null}
              </section>
            ) : canAct ? (
              <section className="space-y-3">
                {order.status === "IN_PROGRESS" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="signed-by">Signed off by *</Label>
                      <Input
                        id="signed-by"
                        value={signedByName}
                        onChange={(event) => setSignedByName(event.target.value)}
                        placeholder="Who at the site accepted the work"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="completion-notes">Notes</Label>
                      <Textarea
                        id="completion-notes"
                        rows={2}
                        value={completionNotes}
                        onChange={(event) => setCompletionNotes(event.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {order.status === "BLOCKED" || order.allowedTransitions?.includes("BLOCKED") ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="blocked-reason">If it&apos;s blocked, why</Label>
                    <Input
                      id="blocked-reason"
                      value={blockedReason || (order.blockedReason ?? "")}
                      onChange={(event) => setBlockedReason(event.target.value)}
                      placeholder="Gate locked, wrong parts delivered…"
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {(order.allowedTransitions ?? []).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={status === "COMPLETED" ? "default" : "outline"}
                      size="sm"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          status,
                          itemProgress: itemProgress(),
                          ...(status === "COMPLETED"
                            ? {
                                signedByName: signedByName.trim() || undefined,
                                completionNotes: completionNotes.trim() || undefined,
                              }
                            : {}),
                          ...(status === "BLOCKED"
                            ? { blockedReason: blockedReason.trim() || undefined }
                            : {}),
                        })
                      }
                    >
                      {status === "COMPLETED"
                        ? "Complete job"
                        : status === "IN_PROGRESS"
                          ? "Start job"
                          : WORK_ORDER_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>

                {Object.keys(progress).length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ itemProgress: itemProgress() })}
                  >
                    Save progress
                  </Button>
                ) : null}
              </section>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                You&apos;re not on this job, so it&apos;s read-only for you.
              </p>
            )}
          </div>
        </>
      )}
    </RecordDialog>
  );
}

export type { WorkOrderQueue };
