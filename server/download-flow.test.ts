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
