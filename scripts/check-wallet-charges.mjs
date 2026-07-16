// READ-ONLY: did Apple/Google Pay users get charged the monthly amount?
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== Cargos por metodo + importe + estado ===");
const [byProv] = await db.query(`
  SELECT provider, amountCents, status, COUNT(*) AS n, MIN(createdAt) AS primero, MAX(createdAt) AS ultimo
  FROM charges
  GROUP BY provider, amountCents, status
  ORDER BY provider, amountCents, status`);
console.table(byProv);

console.log("\n=== Cargos de importe mensual (1995 o 2995), por metodo ===");
const [monthly] = await db.query(`
  SELECT id, userId, provider, amountCents, status, sipayTransactionId, createdAt
  FROM charges
  WHERE amountCents IN (1995, 2995)
  ORDER BY createdAt DESC`);
console.table(monthly.length ? monthly : [{ info: "NINGUN cargo de 19,95 ni 29,95 registrado" }]);

console.log("\n=== Usuarios con wallet (gpay/apay) que ADEMAS tienen un cargo de renovacion (mit) ===");
const [walletRenew] = await db.query(`
  SELECT w.userId,
         GROUP_CONCAT(DISTINCT w.provider) AS wallet_metodos,
         (SELECT GROUP_CONCAT(CONCAT(m.amountCents,':',m.status)) FROM charges m WHERE m.userId = w.userId AND m.provider='mit') AS mit_cargos
  FROM charges w
  WHERE w.provider IN ('gpay','apay')
    AND EXISTS (SELECT 1 FROM charges m WHERE m.userId = w.userId AND m.provider='mit')
  GROUP BY w.userId`);
console.table(walletRenew.length ? walletRenew : [{ info: "Ningun usuario de wallet ha tenido cargo mit (renovacion)" }]);

await db.end();
