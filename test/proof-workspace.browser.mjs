// Isolated component regression check. Run with: node test/proof-workspace.browser.mjs
// All API calls are intercepted; no billing, AI, account, or analytics service is contacted.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = process.cwd();
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "trimproof-workspace-browser-"));
const chromeCandidates = [chromium.executablePath(), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
let executablePath;
for (const candidate of chromeCandidates) {
  if (await fs.access(candidate).then(() => true, () => false)) { executablePath = candidate; break; }
}
assert.ok(executablePath, "No installed Chromium browser available; this check does not download browsers.");
const bundle = await build({
  stdin: {
    contents: `import React from "react";
import { createRoot } from "react-dom/client";
import { PressForgeWorkspace } from "./src/components/press-forge-workspace";
import { sampleBusinessCardLayout } from "./src/lib/print/sample-layout";
window.testSampleLayout = sampleBusinessCardLayout;
window.dataLayer = [];
createRoot(document.getElementById("root")).render(<PressForgeWorkspace accountEmail="buyer@example.test" checkoutSessionId="cs_test" initialMode="advanced" initialSpec={sampleBusinessCardLayout} />);`,
    loader: "tsx", resolveDir: root
  },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"', "process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID": "undefined" },
  plugins: [{
    name: "framework-presentation-stubs",
    setup(builder) {
      builder.onResolve({ filter: /^next\/(?:image|link)$/ }, ({ path: modulePath }) => ({ path: modulePath, namespace: "presentation-stub" }));
      builder.onLoad({ filter: /.*/, namespace: "presentation-stub" }, ({ path: modulePath }) => ({
        contents: modulePath === "next/link"
          ? 'import React from "react"; export default function Link({children, ...props}) { return React.createElement("a", props, children); }'
          : 'import React from "react"; export default function Image({fill, priority, unoptimized, ...props}) { return React.createElement("img", props); }',
        loader: "js", resolveDir: root
      }));
    }
  }]
});
const css = await fs.readFile(path.join(root, ".next/static/css/app/layout.css"), "utf8").catch(() => "");
const server = http.createServer((request, response) => {
  if (request.url === "/bundle.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); }
  else if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); }
  else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath, headless: true, args: ["--disable-background-networking"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  const unexpectedRequests = [];
  const proofRequests = [];
  let checkoutRequests = 0;
  let spec;
  page.on("pageerror", error => errors.push(error.message));
  const enhancement = {
    enhancedBrief: "A clean local test business card.", brandName: "Local Test", tagline: "Test only", styleDirection: "Clean typography",
    colorPalette: { name: "Ink", primary: "#222222", secondary: "#444444", accent: "#aa0055", background: "#ffffff" },
    suggestedContent: { headline: "Local Test", subhead: "Print checks", body: "Local fixture", contactInfo: "buyer@example.test" },
    designNotes: ["Use readable type"], assetSuggestions: [], productTypeHint: "business_card"
  };
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) { unexpectedRequests.push(request.url()); await route.abort(); return; }
    if (!url.pathname.startsWith("/api/")) { await route.continue(); return; }
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/billing/session") return reply({ session: { id: "cs_test", entitlement: "export_credit" } });
    if (url.pathname === "/api/upload") return reply({ files: [] });
    if (url.pathname === "/api/designs") return reply(request.method() === "POST" ? { success: true, id: "saved_local" } : { designs: [] });
    if (url.pathname === "/api/brief/enhance") return reply({ success: true, enhancement });
    if (url.pathname === "/api/design/generate") return reply({ success: true, designId: "variation_local", layoutSpec: spec, designRationale: "Local test design" });
    if (url.pathname === "/api/exports/proof") {
      proofRequests.push(request.postDataJSON());
      const rejected = proofRequests.length === 1;
      const status = rejected ? "needs_attention" : "passed";
      return reply({
        jobId: rejected ? "job_rejected" : "job_passed", mode: "advanced", productionDownloadLocked: rejected,
        demoArtWatermarked: false, assetUrls: [], reportUrl: "/api/exports/proof/files/local/preflight-report.json",
        report: { status, pdfPath: "pressforge-business-card.pdfx.pdf", printProfile: spec.printProfile, pdfxLevel: spec.pdfxLevel,
          checks: [{ id: "fonts_embedded", label: "Fonts embedded", status, evidence: rejected ? "Font embedding needs correction." : "All fonts embedded." }],
          ghostscript: { available: true }, generatedAt: "2026-09-14T00:00:00Z" },
        ...(rejected ? { error: "Print checks did not pass. Your export allowance has been restored." } : { downloadUrl: "/api/exports/proof/files/local/pressforge-business-card.pdfx.pdf" })
      }, rejected ? 422 : 200);
    }
    if (url.pathname === "/api/billing/checkout") checkoutRequests += 1;
    unexpectedRequests.push(`${request.method()} ${request.url()}`);
    return reply({ error: "Unexpected API request in isolated check" }, 500);
  });
  await page.goto(origin);
  await page.getByRole("button", { name: "Generate press proof", exact: true }).waitFor();
  spec = await page.evaluate(() => window.testSampleLayout);
  await page.getByRole("button", { name: "Enhance with AI", exact: true }).click();
  await page.getByRole("button", { name: "Generate Design", exact: true }).click();
  await page.getByText("Production downloads are locked until all print checks pass. Your export allowance has been retained.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "v1", exact: true }).waitFor();
  await page.locator("summary").filter({ hasText: "Preflight checks" }).click();
  await page.getByText("Font embedding needs correction.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Download preflight report", exact: true }).count(), 1);
  assert.equal(await page.getByRole("link", { name: "Download PDF/X proof", exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => window.dataLayer.filter(item => item.event === "proof_export_completed").length), 0);
  assert.equal(proofRequests.length, 1);
  const rejectedScreenshot = path.join(artifacts, "rejected-proof.png");
  await page.screenshot({ path: rejectedScreenshot, fullPage: true });
  await page.getByRole("button", { name: "Regenerate proof", exact: true }).click();
  await page.getByRole("link", { name: "Download PDF/X proof", exact: true }).waitFor();
  await page.getByText("All fonts embedded.", { exact: true }).waitFor();
  assert.equal(await page.getByText("Font embedding needs correction.", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Production downloads are locked until all print checks pass. Your export allowance has been retained.", { exact: true }).count(), 0);
  assert.equal(proofRequests.length, 2);
  assert.deepEqual(proofRequests.map(request => request.checkoutSessionId), ["cs_test", "cs_test"]);
  assert.equal(checkoutRequests, 0);
  assert.equal(await page.evaluate(() => window.dataLayer.filter(item => item.event === "proof_export_completed").length), 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, []);
  const passedScreenshot = path.join(artifacts, "passed-proof.png");
  await page.screenshot({ path: passedScreenshot, fullPage: true });
  console.log(JSON.stringify({ status: "passed", proofRequests: proofRequests.length, checkoutRequests, rejectedScreenshot, passedScreenshot, stubbedPresentationModules: ["next/image", "next/link"] }, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
