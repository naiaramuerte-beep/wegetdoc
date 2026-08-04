// Migración ADITIVA (no destructiva): categoría de dunning 'blocked_provider' +
// columna blockedAt. Para 172/174 (incidencia Sipay 19/07) — ver dunning.ts.
// Idempotente. Aplicar SOLO con OK del dueño:  railway run node scripts/apply-blocked-provider.mjs
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);

const [[cat]] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'declineCategory'`);
if (cat && /blocked_provider/.test(cat.Type)) {
  console.log("• declineCategory ya incluye 'blocked_provider' — skip");
} else {
  await db.query(`ALTER TABLE subscriptions MODIFY COLUMN declineCategory ENUM('soft','hard','unknown','blocked_provider') NULL`);
  console.log("✓ declineCategory ampliado con 'blocked_provider'");
}

const [col] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'blockedAt'`);
if (col.length) {
  console.log("• columna blockedAt ya existe — skip");
} else {
  await db.query(`ALTER TABLE subscriptions ADD COLUMN blockedAt TIMESTAMP NULL AFTER declineCategory`);
  console.log("✓ columna blockedAt añadida");
}

await db.end();
console.log("Migración lista.");
