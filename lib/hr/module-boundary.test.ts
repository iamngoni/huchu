/**
 * `lib/hr/**` does not import a vertical.
 *
 * The rule the payroll-only product stands on. Dependencies point inward —
 * toward `lib/money.ts`, `lib/accounting/`, `lib/documents/` and
 * `lib/platform/` — and never sideways into Gold, Schools, Retail or Autos.
 *
 * Why enforce it mechanically rather than by care: the boundary erodes on the
 * first convenient shortcut, and every shortcut is individually reasonable. One
 * `import { convertUsdToGrams } from "@/lib/gold/valuation"` in the payroll
 * engine and the payroll module no longer ships without the gold module — which
 * is discovered not at review time but when somebody provisions a payroll-only
 * workspace and a screen throws.
 *
 * The direction is deliberately asymmetric. `lib/gold/payouts.ts` may reach into
 * HR's shape, and does — that is the seam HR-1 touched. HR reaching back is what
 * this forbids.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const HR_ROOT = join(process.cwd(), "lib/hr");

/** Verticals HR must not depend on. */
const FORBIDDEN_IMPORTS = [
  "@/lib/gold/",
  "@/lib/schools/",
  "@/lib/retail/",
  "@/lib/autos/",
  "@/lib/scrap-metal/",
  "@/lib/crm/",
  "@/lib/cctv/",
];

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      found.push(full);
    }
  }
  return found;
}

const files = sourceFiles(HR_ROOT);

describe("HR module boundary", () => {
  it("finds the HR source files", () => {
    // Guards against a rename quietly making every assertion below vacuous.
    expect(files.length).toBeGreaterThan(4);
  });

  it.each(files.map((file) => [file.replace(process.cwd() + "/", ""), file]))(
    "%s imports no vertical",
    (label, file) => {
      const source = readFileSync(file, "utf8");
      const offenders = FORBIDDEN_IMPORTS.filter((prefix) => source.includes(prefix));
      expect(
        offenders,
        `${label} imports ${offenders.join(", ")} — HR must not depend on a vertical. ` +
          `If payroll needs something a vertical owns, the vertical registers it or ` +
          `payroll reads the shared model.`,
      ).toEqual([]);
    },
  );

  it("keeps the engine free of Prisma so it can be tested without a database", () => {
    // `computePayroll` takes resolved rates and returns components. The moment it
    // reads a table itself, the 38 hand-worked arithmetic tests need a Postgres,
    // and the arithmetic stops being checkable against a ZIMRA circular.
    const engine = readFileSync(join(HR_ROOT, "payroll/engine.ts"), "utf8");
    expect(engine.includes("@/lib/prisma")).toBe(false);
    expect(engine.includes("prisma.")).toBe(false);
  });

  it("keeps the engine free of feature flags", () => {
    // Whether a workspace has accounting is the caller's business. An engine that
    // asked would be an engine that behaves differently in a test than in
    // production.
    const engine = readFileSync(join(HR_ROOT, "payroll/engine.ts"), "utf8");
    expect(engine.includes("hasEnabledFeature")).toBe(false);
    expect(engine.includes("hasFeature")).toBe(false);
  });
});
