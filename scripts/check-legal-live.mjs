// READ-ONLY: audit live legal_pages for price/trial consistency.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await db.query("SELECT slug, LENGTH(content) AS len, content FROM legal_pages ORDER BY slug");
console.log(`=== legal_pages (${rows.length}) ===`);
for (const r of rows) {
  const c = r.content;
  const hasPlaceholder = /\{price\}/.test(c);
  const hardPrice = (c.match(/\d{1,2}[.,]9\d\s*(?:€|EUR)/g) || []);
  const trial = (c.match(/prueba de \d+\s*(?:d[ií]as?|horas?|h)|\d+[- ]?(?:hour|day)[- ]?trial|periodo de prueba de \d+\s*\w+/gi) || []);
  const stripe = /stripe/i.test(c);
  const flags = [];
  if (hardPrice.length) flags.push(`⚠ precio hardcodeado: ${[...new Set(hardPrice)].join(", ")}`);
  if (stripe) flags.push("⚠ menciona Stripe");
  console.log(`\n${r.slug} (${r.len}b) ${hasPlaceholder ? "✓{price}" : ""}`);
  if (trial.length) console.log(`   prueba: ${[...new Set(trial)].join(" | ")}`);
  if (flags.length) console.log(`   ${flags.join("  ")}`);
}
await db.end();
