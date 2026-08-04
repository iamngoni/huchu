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
 * The page-identity assertions below are the point. An earlier run of this
 * spec reported six passes while every screenshot was the admin sign-in page:
 * the overflow check is perfectly happy to measure a login form. A layout test
 * that cannot prove which page it is looking at proves nothing.
 */

const EMAIL = "head@chisipite-demo.test";
const PASSWORD = "VisualPass123!";
const SHOTS = process.env.SHOT_DIR ?? "/tmp/shots";

// The pinned @playwright/test wants a newer Chromium build than the one
// installed here, so point at the stable symlink rather than downloading.
test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    args: ["--no-proxy-server"],
  },
});

test.skip(process.env.VISUAL_PASS !== "1", "Set VISUAL_PASS=1 with a provisioned tenant host — see the file header.");

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, hasTouch: true },
  { name: "tablet", width: 768, height: 1024, hasTouch: true },
];

const PAGES = [
  { name: "academics", path: "/schools/academics" },
  { name: "guardians", path: "/schools/guardians" },
  { name: "students", path: "/schools/students" },
];

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.hasTouch,
    });

    for (const target of PAGES) {
      test(`${target.name} lays out without horizontal overflow`, async ({ page }) => {
        await page.goto("/login");
        await page.fill('input[type="email"]', EMAIL);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        // Where the app lands after login depends on role and entitlements, so
        // wait for the session to exist and then go straight to the surface
        // under test rather than guessing.
        await page.waitForResponse(
          (response) =>
            response.url().includes("/api/auth/session") && response.status() === 200,
          { timeout: 30_000 },
        );

        await page.goto(target.path);
        await page.waitForLoadState("networkidle");

        // Assert we are actually looking at the surface under test. Without
        // this the overflow check happily passes on a login form: an earlier
        // run of this spec reported six greens while every screenshot was the
        // admin magic-link page, because localhost resolves to the admin
        // portal host in dev.
        expect(new URL(page.url()).pathname, "redirected away from the page under test").toBe(
          target.path,
        );
        await expect(
          page.locator("text=Send magic link"),
          "landed on a sign-in page, not the app",
        ).toHaveCount(0);
        await page.screenshot({
          path: `${SHOTS}/${viewport.name}-${target.name}.png`,
          fullPage: true,
        });

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.body.scrollWidth,
          clientWidth: document.body.clientWidth,
          url: window.location.pathname,
        }));

        expect(
          overflow.scrollWidth,
          `${target.path} scrolls sideways at ${viewport.width}px`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      });
    }
  });
}
