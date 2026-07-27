/**
 * CRM pipeline stage helpers.
 */
import type { CrmLeadStage, Prisma } from "@prisma/client";
import { z } from "zod";

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

export const CRM_LEAD_STAGES: CrmLeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "QUOTED",
  "INVOICED",
  "WON",
  "LOST",
];

export const CRM_OPEN_STAGES: CrmLeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "QUOTED",
  "INVOICED",
];

export const CRM_STAGE_LABELS: Record<CrmLeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  SITE_VISIT: "Site Visit",
  QUOTED: "Quoted",
  INVOICED: "Invoiced",
  WON: "Won",
  LOST: "Lost",
};

/**
 * Default win-probability per stage (0-100). Individual leads may override via
 * CrmLead.probability.
 */
export const CRM_STAGE_DEFAULT_PROBABILITY: Record<CrmLeadStage, number> = {
  NEW: 10,
  CONTACTED: 20,
  QUALIFIED: 40,
  SITE_VISIT: 55,
  QUOTED: 70,
  INVOICED: 90,
  WON: 100,
  LOST: 0,
};

export function defaultProbabilityForStage(stage: CrmLeadStage): number {
  return CRM_STAGE_DEFAULT_PROBABILITY[stage];
}

/**
 * Move a lead to a new stage and log the change on its timeline.
 *
 * Shared by the single-lead endpoint, the bulk action, and the pipeline board
 * so a drag on the board and a dropdown on the detail page produce identical
 * history. Callers are responsible for the tenant and permission checks; this
 * only runs inside a transaction they own.
 */
export async function changeLeadStage(
  tx: Prisma.TransactionClient,
  params: {
    companyId: string;
    userId: string;
    lead: { id: string; stage: CrmLeadStage; clientId: string | null };
    stage: CrmLeadStage;
    lostReason?: string | null;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  const { lead, stage } = params;

  const updated = await tx.crmLead.update({
    where: { id: lead.id },
    data: {
      stage,
      probability: defaultProbabilityForStage(stage),
      // Terminal timestamps always reflect the current stage: entering a
      // terminal stage stamps it and clears the opposing one; reopening to a
      // non-terminal stage clears both (no contradictory wonAt+lostAt).
      wonAt: stage === "WON" ? now : null,
      lostAt: stage === "LOST" ? now : null,
      lostReason: stage === "LOST" ? params.lostReason ?? null : null,
    },
  });

  await tx.crmActivity.create({
    data: {
      companyId: params.companyId,
      type: "STAGE_CHANGE",
      leadId: lead.id,
      clientId: lead.clientId ?? undefined,
      subject: `Stage changed ${CRM_STAGE_LABELS[lead.stage]} → ${CRM_STAGE_LABELS[stage]}`,
      metadata: {
        fromStage: lead.stage,
        toStage: stage,
        ...(params.lostReason ? { lostReason: params.lostReason } : {}),
      },
      createdById: params.userId,
      occurredAt: now,
    },
  });

  return updated;
}
