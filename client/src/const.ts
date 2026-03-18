export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Encodes the current page path in state so OAuth callback can redirect back.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const currentPath = returnPath ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  // Encode both origin and returnPath in state so server can redirect back
  const stateData = JSON.stringify({ redirectUri, returnPath: currentPath });
  const state = btoa(stateData);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
