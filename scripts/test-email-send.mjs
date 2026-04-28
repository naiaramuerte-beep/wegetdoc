/**
 * Send a test email through Resend to figure out exactly which From: addresses
 * work. The send-only API key can't list domains, so we probe by sending.
 *
 * Usage: railway run node scripts/test-email-send.mjs <recipient-email>
 *        (defaults to OWNER_OPEN_ID-derived email if omitted; use a real inbox you control)
 */
import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const TO = process.argv[2];
if (!TO) {
  console.error("Usage: node scripts/test-email-send.mjs <recipient-email>");
  process.exit(1);
}

const key = process.env.RESEND_API_KEY;
if (!key) { console.error("✗ RESEND_API_KEY not set"); process.exit(1); }
const resend = new Resend(key);

const cases = [
  { label: "noreply@editorpdf.net (verified domain candidate)",      from: "EditorPDF <noreply@editorpdf.net>" },
  { label: "onboarding@resend.dev (always works for own-account)",   from: "EditorPDF <onboarding@resend.dev>" },
];

for (const c of cases) {
  console.log(`\n─── From: ${c.from} ───`);
  try {
    const { data, error } = await resend.emails.send({
      from: c.from,
      to: TO,
      subject: `[Test ${new Date().toISOString().slice(11,19)}] EditorPDF email diag`,
      html: `<p>Test from <code>${c.from}</code> at ${new Date().toISOString()}.</p>`,
    });
    if (error) {
      console.log(`  ✗ ${error.statusCode ?? "?"}  ${error.name ?? ""}  ${error.message ?? ""}`);
    } else {
      console.log(`  ✓ accepted  id=${data?.id}`);
    }
  } catch (err) {
    console.log(`  ✗ exception: ${err.message}`);
  }
}
