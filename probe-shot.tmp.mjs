import { chromium } from "@playwright/test";
import os from "node:os"; import path from "node:path";
const targets = JSON.parse(process.argv[2]);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-proxy-server"] });
for (const vp of [{ w: 1440, h: 900, n: "desktop" }, { w: 390, h: 844, n: "phone" }]) {
  const c = await b.newContext({ storageState: path.join(os.tmpdir(), "visual-pass-auth.json"), baseURL: "http://chisipite-demo.apps.pagka.local:3000", viewport: { width: vp.w, height: vp.h } });
  const p = await c.newPage();
  for (const t of targets) {
    await p.goto(t.url, { waitUntil: "domcontentloaded" });
    if (t.wait) await p.getByText(t.wait).first().waitFor({ timeout: 25000 }).catch(() => console.log("  (wait miss:", t.wait, ")"));
    await p.waitForTimeout(t.pause ?? 2500);
    const file = `/tmp/shots/${t.name}-${vp.n}.png`;
    await p.screenshot({ path: file, fullPage: true });
    console.log("shot", file);
  }
  await c.close();
}
await b.close();
