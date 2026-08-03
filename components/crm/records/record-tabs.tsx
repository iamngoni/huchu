"use client";

import type { ReactNode } from "react";

import { CommentThread } from "@/components/crm/collaboration/comment-thread";
import { RecordTasksTab } from "@/components/crm/tasks/record-tasks-tab";
import { ActivityComposer, type ActivityTarget } from "@/components/crm/lead-detail/activity-composer";
import { RecordStory, type StoryEvent } from "./record-story";
import { MentionsTab } from "./mentions-tab";
import type { CollabEntity } from "@/lib/crm/collaboration";
import type { CrmTaskRecordRef } from "@/lib/crm/crm-v2";

import type { RecordTab } from "./record-page-shell";

/**
 * The tabs every record has, written once.
 *
 * A record was implemented five times — lead, deal, company, person, site —
 * each composing its own timeline, its own comments, its own tasks. So a fix
 * to "the record page" landed on one of five and the report came back saying
 * it was not there, correctly. Three rounds went that way.
 *
 * These build the tab from a `RecordRef`, so a change to what a timeline
 * shows is a change to one function and appears on all five.
 */

export type RecordKind = "lead" | "deal" | "company" | "person" | "site";

export type RecordRef = { kind: RecordKind; id: string };

/** The collaboration layer's name for the same record. */
const COLLAB: Record<RecordKind, CollabEntity> = {
  lead: "LEAD",
  deal: "DEAL",
  company: "COMPANY",
  person: "PERSON",
  site: "SITE",
};

/** The task layer's name for the same record. */
export function taskRef(ref: RecordRef): CrmTaskRecordRef {
  switch (ref.kind) {
    case "lead":
      return { leadId: ref.id };
    case "deal":
      return { dealId: ref.id };
    case "company":
      return { clientId: ref.id };
    case "person":
      return { personId: ref.id };
    case "site":
      return { siteId: ref.id };
  }
}

/**
 * Which records somebody can write an activity against. A site is a place,
 * not a correspondent — what happened there is logged on the visit or the
 * deal, so its timeline reads without a composer rather than offering one
 * that posts nowhere.
 */
function activityTarget(ref: RecordRef): ActivityTarget | null {
  switch (ref.kind) {
    case "lead":
      return { kind: "lead", id: ref.id };
    case "deal":
      return { kind: "deal", id: ref.id };
    case "person":
      return { kind: "person", id: ref.id };
    case "company":
      return { kind: "company", id: ref.id };
    case "site":
      return null;
  }
}

export function timelineTab({
  ref,
  events,
  emptyMessage,
}: {
  ref: RecordRef;
  events: StoryEvent[];
  emptyMessage?: string;
}): RecordTab {
  const target = activityTarget(ref);
  return {
    value: "timeline",
    label: "Timeline",
    content: (
      <div className="space-y-4">
        {target ? <ActivityComposer target={target} /> : null}
        <RecordStory events={events} emptyMessage={emptyMessage} />
      </div>
    ),
  };
}

export function tasksTab({
  ref,
  currentUserId,
}: {
  ref: RecordRef;
  currentUserId?: string;
}): RecordTab {
  return {
    value: "tasks",
    label: "Tasks",
    content: <RecordTasksTab record={taskRef(ref)} currentUserId={currentUserId} />,
  };
}

export function commentsTab({
  ref,
  currentUserId,
}: {
  ref: RecordRef;
  currentUserId?: string;
}): RecordTab {
  return {
    value: "comments",
    label: "Comments",
    content: (
      <CommentThread
        entity={COLLAB[ref.kind]}
        recordId={ref.id}
        currentUserId={currentUserId}
      />
    ),
  };
}

/**
 * Where this record has been written about elsewhere. Every kind gets it,
 * because a reference to a site in a note on a deal is exactly the connection
 * that was invisible before.
 */
export function mentionsTab({ ref }: { ref: RecordRef }): RecordTab {
  return {
    value: "mentions",
    label: "Mentions",
    content: <MentionsTab recordId={ref.id} />,
  };
}

/** A tab a single record type adds to the shared set. */
export function extraTab(tab: {
  value: string;
  label: string;
  count?: number;
  content: ReactNode;
}): RecordTab {
  return tab;
}
