// Additive migration 0023: subscriptions.trialHours (nullable int). Stores the
// trial length (HOURS) applied at alta, so the 24h cohort stays separable from
// the older 7d and 48h ones. Additive: existing rows keep NULL and are read
// through trialDays, so nothing retroactive happens to live subscriptions.
// Safe to re-run — skips if the column already exists.
import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const sql = fs.readFileSync("drizzle/0023_subscription_trial_hours.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const db = await mysql.createConnection(process.env.DATABASE_URL);
for (const s of statements) {
  try { await db.query(s); console.log("✓ " + s.slice(0, 80)); }
  catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") console.log("• column already exists: " + s.slice(0, 60));
    else console.error("✗ " + s.slice(0, 80) + "\n  " + err.message);
  }
}
await db.end();
