import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import type { CompensationCalcMethod, CompensationRuleType } from "@prisma/client"
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils"
import {
  calculateRuleAmount,
  computeLineTotals,
  createApprovalAction,
  ensureApproverRole,
} from "@/lib/hr-payroll"
import {
  money,
  rate,
  resolveBaseCurrency,
  resolveExchangeRate,
  sumMoney,
  toBaseAmount,
  UnknownExchangeRateError,
  ZERO,
} from "@/lib/money"
import { createRouteLogger } from "@/lib/observability/route-logger"
import { prisma } from "@/lib/prisma"

const generateRunSchema = z.object({
  notes: z.string().max(1000).optional(),
  runNumber: z.number().int().min(1).optional(),
  overwriteDraft: z.boolean().optional(),
})

type LineComponentDraft = {
  ruleId?: string
  name: string
  type: CompensationRuleType
  calcMethod: CompensationCalcMethod
  rateOrAmount: Prisma.Decimal
  amount: Prisma.Decimal
  isTaxable: boolean
}

type LineItemDraft = {
  employeeId: string
  compensationProfileId: string | null
  baseAmount: Prisma.Decimal
  variableAmount: Prisma.Decimal
  allowancesTotal: Prisma.Decimal
  deductionsTotal: Prisma.Decimal
  grossAmount: Prisma.Decimal
  netAmount: Prisma.Decimal
  currency: string
  notes?: string
  components: LineComponentDraft[]
}

/**
 * Stamp every line with the rate its currency was worth at the period end, and
 * the base-currency value of its net pay.
 *
 * Frozen on the row rather than looked up when something reads it: a payslip
 * reprinted in a year, and the journal that posted alongside it, have to agree,
 * and the ZWG rate will not be what it was. A currency with no rate on file
 * raises `UnknownExchangeRateError` — the run stops rather than paying somebody
 * against an invented number.
 */
async function stampLineCurrencies(input: {
  companyId: string
  on: Date
  lineItems: LineItemDraft[]
}) {
  const baseCurrency = await resolveBaseCurrency(input.companyId)
  const currencies = new Set(input.lineItems.map((line) => line.currency))
  const rateByCurrency = new Map<string, Prisma.Decimal>()

  for (const currency of currencies) {
    rateByCurrency.set(
      currency,
      await resolveExchangeRate({
        companyId: input.companyId,
        currency,
        baseCurrency,
        on: input.on,
      }),
    )
  }

  return input.lineItems.map((line) => {
    const exchangeRate = rateByCurrency.get(line.currency) ?? new Prisma.Decimal(1)
    return {
      ...line,
      exchangeRate,
      netBaseAmount: toBaseAmount(line.netAmount, exchangeRate),
    }
  })
}

type RunDraft = {
  lineItems: LineItemDraft[]
  totals: {
    grossTotal: Prisma.Decimal
    allowancesTotal: Prisma.Decimal
    deductionsTotal: Prisma.Decimal
    netTotal: Prisma.Decimal
  }
  workflowNote: string
  warnings: string[]
  goldRatePerUnit?: number
  goldRateUnit?: string
  goldSettlementMode?: "CURRENT_PERIOD" | "NEXT_PERIOD"
}

const ZERO_TOTALS = {
  grossTotal: ZERO,
  allowancesTotal: ZERO,
  deductionsTotal: ZERO,
  netTotal: ZERO,
}

function parseEmployeeScopeIds(raw: string | null | undefined) {
  if (!raw) return [] as string[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [] as string[]
    return parsed.filter((value): value is string => typeof value === "string")
  } catch {
    return [] as string[]
  }
}

function deriveRunTotals(lineItems: LineItemDraft[]) {
  return {
    grossTotal: sumMoney(lineItems.map((line) => line.grossAmount)),
    allowancesTotal: sumMoney(lineItems.map((line) => line.allowancesTotal)),
    deductionsTotal: sumMoney(lineItems.map((line) => line.deductionsTotal)),
    netTotal: sumMoney(lineItems.map((line) => line.netAmount)),
  }
}

async function buildIrregularPayoutRunDraft(input: {
  companyId: string
  payoutSource: "GOLD" | "SCRAP" | "COMMISSION" | "OTHER"
  periodStart: Date
  periodEnd: Date
  goldSettlementMode: "CURRENT_PERIOD" | "NEXT_PERIOD"
}) {
  if (input.payoutSource !== "GOLD") {
    const approvedBatches = await prisma.irregularPayoutBatch.findMany({
      where: {
        companyId: input.companyId,
        source: input.payoutSource,
        workflowStatus: "APPROVED",
        dueDate: {
          gte: input.periodStart,
          lte: input.periodEnd,
        },
      },
      include: {
        items: {
          select: {
            employeeId: true,
            amount: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    })

    const payoutByEmployee = new Map<
      string,
      { amount: Prisma.Decimal; batchCount: number }
    >()
    for (const batch of approvedBatches) {
      for (const item of batch.items) {
        const current = payoutByEmployee.get(item.employeeId) ?? {
          amount: ZERO,
          batchCount: 0,
        }
        payoutByEmployee.set(item.employeeId, {
          amount: sumMoney([current.amount, item.amount]),
          batchCount: current.batchCount + 1,
        })
      }
    }

    const employeeIds = Array.from(payoutByEmployee.keys())
    if (employeeIds.length === 0) {
      return null
    }

    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        companyId: input.companyId,
      },
      select: {
        id: true,
        defaultCurrency: true,
      },
    })
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]))

    const lineItems: LineItemDraft[] = employeeIds.map((employeeId) => {
      const payout = payoutByEmployee.get(employeeId) ?? { amount: ZERO, batchCount: 0 }
      const employee = employeeById.get(employeeId)
      return {
        employeeId,
        compensationProfileId: null,
        baseAmount: ZERO,
        variableAmount: payout.amount,
        allowancesTotal: ZERO,
        deductionsTotal: ZERO,
        grossAmount: payout.amount,
        netAmount: payout.amount,
        currency: employee?.defaultCurrency ?? "USD",
        notes: `${input.payoutSource} payout snapshot from ${payout.batchCount} approved batch${payout.batchCount === 1 ? "" : "es"}.`,
        components: [],
      }
    })

    return {
      lineItems,
      totals: deriveRunTotals(lineItems),
      workflowNote: `${input.payoutSource} payout run generated from approved irregular payout batches.`,
      warnings: [],
    } satisfies RunDraft
  }

  const allocationDateFloor = new Date(input.periodStart)
  allocationDateFloor.setDate(allocationDateFloor.getDate() - 42)

  const approvedAllocations = await prisma.goldShiftAllocation.findMany({
    where: {
      workflowStatus: "APPROVED",
      site: { companyId: input.companyId },
      date:
        input.goldSettlementMode === "CURRENT_PERIOD"
          ? { gte: input.periodStart, lte: input.periodEnd }
          : { gte: allocationDateFloor, lte: input.periodEnd },
    },
    include: {
      workerShares: {
        select: {
          employeeId: true,
          shareWeight: true,
          shareValueUsd: true,
        },
      },
    },
  })

  const payoutByEmployee = new Map<string, { goldWeight: number; valueUsd: number }>()
  for (const allocation of approvedAllocations) {
    const dueDate = new Date(allocation.date)
    dueDate.setDate(dueDate.getDate() + allocation.payCycleWeeks * 7)

    const qualifiesForPeriod =
      input.goldSettlementMode === "CURRENT_PERIOD"
        ? allocation.date >= input.periodStart && allocation.date <= input.periodEnd
        : dueDate >= input.periodStart && dueDate <= input.periodEnd

    if (!qualifiesForPeriod) continue

    for (const workerShare of allocation.workerShares) {
      const current = payoutByEmployee.get(workerShare.employeeId) ?? { goldWeight: 0, valueUsd: 0 }
      const allocGoldPrice = allocation.goldPriceUsdPerGram != null ? Number(allocation.goldPriceUsdPerGram) : 0;
      const fallbackValueUsd =
        allocGoldPrice > 0
          ? Number(workerShare.shareWeight) * allocGoldPrice
          : 0
      payoutByEmployee.set(workerShare.employeeId, {
        goldWeight: current.goldWeight + Number(workerShare.shareWeight),
        valueUsd: current.valueUsd + (workerShare.shareValueUsd != null ? Number(workerShare.shareValueUsd) : fallbackValueUsd),
      })
    }
  }

  const employeeIds = Array.from(payoutByEmployee.keys())
  if (employeeIds.length === 0) {
    return null
  }

  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      companyId: input.companyId,
    },
    select: {
      id: true,
      defaultCurrency: true,
    },
  })
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))

  let totalGoldWeight = 0
  let totalValueUsd = 0
  const lineItems: LineItemDraft[] = employeeIds.map((employeeId) => {
    const payout = payoutByEmployee.get(employeeId) ?? { goldWeight: 0, valueUsd: 0 }
    const goldWeight = payout.goldWeight
    const convertedAmount = payout.valueUsd
    const derivedRate = goldWeight > 0 ? convertedAmount / goldWeight : null
    const employee = employeeById.get(employeeId)
    totalGoldWeight += goldWeight
    totalValueUsd += convertedAmount

    return {
      employeeId,
      compensationProfileId: null,
      // Grams, not money — see the note on `PayrollLineItem.baseAmount`. Kept at
      // four places through `rate()` rather than rounded to cents by `money()`.
      baseAmount: rate(goldWeight),
      variableAmount: money(convertedAmount),
      allowancesTotal: ZERO,
      deductionsTotal: ZERO,
      grossAmount: money(convertedAmount),
      netAmount: money(convertedAmount),
      currency: employee?.defaultCurrency ?? "USD",
      notes: derivedRate
        ? `Gold payout snapshot: ${goldWeight.toFixed(3)} g => ${convertedAmount.toFixed(2)} USD @ ${derivedRate.toFixed(4)} per g`
        : `Gold payout snapshot: ${goldWeight.toFixed(3)} g => ${convertedAmount.toFixed(2)} USD`,
      components: [],
    }
  })

  const weightedRate = totalGoldWeight > 0 ? totalValueUsd / totalGoldWeight : undefined

  return {
    lineItems,
    totals: deriveRunTotals(lineItems),
    workflowNote: "Gold payout run generated from approved gold shift allocations.",
    warnings: [],
    goldRatePerUnit: weightedRate,
    goldRateUnit: "g",
    goldSettlementMode: input.goldSettlementMode,
  } satisfies RunDraft
}

async function buildSalaryPayrollRunDraft(input: {
  companyId: string
  periodStart: Date
  periodEnd: Date
  employeeScopeJson?: string | null
  appliesToContractorsOnly: boolean
}) {
  const scopedEmployeeIds = parseEmployeeScopeIds(input.employeeScopeJson)
  const employeeWhere: Record<string, unknown> = {
    companyId: input.companyId,
    isActive: true,
  }
  if (input.appliesToContractorsOnly) {
    employeeWhere.employmentType = "CONTRACT"
  }
  if (scopedEmployeeIds.length > 0) {
    employeeWhere.id = { in: scopedEmployeeIds }
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    select: {
      id: true,
      name: true,
      employeeId: true,
      departmentId: true,
      gradeId: true,
      defaultCurrency: true,
    },
    orderBy: { name: "asc" },
  })
  if (employees.length === 0) {
    return {
      lineItems: [] as LineItemDraft[],
      totals: ZERO_TOTALS,
      workflowNote: "Salary payroll run generated from compensation profiles and active rules.",
      warnings: ["No eligible employees found for this payroll period scope."],
    } satisfies RunDraft
  }

  const employeeIds = employees.map((employee) => employee.id)

  const profiles = await prisma.compensationProfile.findMany({
    where: {
      employeeId: { in: employeeIds },
      workflowStatus: "APPROVED",
      status: "ACTIVE",
      effectiveFrom: { lte: input.periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.periodStart } }],
    },
    select: {
      id: true,
      employeeId: true,
      baseAmount: true,
      currency: true,
      effectiveFrom: true,
    },
    orderBy: [{ employeeId: "asc" }, { effectiveFrom: "desc" }, { createdAt: "desc" }],
  })
  const profileByEmployeeId = new Map<string, (typeof profiles)[number]>()
  for (const profile of profiles) {
    if (!profileByEmployeeId.has(profile.employeeId)) {
      profileByEmployeeId.set(profile.employeeId, profile)
    }
  }

  const rules = await prisma.compensationRule.findMany({
    where: {
      companyId: input.companyId,
      workflowStatus: "APPROVED",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      type: true,
      calcMethod: true,
      value: true,
      cap: true,
      taxable: true,
      employeeId: true,
      departmentId: true,
      gradeId: true,
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  })

  const lineItems: LineItemDraft[] = []
  const warnings: string[] = []

  for (const employee of employees) {
    const profile = profileByEmployeeId.get(employee.id)

    if (!profile) {
      warnings.push(
        `${employee.name} (${employee.employeeId}) skipped: no approved compensation profile.`,
      )
      continue
    }

    const baseAmount = profile.baseAmount
    const currency = profile.currency ?? employee.defaultCurrency
    const sourceLabel = "Compensation profile"

    const applicableRules = rules.filter((rule) => {
      if (rule.employeeId && rule.employeeId !== employee.id) return false
      if (rule.departmentId && rule.departmentId !== employee.departmentId) return false
      if (rule.gradeId && rule.gradeId !== employee.gradeId) return false
      return true
    })

    const components: LineComponentDraft[] = applicableRules.map((rule) => {
      const amount = calculateRuleAmount({
        baseAmount,
        calcMethod: rule.calcMethod,
        value: rule.value,
        cap: rule.cap,
      })
      return {
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
        calcMethod: rule.calcMethod,
        rateOrAmount: rule.value,
        amount,
        isTaxable: rule.taxable,
      }
    })

    const totals = computeLineTotals({
      baseAmount,
      variableAmount: ZERO,
      rules: components,
    })

    lineItems.push({
      employeeId: employee.id,
      compensationProfileId: profile.id,
      baseAmount,
      variableAmount: ZERO,
      allowancesTotal: totals.allowancesTotal,
      deductionsTotal: totals.deductionsTotal,
      grossAmount: totals.grossAmount,
      netAmount: totals.netAmount,
      currency,
      notes: `${sourceLabel} salary run for ${employee.name}.`,
      components,
    })
  }

  return {
    lineItems,
    totals: deriveRunTotals(lineItems),
    workflowNote: "Salary payroll run generated from compensation profiles and active rules.",
    warnings,
  } satisfies RunDraft
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const logger = createRouteLogger({
    route: "/api/payroll/periods/[id]/generate-run",
    request,
  })
  logger.info("start")

  try {
    const sessionResult = await validateSession(request)
    if (sessionResult instanceof NextResponse) return sessionResult
    const { session } = sessionResult
    if (!ensureApproverRole(session)) {
      return errorResponse("Insufficient permissions to generate payroll runs", 403)
    }

    const { id } = await params
    const body = await request.json()
    const validated = generateRunSchema.parse(body)
    logger.info("generate_run_requested", {
      companyId: session.user.companyId,
      actorId: session.user.id,
      periodId: id,
      overwriteDraft: validated.overwriteDraft ?? false,
      requestedRunNumber: validated.runNumber,
    })

    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            goldSettlementMode: true,
          },
        },
        runs: {
          select: {
            id: true,
            runNumber: true,
            status: true,
          },
          orderBy: { runNumber: "desc" },
        },
      },
    })
    if (!period || period.companyId !== session.user.companyId) {
      return errorResponse("Payroll period not found", 404)
    }
    if (period.status === "APPROVED" || period.status === "CLOSED") {
      return errorResponse("Approved or closed payroll periods cannot be regenerated", 400)
    }

    const draftRun = period.runs.find((run) => run.status === "DRAFT")
    if (draftRun && !validated.overwriteDraft) {
      logger.info("generate_run_conflict", {
        companyId: session.user.companyId,
        actorId: session.user.id,
        periodId: id,
        draftRunId: draftRun.id,
        statusCode: 409,
      })
      return errorResponse(
        "Draft payroll run already exists for this period. Pass overwriteDraft=true to regenerate.",
        409,
      )
    }

    const runNumber =
      validated.runNumber ??
      (period.runs.length > 0 ? Math.max(...period.runs.map((run) => run.runNumber)) + 1 : 1)

    let runDraft: RunDraft
    if (period.domain === "GOLD_PAYOUT") {
      const irregularDraft = await buildIrregularPayoutRunDraft({
        companyId: session.user.companyId,
        payoutSource: period.payoutSource ?? "GOLD",
        periodStart: new Date(period.startDate),
        periodEnd: new Date(period.endDate),
        goldSettlementMode: period.company.goldSettlementMode,
      })
      if (!irregularDraft) {
        logger.info("generate_run_no_source_records", {
          companyId: session.user.companyId,
          actorId: session.user.id,
          periodId: id,
          domain: period.domain,
          payoutSource: period.payoutSource ?? "GOLD",
          statusCode: 409,
        })
        return errorResponse(
          `No approved ${(period.payoutSource ?? "GOLD").toLowerCase()} payout records found for this period. Approve source records before generating a run.`,
          409,
        )
      }
      runDraft = irregularDraft
    } else {
      runDraft = await buildSalaryPayrollRunDraft({
        companyId: session.user.companyId,
        periodStart: new Date(period.startDate),
        periodEnd: new Date(period.endDate),
        employeeScopeJson: period.employeeScopeJson,
        appliesToContractorsOnly: period.appliesToContractorsOnly,
      })
      if (runDraft.lineItems.length === 0) {
        logger.info("generate_run_no_eligible_employees", {
          companyId: session.user.companyId,
          actorId: session.user.id,
          periodId: id,
          domain: period.domain,
          warningCount: runDraft.warnings.length,
          statusCode: 409,
        })
        return errorResponse("No eligible salary employees found for this period", 409, {
          warnings: runDraft.warnings,
        })
      }
    }

    // Freeze the FX rate before anything is written. A missing rate is a hard
    // stop, not a warning: the alternative is paying somebody in ZWG against a
    // rate nobody entered.
    let stampedLines: Awaited<ReturnType<typeof stampLineCurrencies>>
    try {
      stampedLines = await stampLineCurrencies({
        companyId: session.user.companyId,
        on: new Date(period.endDate),
        lineItems: runDraft.lineItems,
      })
    } catch (error) {
      if (error instanceof UnknownExchangeRateError) {
        logger.info("generate_run_missing_exchange_rate", {
          companyId: session.user.companyId,
          actorId: session.user.id,
          periodId: id,
          statusCode: 409,
        })
        return errorResponse(error.message, 409, { warnings: runDraft.warnings })
      }
      throw error
    }

    const createdRun = await prisma.$transaction(async (tx) => {
      if (draftRun && validated.overwriteDraft) {
        await tx.payrollRun.delete({ where: { id: draftRun.id } })
      }

      const created = await tx.payrollRun.create({
        data: {
          companyId: session.user.companyId,
          periodId: period.id,
          domain: period.domain,
          payoutSource: period.payoutSource ?? undefined,
          runNumber,
          status: "DRAFT",
          notes: validated.notes,
          grossTotal: runDraft.totals.grossTotal,
          allowancesTotal: runDraft.totals.allowancesTotal,
          deductionsTotal: runDraft.totals.deductionsTotal,
          netTotal: runDraft.totals.netTotal,
          goldRatePerUnit: runDraft.goldRatePerUnit,
          goldRateUnit: runDraft.goldRateUnit,
          goldSettlementMode: runDraft.goldSettlementMode ?? period.company.goldSettlementMode,
          createdById: session.user.id,
          lineItems: {
            create: stampedLines.map((line) => ({
              employeeId: line.employeeId,
              compensationProfileId: line.compensationProfileId,
              baseAmount: line.baseAmount,
              variableAmount: line.variableAmount,
              allowancesTotal: line.allowancesTotal,
              deductionsTotal: line.deductionsTotal,
              grossAmount: line.grossAmount,
              netAmount: line.netAmount,
              currency: line.currency,
              exchangeRate: line.exchangeRate,
              netBaseAmount: line.netBaseAmount,
              notes: line.notes,
              components:
                line.components.length > 0
                  ? {
                      create: line.components.map((component) => ({
                        ruleId: component.ruleId ?? undefined,
                        name: component.name,
                        type: component.type,
                        calcMethod: component.calcMethod,
                        rateOrAmount: component.rateOrAmount,
                        amount: component.amount,
                        isTaxable: component.isTaxable,
                      })),
                    }
                  : undefined,
            })),
          },
        },
        include: {
          period: { select: { id: true, periodKey: true, startDate: true, endDate: true } },
          createdBy: { select: { id: true, name: true } },
          lineItems: {
            include: {
              employee: { select: { id: true, employeeId: true, name: true } },
              components: true,
            },
            orderBy: { employee: { name: "asc" } },
          },
        },
      })

      await createApprovalAction(tx, {
        companyId: session.user.companyId,
        entityType: "PAYROLL_RUN",
        entityId: created.id,
        action: "CREATE",
        actedById: session.user.id,
        toStatus: "DRAFT",
        note: runDraft.workflowNote,
      })

      return created
    })

    logger.info("generate_run_success", {
      companyId: session.user.companyId,
      actorId: session.user.id,
      periodId: id,
      payrollRunId: createdRun.id,
      domain: createdRun.domain,
      runNumber: createdRun.runNumber,
      lineItemCount: createdRun.lineItems.length,
      warningCount: runDraft.warnings.length,
      statusCode: 201,
    })

    return successResponse(
      {
        ...createdRun,
        warnings: runDraft.warnings,
      },
      201,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation failed", 400, error.issues)
    }
    logger.error("generate_run_failed", error)
    return errorResponse("Failed to generate payroll run")
  }
}
