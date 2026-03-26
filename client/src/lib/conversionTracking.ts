/**
 * Centralized conversion tracking for Google Ads + GA4
 * All payment-related events go through here to ensure consistency.
 */

const GOOGLE_ADS_CONVERSION_ID = "AW-18038723667/IUjxCNKbjI8cENLLwJLD";
const CONVERSION_VALUE = 0.50;
const CONVERSION_CURRENCY = "EUR";

/**
 * Fire Google Ads conversion + GA4 purchase event after a successful payment.
 * Safe to call multiple times — deduplication is handled by Google via transaction_id.
 */
export function fireConversionEvents(transactionId: string) {
  if (typeof window.gtag !== "function") {
    console.warn("[ConversionTracking] gtag not available — events not fired");
    return;
  }

  // 1. Google Ads conversion event
  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_CONVERSION_ID,
    value: CONVERSION_VALUE,
    currency: CONVERSION_CURRENCY,
    transaction_id: transactionId,
  });
  console.log("[ConversionTracking] Google Ads conversion fired", { transactionId });

  // 2. GA4 purchase event (used for Analytics reports + can be marked as key event)
  window.gtag("event", "purchase", {
    transaction_id: transactionId,
    value: CONVERSION_VALUE,
    currency: CONVERSION_CURRENCY,
    items: [
      {
        item_id: "pdfup_trial",
        item_name: "PDFUp Trial Subscription",
        price: CONVERSION_VALUE,
        quantity: 1,
      },
    ],
  });
  console.log("[ConversionTracking] GA4 purchase event fired", { transactionId });
}

/**
 * Fire GA4 begin_checkout event when the paywall modal opens.
 * Useful for measuring the checkout funnel (how many start vs complete).
 */
export function fireBeginCheckout() {
  if (typeof window.gtag !== "function") return;

  window.gtag("event", "begin_checkout", {
    value: CONVERSION_VALUE,
    currency: CONVERSION_CURRENCY,
    items: [
      {
        item_id: "pdfup_trial",
        item_name: "PDFUp Trial Subscription",
        price: CONVERSION_VALUE,
        quantity: 1,
      },
    ],
  });
  console.log("[ConversionTracking] GA4 begin_checkout fired");
}
