/**
 * The four consents, with no database behind them.
 *
 * Split out of `lib/schools/health.ts` for the same reason `calendar-kinds.ts`
 * is split out of `calendar.ts`: the welfare form renders one checkbox per
 * consent, and importing the labels from a Prisma-importing module drags `pg`
 * into the browser bundle.
 */

export type ConsentKey =
  | "consentFirstAid"
  | "consentEmergencyTreatment"
  | "consentPhotography"
  | "consentOutings";

export const CONSENT_LABELS: Record<ConsentKey, string> = {
  consentFirstAid: "Ordinary first aid without ringing home",
  consentEmergencyTreatment: "Emergency treatment, including hospital",
  consentPhotography: "Photographs for the newsletter and website",
  consentOutings: "Leaving the grounds on a school trip",
};

export const CONSENT_KEYS = Object.keys(CONSENT_LABELS) as ConsentKey[];

export function anyConsentGiven(flags: Partial<Record<ConsentKey, boolean>>) {
  return CONSENT_KEYS.some((key) => flags[key] === true);
}
