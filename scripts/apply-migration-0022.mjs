// Additive migration 0022: subscriptions.trialDays (nullable int). Stores the
// trial length (days) applied at alta, for the 48h-vs-7d cohort comparison.
// Safe to re-run — skips if the column already exists.
import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const sql = fs.readFileSync("drizzle/0022_subscription_trial_days.sql", "utf-8");
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
