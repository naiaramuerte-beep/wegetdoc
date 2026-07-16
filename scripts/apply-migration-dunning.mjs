// Aplica la migración additiva del dunning v2 (columnas nuevas en subscriptions
// + tabla payment_attempts + índices). Idempotente: ignora "ya existe".
// NO toca datos. Uso: railway run node scripts/apply-migration-dunning.mjs
import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const sql = fs.readFileSync("drizzle/0021_dunning_v2.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);

const IGNORE = new Set([
  "ER_DUP_FIELDNAME", // columna ya existe
  "ER_DUP_KEYNAME",   // índice ya existe
  "ER_TABLE_EXISTS_ERROR",
]);

const db = await mysql.createConnection(process.env.DATABASE_URL);
for (const s of statements) {
  try {
    await db.query(s);
    console.log("✓ " + s.slice(0, 80).replace(/\n/g, " "));
  } catch (err) {
    if (IGNORE.has(err.code)) console.log("• ya existe: " + s.slice(0, 60).replace(/\n/g, " "));
    else console.error("✗ " + s.slice(0, 80).replace(/\n/g, " ") + "\n  " + err.message);
  }
}
await db.end();
console.log("\nMigración additiva aplicada.");
