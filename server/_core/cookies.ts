import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const host = (req.hostname || "").toLowerCase();
  // Share the session cookie across the apex AND www with a leading-dot domain.
  // Google OAuth's redirect_uri is always the apex (editorpdf.net) — the only
  // host registered in Google Cloud Console — so the session cookie gets set on
  // editorpdf.net. When the user started on www.editorpdf.net (where the ads now
  // point, so Google Pay works) they're bounced back to www afterwards, and a
  // host-only apex cookie is NOT sent on www → the user looked logged out and
  // registration "did nothing". `.editorpdf.net` covers both hosts. Skip it for
  // localhost / Railway previews / IPs (where a dotted apex domain is invalid).
  const isProdHost =
    !LOCAL_HOSTS.has(host) &&
    !isIpAddress(host) &&
    (host === "editorpdf.net" || host.endsWith(".editorpdf.net"));

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
    ...(isProdHost ? { domain: ".editorpdf.net" } : {}),
  };
}
