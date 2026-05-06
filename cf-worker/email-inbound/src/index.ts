/**
 * Cloudflare Email Worker — receives inbound mail to support@editorpdf.net
 * (configured in Cloudflare Email Routing rules), parses the MIME body,
 * POSTs the parsed fields to the EditorPDF backend, and forwards the
 * raw email to the gmail backup so we keep both channels.
 *
 * Secrets (set via `wrangler secret put`):
 *   INBOUND_EMAIL_SECRET — must match server's INBOUND_EMAIL_SECRET env var
 *   BACKEND_URL          — e.g. "https://editorpdf.net" (no trailing slash)
 *   FORWARD_TO           — gmail backup, e.g. "supporteditorpdf@gmail.com"
 *                          (optional; if missing, no backup forward)
 */
import PostalMime from "postal-mime";

interface Env {
  INBOUND_EMAIL_SECRET: string;
  BACKEND_URL: string;
  FORWARD_TO?: string;
}

// Strip the quoted reply tail from a plain-text email body. Most clients
// prefix it with one of these patterns followed by quoted lines starting
// with ">". Imperfect but good enough for the panel UI — the admin can
// expand to read everything if needed.
function stripQuotedReply(text: string): string {
  if (!text) return "";
  // Common reply markers in EN/ES/FR/DE/IT/PT.
  const markers = [
    /^On .+ wrote:/m,
    /^Le .+ a écrit\s*:/m,
    /^Am .+ schrieb/m,
    /^Il .+ ha scritto:/m,
    /^Em .+ escreveu:/m,
    /^El .+ escribió:/m,
    /^>.+/m,
    /^-+ ?Original Message ?-+/m,
    /^Forwarded message/m,
  ];
  let cut = text.length;
  for (const re of markers) {
    const m = text.match(re);
    if (m && m.index !== undefined && m.index < cut) cut = m.index;
  }
  return text.slice(0, cut).trim();
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext) {
    const startTs = Date.now();
    let parsedOk = false;
    let postedOk = false;
    let forwardedOk = false;

    // ── 1) Parse the MIME ─────────────────────────────────────────
    let parsed: Awaited<ReturnType<typeof PostalMime.parse>> | null = null;
    try {
      parsed = await PostalMime.parse(message.raw);
      parsedOk = true;
    } catch (err) {
      console.error("[email-inbound] parse error:", (err as Error).message);
    }

    // ── 2) POST to backend ────────────────────────────────────────
    if (parsed) {
      const fromAddr = parsed.from?.address ?? message.from ?? "";
      const fromName = parsed.from?.name ?? "";
      const subject = (parsed.subject ?? "").replace(/^(Re:\s*)+/i, "Re: ");
      const bodyRaw = parsed.text ?? (parsed.html ? parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "");
      const body = stripQuotedReply(bodyRaw);

      try {
        const r = await fetch(`${env.BACKEND_URL}/api/inbound-email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-inbound-secret": env.INBOUND_EMAIL_SECRET,
          },
          body: JSON.stringify({ fromName, fromEmail: fromAddr, subject, body }),
        });
        if (r.ok) postedOk = true;
        else console.error("[email-inbound] backend POST failed:", r.status, await r.text());
      } catch (err) {
        console.error("[email-inbound] backend POST exception:", (err as Error).message);
      }
    }

    // ── 3) Forward to gmail backup (if configured) ───────────────
    if (env.FORWARD_TO) {
      try {
        await message.forward(env.FORWARD_TO);
        forwardedOk = true;
      } catch (err) {
        console.error("[email-inbound] forward error:", (err as Error).message);
      }
    }

    const dur = Date.now() - startTs;
    console.log(`[email-inbound] from=${message.from} parsed=${parsedOk} posted=${postedOk} forwarded=${forwardedOk} ${dur}ms`);

    // If both delivery paths failed, reject so Cloudflare retries / surfaces
    // the bounce. If at least one worked, accept silently.
    if (!postedOk && !forwardedOk) {
      message.setReject("Internal processing error");
    }
  },
};
