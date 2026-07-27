"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

const ACTIVITY_TYPES = [
  { value: "NOTE", label: "Note" },
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MEETING", label: "Meeting" },
] as const;

type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"];

const PLACEHOLDERS: Record<ActivityType, string> = {
  NOTE: "What should the team know?",
  CALL: "What was said on the call?",
  EMAIL: "What did you send, and what came back?",
  WHATSAPP: "What was agreed on WhatsApp?",
  MEETING: "What came out of the meeting?",
};

/**
 * Logs what actually happened with the client. The first line becomes the
 * timeline subject and the rest the body, so a one-line note stays a one-liner
 * and a long call write-up still reads well.
 */
export function ActivityComposer({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<ActivityType>("NOTE");
  const [text, setText] = useState("");

  const log = useMutation({
    mutationFn: () => {
      const trimmed = text.trim();
      const breakAt = trimmed.indexOf("\n");
      const subject = breakAt === -1 ? trimmed : trimmed.slice(0, breakAt).trim();
      const body = breakAt === -1 ? undefined : trimmed.slice(breakAt + 1).trim() || undefined;
      return fetchJson(`/api/v2/crm/leads/${leadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type, subject: subject.slice(0, 200), body }),
      });
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] });
    },
    onError: (error) =>
      toast({
        title: "Could not log that",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-2 rounded-[var(--card-radius)] border border-[var(--border)] p-3">
      <SegmentedControl
        value={type}
        onValueChange={(value) => setType(value as ActivityType)}
        options={ACTIVITY_TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
        size="sm"
        ariaLabel="Activity type"
      />
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Cmd/Ctrl+Enter submits — this box gets used dozens of times a day.
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && text.trim()) {
            event.preventDefault();
            log.mutate();
          }
        }}
        placeholder={PLACEHOLDERS[type]}
        rows={3}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          First line becomes the heading. ⌘/Ctrl + Enter to save.
        </p>
        <Button
          size="sm"
          onClick={() => log.mutate()}
          disabled={!text.trim() || log.isPending}
        >
          {log.isPending ? "Saving…" : "Log it"}
        </Button>
      </div>
    </div>
  );
}
