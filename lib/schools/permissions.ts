import { hasPersonaPermission, personaForRole } from "@/lib/platform/personas";

/**
 * What a member of school staff may do.
 *
 * The persona catalogue has always described this, but nothing mapped a role
 * onto a persona, so `hasPersonaPermission` had no call sites and the grants
 * were decoration. This is the school's entry point into it.
 *
 * It matters more here than the middleware suggests: the matcher in `proxy.ts`
 * does not cover `/api/v2/**`, so the `scope: "api"` entries in the route
 * registry never run for the schools API. A check inside the route is the only
 * thing standing between a signed-in teacher and the fee ledger.
 */

export const SCHOOL_RESOURCES = [
  "schools.academics",
  "schools.admissions",
  "schools.students",
  "schools.teachers",
  "schools.attendance",
  "schools.fees",
  "schools.boarding",
  "schools.results",
  "schools.reports",
] as const;

export type SchoolResource = (typeof SCHOOL_RESOURCES)[number];

/**
 * The tenant's own administrators, who are not scoped by a vertical persona.
 * Everyone else is answered from the persona grants.
 */
const TENANT_ADMIN_ROLES = new Set(["SUPERADMIN", "MANAGER"]);

export function canSchoolRoleDo(
  role: string | null | undefined,
  resource: SchoolResource,
  action: string,
): boolean {
  if (!role) return false;
  const normalized = role.trim().toUpperCase();
  if (TENANT_ADMIN_ROLES.has(normalized)) return true;

  const persona = personaForRole(normalized);
  if (!persona) return false;

  return hasPersonaPermission([persona], resource, action);
}

export type SessionLike = { user: { role?: string | null } };

/**
 * Returns null when allowed, or the message to refuse with.
 *
 * A message rather than a thrown error, because every school route already
 * returns through `errorResponse` and a throw would be caught by the generic
 * handler and reported as a 500.
 */
export function schoolPermissionDenial(
  session: SessionLike,
  resource: SchoolResource,
  action: string,
): string | null {
  if (canSchoolRoleDo(session.user.role, resource, action)) return null;
  return `Your role cannot ${action.replace(/-/g, " ")} ${resource.replace("schools.", "")}`;
}
