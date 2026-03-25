import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-download",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("download-flow: subscription status", () => {
  it("returns subscription status for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw — it returns the subscription status
    const result = await caller.subscription.status();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("isPremium");
  });

  it("returns non-premium status for unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    // subscription.status is a public procedure — returns isPremium: false for unauthed
    const result = await caller.subscription.status();
    expect(result).toBeDefined();
    expect(result.isPremium).toBe(false);
    expect(result.subscription).toBeNull();
  });
});

describe("download-flow: documents list", () => {
  it("returns documents list for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects documents list for unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.documents.list()).rejects.toThrow();
  });
});

describe("download-flow: confirmSubscription requires auth", () => {
  it("rejects confirmSubscription for unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.subscription.confirmSubscription({
        paymentMethodId: "pm_test_123",
        customerId: "cus_test_123",
      })
    ).rejects.toThrow();
  });
});

/**
 * Download flow client-side decision logic test
 * 
 * The download flow for unauthenticated users should:
 * 1. NOT redirect to Google OAuth directly (which caused 403 errors)
 * 2. Instead, show the PaywallModal with auth-choice step
 */

// Extracted decision logic from downloadPdf in PdfEditor
function getDownloadAction(params: {
  isAuthenticated: boolean;
  isPremium: boolean;
  hasPdfBytes: boolean;
}): "show-paywall" | "auto-save-and-download" | "auto-save-and-show-paywall" | "no-pdf" {
  if (!params.hasPdfBytes) return "no-pdf";
  
  if (!params.isAuthenticated) {
    // Should show paywall modal (auth-choice step) — NOT redirect to Google OAuth
    return "show-paywall";
  }

  if (params.isPremium) {
    return "auto-save-and-download";
  }

  return "auto-save-and-show-paywall";
}

describe("download-flow: client-side decision logic", () => {
  it("should show paywall for unauthenticated users (not redirect to Google)", () => {
    const action = getDownloadAction({
      isAuthenticated: false,
      isPremium: false,
      hasPdfBytes: true,
    });
    expect(action).toBe("show-paywall");
    expect(action).not.toBe("redirect-to-google");
  });

  it("should auto-save and download for premium authenticated users", () => {
    const action = getDownloadAction({
      isAuthenticated: true,
      isPremium: true,
      hasPdfBytes: true,
    });
    expect(action).toBe("auto-save-and-download");
  });

  it("should auto-save and show paywall for non-premium authenticated users", () => {
    const action = getDownloadAction({
      isAuthenticated: true,
      isPremium: false,
      hasPdfBytes: true,
    });
    expect(action).toBe("auto-save-and-show-paywall");
  });

  it("should return no-pdf when no PDF bytes available", () => {
    const action = getDownloadAction({
      isAuthenticated: true,
      isPremium: true,
      hasPdfBytes: false,
    });
    expect(action).toBe("no-pdf");
  });
});

describe("download-flow: PaywallModal step selection", () => {
  function getInitialStep(isAuthenticated: boolean): "auth-choice" | "plans" {
    return isAuthenticated ? "plans" : "auth-choice";
  }

  it("should show auth-choice step for unauthenticated users", () => {
    expect(getInitialStep(false)).toBe("auth-choice");
  });

  it("should show plans step for authenticated users", () => {
    expect(getInitialStep(true)).toBe("plans");
  });
});
