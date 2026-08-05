import {
  writePlatformAuditEvent,
  type AuditClient,
} from "@/lib/audit/platform";

/**
 * The school's privileged actions, written down once.
 *
 * DoD item 7 — "every privileged action writes a `PlatformAuditEvent`" — was
 * unmet across the whole fee surface: before S-2.5/S-2.6 not one route in
 * `app/api/v2/schools/**` wrote an audit row. This closes it for the actions
 * that move money in or out, which are the ones this pass touches. Issuing an
 * invoice, writing one off, voiding a receipt and applying a waiver are equally
 * privileged and equally silent; they are named in the report rather than fixed
 * here.
 *
 * The union exists so that a new event type is a deliberate addition rather
 * than a string typed twice slightly differently — an audit log is only
 * searchable if the verbs are finite.
 */
export type SchoolAuditEventType =
  | "schools.fee.receipt.recorded"
  | "schools.fee.receipt.voided"
  /** S-2.7 — a bursar re-sent a receipt to ZIMRA by hand. */
  | "schools.fee.receipt.fiscalised"
  | "schools.fee.credit.allocated"
  | "schools.fee.refund.requested"
  | "schools.fee.refund.paid"
  | "schools.fee.refund.cancelled";

export type SchoolAuditArgs = {
  companyId: string;
  actorId: string;
  eventType: SchoolAuditEventType;
  entityType: string;
  entityId: string;
  /** Why, in the bursar's own words, where the action asks for a reason. */
  reason?: string;
  payload?: Record<string, unknown>;
};

/**
 * Write a school audit event, on the client you give it.
 *
 * Pass the transaction client. An audit row written outside the transaction
 * that performed the action can survive a rollback and describe something that
 * never happened, which is worse than no row at all; and one written after a
 * commit can be lost to a crash, leaving money moved and nothing said. Inside,
 * both fates are impossible.
 *
 * It does not swallow errors, for the same reason.
 */
export async function writeSchoolAuditEvent(
  client: AuditClient,
  args: SchoolAuditArgs,
): Promise<void> {
  await writePlatformAuditEvent(
    {
      companyId: args.companyId,
      actorId: args.actorId,
      eventType: args.eventType,
      entityType: args.entityType,
      entityId: args.entityId,
      reason: args.reason,
      payload: args.payload,
    },
    client,
  );
}
