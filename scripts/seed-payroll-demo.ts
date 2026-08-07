import "dotenv/config";
/**
 * A payroll workspace to look at.
 *
 * Not a fixture — a demo tenant with enough shape that the screens show real
 * numbers: a dual-currency workforce, one employee deliberately missing a BP
 * number so the blocker path renders, an approved run, and a posted journal.
 */
import { prisma } from "@/lib/prisma";
import { ensureAccountingDefaults } from "@/lib/accounting/bootstrap";
import { seedZimbabweStatutoryPack } from "@/lib/hr/statutory/zimbabwe-pack";
import { FEATURE_BUNDLES, FEATURE_CATALOG } from "@/lib/platform/feature-catalog";
import { assembleSalaryRun } from "@/lib/hr/payroll/assemble";
import { postPayrollRun } from "@/lib/hr/payroll/posting";
import bcrypt from "bcryptjs";

const SLUG = "payroll-demo";
const PERIOD_KEY = "2026-08";
const START = new Date("2026-08-01T00:00:00.000Z");
const END = new Date("2026-08-31T23:59:59.999Z");

async function main() {
  // Re-runnable. The company cascade cannot clear everything on its own — the
  // accounting seed leaves tax templates whose lines reference tax codes — so the
  // payroll rows go first and by name, rather than being swallowed by a `catch`
  // that leaves the tenant half-deleted and the next run failing on the slug.
  const existing = await prisma.company.findUnique({
    where: { slug: SLUG },
    select: { id: true },
  });
  if (existing) {
    const companyId = existing.id;
    await prisma.journalLine.deleteMany({ where: { entry: { companyId } } });
    await prisma.journalEntry.deleteMany({ where: { companyId } });
    await prisma.accountingIntegrationEvent.deleteMany({ where: { companyId } });
    await prisma.payrollLineComponent.deleteMany({
      where: { lineItem: { run: { companyId } } },
    });
    await prisma.payrollLineItem.deleteMany({ where: { run: { companyId } } });
    await prisma.approvalAction.deleteMany({ where: { companyId } });
    await prisma.payrollRun.deleteMany({ where: { companyId } });
    await prisma.payrollPeriod.deleteMany({ where: { companyId } });
    await prisma.compensationProfile.deleteMany({ where: { employee: { companyId } } });
    await prisma.compensationRule.deleteMany({ where: { companyId } });
    await prisma.employee.deleteMany({ where: { companyId } });
    await prisma.department.deleteMany({ where: { companyId } });
    await prisma.payeTable.deleteMany({ where: { companyId } });
    await prisma.statutoryRate.deleteMany({ where: { companyId } });
    await prisma.taxCredit.deleteMany({ where: { companyId } });
    await prisma.necAgreement.deleteMany({ where: { companyId } });
    await prisma.currencyRate.deleteMany({ where: { companyId } });
    await prisma.platformAuditEvent.deleteMany({ where: { companyId } });
    await prisma.companyFeatureFlag.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.taxRule.deleteMany({ where: { companyId } });
    await prisma.taxTemplateLine.deleteMany({ where: { template: { companyId } } });
    await prisma.taxTemplate.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
  }

  const company = await prisma.company.create({
    data: {
      name: "Kariba Payroll Bureau",
      slug: SLUG,
      workspaceProfile: "PAYROLL",
      // Auth refuses a tenant that is still PROVISIONING, so a demo left at the
      // default cannot be signed into at all.
      tenantStatus: "ACTIVE",
    },
    select: { id: true },
  });
  const companyId = company.id;

  const admin = await prisma.user.create({
    data: {
      companyId,
      // The email domain carries the tenant: `<slug>.test` matches how the school
      // demo tenant is addressed, and auth resolves the tenant from it.
      email: "rudo.chirwa@payroll-demo.test",
      name: "Rudo Chirwa",
      password: await bcrypt.hash("Password123!", 10),
      role: "MANAGER",
      isActive: true,
    },
    select: { id: true },
  });

  await ensureAccountingDefaults(companyId);
  await seedZimbabweStatutoryPack({ companyId });

  // Turn on the payroll surface. Provisioning normally does this from the
  // template's bundles; here it is direct, so the demo has exactly the features
  // TEMPLATE_PAYROLL_BUREAU grants and nothing else.
  const bureauKeys = new Set(
    FEATURE_BUNDLES.filter((bundle) =>
      ["ADDON_WORKFORCE_CORE", "ADDON_ADVANCED_PAYROLL", "ADDON_ZIMBABWE_PAYROLL"].includes(
        bundle.code,
      ),
    ).flatMap((bundle) => bundle.features),
  );
  bureauKeys.add("accounting.core");
  bureauKeys.add("accounting.journals");
  bureauKeys.add("accounting.chart-of-accounts");

  for (const key of bureauKeys) {
    const catalog = FEATURE_CATALOG.find((feature) => feature.key === key);
    const feature = await prisma.platformFeature.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: catalog?.name ?? key,
        description: catalog?.description,
        domain: catalog?.domain,
        defaultEnabled: false,
        isBillable: catalog?.isBillable ?? false,
      },
      select: { id: true },
    });
    await prisma.companyFeatureFlag.upsert({
      where: { companyId_featureId: { companyId, featureId: feature.id } },
      update: { isEnabled: true },
      create: { companyId, featureId: feature.id, isEnabled: true },
    });
  }

  await prisma.currencyRate.create({
    data: {
      companyId,
      baseCurrency: "USD",
      quoteCurrency: "ZWG",
      rate: 27.5,
      effectiveDate: new Date("2026-08-01T00:00:00.000Z"),
    },
  });

  const dept = await prisma.department.create({
    data: { companyId, name: "Operations", code: "OPS" },
    select: { id: true },
  });

  const people: Array<[string, string, string, string, string | null, boolean]> = [
    // name, employeeId, base, currency, taxNumber, hasDisability
    ["Ada Moyo", "EMP-001", "1450", "USD", "BP1000001", false],
    ["Tendai Zulu", "EMP-002", "820", "USD", "BP1000002", false],
    ["Chipo Nyoni", "EMP-003", "2600", "USD", "BP1000003", false],
    ["Farai Dube", "EMP-004", "540", "USD", null, false],
    ["Tapiwa Gumbo", "EMP-005", "41250", "ZWG", "BP1000005", false],
    ["Nyasha Banda", "EMP-006", "19800", "ZWG", "BP1000006", true],
  ];

  for (const [name, employeeId, base, currency, taxNumber, hasDisability] of people) {
    const employee = await prisma.employee.create({
      data: {
        companyId,
        employeeId,
        name,
        jobTitle: "Operations Officer",
        departmentId: dept.id,
        phone: "0770000000",
        nextOfKinName: "Next of kin",
        nextOfKinPhone: "0770000001",
        passportPhotoUrl: "https://example.invalid/p.jpg",
        villageOfOrigin: "Harare",
        defaultCurrency: currency,
        taxNumber,
        nssaNumber: taxNumber ? `NSSA-${employeeId}` : null,
        hasDisability,
        overtimeHourlyRate: currency === "USD" ? "9.25" : null,
      },
      select: { id: true },
    });

    await prisma.compensationProfile.create({
      data: {
        employeeId: employee.id,
        baseAmount: base,
        currency,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        status: "ACTIVE",
        workflowStatus: "APPROVED",
        createdById: admin.id,
      },
    });
  }

  // A taxable housing allowance and a pre-tax pension, so the payslip has stages.
  await prisma.compensationRule.create({
    data: {
      companyId,
      name: "Housing allowance",
      type: "ALLOWANCE",
      calcMethod: "PERCENT",
      value: "10",
      taxable: true,
      currency: "USD",
      isActive: true,
      workflowStatus: "APPROVED",
      createdById: admin.id,
    },
  });
  await prisma.compensationRule.create({
    data: {
      companyId,
      name: "Pension",
      type: "DEDUCTION",
      calcMethod: "PERCENT",
      value: "5",
      currency: "USD",
      isActive: true,
      workflowStatus: "APPROVED",
      statutoryKey: "PENSION",
      createdById: admin.id,
    },
  });
  await prisma.compensationRule.create({
    data: {
      companyId,
      name: "Medical aid",
      type: "DEDUCTION",
      calcMethod: "FIXED",
      value: "95",
      currency: "USD",
      isActive: true,
      workflowStatus: "APPROVED",
      statutoryKey: "MEDICAL_AID_CONTRIBUTION",
      createdById: admin.id,
    },
  });

  await prisma.necAgreement.create({
    data: {
      companyId,
      councilName: "NEC for the Commercial Sectors",
      currency: "USD",
      employeeRatePercent: "0.5",
      employerRatePercent: "0.5",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  const period = await prisma.payrollPeriod.create({
    data: {
      companyId,
      periodKey: PERIOD_KEY,
      startDate: START,
      endDate: END,
      dueDate: new Date("2026-09-05T00:00:00.000Z"),
      status: "APPROVED",
      createdById: admin.id,
    },
    select: { id: true },
  });

  const assembled = await assembleSalaryRun({
    companyId,
    periodStart: START,
    periodEnd: END,
    appliesToContractorsOnly: false,
  });
  if (assembled.gaps.length > 0) throw new Error(assembled.gaps.join("; "));

  const run = await prisma.payrollRun.create({
    data: {
      companyId,
      periodId: period.id,
      runNumber: 1,
      status: "APPROVED",
      approvedById: admin.id,
      approvedAt: new Date("2026-08-31T00:00:00.000Z"),
      createdById: admin.id,
      lineItems: {
        create: assembled.lines.flatMap((line) =>
          line.payroll.slices.map((slice) => ({
            employeeId: line.employee.id,
            compensationProfileId: line.profile.id,
            baseAmount: line.profile.baseAmount,
            allowancesTotal: slice.allowancesTotal,
            deductionsTotal: slice.deductionsTotal,
            grossAmount: slice.grossAmount,
            netAmount: slice.netAmount,
            taxableGross: slice.taxableGross,
            employerCost: slice.employerCost,
            currency: slice.currency,
            exchangeRate: slice.exchangeRate,
            netBaseAmount: slice.netAmount.dividedBy(slice.exchangeRate).toDecimalPlaces(2),
            components: {
              create: slice.components.map((c) => ({
                name: c.name,
                type: c.type,
                calcMethod: c.calcMethod,
                rateOrAmount: c.rateOrAmount,
                amount: c.amount,
                isTaxable: c.isTaxable,
                statutoryKey: c.statutoryKey ?? undefined,
                sequence: c.sequence,
                basis: c.basis ?? undefined,
              })),
            },
          })),
        ),
      },
    },
    select: { id: true, runNumber: true, lineItems: { select: { id: true } } },
  });

  const totals = assembled.lines.flatMap((l) => l.payroll.slices);
  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      grossTotal: totals.reduce((s, x) => s.plus(x.grossAmount), totals[0].grossAmount.minus(totals[0].grossAmount)),
      netTotal: totals.reduce((s, x) => s.plus(x.netAmount), totals[0].netAmount.minus(totals[0].netAmount)),
      deductionsTotal: totals.reduce((s, x) => s.plus(x.deductionsTotal), totals[0].deductionsTotal.minus(totals[0].deductionsTotal)),
      employerCostTotal: totals.reduce((s, x) => s.plus(x.employerCost), totals[0].employerCost.minus(totals[0].employerCost)),
    },
  });

  const outcome = await postPayrollRun({
    companyId,
    runId: run.id,
    runNumber: run.runNumber,
    entryDate: new Date("2026-08-31T00:00:00.000Z"),
    createdById: admin.id,
    enabledFeatures: ["accounting.core"],
  });

  console.log(JSON.stringify({
    companyId,
    slug: SLUG,
    login: "payroll@demo.local / Password123!",
    lineItemIds: run.lineItems.map((l) => l.id),
    posted: outcome.posted,
  }, null, 2));
}

main().then(() => prisma.$disconnect());
