import { expect, test, type Page } from "@playwright/test";

/**
 * Screenshots of the Zimbabwe payroll surface.
 *
 * Run against the tenant host, not localhost. The demo tenant has
 * `core.multitenancy.tenant-host-enforcement` on, so localhost is the central
 * admin host and every `/people` path 307s to `/admin`:
 *
 *   echo '127.0.0.1 payroll-demo.apps.pagka.local' >> /etc/hosts
 *   npx tsx scripts/seed-payroll-demo.ts
 *   E2E_BASE_URL=http://payroll-demo.apps.pagka.local:3000 \
 *     npx playwright test e2e/hr-payroll-shots.spec.ts
 *
 * The login click waits for `networkidle` plus a beat: clicking before React has
 * hydrated submits the form as a GET, which produced a page of query parameters
 * rather than a session on an earlier pass.
 */

const OUT = process.env.SHOT_DIR ?? "/tmp/shots";
const BASE = process.env.E2E_BASE_URL ?? "http://payroll-demo.apps.pagka.local:3000";

// Returns default to the previous complete month — the right default to file
// against and the wrong one to photograph, since the demo run is August 2026
// and July lands on the empty state.
type Screen = {
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
};

const SCREENS: Screen[] = [
  { name: "statutory-tables", path: "/payroll/statutory" },
  {
    name: "statutory-returns",
    path: "/payroll/statutory/returns",
    prepare: async (page) => {
      const trigger = page.getByRole("combobox").first();
      if (!(await trigger.isVisible().catch(() => false))) return;
      await trigger.click();
      const option = page.getByRole("option", { name: /August 2026/i });
      if (await option.isVisible().catch(() => false)) await option.click();
      await page.waitForLoadState("networkidle");
    },
  },
  { name: "employees", path: "/people" },
  {
    name: "payroll-runs",
    // The resolved URL. /payroll/runs redirects here, and a shot
    // taken mid-redirect catches the periods table still loading.
    path: "/payroll/runs",
    prepare: async (page) => {
      await page
        .getByText("2026-08")
        .first()
        .waitFor({ state: "visible", timeout: 30000 })
        .catch(() => {});
    },
  },
];

// The environment ships chromium-1194 but this Playwright wants 1217, so point
// at the installed binary rather than downloading one.
test.use({
  baseURL: BASE,
  launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
});

const VIEWPORTS: Array<[label: string, width: number, height: number]> = [
  ["desktop", 1440, 900],
  ["tablet", 768, 1024],
  ["phone", 390, 844],
];

for (const [label, width, height] of VIEWPORTS) {
  test.describe(`${label}`, () => {
    test.use({ viewport: { width, height } });

    test(`payroll screens at ${width}x${height}`, async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2500);
      await page.fill("#login-email", "rudo.chirwa@payroll-demo.test");
      await page.fill("#login-password", "Password123!");
      await page.click('button[type="submit"]');
      // Wait on the cookie, not the URL. NEXTAUTH_URL pins the post-login
      // redirect to whichever host it names, which in a multi-tenant dev setup
      // is some other tenant — the session is still issued for the host the
      // form posted to, so the cookie is the signal that matters.
      await expect
        .poll(
          async () => {
            const cookies = await page.context().cookies();
            return cookies.some((cookie) => cookie.name.includes("session-token"));
          },
          { timeout: 45000 },
        )
        .toBe(true);

      for (const { name, path, prepare } of SCREENS) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        // Compile on first hit can take seconds; a screenshot taken during it is
        // a picture of a skeleton, which is how 30 blank images happened before.
        // The runs page needs the longer end of this — it fires a second query
        // for periods after the shell paints.
        await page.waitForTimeout(8000);
        if (prepare) {
          await prepare(page);
          await page.waitForTimeout(1500);
        }
        await page.screenshot({
          path: `${OUT}/${name}-${label}.png`,
          fullPage: true,
        });
      }
    });
  });
}
