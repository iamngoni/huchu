import { z } from "zod";

import type { AuthenticatedSession } from "@/lib/api-utils";
import { hasCrmFullAccess } from "@/lib/crm/scope";
import { prisma } from "@/lib/prisma";

export { crmLeadStageSchema } from "@/lib/crm/pipeline";

export const crmDocumentLineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative(),
  taxRate: z.number().finite().min(0).max(100).optional(),
});

/**
 * Require the session to have CRM manager access (forms, API keys, commission
 * rules, cross-rep actions). Returns true if allowed.
 */
export function requireCrmManager(session: AuthenticatedSession): boolean {
  return hasCrmFullAccess(session.user.role);
}

/**
 * Guard against cross-tenant user references: any user id accepted from a
 * request body (assignee, default assignee, commission target) must belong to
 * the caller's company. Returns true when the id is null/undefined or valid.
 */
export async function isCompanyUser(
  companyId: string,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return true;
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true },
  });
  return Boolean(user);
}
