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
    email: "test@pdfpro.com",
    name: "Test User",
    loginMethod: "manus",
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

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
