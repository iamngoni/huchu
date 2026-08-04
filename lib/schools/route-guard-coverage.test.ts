/**
 * Every school API route is guarded.
 *
 * This is a coverage test rather than a behaviour test, and it exists because
 * of where the schools API sits: the middleware matcher in `proxy.ts` does not
 * cover `/api/v2/**`, so the `scope: "api"` entries in the route registry never
 * run for it. A route that forgets its own check has no second line of defence
 * — it is open to any signed-in user in the tenant, including a parent.
 *
 * A new route file therefore fails this test until it declares who may call it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SCHOOLS_API = join(process.cwd(), "app/api/v2/schools");

/**
 * Portal routes answer "who is this" through `lib/schools/portal-identity`
 * instead of a role check — a parent is allowed in, but only to their own
 * children. Both count as guarded.
 */
const GUARD_MARKERS = [
  "schoolPermissionDenial",
  "canViewAnyPortalSubject",
  "resolvePortalStudent",
  "resolvePortalGuardian",
  "getTeacherProfile",
];

function routeFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...routeFiles(full));
    } else if (entry === "route.ts") {
      found.push(full);
    }
  }
  return found;
}

const files = routeFiles(SCHOOLS_API);

describe("school API route guards", () => {
  it("finds the route files at all", () => {
    // A silent zero here would make every assertion below vacuously true.
    expect(files.length).toBeGreaterThan(60);
  });

  it.each(files.map((file) => [file.replace(process.cwd() + "/", ""), file]))(
    "%s declares who may call it",
    (_label, file) => {
      const source = readFileSync(file, "utf8");

      // A file that only forwards inherits the guard of whatever it forwards
      // to. Two shapes qualify, and both are checked for actually being empty
      // of their own logic rather than merely importing a handler: a bare
      // `export { GET } from …`, and a thin wrapper that calls a shared
      // `_handlers` function. Neither may touch the database itself.
      const isBareReExport = /^export \{[^}]*\} from/m.test(source);
      const isHandlerDelegate =
        /_handlers"/.test(source) && !source.includes("prisma.");
      if (isBareReExport || isHandlerDelegate) {
        expect(source.includes("prisma.")).toBe(false);
        return;
      }

      const guarded = GUARD_MARKERS.some((marker) => source.includes(marker));
      expect(guarded).toBe(true);
    },
  );
});
