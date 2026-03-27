import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock ALL modules that routers.ts imports to avoid side effects
vi.mock("./db", () => ({
  getActiveSubscription: vi.fn(),
  userHasActiveSubscription: vi.fn(),
  upsertSubscription: vi.fn(),
  cancelSubscriptionDb: vi.fn(),
  markDocumentsPaid: vi.fn(),
  getAllUsers: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByGoogleId: vi.fn(),
  getUserByResetToken: vi.fn(),
  createOwnUser: vi.fn(),
  updateUserPassword: vi.fn(),
  setResetToken: vi.fn(),
  clearResetToken: vi.fn(),
  deactivateUser: vi.fn(),
  deleteUserById: vi.fn(),
  updateUserProfile: vi.fn(),
  getDocumentsByUserId: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentById: vi.fn(),
  getFoldersByUserId: vi.fn(),
  createFolder: vi.fn(),
  deleteFolder: vi.fn(),
  getTeamInvitations: vi.fn(),
  createTeamInvitation: vi.fn(),
  removeTeamInvitation: vi.fn(),
  getLegalPage: vi.fn(),
  getAllLegalPages: vi.fn(),
  upsertLegalPage: vi.fn(),
  getSiteSetting: vi.fn(),
  setSiteSetting: vi.fn(),
  getAllSiteSettings: vi.fn(),
  createContactMessage: vi.fn(),
  getAllContactMessages: vi.fn(),
  markContactMessageRead: vi.fn(),
  getAdminStats: vi.fn(),
  getAllSubscribedUsers: vi.fn(),
  getBillingStats: vi.fn(),
  getCanceledSubscriptions: vi.fn(),
  getBlogPosts: vi.fn(),
  getBlogPost: vi.fn(),
  getBlogPostById: vi.fn(),
  createBlogPost: vi.fn(),
  updateBlogPost: vi.fn(),
  deleteBlogPost: vi.fn(),
}));

vi.mock("./email", () => ({
  sendPaymentConfirmationEmail: vi.fn(() => Promise.resolve(true)),
  sendCancellationEmail: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
  storageGet: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

// Now import after mocks
import { appRouter } from "./routers";
import {
  getActiveSubscription,
  userHasActiveSubscription,
  upsertSubscription,
  cancelSubscriptionDb,
  markDocumentsPaid,
} from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-42",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://pdfup.io" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("subscription.paddleConfig", () => {
  it("returns client token and price ID from env", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.paddleConfig();

    expect(result).toHaveProperty("clientToken");
    expect(result).toHaveProperty("priceId");
    expect(typeof result.clientToken).toBe("string");
    expect(typeof result.priceId).toBe("string");
  });
});

describe("subscription.status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isPremium:false for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result).toEqual({ isPremium: false, subscription: null });
  });

  it("returns subscription data for authenticated users", async () => {
    vi.mocked(userHasActiveSubscription).mockResolvedValue(true);
    vi.mocked(getActiveSubscription).mockResolvedValue({
      id: 1,
      userId: 42,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeSessionId: null,
      paddleCustomerId: "ctm_123",
      paddleSubscriptionId: "sub_123",
      paddleTransactionId: "txn_123",
      plan: "trial",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date("2026-04-02"),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.isPremium).toBe(true);
    expect(result.subscription).toBeTruthy();
    expect(result.subscription?.plan).toBe("trial");
    expect(result.subscription?.status).toBe("active");
  });

  it("returns isPremium:false for users without subscription", async () => {
    vi.mocked(userHasActiveSubscription).mockResolvedValue(false);
    vi.mocked(getActiveSubscription).mockResolvedValue(null);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.status();

    expect(result.isPremium).toBe(false);
    expect(result.subscription).toBeNull();
  });
});

describe("subscription.confirmPaddleCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates subscription record and marks documents as paid", async () => {
    vi.mocked(upsertSubscription).mockResolvedValue(undefined as any);
    vi.mocked(markDocumentsPaid).mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.confirmPaddleCheckout({
      transactionId: "txn_test_123",
      subscriptionId: "sub_test_456",
      customerId: "ctm_test_789",
    });

    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe("sub_test_456");

    // Verify upsertSubscription was called with correct params
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        paddleCustomerId: "ctm_test_789",
        paddleSubscriptionId: "sub_test_456",
        paddleTransactionId: "txn_test_123",
        plan: "trial",
        status: "active",
        cancelAtPeriodEnd: false,
      })
    );

    // Verify documents were marked as paid
    expect(markDocumentsPaid).toHaveBeenCalledWith(42);
  });

  it("works with empty optional fields", async () => {
    vi.mocked(upsertSubscription).mockResolvedValue(undefined as any);
    vi.mocked(markDocumentsPaid).mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.confirmPaddleCheckout({});

    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe("");
  });
});

describe("subscription.cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels subscription in DB when no Paddle subscription ID", async () => {
    vi.mocked(getActiveSubscription).mockResolvedValue({
      id: 1,
      userId: 42,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeSessionId: null,
      paddleCustomerId: null,
      paddleSubscriptionId: null,
      paddleTransactionId: null,
      plan: "trial",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(cancelSubscriptionDb).mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.cancel();

    expect(result.success).toBe(true);
    expect(cancelSubscriptionDb).toHaveBeenCalledWith(42);
  });

  it("calls Paddle API and updates DB when subscription has Paddle ID", async () => {
    const periodEnd = new Date("2026-04-20");
    vi.mocked(getActiveSubscription).mockResolvedValue({
      id: 1,
      userId: 42,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeSessionId: null,
      paddleCustomerId: "ctm_paddle_456",
      paddleSubscriptionId: "sub_paddle_123",
      paddleTransactionId: "txn_paddle_789",
      plan: "trial",
      status: "active",
      currentPeriodStart: new Date("2026-03-20"),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(upsertSubscription).mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // The Paddle API call will fail in test env, but the DB update should still happen
    const result = await caller.subscription.cancel();

    expect(result.success).toBe(true);
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        cancelAtPeriodEnd: true,
      })
    );
  });
});
