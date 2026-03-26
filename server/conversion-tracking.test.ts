import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const CONVERSION_SEND_TO = "AW-18038723667/IUjxCNKbjI8cENLLwJLD";
const GOOGLE_ADS_ID = "AW-18038723667";
const GOOGLE_ANALYTICS_ID = "G-XBHZ3TMG7K";

describe("Google Ads Conversion Tracking", () => {
  it("index.html contains Google Ads gtag config", () => {
    const html = readFileSync(
      join(__dirname, "../client/index.html"),
      "utf-8"
    );
    expect(html).toContain(`gtag('config', '${GOOGLE_ADS_ID}')`);
    expect(html).toContain(`gtag('config', '${GOOGLE_ANALYTICS_ID}')`);
    expect(html).toContain("googletagmanager.com/gtag/js");
  });

  it("index.html does NOT contain old Google Ads/Analytics IDs", () => {
    const html = readFileSync(
      join(__dirname, "../client/index.html"),
      "utf-8"
    );
    expect(html).not.toContain("AW-18034146775");
    expect(html).not.toContain("AW-18038662610");
    expect(html).not.toContain("G-S9PBPV95TL");
    expect(html).not.toContain("G-LKD51NK94C");
  });

  it("index.html has consent mode with ad_storage granted by default", () => {
    const html = readFileSync(
      join(__dirname, "../client/index.html"),
      "utf-8"
    );
    expect(html).toContain("gtag('consent', 'default'");
    expect(html).toContain("'ad_storage': 'granted'");
    expect(html).toContain("'ad_user_data': 'granted'");
    expect(html).toContain("'analytics_storage': 'granted'");
    expect(html).not.toContain("'ad_storage': 'denied'");
    expect(html).not.toContain("'ad_user_data': 'denied'");
  });

  // ── Centralized helper tests ──
  it("conversionTracking.ts helper contains correct Google Ads conversion config", () => {
    const src = readFileSync(
      join(__dirname, "../client/src/lib/conversionTracking.ts"),
      "utf-8"
    );
    expect(src).toContain(`"${CONVERSION_SEND_TO}"`);
    expect(src).toContain("CONVERSION_VALUE = 0.50");
    expect(src).toContain('CONVERSION_CURRENCY = "EUR"');
    expect(src).toContain('window.gtag("event", "conversion"');
    expect(src).toContain('window.gtag("event", "purchase"');
    expect(src).toContain("item_id: \"pdfup_trial\"");
    expect(src).toContain("fireBeginCheckout");
    expect(src).toContain('window.gtag("event", "begin_checkout"');
  });

  it("conversionTracking.ts exports fireConversionEvents and fireBeginCheckout", () => {
    const src = readFileSync(
      join(__dirname, "../client/src/lib/conversionTracking.ts"),
      "utf-8"
    );
    expect(src).toContain("export function fireConversionEvents");
    expect(src).toContain("export function fireBeginCheckout");
  });

  // ── All payment flows use the centralized helper ──
  it("PaywallModal.tsx uses centralized fireConversionEvents", () => {
    const src = readFileSync(
      join(__dirname, "../client/src/components/PaywallModal.tsx"),
      "utf-8"
    );
    expect(src).toContain("fireConversionEvents(");
    expect(src).toContain("fireBeginCheckout");
    expect(src).toContain('from "@/lib/conversionTracking"');
  });

  it("PaymentSuccess.tsx uses centralized fireConversionEvents", () => {
    const src = readFileSync(
      join(__dirname, "../client/src/pages/PaymentSuccess.tsx"),
      "utf-8"
    );
    expect(src).toContain("fireConversionEvents(");
    expect(src).toContain('from "@/lib/conversionTracking"');
    expect(src).toContain('params.get("txn")');
  });

  it("Dashboard.tsx uses centralized fireConversionEvents", () => {
    const src = readFileSync(
      join(__dirname, "../client/src/pages/Dashboard.tsx"),
      "utf-8"
    );
    expect(src).toContain("fireConversionEvents(");
    expect(src).toContain('from "@/lib/conversionTracking"');
  });

  it("Pricing.tsx uses centralized fireConversionEvents", () => {
    const src = readFileSync(
      join(__dirname, "../client/src/pages/Pricing.tsx"),
      "utf-8"
    );
    expect(src).toContain("fireConversionEvents(");
    expect(src).toContain('from "@/lib/conversionTracking"');
  });

  it("gtag type declaration exists for TypeScript", () => {
    const dts = readFileSync(
      join(__dirname, "../client/src/types/gtag.d.ts"),
      "utf-8"
    );
    expect(dts).toContain("gtag");
    expect(dts).toContain("Window");
  });

  it("CookieBanner keeps ad_storage granted even when user rejects", () => {
    const src = readFileSync(
      join(__dirname, "../client/src/components/CookieBanner.tsx"),
      "utf-8"
    );
    expect(src).toContain('ad_storage: "granted"');
    expect(src).toContain('ad_user_data: "granted"');
  });
});
