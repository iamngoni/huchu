/**
 * CRM pipeline stage helpers.
 */
import type { CrmLeadStage } from "@prisma/client";

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
