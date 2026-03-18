import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import Stripe from "stripe";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getUserById, upsertSubscription } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Stripe Webhook (MUST be before express.json) ─────────────
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2026-02-25.clover",
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err);
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    console.log(`[Webhook] Event: ${event.type} | ID: ${event.id}`);

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.user_id || "0");
        const plan = (session.metadata?.plan || "trial") as "trial" | "monthly";

        if (userId) {
          const user = await getUserById(userId);
          if (user) {
            const now = new Date();
            const periodEnd =
              plan === "trial"
                ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            await upsertSubscription({
              userId,
              stripeCustomerId: (session.customer as string) || undefined,
              stripeSubscriptionId: (session.subscription as string) || undefined,
              stripePriceId: undefined,
              stripeSessionId: session.id,
              plan,
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            });
            console.log(`[Webhook] Subscription activated for user ${userId}, plan: ${plan}`);
          }
        }
      } else if (event.type === "customer.subscription.updated") {
        const sub = event.data.object as Stripe.Subscription;
        const userId = parseInt(sub.metadata?.user_id || "0");
        if (userId) {
          await upsertSubscription({
            userId,
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price?.id || undefined,
            stripeSessionId: undefined,
            plan: "monthly",
            status: sub.status as "active" | "canceled" | "past_due" | "trialing" | "incomplete",
            currentPeriodStart: new Date((sub as any).current_period_start * 1000),
            currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          });
        }
      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const userId = parseInt(sub.metadata?.user_id || "0");
        if (userId) {
          await upsertSubscription({
            userId,
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: undefined,
            stripeSessionId: undefined,
            plan: "monthly",
            status: "canceled",
            currentPeriodStart: undefined,
            currentPeriodEnd: undefined,
            cancelAtPeriodEnd: false,
          });
        }
      }
    } catch (err) {
      console.error("[Webhook] Error processing event:", err);
    }

    res.json({ received: true });
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
