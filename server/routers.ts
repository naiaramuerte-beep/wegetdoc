import Stripe from "stripe";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  getActiveSubscription,
  userHasActiveSubscription,
  upsertSubscription,
  cancelSubscriptionDb,
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByGoogleId,
  getUserByResetToken,
  createOwnUser,
  updateUserPassword,
  setResetToken,
  clearResetToken,
  deactivateUser,
  deleteUserById,
  updateUserProfile,
  getDocumentsByUserId,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentById,
  getFoldersByUserId,
  createFolder,
  deleteFolder,
  getTeamInvitations,
  createTeamInvitation,
  removeTeamInvitation,
  getLegalPage,
  getAllLegalPages,
  upsertLegalPage,
  getSiteSetting,
  setSiteSetting,
  getAllSiteSettings,
  createContactMessage,
  getAllContactMessages,
  markContactMessageRead,
  getAdminStats,
  getAllSubscribedUsers,
  getBillingStats,
  getCanceledSubscriptions,
  getBlogPosts,
  getBlogPost,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "./db";
import { storagePut } from "./storage";

const getStripe = (testMode = false) =>
  new Stripe(
    testMode
      ? (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "")
      : (process.env.STRIPE_SECRET_KEY || ""),
    { apiVersion: "2026-02-25.clover" }
  );

async function isStripeTestMode(): Promise<boolean> {
  const setting = await getSiteSetting("stripe_test_mode");
  return setting === "true";
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Own auth: register with email+password
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1).max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Este email ya está registrado" });
        const passwordHash = await bcrypt.hash(input.password, 12);
        // Auto-promote sergisd39@gmail.com as admin
        const role = input.email === "sergisd39@gmail.com" ? "admin" : "user";
        const user = await createOwnUser({
          email: input.email,
          name: input.name ?? input.email.split("@")[0],
          passwordHash,
          loginMethod: "email",
          role,
        });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al crear usuario" });
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
      }),

    // Own auth: login with email+password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email o contraseña incorrectos" });
        if (!user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Esta cuenta usa Google. Inicia sesión con Google." });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email o contraseña incorrectos" });
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
      }),

    // Own auth: forgot password — generate reset token
    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // Always return success to avoid email enumeration
        if (!user) return { success: true };
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await setResetToken(user.id, token, expiry);
        // In production: send email with reset link. For now, return token in dev.
        console.log(`[Auth] Reset token for ${input.email}: ${token}`);
        return { success: true };
      }),

    // Own auth: reset password with token
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), password: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const user = await getUserByResetToken(input.token);
        if (!user) throw new TRPCError({ code: "BAD_REQUEST", message: "Token inválido o expirado" });
        if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El enlace ha expirado" });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        await updateUserPassword(user.id, passwordHash);
        await clearResetToken(user.id);
        return { success: true };
      }),

    // Admin: set/change own password (for sergisd39@gmail.com first login)
    setPassword: protectedProcedure
      .input(z.object({ password: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        const passwordHash = await bcrypt.hash(input.password, 12);
        await updateUserPassword(ctx.user.id, passwordHash);
        return { success: true };
      }),
  }),

  // ─── User Profile ──────────────────────────────────────────────
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const sub = await getActiveSubscription(ctx.user.id);
      return {
        ...user,
        subscription: sub
          ? {
              plan: sub.plan,
              status: sub.status,
              currentPeriodEnd: sub.currentPeriodEnd,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            }
          : null,
      };
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128).optional(),
          email: z.string().email().optional(),
          phone: z.string().max(32).optional(),
          language: z.string().max(16).optional(),
          timezone: z.string().max(64).optional(),
          country: z.string().max(64).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteUserById(ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // ─── Subscriptions ─────────────────────────────────────────────
  subscription: router({
    status: publicProcedure.query(async ({ ctx }) => {
      // Public procedure: returns isPremium:false for unauthenticated users
      // This prevents triggering the global auth redirect when loading the editor
      if (!ctx.user) {
        return { isPremium: false, subscription: null };
      }
      const isPremium = await userHasActiveSubscription(ctx.user.id);
      const sub = await getActiveSubscription(ctx.user.id);
      return {
        isPremium,
        subscription: sub
          ? {
              plan: sub.plan,
              status: sub.status,
              currentPeriodEnd: sub.currentPeriodEnd,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            }
          : null,
      };
    }),

    createCheckout: protectedProcedure
      .input(
        z.object({
          plan: z.enum(["trial", "monthly"]),
          origin: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const testMode = await isStripeTestMode();
        const stripe = getStripe(testMode);
        const { plan, origin } = input;
        const user = ctx.user;

        // Price IDs from Stripe Dashboard (live):
        // Monthly 49,90€/mes: price_1TCdbn2WMuUgq7vD74v0mclA
        // One-time 0,50€: price_1TCdcV2WMuUgq7vD5X99lzED
        const MONTHLY_PRICE_ID = "price_1TCdbn2WMuUgq7vD74v0mclA";

        // Use real Price ID instead of price_data to avoid creating duplicate prices
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
          { price: MONTHLY_PRICE_ID, quantity: 1 },
        ];

        const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
          plan === "trial"
            ? {
                trial_period_days: 7,
                trial_settings: {
                  end_behavior: { missing_payment_method: "cancel" },
                },
                metadata: {
                  user_id: user.id.toString(),
                  plan,
                },
              }
            : {
                metadata: {
                  user_id: user.id.toString(),
                  plan,
                },
              };

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: lineItems,
          subscription_data: subscriptionData,
          customer_email: user.email || undefined,
          allow_promotion_codes: true,
          client_reference_id: user.id.toString(),
          metadata: {
            user_id: user.id.toString(),
            plan,
            customer_email: user.email || "",
            customer_name: user.name || "",
          },
          success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/precios`,
        });

        return { url: session.url };
      }),

    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const testMode = await isStripeTestMode();
      const stripe = getStripe(testMode);
      const sub = await getActiveSubscription(ctx.user.id);
      if (!sub?.stripeSubscriptionId) {
        await cancelSubscriptionDb(ctx.user.id);
        return { success: true };
      }
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      await upsertSubscription({
        userId: ctx.user.id,
        stripeCustomerId: sub.stripeCustomerId ?? undefined,
        stripeSubscriptionId: sub.stripeSubscriptionId ?? undefined,
        stripePriceId: sub.stripePriceId ?? undefined,
        stripeSessionId: sub.stripeSessionId ?? undefined,
        plan: sub.plan ?? "monthly",
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart ?? undefined,
        currentPeriodEnd: sub.currentPeriodEnd ?? undefined,
        cancelAtPeriodEnd: true,
      });
      return { success: true };
    }),

    // ── Stripe Elements: create SetupIntent for inline card form ──────────────
    createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
      const testMode = await isStripeTestMode();
      const stripe = getStripe(testMode);
      const user = ctx.user;

      // Find or create Stripe customer
      let customerId: string | undefined;
      const existingSub = await getActiveSubscription(user.id);
      if (existingSub?.stripeCustomerId) {
        customerId = existingSub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.name || undefined,
          metadata: { user_id: user.id.toString() },
        });
        customerId = customer.id;
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: { user_id: user.id.toString() },
      });

      return {
        clientSecret: setupIntent.client_secret!,
        customerId,
      };
    }),

    // ── Stripe Elements: confirm subscription after card setup ──────────────
    confirmSubscription: protectedProcedure
      .input(z.object({
        paymentMethodId: z.string(),
        customerId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const testMode = await isStripeTestMode();
        const stripe = getStripe(testMode);
        const user = ctx.user;

        // 1. Attach payment method to customer
        await stripe.paymentMethods.attach(input.paymentMethodId, {
          customer: input.customerId,
        });

        // 2. Set as default payment method
        await stripe.customers.update(input.customerId, {
          invoice_settings: { default_payment_method: input.paymentMethodId },
        });

        // 3. Charge 0,50€ immediately (trial fee) using the real Price ID
        const trialPayment = await stripe.paymentIntents.create({
          amount: 50, // 0,50€ in cents
          currency: "eur",
          customer: input.customerId,
          payment_method: input.paymentMethodId,
          confirm: true,
          off_session: true,
          description: "editPDF — Acceso 7 días (0,50€)",
          metadata: {
            user_id: user.id.toString(),
            type: "trial_fee",
          },
        });

        if (trialPayment.status !== "succeeded") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El pago de 0,50€ no se pudo procesar. Por favor, revisa los datos de tu tarjeta.",
          });
        }

        // 4. Create subscription with real Price ID (49,90€/month) and 7-day trial
        // Price IDs from Stripe Dashboard:
        // Monthly 49,90€: price_1TCdbn2WMuUgq7vD74v0mclA
        // One-time 0,50€: price_1TCdcV2WMuUgq7vD5X99lzED
        const MONTHLY_PRICE_ID = "price_1TCdbn2WMuUgq7vD74v0mclA";

        const trialEndTimestamp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

        const subscription = await stripe.subscriptions.create({
          customer: input.customerId,
          items: [{ price: MONTHLY_PRICE_ID }],
          trial_end: trialEndTimestamp,
          default_payment_method: input.paymentMethodId,
          metadata: {
            user_id: user.id.toString(),
            plan: "trial",
          },
        });

        const now = new Date();
        const trialEnd = new Date(trialEndTimestamp * 1000);

        await upsertSubscription({
          userId: user.id,
          stripeCustomerId: input.customerId,
          stripeSubscriptionId: subscription.id,
          plan: "trial",
          status: "trialing",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          cancelAtPeriodEnd: false,
        });

        return { success: true, subscriptionId: subscription.id };
      }),

    verifySession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const testMode = await isStripeTestMode();
        const stripe = getStripe(testMode);
        try {
          const session = await stripe.checkout.sessions.retrieve(input.sessionId);
          if (session.payment_status === "paid" || session.status === "complete") {
            const plan = (session.metadata?.plan as "trial" | "monthly") ?? "trial";
            const now = new Date();
            const periodEnd = plan === "trial"
              ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
              : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            await upsertSubscription({
              userId: ctx.user.id,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
              stripeSessionId: session.id,
              plan,
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            });
            return { success: true, plan };
          }
          return { success: false };
        } catch {
          return { success: false };
        }
      }),
  }),

  // ─── Documents ─────────────────────────────────────────────────
  documents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getDocumentsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getDocumentById(input.id, ctx.user.id);
      }),

    upload: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          base64: z.string(),
          size: z.number(),
          folderId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `docs/${ctx.user.id}/${Date.now()}-${input.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url } = await storagePut(key, buffer, "application/pdf");
        const doc = await createDocument({
          userId: ctx.user.id,
          name: input.name,
          fileKey: key,
          fileUrl: url,
          fileSize: input.size,
          folderId: input.folderId,
        });
        return doc;
      }),

    rename: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await updateDocument(input.id, ctx.user.id, { name: input.name });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteDocument(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Folders ───────────────────────────────────────────────────
  folders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getFoldersByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(256) }))
      .mutation(async ({ ctx, input }) => {
        return createFolder(ctx.user.id, input.name);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFolder(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Team ──────────────────────────────────────────────────────
  team: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getTeamInvitations(ctx.user.id);
    }),

    invite: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          role: z.enum(["editor", "viewer", "admin"]).default("editor"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createTeamInvitation({
          ownerId: ctx.user.id,
          inviteeEmail: input.email,
          role: input.role,
        });
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeTeamInvitation(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Contact ───────────────────────────────────────────────────
  contact: router({
    send: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          email: z.string().email(),
          reason: z.string().max(128).optional(),
          subject: z.string().min(1).max(256),
          message: z.string().min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createContactMessage({
          userId: ctx.user?.id,
          name: input.name,
          email: input.email,
          reason: input.reason ?? "",
          subject: input.subject,
          message: input.message,
        });
        return { success: true };
      }),
  }),

  // ─── Legal Pages ───────────────────────────────────────────────
  legal: router({
    get: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getLegalPage(input.slug);
      }),

    list: publicProcedure.query(async () => {
      return getAllLegalPages();
    }),
  }),

  // ─── Admin ─────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return getAdminStats();
    }),

    users: adminProcedure
      .input(z.object({ search: z.string().optional() }))
      .query(async ({ input }) => {
        return getAllUsers(input.search);
      }),

    subscribedUsers: adminProcedure.query(async () => {
      return getAllSubscribedUsers();
    }),

    deactivateUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await deactivateUser(input.userId);
        return { success: true };
      }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteUserById(input.userId);
        return { success: true };
      }),

    contactMessages: adminProcedure.query(async () => {
      return getAllContactMessages();
    }),

    markMessageRead: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markContactMessageRead(input.id);
        return { success: true };
      }),

    legalPages: adminProcedure.query(async () => {
      return getAllLegalPages();
    }),

    saveLegalPage: adminProcedure
      .input(
        z.object({
          slug: z.string(),
          title: z.string().min(1),
          content: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await upsertLegalPage(input.slug, input.title, input.content);
        return { success: true };
      }),

    settings: adminProcedure.query(async () => {
      return getAllSiteSettings();
    }),

    saveSetting: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await setSiteSetting(input.key, input.value);
        return { success: true };
      }),

    billingStats: adminProcedure.query(async () => {
      return getBillingStats();
    }),

    canceledSubscriptions: adminProcedure.query(async () => {
      return getCanceledSubscriptions();
    }),

     promoteUser: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        const db = await import("./db").then(m => m.getDb());
        if (!db) return { success: false };
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    // ─── Blog Admin ───────────────────────────────────────────
    blogPosts: adminProcedure.query(async () => {
      return getBlogPosts(false); // all posts including drafts
    }),
    createBlogPost: adminProcedure
      .input(z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        excerpt: z.string().min(1),
        content: z.string().min(1),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        category: z.string().default("guides"),
        tags: z.string().optional(),
        readTime: z.number().default(5),
        published: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        return createBlogPost(input);
      }),
    updateBlogPost: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        title: z.string().optional(),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
        readTime: z.number().optional(),
        published: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateBlogPost(id, data);
      }),
    deleteBlogPost: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBlogPost(input.id);
        return { success: true };
      }),
    getBlogPost: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getBlogPostById(input.id);
      }),
    uploadBlogImage: adminProcedure
      .input(z.object({ base64: z.string(), filename: z.string() }))
      .mutation(async ({ input }) => {
        const matches = input.base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid base64" });
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const ext = input.filename.split(".").pop() ?? "jpg";
        const key = `blog-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buffer, contentType);
        return { url };
      }),

    // ─── Stripe Test Mode ─────────────────────────────────────
    getStripeTestMode: adminProcedure.query(async () => {
      const setting = await getSiteSetting("stripe_test_mode");
      return { testMode: setting === "true" };
    }),

    setStripeTestMode: adminProcedure
      .input(z.object({ testMode: z.boolean() }))
      .mutation(async ({ input }) => {
        await setSiteSetting("stripe_test_mode", input.testMode ? "true" : "false");
        return { success: true, testMode: input.testMode };
      }),
  }),

  // ─── Public Blog ───────────────────────────────────────────
  blog: router({
    list: publicProcedure.query(async () => {
      return getBlogPosts(true);
    }),
    post: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const post = await getBlogPost(input.slug);
        if (!post || !post.published) throw new TRPCError({ code: "NOT_FOUND" });
        return post;
      }),
  }),
});
export type AppRouter = typeof appRouter;
