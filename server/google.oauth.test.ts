import { describe, it, expect } from "vitest";

describe("Google OAuth credentials", () => {
  it("should have GOOGLE_CLIENT_ID set", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    // Should look like a Google client ID
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("should have GOOGLE_CLIENT_SECRET set", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe("");
    // Google secrets start with GOCSPX-
    expect(clientSecret).toMatch(/^GOCSPX-/);
  });

  it("should build a valid Google auth URL", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    const redirectUri = "https://editpdf.online/api/auth/google/callback";
    const state = Buffer.from(JSON.stringify({ origin: "https://editpdf.online", returnPath: "/" })).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    expect(url).toContain("accounts.google.com");
    expect(url).toContain(encodeURIComponent("editpdf.online"));
  });
});
