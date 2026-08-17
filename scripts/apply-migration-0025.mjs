// Migración aditiva 0025: `subscriptions.recurringCents`.
// Ancla en cada suscripción el precio recurrente que aceptó su dueño, para que
// subir el precio afecte solo a las altas nuevas y no le cambie el recibo a
// quien ya está dentro. Solo añade una columna NULL: no toca datos.
// Re-ejecutable — si la columna ya existe, lo dice y sigue.
import mysql from "mysql2/promise";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const sql = fs.readFileSync("drizzle/0025_subscription_recurring_cents.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const db = await mysql.createConnection(process.env.DATABASE_URL);
for (const s of statements) {
  try { await db.query(s); console.log("✓ " + s.slice(0, 90)); }
  catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_DUP_KEYNAME") console.log("• ya existía: " + s.slice(0, 70));
    else console.error("✗ " + s.slice(0, 90) + "\n  " + err.message);
  }
}
await db.end();
