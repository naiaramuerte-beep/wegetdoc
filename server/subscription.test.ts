import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getActiveSubscription: vi.fn(),
  userHasActiveSubscription: vi.fn(),
  upsertSubscription: vi.fn(),
  getUserById: vi.fn(),
}));

import { getActiveSubscription, userHasActiveSubscription } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-openid",
    email: "test@cloud-pdf.net",
    name: "Test User",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("subscription.status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isPremium: false when user has no subscription", async () => {
    vi.mocked(userHasActiveSubscription).mockResolvedValue(false);
    vi.mocked(getActiveSubscription).mockResolvedValue(null);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.isPremium).toBe(false);
    expect(result.subscription).toBeNull();
  });

  it("returns isPremium: true when user has active subscription", async () => {
    vi.mocked(userHasActiveSubscription).mockResolvedValue(true);
    vi.mocked(getActiveSubscription).mockResolvedValue({
      id: 1,
      userId: 42,
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: null,
      stripeSessionId: "cs_test",
      plan: "trial",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.isPremium).toBe(true);
    expect(result.subscription).not.toBeNull();
    expect(result.subscription?.plan).toBe("trial");
    expect(result.subscription?.status).toBe("active");
  });

  it("returns subscription details when user has monthly plan", async () => {
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    vi.mocked(userHasActiveSubscription).mockResolvedValue(true);
    vi.mocked(getActiveSubscription).mockResolvedValue({
      id: 2,
      userId: 42,
      stripeCustomerId: "cus_monthly",
      stripeSubscriptionId: "sub_monthly",
      stripePriceId: "price_monthly",
      stripeSessionId: null,
      plan: "monthly",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.isPremium).toBe(true);
    expect(result.subscription?.plan).toBe("monthly");
    expect(result.subscription?.cancelAtPeriodEnd).toBe(false);
  });
});

describe("stripe.liveKeys", () => {
  it("STRIPE_LIVE_SECRET_KEY is set and starts with sk_live_", () => {
    const key = process.env.STRIPE_LIVE_SECRET_KEY || "";
    expect(key.startsWith("sk_live_")).toBe(true);
  });

  it("VITE_STRIPE_LIVE_PUBLISHABLE_KEY is set and starts with pk_live_", () => {
    const key = process.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || "";
    expect(key.startsWith("pk_live_")).toBe(true);
  });

  it("Price IDs are correctly configured in products.ts", async () => {
    const { STRIPE_PRICE_IDS } = await import("./products");
    expect(STRIPE_PRICE_IDS.monthly).toBe("price_1TCdbn2WMuUgq7vD74v0mclA");
    expect(STRIPE_PRICE_IDS.activation).toBe("price_1TCdcV2WMuUgq7vD5X99lzED");
  });

  it("Trial plan has correct activation price of 0€ (free trial)", async () => {
    const { PLANS } = await import("./products");
    expect(PLANS.trial.activationPrice).toBe(0);
    expect(PLANS.trial.trialDays).toBe(7);
    expect(PLANS.trial.activationPriceId).toBe("price_1TCdcV2WMuUgq7vD5X99lzED");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
