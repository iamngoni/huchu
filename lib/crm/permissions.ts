/**
 * What each role can do in the CRM, written down in one place.
 *
 * The rules already existed, scattered across route handlers as `if (!manager)
 * return 403`. Collecting them here means the answer to "why can't I do this?"
 * is a table somebody can read, and the settings screen can show the same
 * table rather than a second, drifting description of it.
 */
import type { AuthenticatedSession } from "@/lib/auth-core/types";
import { prisma } from "@/lib/prisma";
import { hasCrmFullAccess } from "./scope";

export const CRM_CAPABILITIES = [
  "records.read",
  "records.edit.own",
  "records.edit.any",
  "records.delete",
  "records.merge",
  "records.import",
  "records.export",
  "pipelines.manage",
  "fields.manage",
  "views.share",
  "tasks.assign.others",
  "documents.issue",
  "documents.approve",
  "commissions.manage",
  "settings.manage",
] as const;

export type CrmCapability = (typeof CRM_CAPABILITIES)[number];

export const CRM_CAPABILITY_LABELS: Record<CrmCapability, string> = {
  "records.read": "See the whole pipeline",
  "records.edit.own": "Edit records assigned to them",
  "records.edit.any": "Edit anybody's records",
  "records.delete": "Delete records",
  "records.merge": "Merge duplicates",
  "records.import": "Import from a file",
  "records.export": "Export to a file",
  "pipelines.manage": "Change pipelines and stages",
  "fields.manage": "Add and change custom fields",
  "views.share": "Share saved views with the team",
  "tasks.assign.others": "Assign tasks to other people",
  "documents.issue": "Issue quotes and invoices",
  "documents.approve": "Send documents for customer approval",
  "commissions.manage": "Set commission rules",
  "settings.manage": "Change CRM settings",
};

/**
 * What each permission costs to grant, in one sentence.
 *
 * An admin deciding whether to tick a box needs to know what goes wrong if
 * they tick it, and a label like "Merge duplicates" does not say that merging
 * is irreversible. These notes are the difference between a permission screen
 * somebody can use and one they guess at.
 */
export const CRM_CAPABILITY_NOTES: Record<CrmCapability, string> = {
  "records.read": "The whole pipeline, including deals they are not on.",
  "records.edit.own": "Records assigned to them, plus any unassigned record they claim.",
  "records.edit.any": "Anybody's record. History still shows who changed what.",
  "records.delete": "Removes the record and everything hanging off it.",
  "records.merge": "Folds one record into another. Not reversible.",
  "records.import": "Creates records in bulk from a spreadsheet.",
  "records.export": "Takes customer data out of the system as a file.",
  "pipelines.manage": "Adds, renames and reorders stages for everyone.",
  "fields.manage": "Adds and changes custom fields for everyone.",
  "views.share": "Publishes a saved view to the whole team.",
  "tasks.assign.others": "Puts work on somebody else's list.",
  "documents.issue": "Raises quotes and invoices against a customer.",
  "documents.approve": "Sends a document to the customer for signature.",
  "commissions.manage": "Changes what the team gets paid.",
  "settings.manage": "Everything on the CRM settings screen.",
};

/**
 * A rep sees everything and edits their own. That combination is deliberate:
 * hiding the pipeline from the people working it causes more damage than the
 * privacy it buys, but letting anyone rewrite anyone's deal loses history.
 */
const REP_CAPABILITIES = new Set<CrmCapability>([
  "records.read",
  "records.edit.own",
  "records.export",
  "documents.issue",
  "documents.approve",
]);

const MANAGER_CAPABILITIES = new Set<CrmCapability>(CRM_CAPABILITIES);

export function capabilitiesForRole(role: string | null | undefined): Set<CrmCapability> {
  return hasCrmFullAccess(role) ? MANAGER_CAPABILITIES : REP_CAPABILITIES;
}

export function can(session: AuthenticatedSession, capability: CrmCapability): boolean {
  return capabilitiesForRole(session.user.role).has(capability);
}

/**
 * The same question, but honouring what an admin decided about this person.
 *
 * Roles answer for most people most of the time, which is why `can` still
 * exists and why the override table is usually empty. When an admin has said
 * something specific — this rep may not export, that coordinator may merge —
 * their answer wins over the role's.
 */
export async function canUser(
  session: AuthenticatedSession,
  capability: CrmCapability,
): Promise<boolean> {
  const roleDefault = can(session, capability);

  const override = await prisma.userPermissionOverride.findUnique({
    where: {
      userId_permissionKey: {
        userId: session.user.id,
        permissionKey: capability,
      },
    },
    select: { isAllowed: true },
  });

  return override ? override.isAllowed : roleDefault;
}

/**
 * The reason to show when something is refused. A 403 that says "forbidden"
 * sends the person to support; one that names the role sends them to their
 * manager, which is where the answer actually is.
 */
export function denialMessage(capability: CrmCapability): string {
  return `You do not have permission to ${CRM_CAPABILITY_LABELS[capability].toLowerCase()}. An admin or manager can grant it under Settings → Users.`;
}

/** The matrix, for the settings screen. */
export function permissionMatrix(): {
  capability: CrmCapability;
  label: string;
  manager: boolean;
  rep: boolean;
}[] {
  return CRM_CAPABILITIES.map((capability) => ({
    capability,
    label: CRM_CAPABILITY_LABELS[capability],
    manager: MANAGER_CAPABILITIES.has(capability),
    rep: REP_CAPABILITIES.has(capability),
  }));
}
