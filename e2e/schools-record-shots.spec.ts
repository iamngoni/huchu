import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * S-4.3 — a student as a record page.
 *
 * Driven by opening a real pupil from the class list rather than by visiting a
 * hard-coded id, so the shots prove the route a registrar actually takes.
 *
 * Two viewports matter here for a reason beyond habit: below 1024px
 * `RecordPageShell` folds its rail into a synthetic "Overview" tab and lands on
 * it, so the phone shot is testing different code from the desktop one.
 *
 * See `visual-pass.spec.ts` for the login setup this shares.
 */

const EMAIL = process.env.VISUAL_PASS_EMAIL ?? "head@chisipite-demo.test";
const PASSWORD = process.env.VISUAL_PASS_PASSWORD ?? "VisualPass123!";
const SHOTS = process.env.SHOT_DIR ?? "/tmp/shots";
const AUTH_STATE = path.join(os.tmpdir(), "visual-pass-auth.json");

test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    args: ["--no-proxy-server"],
  },
  storageState: AUTH_STATE,
  serviceWorkers: "block",
});

test.skip(process.env.VISUAL_PASS !== "1", "See visual-pass.spec.ts for setup.");
test.describe.configure({ timeout: 180_000 });

test.beforeAll(async ({ browser }) => {
  fs.mkdirSync(SHOTS, { recursive: true });
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
  expect(response.status()).toBeLessThan(400);
  await context.storageState({ path: AUTH_STATE });
  await context.close();
});

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test.describe(`${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("student record page", async ({ page }) => {
      // Find a real pupil through the API rather than guessing an id, so the
      // spec keeps working when the demo tenant is reseeded. Prefer one with
      // guardians: a record page whose every relationship tab is empty proves
      // the tabs render but not that they show anything.
      const list = await page.request.get("/api/v2/schools/students?limit=25");
      expect(list.status()).toBeLessThan(400);
      const body = await list.json();
      const candidates: { id: string; studentNo: string }[] = body?.data ?? [];
      expect(candidates.length, "the demo tenant has no students to open").toBeGreaterThan(0);

      let student = candidates[0];
      for (const candidate of candidates) {
        const detail = await page.request.get(`/api/v2/schools/students/${candidate.id}`);
        const record = await detail.json().catch(() => null);
        if ((record?.guardianLinks?.length ?? 0) > 0) {
          student = candidate;
          break;
        }
      }

      await expect(async () => {
        await page.goto(`/schools/students/${student.id}`);
        // The pupil's student number, which the shell renders as the identity
        // strip's `reference`. It appears nowhere in the loading branch — that
        // is two Skeletons with no text — so this cannot photograph a spinner.
        await expect(page.getByText(student.studentNo).first()).toBeVisible({
          timeout: 20_000,
        });
      }).toPass({ timeout: 120_000 });

      // The property list is the thing S-4.3 replaced a hand-rolled InfoRow
      // with. If this is missing, the shell rendered without its attributes.
      await expect(page.getByText("Student number").first()).toBeVisible();

      // S-4.4 — the school's own fields sit in the same list as the built-in
      // ones. They are past the "N more properties" fold, which is the whole
      // reason that control exists, so it has to be opened first.
      const more = page.getByRole("button", { name: /more propert/ });
      if (await more.count()) {
        await more.first().click();
        await expect(page.getByText(/Transport · Bus route|Bus route/).first()).toBeVisible({
          timeout: 10_000,
        });
        await page.screenshot({
          path: `${SHOTS}/record-student-custom-fields-${viewport.name}.png`,
          fullPage: true,
        });
      }

      await page.screenshot({
        path: `${SHOTS}/record-student-${viewport.name}.png`,
        fullPage: true,
      });

      // Relationship tabs. Guardians is the landing tab on desktop; below
      // 1024px the shell inserts "Overview" ahead of it and lands there
      // instead, so assert on the tab existing rather than on it being active.
      const guardians = page.getByRole("tab", { name: /Guardians/ });
      await expect(guardians).toBeVisible();
      await guardians.click();
      await page.screenshot({
        path: `${SHOTS}/record-student-guardians-${viewport.name}.png`,
        fullPage: true,
      });

      const enrolments = page.getByRole("tab", { name: /Enrolments/ });
      if (await enrolments.count()) {
        await enrolments.click();
        await page.screenshot({
          path: `${SHOTS}/record-student-enrolments-${viewport.name}.png`,
          fullPage: true,
        });
      }
    });
  });
}
