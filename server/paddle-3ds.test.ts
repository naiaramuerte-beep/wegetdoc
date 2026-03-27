import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Tests to verify that Paddle SDK is configured with environment: "production"
 * and that successUrl is set in all Checkout.open calls for 3DS redirect handling.
 */

const projectRoot = join(import.meta.dirname, "..");

// Helper to read a file relative to project root
function readProjectFile(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), "utf-8");
}

describe("Paddle 3DS / Production Environment Configuration", () => {
  describe("Frontend: environment: production in P.Initialize()", () => {
    it("PaywallModal.tsx should have environment: production", () => {
      const content = readProjectFile("client/src/components/PaywallModal.tsx");
      expect(content).toContain('environment: "production"');
    });

    it("Pricing.tsx should have environment: production", () => {
      const content = readProjectFile("client/src/pages/Pricing.tsx");
      expect(content).toContain('environment: "production"');
    });

    it("Dashboard.tsx should have environment: production", () => {
      const content = readProjectFile("client/src/pages/Dashboard.tsx");
      expect(content).toContain('environment: "production"');
    });
  });

  describe("Server: Environment.production in Paddle SDK", () => {
    it("server/routers.ts should use Environment.production", () => {
      const content = readProjectFile("server/routers.ts");
      expect(content).toContain("Environment.production");
      expect(content).toContain("environment: Environment.production");
    });

    it("server/_core/index.ts should use Environment.production", () => {
      const content = readProjectFile("server/_core/index.ts");
      expect(content).toContain("Environment.production");
      expect(content).toContain("environment: Environment.production");
    });
  });

  describe("Frontend: NO successUrl in inline Checkout.open() (breaks inline mode)", () => {
    it("PaywallModal.tsx should NOT have successUrl in Checkout.open settings", () => {
      const content = readProjectFile("client/src/components/PaywallModal.tsx");
      expect(content).not.toContain("successUrl");
    });

    it("Pricing.tsx should NOT have successUrl in Checkout.open settings", () => {
      const content = readProjectFile("client/src/pages/Pricing.tsx");
      expect(content).not.toContain("successUrl");
    });

    it("Dashboard.tsx should NOT have successUrl in Checkout.open settings", () => {
      const content = readProjectFile("client/src/pages/Dashboard.tsx");
      expect(content).not.toContain("successUrl");
    });
  });

  describe("Frontend: eventCallback handles checkout.completed for inline mode", () => {
    it("PaywallModal.tsx should use eventCallback with checkout.completed", () => {
      const content = readProjectFile("client/src/components/PaywallModal.tsx");
      expect(content).toContain("checkout.completed");
      expect(content).toContain("eventCallback");
    });

    it("Pricing.tsx should use eventCallback with checkout.completed", () => {
      const content = readProjectFile("client/src/pages/Pricing.tsx");
      expect(content).toContain("checkout.completed");
      expect(content).toContain("eventCallback");
    });

    it("Dashboard.tsx should use eventCallback with checkout.completed", () => {
      const content = readProjectFile("client/src/pages/Dashboard.tsx");
      expect(content).toContain("checkout.completed");
      expect(content).toContain("eventCallback");
    });
  });

  describe("PaymentSuccess page handles _ptxn parameter", () => {
    it("PaymentSuccess.tsx should read _ptxn from URL params", () => {
      const content = readProjectFile("client/src/pages/PaymentSuccess.tsx");
      expect(content).toContain("_ptxn");
      expect(content).toContain("confirmPaddleCheckout");
    });

    it("PaymentSuccess.tsx should redirect to dashboard documents", () => {
      const content = readProjectFile("client/src/pages/PaymentSuccess.tsx");
      expect(content).toContain("dashboard?tab=documents");
    });
  });
});
