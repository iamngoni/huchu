import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * Visual pass over the school surfaces.
 *
 * Code review cannot see rendering, so this signs in against a provisioned
 * tenant and measures what the browser actually laid out at the two viewports
 * the playbook names.
 *
 * Skipped unless VISUAL_PASS=1, because it needs a local environment that CI
 * does not have:
 *
 *   1. A provisioned school — `pnpm provision:school --company-id <uuid>`
 *   2. A tenant hostname in /etc/hosts, e.g.
 *        127.0.0.1 <slug>.apps.pagka.local apps.pagka.local
 *      `lib/admin-portal.ts` treats localhost as the *admin* host in dev, so
 *      without this every tenant page redirects to the admin magic-link login.
 *   3. .env with NEXTAUTH_URL on that host, PLATFORM_ROOT_DOMAIN=apps.pagka.local
 *      and PLATFORM_ROOT_HOSTS including the port
 *   4. A user with a password on that company
 *
 *   VISUAL_PASS=1 E2E_BASE_URL=http://<slug>.apps.pagka.local:3000 \
 *     PW_CHROMIUM=/opt/pw-browsers/chromium SHOT_DIR=/tmp/shots \
 *     npx playwright test e2e/visual-pass.spec.ts --workers=1
 *
 * Two things here are load-bearing, both learned by getting them wrong:
 *
 * The suite signs in ONCE and reuses the storage state. `authorize()` rate
 * limits credentials to 10 attempts per 15 minutes per host+email+address, so
 * a spec that logs in per test spends its budget on itself and the later tests
 * silently screenshot the login page.
 *
 * Page identity is asserted POSITIVELY, on the heading the page is supposed to
 * render. An earlier version asserted the absence of the admin magic-link form
 * and reported six greens over six screenshots of the *tenant* password form —
 * a different sign-in page, so the negative check never fired. Proving what a
 * page is beats enumerating what it is not.
 */

const EMAIL = process.env.VISUAL_PASS_EMAIL ?? "head@chisipite-demo.test";
const PASSWORD = process.env.VISUAL_PASS_PASSWORD ?? "VisualPass123!";
const SHOTS = process.env.SHOT_DIR ?? "/tmp/shots";
const AUTH_STATE = path.join(os.tmpdir(), "visual-pass-auth.json");

// The pinned @playwright/test wants a newer Chromium build than the one
// installed here, so point at the stable symlink rather than downloading.
test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    args: ["--no-proxy-server"],
  },
  storageState: AUTH_STATE,
});

test.skip(
  process.env.VISUAL_PASS !== "1",
  "Set VISUAL_PASS=1 with a provisioned tenant host — see the file header.",
);

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, hasTouch: true },
  { name: "tablet", width: 768, height: 1024, hasTouch: true },
];

const PAGES = [
  { name: "academics", path: "/schools/academics", heading: "Academics Setup" },
  { name: "guardians", path: "/schools/guardians", heading: "Guardians" },
  { name: "students", path: "/schools/students", heading: "Students" },
];

/**
 * Sign in once for the whole file. Runs before any test's context is built, so
 * the storage state referenced by `test.use` above exists by the time it is
 * read.
 */
test.beforeAll(async ({ browser }) => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // Playwright restarts the worker after a failing test, which re-runs this
  // hook. Logging in each time spends the 10-per-15-minutes credentials budget
  // on the harness, and the runs after it fail on a rate limit rather than on
  // whatever they were meant to measure — the first real failure would hide
  // every result behind it. Reuse a live session instead.
  if (fs.existsSync(AUTH_STATE)) {
    const probe = await browser.newContext({ storageState: AUTH_STATE });
    const session = await probe.request.get("/api/auth/session");
    const body = await session.json().catch(() => ({}));
    await probe.close();
    if (body?.user) return;
  }

  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"), {
      timeout: 30_000,
    }),
    page.click('button[type="submit"]'),
  ]);

  // A 401 here is the whole run's outcome, so say why rather than letting six
  // tests fail one at a time on a screenshot of the login form. The reason is
  // recorded against `auth.login.failed` in PlatformAuditEvent.
  expect(
    response.status(),
    `sign-in as ${EMAIL} was rejected (${response.status()}) — check PlatformAuditEvent ` +
      "for the auth.login.failed reason; AUTH_RATE_LIMITED clears after 15 minutes",
  ).toBeLessThan(400);

  await expect
    .poll(
      async () => {
        const session = await page.request.get("/api/auth/session");
        const body = await session.json().catch(() => ({}));
        return Boolean(body?.user);
      },
      { timeout: 30_000, intervals: [500] },
    )
    .toBe(true);

  await context.storageState({ path: AUTH_STATE });
  await context.close();
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.hasTouch,
    });

    for (const target of PAGES) {
      test(`${target.name} lays out without horizontal overflow`, async ({ page }) => {
        await page.goto(target.path);
        // Not networkidle: the dev server keeps an HMR socket open, so the
        // network never goes quiet. Wait for the data instead of for a timer —
        // a screenshot taken while a table still says "Loading…" tells you
        // nothing about how the loaded page looks.
        await page.waitForLoadState("domcontentloaded");

        // Page identity, before anything is measured or photographed.
        // `.first()` because the design system's header renders a heading per
        // breakpoint variant and a card may repeat the word. One visible match
        // is all this needs to prove: that we are on the page, not a login form.
        await expect(
          page.getByRole("heading", { name: target.heading, exact: true }).first(),
          `never rendered the "${target.heading}" heading — landed on ${page.url()}`,
        ).toBeVisible({ timeout: 30_000 });
        expect(
          new URL(page.url()).pathname,
          `redirected away from ${target.path} — landed on ${page.url()}`,
        ).toBe(target.path);
        await expect(
          page.locator('input[type="password"]'),
          "a password field is on screen — this is a sign-in page, not the app",
        ).toHaveCount(0);

        await expect
          .poll(async () => page.locator("text=/Loading/i").count(), {
            timeout: 30_000,
            intervals: [500],
          })
          .toBe(0);

        await page.screenshot({
          path: `${SHOTS}/${viewport.name}-${target.name}.png`,
          fullPage: true,
        });

        // Body scrollWidth alone is too weak: a clipped inner container leaves
        // the body itself the right width while the content it holds is cut
        // off. Measure every element against the viewport and report the worst.
        const widest = await page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          let worst = { selector: "", right: 0 };
          for (const element of Array.from(document.querySelectorAll("*"))) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if (rect.right > worst.right) {
              const tag = element.tagName.toLowerCase();
              const cls = (element.getAttribute("class") ?? "").slice(0, 60);
              worst = { selector: `${tag}.${cls}`, right: Math.round(rect.right) };
            }
          }
          return { ...worst, viewportWidth, bodyScroll: document.body.scrollWidth };
        });

        // Row counts go in the log because "no overflow" over an empty table is
        // not the same result as "no overflow" over a full one, and the
        // screenshot alone does not distinguish an empty state from a fetch
        // that silently returned nothing.
        const rows = await page.locator("table tbody tr, [data-slot='mobile-list-row']").count();
        console.log(
          `RESULT ${viewport.name} ${target.name}: rows=${rows} ` +
            `widest=${widest.right}px viewport=${widest.viewportWidth}px (${widest.selector})`,
        );

        expect(
          widest.right,
          `${target.path} at ${viewport.width}px: "${widest.selector}" reaches ${widest.right}px, past the ${widest.viewportWidth}px viewport`,
        ).toBeLessThanOrEqual(widest.viewportWidth + 1);
      });
    }
  });
}
