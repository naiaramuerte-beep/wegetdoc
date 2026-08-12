// Migración aditiva 0024: tablas `consents` y `legal_snapshots`.
// Registro del consentimiento del cliente (fecha, IP, navegador, texto exacto
// mostrado) y archivo deduplicado de las versiones de los textos legales, para
// poder demostrar en una disputa qué aceptó esa persona y qué decía ese día.
// Aditiva: solo crea tablas nuevas, no toca ninguna existente.
// Se puede re-ejecutar sin miedo — las tablas llevan IF NOT EXISTS.
import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const sql = fs.readFileSync("drizzle/0024_consents.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const db = await mysql.createConnection(process.env.DATABASE_URL);
for (const s of statements) {
  try { await db.query(s); console.log("✓ " + s.slice(0, 80)); }
  catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_DUP_KEYNAME") console.log("• ya existía: " + s.slice(0, 60));
    else console.error("✗ " + s.slice(0, 80) + "\n  " + err.message);
  }
}
await db.end();
