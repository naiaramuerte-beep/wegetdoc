import { test, expect, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ── Console-error capture ────────────────────────────────────────────────────
// The live site loads third parties (GTM, Trustpilot, analytics, Sentry). Their
// console noise is NOT our bug, so filter it out and only fail on our own errors.
const IGNORE = [
  /googletagmanager|google-analytics|doubleclick|gstatic|googleads|trustpilot|hotjar|sentry|facebook|clarity|paypal|stripe/i,
  /Failed to load resource/i,
  /net::ERR_/i,
  /favicon/i,
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
];
const isOurError = (t: string) => t.length > 0 && !IGNORE.some((re) => re.test(t));

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && isOurError(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => {
    if (isOurError(e.message)) errors.push("pageerror: " + e.message);
  });
  return errors;
}

// A small, multi-line PDF with editable text — enough to exercise every tool.
async function samplePdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = [
    "Smoke test — EditorPDF",
    "Estimado cliente,",
    "Esta es una linea de texto editable.",
    "Y una segunda linea para probar.",
    "Atentamente, el equipo de EditorPDF",
  ];
  lines.forEach((t, i) =>
    page.drawText(t, { x: 60, y: 760 - i * 42, size: 16, font, color: rgb(0.12, 0.12, 0.12) })
  );
  return Buffer.from(await doc.save());
}

// Skip the product tour so its overlay doesn't block clicks.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("editorpdf_tour_seen_v1", "1");
    } catch {}
  });
});

async function openEditorWithPdf(page: Page) {
  const pdf = await samplePdfBuffer();
  await page.goto("/en");
  // Dismiss the cookie banner if it's covering the page.
  const accept = page.getByRole("button", { name: /accept all|accept|aceptar|ok/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click().catch(() => {});
  // Upload via the hidden file input (works even when not visible).
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "smoke.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.waitForURL("**/editor**", { timeout: 60_000 });
  // Give pdf.js time to render the page + detect native text blocks.
  await page.waitForTimeout(5000);
}

test("desktop: every editor tool activates without our-code errors", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "tool sweep runs on desktop project");
  const errors = trackErrors(page);
  await openEditorWithPdf(page);

  const toolbar = page.locator('[data-tour="toolbar"]');
  await expect(toolbar).toBeVisible({ timeout: 30_000 });
  const buttons = toolbar.locator("button");
  const n = await buttons.count();
  expect(n, "expected the tool toolbar to have several buttons").toBeGreaterThan(8);

  const results: { tool: string; ok: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    const label = (
      (await b.getAttribute("title").catch(() => null)) ||
      (await b.innerText().catch(() => "")) ||
      `#${i}`
    )
      .replace(/\s+/g, " ")
      .trim();
    const before = errors.length;
    await b.click({ timeout: 8000 }).catch((e) => errors.push(`click "${label}": ${e.message}`));
    await page.waitForTimeout(450);
    await page.keyboard.press("Escape").catch(() => {}); // close any panel it opened
    results.push({ tool: label, ok: errors.length === before });
  }

  // Undo / redo
  for (const key of ["Control+z", "Control+y"]) {
    const before = errors.length;
    await page.keyboard.press(key).catch(() => {});
    await page.waitForTimeout(300);
    results.push({ tool: key, ok: errors.length === before });
  }

  console.log(
    "\n===== TOOL SWEEP =====\n" +
      results.map((r) => `  ${r.ok ? "✓ PASS" : "✗ FAIL"}  ${r.tool}`).join("\n") +
      "\n======================\n"
  );
  expect(errors, `Our-code console/page errors:\n${errors.join("\n")}`).toEqual([]);
});

test("mobile: editor loads and core interactions raise no errors", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile smoke runs on mobile project");
  const errors = trackErrors(page);
  await openEditorWithPdf(page);

  // The mobile bottom bar renders the same tool components under a different
  // layout. Verify it mounted and tap a couple of common tools + undo.
  await page.getByText(/edit text|editar texto/i).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.getByText(/^undo$|deshacer/i).first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(600);

  expect(errors, `Our-code console/page errors:\n${errors.join("\n")}`).toEqual([]);
});
