import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * The teacher portal, screen by screen.
 *
 * Signs in as a *teacher* rather than reusing `visual-pass.spec.ts`'s head:
 * the portal resolves everything from the caller's own teacher profile, so a
 * privileged account sees the "you are not linked to a teacher profile" state
 * and every screenshot would be of that. The state file is separate for the
 * same reason.
 */

const EMAIL = process.env.TEACHER_EMAIL ?? "t001@chisipite-demo.test";
const PASSWORD = process.env.TEACHER_PASSWORD ?? "VisualPass123!";
const SHOTS = process.env.SHOT_DIR ?? "/tmp/shots";
const AUTH_STATE = path.join(os.tmpdir(), "teacher-portal-auth.json");

test.use({
  launchOptions: {
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    args: ["--no-proxy-server"],
  },
  storageState: AUTH_STATE,
  // The app registers an offline service worker. Once it installs it sits in
  // front of `/api/v2`, and a run would pass or hang depending on whether the
  // install had finished — the same test green in one context and stuck on a
  // skeleton in the next. Offline behaviour has its own spec; this one is
  // about what the screens look like.
  serviceWorkers: "block",
});

test.skip(process.env.VISUAL_PASS !== "1", "See visual-pass.spec.ts for setup.");

/**
 * Each screen names something only the *loaded* screen renders.
 *
 * An earlier version matched the greeting, which the skeleton state also
 * shows — every screenshot was of a shell waiting for its data. Waiting on a
 * class name, a pupil's name or a period is waiting on the query.
 */
const SCREENS = [
  { slug: "today", path: "/portal/teacher", ready: "Today's lessons" },
  { slug: "attendance", path: "/portal/teacher/attendance", ready: "on the class list" },
];

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
  expect(
    response.status(),
    `sign-in as ${EMAIL} was rejected (${response.status()})`,
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

/**
 * Compile the routes before measuring them.
 *
 * `next dev` builds a route on its first request, and the client bundle only
 * when a browser actually runs it. An earlier version warmed with
 * `request.get()`, which fetches the HTML and compiles none of the JavaScript
 * — so the first two tests in the run still screenshotted skeletons and the
 * last two passed, which reads as flakiness and is really a cold server. Warm
 * with a real navigation, and wait for the screen the tests wait for.
 */
test.beforeAll(async ({ browser }) => {
  // Compiling a screen takes longer than a test does, and there is one per
  // screen. The default 60s hook budget is for asserting, not for building.
  test.setTimeout(60_000 * SCREENS.length);
  const context = await browser.newContext({ storageState: AUTH_STATE });
  const page = await context.newPage();
  for (const screen of SCREENS) {
    // Compiling is the point; whether this render finishes is not. The tests
    // do the waiting, and a hook that blocks on the same condition just moves
    // the timeout somewhere it reports worse.
    await page
      .goto(screen.path, { waitUntil: "domcontentloaded", timeout: 45_000 })
      .catch(() => undefined);
  }
  await context.close();
});


for (const viewport of [
  { name: "tablet", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test.describe(`${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const screen of SCREENS) {
      test(`${screen.slug}`, async ({ page }) => {
        // Reload rather than wait harder.
        //
        // The app-wide hydration mismatch recorded in schools-open-questions
        // makes React discard the tree and rebuild it, and often enough the
        // rebuilt tree never gets its data — the page sits on its header with
        // no query in flight. Waiting longer does not help, because nothing is
        // pending; loading the page again does. Two attempts, so a screen that
        // is genuinely broken still fails.
        await expect(async () => {
          await page.goto(screen.path);
          await expect(page.getByText(screen.ready).first()).toBeVisible({
            timeout: 20_000,
          });
        }).toPass({ timeout: 90_000, intervals: [1_000] });
        // The rail is part of every screenshot, so wait for it to stop being
        // a skeleton too.
        await expect(page.getByText("Loading your classes…")).toHaveCount(0, {
          timeout: 30_000,
        });
        await page.screenshot({
          path: `${SHOTS}/teacher-${screen.slug}-${viewport.name}.png`,
          fullPage: true,
        });
      });
    }
  });
}
