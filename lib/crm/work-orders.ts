/**
 * Work orders: the job that follows a won deal.
 *
 * The lifecycle is a state machine rather than a free-text status, because the
 * questions people ask of a job — "is anyone on site?", "why has this not
 * moved?" — only have answers if the states mean something and the moves
 * between them are the ones that can actually happen.
 */
import type { CrmWorkOrderStatus } from "@prisma/client";
import { z } from "zod";

export const WORK_ORDER_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const WORK_ORDER_STATUS_LABELS: Record<CrmWorkOrderStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "On site",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Which moves are allowed.
 *
 * A completed job is final: reopening one would let a signature stand against
 * work that changed afterwards. Redo it as a new job instead.
 */
const TRANSITIONS: Record<CrmWorkOrderStatus, CrmWorkOrderStatus[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "BLOCKED", "CANCELLED", "DRAFT"],
  IN_PROGRESS: ["COMPLETED", "BLOCKED", "CANCELLED"],
  BLOCKED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: CrmWorkOrderStatus,
  to: CrmWorkOrderStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: CrmWorkOrderStatus): CrmWorkOrderStatus[] {
  return TRANSITIONS[from];
}

export type WorkOrderItemProgress = { quantity: number; completedQuantity: number };

/**
 * What a job needs before it can be called done.
 *
 * A signature is the one that matters: a job with nobody's name against it is
 * a job the customer can still say never happened.
 */
export function completionBlockers(order: {
  items: WorkOrderItemProgress[];
  signedByName?: string | null;
  scheduledStart?: Date | string | null;
}): string[] {
  const blockers: string[] = [];

  if (!order.signedByName?.trim()) {
    blockers.push("Nobody has signed the job off");
  }

  const unfinished = order.items.filter((item) => item.completedQuantity < item.quantity);
  if (unfinished.length > 0) {
    blockers.push(
      `${unfinished.length} item${unfinished.length === 1 ? " is" : "s are"} not fully done`,
    );
  }

  return blockers;
}

/** How far through the job is, by quantity rather than by line count. */
export function completionPercent(items: WorkOrderItemProgress[]): number {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (total === 0) return 0;
  const done = items.reduce(
    (sum, item) => sum + Math.min(item.completedQuantity, item.quantity),
    0,
  );
  return Math.round((done / total) * 100);
}

/** A job that should have started and hasn't. */
export function isOverdueToStart(
  order: { status: CrmWorkOrderStatus; scheduledStart: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (order.status !== "SCHEDULED" || !order.scheduledStart) return false;
  const start =
    typeof order.scheduledStart === "string"
      ? new Date(order.scheduledStart)
      : order.scheduledStart;
  return !Number.isNaN(start.getTime()) && start.getTime() < now.getTime();
}

export const workOrderItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().finite().positive(),
  unit: z.string().trim().max(20).nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const createWorkOrderSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  siteId: z.string().uuid().nullable().optional(),
  /** Pull the checklist from this quote's lines instead of typing it out. */
  documentId: z.string().uuid().nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  crewIds: z.array(z.string().uuid()).max(20).optional(),
  addressLine: z.string().trim().max(300).nullable().optional(),
  accessNotes: z.string().trim().max(1000).nullable().optional(),
  contactName: z.string().trim().max(120).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  items: z.array(workOrderItemSchema).max(100).optional(),
});

export const updateWorkOrderSchema = createWorkOrderSchema.partial().extend({
  status: z.enum(WORK_ORDER_STATUSES).optional(),
  blockedReason: z.string().trim().max(500).nullable().optional(),
  completionNotes: z.string().trim().max(4000).nullable().optional(),
  signedByName: z.string().trim().max(120).nullable().optional(),
  signatureUrl: z.string().url().nullable().optional(),
  customerRating: z.number().int().min(1).max(5).nullable().optional(),
  itemProgress: z
    .array(z.object({ id: z.string().uuid(), completedQuantity: z.number().finite().min(0) }))
    .max(100)
    .optional(),
});

export type WorkOrderQueue = "TODAY" | "SCHEDULED" | "IN_PROGRESS" | "BLOCKED" | "MINE" | "DONE";

export const WORK_ORDER_QUEUE_LABELS: Record<WorkOrderQueue, string> = {
  TODAY: "Today",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "On site",
  BLOCKED: "Blocked",
  MINE: "Mine",
  DONE: "Completed",
};

/**
 * Quote lines become a job checklist.
 *
 * Only what has to be done on site: a delivery charge is on the invoice but
 * isn't a thing a crew ticks off, so anything with no quantity to install is
 * left out rather than cluttering the sheet.
 */
export function quoteLinesToWorkItems(
  lines: { description: string; quantity: number }[],
): { description: string; quantity: number }[] {
  return lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({ description: line.description, quantity: line.quantity }));
}
