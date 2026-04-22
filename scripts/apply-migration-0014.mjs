import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const sql = fs.readFileSync("drizzle/0014_mysterious_victor_mancha.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const db = await mysql.createConnection(process.env.DATABASE_URL);
for (const s of statements) {
  const preview = s.replace(/\s+/g, " ").slice(0, 80);
  try {
    await db.query(s);
    console.log("✓ " + preview);
  } catch (err) {
    console.error("✗ " + preview);
    console.error("  " + err.message);
  }
}
await db.end();
console.log("Done.");
