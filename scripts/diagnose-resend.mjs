/**
 * Diagnose why emails aren't arriving:
 *   - Is the API key valid?
 *   - Is editorpdf.net verified for sending? (controls whether From: noreply@editorpdf.net delivers)
 *   - Recent send attempts + their status
 *
 * Usage: railway run node scripts/diagnose-resend.mjs
 */
import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error("✗ RESEND_API_KEY not set");
  process.exit(1);
}
console.log(`API key prefix: ${key.slice(0, 7)}…  (length ${key.length})`);

const resend = new Resend(key);

console.log("\n─── Domains in this Resend account ───");
try {
  const { data, error } = await resend.domains.list();
  if (error) {
    console.error("✗ list error:", error);
  } else {
    const domains = data?.data ?? [];
    if (!domains.length) {
      console.log("  (none) — without a verified domain you can ONLY send from onboarding@resend.dev to your own account email.");
    } else {
      for (const d of domains) {
        const flag = d.status === "verified" ? "✓" : "✗";
        console.log(`  ${flag} ${d.name}  status=${d.status}  region=${d.region}  id=${d.id}`);
      }
    }
  }
} catch (err) {
  console.error("✗ exception:", err.message);
}

console.log("\n─── Last 10 email send attempts ───");
try {
  const { data, error } = await resend.emails.list({ limit: 10 });
  if (error) {
    console.error("✗ list error:", error);
  } else {
    const emails = data?.data ?? [];
    if (!emails.length) {
      console.log("  (no recent emails)");
    } else {
      for (const e of emails) {
        console.log(`  ${e.created_at}  ${e.last_event ?? "?"}  →  ${e.to}  | "${e.subject}"`);
      }
    }
  }
} catch (err) {
  console.error("✗ exception:", err.message);
}
