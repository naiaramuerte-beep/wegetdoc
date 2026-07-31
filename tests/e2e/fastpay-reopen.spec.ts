import { test, expect, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Regression: the FastPay card form must load EVERY time the "Tarjeta de crédito
 * o débito" row is opened — including after collapsing and reopening it.
 *
 * The bug (pre-existing since 2026-06-13): the FastPay bundle keeps an internal
 * "iframe already created" flag. Collapsing swept the iframe from the DOM but did
 * NOT reset window.Fastpay, so reopening ran loadAll() as a no-op → the iframe
 * never came back → the form stuck on the "Preparando formulario seguro…" skeleton
 * forever (only a full page reload fixed it). The fix reloads a fresh bundle on
 * every open, and adds a 9s timeout → retry fallback so a slow/blocked load never
 * leaves an infinite skeleton.
 *
 * WHERE THIS RUNS: it needs to reach the paywall PAYMENT step, which lives behind
 * auth (and premium accounts skip the paywall entirely). Point it at a preview or
 * local build with a guest/test session:
 *     E2E_BASE_URL=http://localhost:5173 pnpm test:e2e fastpay-reopen
 * Against production the card row sits behind the register/login step, so the test
 * auto-skips if it can't surface the FastPay row (never a false failure).
 */

const CARD_ROW = /tarjeta de crédito|tarjeta de credito|credit or debit|targeta/i;
const SKELETON = /Preparando formulario seguro|preparing the secure form|secure form/i;

async function samplePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("FastPay reopen smoke — EditorPDF", { x: 60, y: 760, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
  return Buffer.from(await doc.save());
}

// Locator for the real FastPay card iframe (injected as a sibling of .fastpay-btn).
function cardIframe(page: Page) {
  return page.locator(".fastpay-btn + iframe, .fastpay-shell iframe");
}

/** Reach the paywall payment step via the converter funnel and return true if the
 *  FastPay card row is present (i.e. we're past auth). */
async function openPaywallCardStep(page: Page): Promise<boolean> {
  await page.addInitScript(() => { try { localStorage.setItem("editorpdf_tour_seen_v1", "1"); } catch {} });
  await page.goto("/en/pdf-to-word");
  const accept = page.getByRole("button", { name: /accept all|accept|aceptar|ok/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click().catch(() => {});

  // Upload the PDF into the converter's file input.
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "smoke.pdf", mimeType: "application/pdf", buffer: await samplePdf() });

  // Wait for the converter "ready" state, then click Download to open the paywall.
  const download = page.getByRole("button", { name: /download/i }).first();
  await download.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  await download.click().catch(() => {});

  // The paywall may show an auth step first. Only continue if the card row shows.
  const cardRow = page.getByRole("button", { name: CARD_ROW }).first();
  return cardRow.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
}

test("card form loads on open → collapse → reopen, every time", async ({ page }) => {
  const reached = await openPaywallCardStep(page);
  test.skip(!reached, "Card row behind auth on this target — run against a preview/local with a guest session.");

  const cardRow = page.getByRole("button", { name: CARD_ROW }).first();

  // Cycle it a few times — the old code stuck on the 2nd open.
  for (let i = 1; i <= 3; i++) {
    await cardRow.click();                                  // open
    await expect(cardIframe(page), `iframe missing on open #${i}`).toBeVisible({ timeout: 12_000 });
    // Skeleton must not persist once the iframe is up.
    await expect(page.getByText(SKELETON)).toHaveCount(0);
    await cardRow.click();                                  // collapse
    await expect(cardIframe(page)).toHaveCount(0, { timeout: 5_000 });
  }

  // Final open left ready to pay: iframe present and interactable (we do NOT submit
  // a real card — reaching a live, visible payment iframe is the payable state).
  await cardRow.click();
  const frame = cardIframe(page).first();
  await expect(frame).toBeVisible({ timeout: 12_000 });
  const box = await frame.boundingBox();
  expect(box && box.height, "payment iframe has no height").toBeTruthy();
  expect(box!.height).toBeGreaterThan(200);
});
