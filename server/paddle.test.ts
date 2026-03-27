import { describe, it, expect } from "vitest";

describe("Paddle configuration", () => {
  it("should have PADDLE_API_KEY configured", () => {
    const key = process.env.PADDLE_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key).toMatch(/^pdl_/);
  });

  it("should have VITE_PADDLE_CLIENT_TOKEN configured", () => {
    const token = process.env.VITE_PADDLE_CLIENT_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    expect(token).toMatch(/^live_/);
  });

  it("should have VITE_PADDLE_PRICE_ID configured", () => {
    const priceId = process.env.VITE_PADDLE_PRICE_ID;
    expect(priceId).toBeDefined();
    expect(priceId).not.toBe("");
    expect(priceId).toMatch(/^pri_/);
  });

  it("should have PADDLE_WEBHOOK_NOTIFICATION_ID configured", () => {
    const notifId = process.env.PADDLE_WEBHOOK_NOTIFICATION_ID;
    expect(notifId).toBeDefined();
    expect(notifId).not.toBe("");
    expect(notifId).toMatch(/^ntfset_/);
  });

  it("should be able to initialize Paddle SDK", async () => {
    const { Paddle, Environment } = await import("@paddle/paddle-node-sdk");
    const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
      environment: Environment.production,
    });
    expect(paddle).toBeDefined();
  }, 15000);
});
