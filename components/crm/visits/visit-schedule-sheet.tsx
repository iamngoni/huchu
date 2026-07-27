"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

import type { LeadFilterOwner } from "@/components/crm/leads/leads-filters";

function defaultStart(): string {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const offset = start.getTimezoneOffset() * 60_000;
  return new Date(start.getTime() - offset).toISOString().slice(0, 16);
}

function addHours(local: string, hours: number): string {
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(date.getHours() + hours);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function VisitScheduleSheet({
  open,
  onOpenChange,
  leadId,
  clientId,
  defaultLocation,
  owners,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  clientId: string | null;
  defaultLocation?: string | null;
  owners: LeadFilterOwner[];
  currentUserId?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("Site visit");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [assignedToId, setAssignedToId] = useState(currentUserId ?? "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const initialStart = defaultStart();
    setTitle("Site visit");
    setStart(initialStart);
    setEnd(addHours(initialStart, 2));
    setLocation(defaultLocation ?? "");
    setAssignedToId(currentUserId ?? "");
    setNotes("");
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const book = useMutation({
    mutationFn: () =>
      fetchJson<{ data: { id: string } }>("/api/v2/crm/appointments", {
        method: "POST",
        body: JSON.stringify({
          leadId,
          clientId: clientId ?? undefined,
          title: title.trim() || "Site visit",
          scheduledStart: new Date(start).toISOString(),
          scheduledEnd: end ? new Date(end).toISOString() : undefined,
          location: location.trim() || undefined,
          assignedToId: assignedToId || undefined,
          outcomeNotes: notes.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "appointments"] });
      toast({ title: "Site visit scheduled" });
      onOpenChange(false);
    },
    onError: (error) => setErrors([getApiErrorMessage(error)]),
  });

  const validate = (): string[] => {
    const found: string[] = [];
    if (!start) found.push("Pick when the visit starts.");
    if (end && new Date(end) <= new Date(start)) found.push("The visit has to end after it starts.");
    if (!assignedToId) found.push("Someone has to be going — assign the visit.");
    return found;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md" className="w-full overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Schedule a site visit</SheetTitle>
          <SheetDescription>
            The visit is where the job gets specified — measurements taken here become the
            quotation.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <FormShell
            variant="bare"
            errors={errors}
            requiredHint="A start time and an assignee are required."
            onSubmit={(event) => {
              event.preventDefault();
              const found = validate();
              setErrors(found);
              if (found.length === 0) book.mutate();
            }}
            actions={
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={book.isPending}>
                  {book.isPending ? "Scheduling…" : "Schedule visit"}
                </Button>
              </>
            }
          >
            <div className="space-y-1.5">
              <Label htmlFor="visit-title">Title</Label>
              <Input
                id="visit-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="visit-start">Starts *</Label>
                <Input
                  id="visit-start"
                  type="datetime-local"
                  value={start}
                  onChange={(event) => {
                    setStart(event.target.value);
                    if (event.target.value) setEnd(addHours(event.target.value, 2));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visit-end">Ends</Label>
                <Input
                  id="visit-end"
                  type="datetime-local"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visit-location">Location</Label>
              <Input
                id="visit-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Street address, or where to meet on site"
                maxLength={300}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visit-assignee">Assigned to *</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger id="visit-assignee">
                  <SelectValue placeholder="Who's going?" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name ?? "Unnamed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visit-notes">Notes</Label>
              <Textarea
                id="visit-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Access arrangements, who to ask for, what to bring."
              />
            </div>
          </FormShell>
        </div>
      </SheetContent>
    </Sheet>
  );
}
