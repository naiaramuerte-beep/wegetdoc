import Stripe from "stripe";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getActiveSubscription,
  userHasActiveSubscription,
  upsertSubscription,
  cancelSubscriptionDb,
  getAllUsers,
  getUserById,
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
} from "./db";
import { storagePut } from "./storage";

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2026-02-25.clover",
  });

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
    status: protectedProcedure.query(async ({ ctx }) => {
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
        const stripe = getStripe();
        const { plan, origin } = input;
        const user = ctx.user;

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
          plan === "trial"
            ? [
                {
                  price_data: {
                    currency: "eur",
                    product_data: {
                      name: "PDFPro — Prueba 7 días",
                      description: "Acceso completo a todas las herramientas PDF durante 7 días",
                    },
                    unit_amount: 99,
                  },
                  quantity: 1,
                },
              ]
            : [
                {
                  price_data: {
                    currency: "eur",
                    product_data: {
                      name: "PDFPro — Plan Mensual",
                      description: "Acceso ilimitado a todas las herramientas PDF",
                    },
                    unit_amount: 999,
                    recurring: { interval: "month" },
                  },
                  quantity: 1,
                },
              ];

        const mode: Stripe.Checkout.SessionCreateParams.Mode =
          plan === "monthly" ? "subscription" : "payment";

        const session = await stripe.checkout.sessions.create({
          mode,
          line_items: lineItems,
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
      const stripe = getStripe();
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

    verifySession: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const stripe = getStripe();
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
  }),
});

export type AppRouter = typeof appRouter;
