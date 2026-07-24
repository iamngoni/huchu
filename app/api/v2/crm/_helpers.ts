import { z } from "zod";

import type { AuthenticatedSession } from "@/lib/api-utils";
import { hasCrmFullAccess } from "@/lib/crm/scope";

export const crmLeadStageSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "QUOTED",
  "INVOICED",
  "WON",
  "LOST",
]);

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
