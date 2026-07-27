/**
 * Comments and followers, shared across every CRM record type.
 *
 * Both features answer the same question — "who is talking about this record,
 * and who wants to hear about it" — so they share one way of naming a record
 * rather than each inventing their own.
 */
import type { CrmFieldEntity, Prisma } from "@prisma/client";
import { z } from "zod";

/** The five record types people actually discuss. Work orders join in Phase 7. */
export const COLLAB_ENTITIES = ["LEAD", "DEAL", "COMPANY", "PERSON", "SITE"] as const;
export type CollabEntity = (typeof COLLAB_ENTITIES)[number];

export const collabRecordSchema = z.object({
  entity: z.enum(COLLAB_ENTITIES),
  recordId: z.string().uuid(),
});
export type CollabRecord = z.infer<typeof collabRecordSchema>;

/**
 * Comments store the record as one of five nullable columns rather than an
 * entity/id pair, so the database can cascade a delete and so a record page
 * reads its thread through an index instead of a scan.
 */
export function commentRecordColumns(record: CollabRecord): {
  leadId?: string;
  dealId?: string;
  clientId?: string;
  personId?: string;
  siteId?: string;
} {
  switch (record.entity) {
    case "LEAD":
      return { leadId: record.recordId };
    case "DEAL":
      return { dealId: record.recordId };
    case "COMPANY":
      return { clientId: record.recordId };
    case "PERSON":
      return { personId: record.recordId };
    case "SITE":
      return { siteId: record.recordId };
  }
}

/** The same mapping as a where clause, with the other four pinned to null. */
export function commentRecordWhere(record: CollabRecord): Prisma.CrmCommentWhereInput {
  return {
    leadId: null,
    dealId: null,
    clientId: null,
    personId: null,
    siteId: null,
    ...commentRecordColumns(record),
  };
}

/** Where a record lives in the UI, for notification deep links. */
export function collabRecordPath(record: CollabRecord): string {
  switch (record.entity) {
    case "LEAD":
      return `/crm/leads/${record.recordId}`;
    case "DEAL":
      return `/crm/deals/${record.recordId}`;
    case "COMPANY":
      return `/crm/companies/${record.recordId}`;
    case "PERSON":
      return `/crm/people/${record.recordId}`;
    case "SITE":
      return `/crm/sites/${record.recordId}`;
  }
}

export const COLLAB_ENTITY_LABELS: Record<CollabEntity, string> = {
  LEAD: "Lead",
  DEAL: "Deal",
  COMPANY: "Company",
  PERSON: "Person",
  SITE: "Site",
};

/** `CollabEntity` is a subset of the field-definition entity enum. */
export function asFieldEntity(entity: CollabEntity): CrmFieldEntity {
  return entity as CrmFieldEntity;
}

export const createCommentSchema = collabRecordSchema.extend({
  body: z.string().trim().min(1).max(8000),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(8000).optional(),
  isPinned: z.boolean().optional(),
  resolved: z.boolean().optional(),
});

/**
 * People who should hear about a comment: everyone following the record and
 * everyone already in the thread, minus whoever just wrote it and anyone
 * mentioned by name — a mention notice already says more than "new comment".
 */
export function commentAudience(params: {
  followerIds: string[];
  participantIds: string[];
  mentionedIds: string[];
  authorId: string;
}): string[] {
  const exclude = new Set([params.authorId, ...params.mentionedIds]);
  const audience = new Set<string>();
  for (const id of [...params.followerIds, ...params.participantIds]) {
    if (!exclude.has(id)) audience.add(id);
  }
  return Array.from(audience);
}

/**
 * A comment can only reply to a top-level comment on the same record. One
 * level of nesting keeps a thread readable; replies-to-replies do not.
 */
export function isValidParent(
  parent: { id: string; parentId: string | null; leadId: string | null; dealId: string | null; clientId: string | null; personId: string | null; siteId: string | null } | null,
  record: CollabRecord,
): boolean {
  if (!parent) return false;
  if (parent.parentId) return false;
  const columns = commentRecordColumns(record);
  return (
    parent.leadId === (columns.leadId ?? null) &&
    parent.dealId === (columns.dealId ?? null) &&
    parent.clientId === (columns.clientId ?? null) &&
    parent.personId === (columns.personId ?? null) &&
    parent.siteId === (columns.siteId ?? null)
  );
}
