import Stripe from "stripe";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getActiveSubscription,
  userHasActiveSubscription,
  upsertSubscription,
} from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  subscription: router({
    /** Check if the current user has an active subscription */
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

    /** Create a Stripe Checkout session for a plan */
    createCheckout: protectedProcedure
      .input(
        z.object({
          plan: z.enum(["trial", "monthly"]),
          origin: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
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

    /** Cancel the current subscription */
    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const sub = await getActiveSubscription(ctx.user.id);
      if (!sub?.stripeSubscriptionId) {
        return { success: false, message: "No hay suscripción activa" };
      }
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      await upsertSubscription({
        ...sub,
        cancelAtPeriodEnd: true,
      });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
