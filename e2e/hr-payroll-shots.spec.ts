import { test } from "@playwright/test";

/**
 * Screenshots of the Zimbabwe payroll surface.
 *
 * The login click waits for `networkidle` plus a beat: clicking before React has
 * hydrated submits the form as a GET, which produced a page of query parameters
 * rather than a session on an earlier pass.
 */

const OUT = process.env.SHOT_DIR ?? "/tmp/shots";

const SCREENS: Array<[name: string, path: string]> = [
  ["statutory-tables", "/human-resources/statutory"],
  ["statutory-returns", "/human-resources/statutory/returns"],
  ["employees", "/human-resources"],
  ["payroll-runs", "/human-resources/payroll"],
];

// The environment ships chromium-1194 but this Playwright wants 1217, so point
// at the installed binary rather than downloading one.
test.use({ launchOptions: { executablePath: "/opt/pw-browsers/chromium" } });

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
      await page.fill("#login-email", "payroll@demo.local");
      await page.fill("#login-password", "Password123!");
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 45000,
      });

      for (const [name, path] of SCREENS) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        // Compile on first hit can take seconds; a screenshot taken during it is
        // a picture of a skeleton, which is how 30 blank images happened before.
        await page.waitForTimeout(3500);
        await page.screenshot({
          path: `${OUT}/${name}-${label}.png`,
          fullPage: true,
        });
      }
    });
  });
}
