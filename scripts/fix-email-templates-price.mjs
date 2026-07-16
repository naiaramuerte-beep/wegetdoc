// One-shot: rewrite hardcoded old A/B price (39,90€ / €39.90) in the live
// email_templates to the dynamic {{price}} token, and drop the stale "en Stripe"
// mention (payments run on Sipay now). Re-runnable / idempotent.
//
// Usage: railway run node scripts/fix-email-templates-price.mjs [--dry]
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DRY = process.argv.includes("--dry");
const db = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await db.query("SELECT id, name, body FROM email_templates ORDER BY id");
let changed = 0;
for (const r of rows) {
  const next = r.body
    .replaceAll("39,90€", "{{price}}")
    .replaceAll("€39.90", "{{price}}")
    .replaceAll("39,90 €", "{{price}}")
    .replaceAll("procesado en Stripe", "procesado");
  if (next !== r.body) {
    changed++;
    console.log(`${DRY ? "[dry] " : ""}#${r.id} — ${r.name}: actualizado`);
    if (!DRY) {
      await db.query("UPDATE email_templates SET body = ?, updatedAt = NOW() WHERE id = ?", [next, r.id]);
    }
  }
}
console.log(`\n${DRY ? "Serían" : "Actualizadas"} ${changed} plantillas de ${rows.length}.`);
await db.end();
