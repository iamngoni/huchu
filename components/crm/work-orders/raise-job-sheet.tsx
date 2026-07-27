"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FormShell } from "@/components/shared/form-shell";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

type TeamResponse = { data: { id: string; name: string | null; email: string }[] };

/** Book it for tomorrow morning, which is when a job realistically starts. */
function defaultStart(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const offset = tomorrow.getTimezoneOffset() * 60_000;
  return new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Raise the job that delivers a won deal.
 *
 * The checklist comes from the quote rather than being retyped, which is where
 * transcription errors come from — a crew installing four panels because
 * somebody typed 4 instead of 14 is a whole second visit.
 */
export function RaiseJobSheet({
  open,
  onOpenChange,
  dealId,
  clientId,
  siteId,
  defaultTitle,
  quotationDocuments,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  clientId?: string | null;
  siteId?: string | null;
  defaultTitle?: string;
  /** Accepted quotes whose lines can seed the checklist. */
  quotationDocuments: { id: string; label: string }[];
  currentUserId?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState(defaultTitle ?? "");
  const [documentId, setDocumentId] = useState(quotationDocuments[0]?.id ?? "");
  const [scheduledStart, setScheduledStart] = useState(defaultStart);
  const [assignedToId, setAssignedToId] = useState(currentUserId ?? "");
  const [addressLine, setAddressLine] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(defaultTitle ?? "");
      setDocumentId(quotationDocuments[0]?.id ?? "");
      setScheduledStart(defaultStart());
      setAssignedToId(currentUserId ?? "");
      setAddressLine("");
      setAccessNotes("");
      setErrors([]);
    }
  }

  const { data: team } = useQuery({
    queryKey: ["crm-team"],
    queryFn: () => fetchJson<TeamResponse>("/api/v2/crm/team"),
    staleTime: 5 * 60_000,
  });

  const create = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/crm/work-orders", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          dealId,
          clientId: clientId ?? null,
          siteId: siteId ?? null,
          documentId: documentId || null,
          scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          assignedToId: assignedToId || null,
          addressLine: addressLine.trim() || null,
          accessNotes: accessNotes.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Job raised", description: "It's on the crew's list." });
      queryClient.invalidateQueries({ queryKey: ["crm-work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "deal", dealId] });
      onOpenChange(false);
    },
    onError: (err) => setErrors([getApiErrorMessage(err)]),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Raise a job</SheetTitle>
          <SheetDescription>
            The checklist comes straight off the quote, so nothing is retyped.
          </SheetDescription>
        </SheetHeader>

        <FormShell
          variant="bare"
          errors={errors}
          requiredHint="A title is required."
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) {
              setErrors(["Give the job a title the crew will recognise"]);
              return;
            }
            setErrors([]);
            create.mutate();
          }}
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Raising…" : "Raise job"}
              </Button>
            </>
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="job-title">Title *</Label>
            <Input
              id="job-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Install 14 panels — Msasa depot"
            />
          </div>

          {quotationDocuments.length ? (
            <div className="space-y-1.5">
              <Label>Checklist from</Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nothing — I'll add items later" />
                </SelectTrigger>
                <SelectContent>
                  {quotationDocuments.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              No quote on this deal, so the job starts with an empty checklist.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job-start">Starts</Label>
              <Input
                id="job-start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(event) => setScheduledStart(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Crew lead</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {(team?.data ?? []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job-address">Address</Label>
            <Input
              id="job-address"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="Leave blank to use the site's"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job-access">Getting in</Label>
            <Textarea
              id="job-access"
              rows={2}
              value={accessNotes}
              onChange={(event) => setAccessNotes(event.target.value)}
              placeholder="Ask for the security office, gate code 4471…"
            />
          </div>
        </FormShell>
      </SheetContent>
    </Sheet>
  );
}
