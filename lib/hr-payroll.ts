import {
  Prisma,
  type CompensationCalcMethod,
  type CompensationRuleType,
  type GoldSettlementMode,
  type PayrollCycle,
} from "@prisma/client"
import type { AuthenticatedSession } from "@/lib/api-utils"
import {
  clampAtZero,
  minMoney,
  money,
  sumMoney,
  taxOn,
  type MoneyLike,
} from "@/lib/money"
import { emitWorkflowNotificationFromApprovalAction } from "@/lib/notifications"

type ApprovalActionInput = {
  companyId: string
  entityType:
    | "PAYROLL_RUN"
    | "DISBURSEMENT_BATCH"
    | "ADJUSTMENT_ENTRY"
    | "COMPENSATION_PROFILE"
    | "COMPENSATION_RULE"
    | "GOLD_SHIFT_ALLOCATION"
    | "IRREGULAR_PAYOUT_BATCH"
    | "DISCIPLINARY_ACTION"
  entityId: string
  action: "CREATE" | "SUBMIT" | "APPROVE" | "REJECT" | "ADJUST"
  actedById: string
  fromStatus?: string | null
  toStatus?: string | null
  note?: string | null
}

export type StandardWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"

export type StandardWorkflowAction = "SUBMIT" | "APPROVE" | "REJECT"

const STANDARD_WORKFLOW_TRANSITIONS: Record<
  StandardWorkflowAction,
  StandardWorkflowStatus[]
> = {
  SUBMIT: ["DRAFT", "REJECTED"],
  APPROVE: ["SUBMITTED"],
  REJECT: ["SUBMITTED"],
}

export function canTransitionStandardWorkflow(
  fromStatus: StandardWorkflowStatus,
  action: StandardWorkflowAction,
) {
  return STANDARD_WORKFLOW_TRANSITIONS[action].includes(fromStatus)
}

export function normalizeWorkflowNote(
  note: string | null | undefined,
  fallback: string,
) {
  const trimmed = note?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

export function isApproverRole(role: string | undefined) {
  return role === "MANAGER" || role === "SUPERADMIN"
}

export function ensureApproverRole(session: AuthenticatedSession) {
  return isApproverRole(session.user.role)
}

export function isTwoStepActionAllowed(
  submittedById: string | null | undefined,
  actorId: string,
  actorRole?: string,
  options?: {
    allowSuperadminSelfAction?: boolean
  },
) {
  if (options?.allowSuperadminSelfAction && actorRole === "SUPERADMIN") {
    return true
  }
  return !submittedById || submittedById !== actorId
}

export function derivePaidStatus(
  amount: MoneyLike,
  paidAmount?: MoneyLike,
): "DUE" | "PARTIAL" | "PAID" {
  const paid = money(paidAmount)
  if (paid.lessThanOrEqualTo(0)) return "DUE"
  if (paid.greaterThanOrEqualTo(money(amount))) return "PAID"
  return "PARTIAL"
}

export function monthPeriodKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

export function endOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

export function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

export function endOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

export function startOfFortnightUtc(date: Date) {
  const startDay = date.getUTCDate() <= 15 ? 1 : 16
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), startDay, 0, 0, 0, 0))
}

export function endOfFortnightUtc(date: Date) {
  if (date.getUTCDate() <= 15) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 15, 23, 59, 59, 999))
  }
  return endOfMonthUtc(date)
}

export function deriveCycleWindow(anchorDate: Date, cycle: PayrollCycle) {
  if (cycle === "FORTNIGHTLY") {
    const startDate = startOfFortnightUtc(anchorDate)
    const endDate = endOfFortnightUtc(anchorDate)
    return { startDate, endDate }
  }
  return {
    startDate: startOfMonthUtc(anchorDate),
    endDate: endOfMonthUtc(anchorDate),
  }
}

export function deriveCyclePeriodKey(startDate: Date, cycle: PayrollCycle) {
  if (cycle === "FORTNIGHTLY") {
    const half = startDate.getUTCDate() <= 15 ? "H1" : "H2"
    return `${monthPeriodKey(startDate)}-${half}`
  }
  return monthPeriodKey(startDate)
}

export function nextCycleAnchor(startDate: Date, cycle: PayrollCycle) {
  if (cycle === "FORTNIGHTLY") {
    if (startDate.getUTCDate() <= 1) {
      return new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 16, 0, 0, 0, 0))
    }
    return new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  }
  return new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1, 0, 0, 0, 0))
}

export function buildGoldPaymentWhere(input: {
  employeeIds: string[]
  settlementMode: GoldSettlementMode
  periodStart: Date
  periodEnd: Date
}) {
  const base = {
    employeeId: { in: input.employeeIds },
    type: "GOLD" as const,
  }

  if (input.settlementMode === "NEXT_PERIOD") {
    return {
      ...base,
      dueDate: {
        gte: input.periodStart,
        lte: input.periodEnd,
      },
    }
  }

  return {
    ...base,
    periodStart: { lte: input.periodEnd },
    periodEnd: { gte: input.periodStart },
  }
}

export function generateDisbursementCode(date = new Date()) {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(date.getUTCDate()).padStart(2, "0")
  const stamp = `${yyyy}${mm}${dd}`
  const suffix = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")
  return `DB-${stamp}-${suffix}`
}

export async function createApprovalAction(
  tx: Prisma.TransactionClient,
  input: ApprovalActionInput,
) {
  await tx.approvalAction.create({
    data: {
      companyId: input.companyId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actedById: input.actedById,
      fromStatus: input.fromStatus ?? undefined,
      toStatus: input.toStatus ?? undefined,
      note: input.note ?? undefined,
    },
  })

  await emitWorkflowNotificationFromApprovalAction(tx, {
    companyId: input.companyId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actedById: input.actedById,
  })
}

/**
 * A single compensation rule, applied.
 *
 * `Decimal` throughout since the columns became `Decimal(14,2)`. The old
 * version did `(baseAmount * value) / 100` in floating point and rounded
 * nowhere, so a 4.5% deduction on 1,234.56 produced 55.5552 and whatever the
 * next `+` made of it.
 */
export function calculateRuleAmount(input: {
  baseAmount: MoneyLike
  calcMethod: CompensationCalcMethod
  value: MoneyLike
  cap?: MoneyLike
}) {
  const amount =
    input.calcMethod === "PERCENT"
      ? taxOn(input.baseAmount, input.value)
      : money(input.value)
  const capped =
    input.cap === null || input.cap === undefined
      ? amount
      : minMoney(amount, input.cap)
  return clampAtZero(capped)
}

export type ComputedRuleComponent = {
  name: string
  ruleId?: string
  type: CompensationRuleType
  calcMethod: CompensationCalcMethod
  rateOrAmount: Prisma.Decimal
  amount: Prisma.Decimal
  isTaxable: boolean
}

/**
 * Gross and net from a set of applied rules.
 *
 * Employer contributions are deliberately absent from both totals. They are a
 * cost to the company and a liability to an authority; adding them to gross
 * would inflate what the employee appears to have earned, and adding them to
 * deductions would take them out of a wage they were never in.
 *
 * The Zimbabwe statutory pipeline in `lib/hr/payroll/` supersedes this for a
 * real payroll run. This stays for the settlement domains that have no
 * statutory dimension.
 */
export function computeLineTotals(input: {
  baseAmount: MoneyLike
  variableAmount: MoneyLike
  rules: ComputedRuleComponent[]
}) {
  const allowancesTotal = sumMoney(
    input.rules.filter((rule) => rule.type === "ALLOWANCE").map((rule) => rule.amount),
  )
  const deductionsTotal = sumMoney(
    input.rules
      .filter(
        (rule) => rule.type === "DEDUCTION" || rule.type === "STATUTORY_DEDUCTION",
      )
      .map((rule) => rule.amount),
  )
  const employerCost = sumMoney(
    input.rules
      .filter((rule) => rule.type === "EMPLOYER_CONTRIBUTION")
      .map((rule) => rule.amount),
  )
  const grossAmount = sumMoney([input.baseAmount, input.variableAmount, allowancesTotal])
  const netAmount = clampAtZero(grossAmount.minus(deductionsTotal))

  return {
    allowancesTotal,
    deductionsTotal,
    employerCost,
    grossAmount,
    netAmount,
  }
}
