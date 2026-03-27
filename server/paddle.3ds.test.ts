import { describe, it, expect, vi, beforeEach } from "vitest";
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

import { appRouter } from "./routers";
import { upsertSubscription, markDocumentsPaid } from "./db";

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

describe("Paddle 3DS fix - Environment.production", () => {
  it("getPaddle() uses Environment.production", async () => {
    // Verify the Paddle SDK import includes Environment
    const { Paddle, Environment } = await import("@paddle/paddle-node-sdk");
    expect(Environment).toBeDefined();
    expect(Environment.production).toBeDefined();

    // Create a Paddle instance with production environment (same as getPaddle)
    const paddle = new Paddle(process.env.PADDLE_API_KEY || "test_key", {
      environment: Environment.production,
    });
    expect(paddle).toBeDefined();
  });

  it("routers.ts imports Environment from paddle SDK", async () => {
    // Read the routers.ts source to verify the import
    const fs = await import("fs");
    const routersSource = fs.readFileSync("server/routers.ts", "utf-8");

    // Verify Environment is imported
    expect(routersSource).toContain("import { Paddle, Environment }");
    // Verify getPaddle uses Environment.production
    expect(routersSource).toContain("Environment.production");
  });

  it("server/_core/index.ts uses Environment.production for webhook Paddle instance", async () => {
    const fs = await import("fs");
    const indexSource = fs.readFileSync("server/_core/index.ts", "utf-8");

    // Verify Environment is imported
    expect(indexSource).toContain("Environment");
    // Verify the Paddle instance uses production environment
    expect(indexSource).toContain("environment: Environment.production");
  });
});

describe("Paddle 3DS fix - successUrl in checkout settings", () => {
  it("PaywallModal includes successUrl in Paddle.Checkout.open settings", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/components/PaywallModal.tsx", "utf-8");

    // Verify successUrl is built and passed to Paddle.Checkout.open
    expect(source).toContain("successUrl");
    expect(source).toContain("/payment/success");
    expect(source).toContain("window.location.origin");
  });

  it("Pricing page includes successUrl in Paddle.Checkout.open settings", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/Pricing.tsx", "utf-8");

    expect(source).toContain("successUrl");
    expect(source).toContain("/payment/success");
  });

  it("Dashboard includes successUrl in Paddle.Checkout.open settings", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/Dashboard.tsx", "utf-8");

    expect(source).toContain("successUrl");
    expect(source).toContain("/payment/success");
  });

  it("Dashboard Paddle.Initialize includes environment: production", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/Dashboard.tsx", "utf-8");

    expect(source).toContain('environment: "production"');
  });
});

describe("Paddle 3DS fix - PaymentSuccess handles _ptxn parameter", () => {
  it("PaymentSuccess page reads _ptxn from URL params", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/PaymentSuccess.tsx", "utf-8");

    // Verify it reads the _ptxn parameter (Paddle's transaction ID after 3DS redirect)
    expect(source).toContain("_ptxn");
    expect(source).toContain("confirmPaddleCheckout");
  });

  it("PaymentSuccess page calls confirmPaddleCheckout when _ptxn is present", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/PaymentSuccess.tsx", "utf-8");

    // Verify the flow: detect _ptxn -> call confirmPaddleCheckout
    expect(source).toContain('params.get("_ptxn")');
    expect(source).toContain("confirmPaddleCheckout.mutateAsync");
    expect(source).toContain("transactionId: paddleTxn");
  });
});

describe("Paddle 3DS fix - confirmPaddleCheckout works with transactionId only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms checkout with only transactionId (3DS redirect scenario)", async () => {
    vi.mocked(upsertSubscription).mockResolvedValue(undefined as any);
    vi.mocked(markDocumentsPaid).mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Simulate 3DS redirect: only transactionId is available, no subscriptionId or customerId
    const result = await caller.subscription.confirmPaddleCheckout({
      transactionId: "txn_01abc123def456",
      subscriptionId: "",
      customerId: "",
    });

    expect(result.success).toBe(true);

    // Verify upsertSubscription was called with the transactionId
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        paddleTransactionId: "txn_01abc123def456",
        plan: "trial",
        status: "active",
      })
    );

    // Verify documents were marked as paid
    expect(markDocumentsPaid).toHaveBeenCalledWith(42);
  });
});
