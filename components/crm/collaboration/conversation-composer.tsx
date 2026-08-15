"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { RichTextComposer } from "@/components/crm/collaboration/rich-text-composer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/use-toast";
import { createCrmComment } from "@/lib/crm/crm-v2";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { richTextToPlain } from "@/lib/crm/rich-text";
import type { CollabEntity } from "@/lib/crm/collaboration";

/**
 * One box for everything anybody says about a record.
 *
 * There were two, in two different sections. The activity composer logged what
 * happened with the client — a call, an email, a note — and lived at the top of
 * the timeline. The comment box was internal chatter and lived seven sections
 * along under Comments. Both are somebody typing a paragraph about this record,
 * and asking which of two screens to type it on is a question nobody should
 * have to answer: the difference is *who it is about*, not where it goes.
 *
 * So one composer, and the segmented control says which kind. Comment is first
 * and is the default, because it is the one with no other home — everything
 * else is a record of something that already happened elsewhere.
 */
const KINDS = [
  { value: "COMMENT", label: "Comment" },
  { value: "NOTE", label: "Note" },
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MEETING", label: "Meeting" },
] as const;

type Kind = (typeof KINDS)[number]["value"];

const PLACEHOLDERS: Record<Kind, string> = {
  COMMENT: "Leave a note for the team. Type @ to bring someone in.",
  NOTE: "What should the team know?",
  CALL: "What was said on the call?",
  EMAIL: "What did you send, and what came back?",
  WHATSAPP: "What was agreed on WhatsApp?",
  MEETING: "What came out of the meeting?",
};

const VERBS: Record<Kind, string> = {
  COMMENT: "Comment",
  NOTE: "Log it",
  CALL: "Log it",
  EMAIL: "Log it",
  WHATSAPP: "Log it",
  MEETING: "Log it",
};

export type ConversationTarget =
  | { kind: "lead"; id: string }
  | { kind: "deal"; id: string }
  | { kind: "person"; id: string }
  | { kind: "company"; id: string }
  | { kind: "site"; id: string };

const TARGET_KEYS: Record<ConversationTarget["kind"], string | null> = {
  lead: "leadId",
  deal: "dealId",
  person: "personId",
  company: "clientId",
  // A site is a place, not a correspondent: what happened there is logged on
  // the visit or the deal. It can still be commented on.
  site: null,
};

const COLLAB: Record<ConversationTarget["kind"], CollabEntity> = {
  lead: "LEAD",
  deal: "DEAL",
  company: "COMPANY",
  person: "PERSON",
  site: "SITE",
};

export function ConversationComposer({ target }: { target: ConversationTarget }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canLogActivity = TARGET_KEYS[target.kind] !== null;
  const [kind, setKind] = useState<Kind>("COMMENT");
  const [text, setText] = useState("");

  const post = useMutation({
    mutationFn: () => {
      const trimmed = text.trim();

      if (kind === "COMMENT") {
        return createCrmComment({
          entity: COLLAB[target.kind],
          recordId: target.id,
          body: trimmed,
        });
      }

      // What was written goes in the body, always. The subject is a flattened
      // reading of the same words, for the places that cannot run the renderer
      // — notifications, search snippets.
      return fetchJson("/api/v2/crm/activities", {
        method: "POST",
        body: JSON.stringify({
          type: kind,
          subject: richTextToPlain(trimmed, 200),
          body: trimmed,
          [TARGET_KEYS[target.kind] as string]: target.id,
        }),
      });
    },
    onSuccess: () => {
      setText("");
      // Both halves of the feed, because either kind lands in it.
      queryClient.invalidateQueries({ queryKey: ["crm-lead", target.id] });
      queryClient.invalidateQueries({ queryKey: ["crm", target.kind, target.id] });
      queryClient.invalidateQueries({
        queryKey: ["crm-comments", COLLAB[target.kind], target.id],
      });
    },
    onError: (error) =>
      toast({
        title: kind === "COMMENT" ? "Could not post that" : "Could not log that",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const options = canLogActivity ? KINDS : KINDS.filter((entry) => entry.value === "COMMENT");

  return (
    <div className="space-y-2 rounded-[var(--card-radius)] border border-[var(--border)] p-3">
      {options.length > 1 ? (
        <SegmentedControl
          value={kind}
          onValueChange={(value) => setKind(value as Kind)}
          options={options.map((entry) => ({ value: entry.value, label: entry.label }))}
          size="sm"
          ariaLabel="What are you writing"
        />
      ) : null}

      <RichTextComposer
        value={text}
        onChange={setText}
        // Cmd/Ctrl+Enter submits — this box gets used dozens of times a day.
        onSubmit={() => {
          if (text.trim()) post.mutate();
        }}
        placeholder={PLACEHOLDERS[kind]}
        rows={3}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* The keyboard shortcut is the second half of this line and means
            nothing on a touch keyboard, so a phone reads the first half only
            and the button stays on the same row. */}
        <p className="text-sm text-[var(--text-muted)]">
          Type @ to link a person or record.
          <span className="hidden sm:inline"> ⌘/Ctrl + Enter to save.</span>
        </p>
        <Button size="sm" onClick={() => post.mutate()} disabled={!text.trim() || post.isPending}>
          {post.isPending ? "Saving…" : VERBS[kind]}
        </Button>
      </div>
    </div>
  );
}
