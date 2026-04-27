/**
 * One-shot data fix: rewrite "19,99 EUR" / "19.99 EUR" → "{price}" in
 * already-seeded legal_pages content so the dynamic price interpolation
 * picks them up.
 *
 * Idempotent — running it twice is a no-op (REPLACE silently does nothing
 * when the substring is absent).
 *
 * Usage: railway run node scripts/fix-legal-pages-price.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const patterns = [
  "19,99 EUR",
  "19.99 EUR",
  "19,99 €",
  "19.99 €",
  "19,99€",
  "19.99€",
  "€19,99",
  "€19.99",
];

let totalUpdated = 0;
for (const needle of patterns) {
  const [r] = await db.query(
    `UPDATE legal_pages SET content = REPLACE(content, ?, '{price}') WHERE content LIKE ?`,
    [needle, `%${needle}%`],
  );
  if (r.affectedRows) {
    console.log(`  "${needle}" → {price}: ${r.affectedRows} row(s)`);
    totalUpdated += r.affectedRows;
  }
}

if (totalUpdated === 0) {
  console.log("Nothing to do — no hardcoded prices found in legal_pages.");
} else {
  console.log(`\n✅ Done — ${totalUpdated} row update(s).`);
}

await db.end();
