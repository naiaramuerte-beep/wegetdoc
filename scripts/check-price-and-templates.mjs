// READ-ONLY diagnostic: live monthly price + email template bodies.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const [price] = await db.query(
  "SELECT `key`, `value`, updatedAt FROM site_settings WHERE `key` IN ('subscription_price_eur','active_stripe_price_id')",
);
console.log("=== site_settings (precio) ===");
console.table(price.length ? price : [{ key: "(none)", value: "(not set → fallback 19.95)" }]);

try {
  const [tpls] = await db.query("SELECT id, name, LEFT(body, 400) AS body_preview FROM email_templates ORDER BY id");
  console.log(`\n=== email_templates (${tpls.length}) ===`);
  for (const t of tpls) {
    const hits = (t.body_preview.match(/39[.,]90|29[.,]9\d|19[.,]9\d|0[.,]50|48\s*h|\{price\}/gi) || []).join(", ");
    console.log(`\n#${t.id} — ${t.name}`);
    console.log(`  precio/horas detectados: ${hits || "(ninguno)"}`);
  }
} catch (e) {
  console.log("\n(email_templates no accesible:", e.message, ")");
}

await db.end();
