import { test, expect } from "@playwright/test";

/**
 * The failed-payment landing page. Unlike the FastPay iframe cycle, this route is
 * PUBLIC (no auth), so it runs against any target — including production once the
 * branch is deployed. Against a target that predates this branch it 404s (route
 * not present yet); run it against the preview/local build:
 *     E2E_BASE_URL=http://localhost:8080 pnpm test:e2e payment-retry
 */
test("failed-payment page explains what happened and offers retry + home", async ({ page }) => {
  await page.goto("/en/payment/retry?reason=confirm_failed");

  // Clear explanation (not a blank home) + card-not-charged reassurance.
  await expect(page.getByText(/payment didn.t go through/i)).toBeVisible();
  await expect(page.getByText(/card was not charged/i)).toBeVisible();
  await expect(page.getByText(/document is still saved/i)).toBeVisible();

  // Both actions present.
  await expect(page.getByRole("button", { name: /try the payment again/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible();
});

test("bank-verification reason shows the bank-specific copy", async ({ page }) => {
  await page.goto("/en/payment/retry?reason=ko");
  await expect(page.getByText(/verification with your bank wasn.t completed/i)).toBeVisible();
});
