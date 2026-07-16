// READ-ONLY: is the dunning backoff live? Show past_due subs with their
// attempt count + next scheduled retry, and detect any same-user MIT charges
// on consecutive days (would mean daily-retry bug still active).
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== Subs past_due: intentos + proximo reintento programado ===");
const [pd] = await db.query(`
  SELECT userId, status, renewalAttempts, currentPeriodEnd, nextRenewalAt,
         DATEDIFF(nextRenewalAt, NOW()) AS dias_hasta_reintento
  FROM subscriptions
  WHERE status = 'past_due'
  ORDER BY nextRenewalAt
  LIMIT 40`);
console.table(pd.length ? pd : [{ info: "no hay subs past_due" }]);

console.log("\n=== Reparto de renewalAttempts en past_due ===");
const [dist] = await db.query(`
  SELECT renewalAttempts, COUNT(*) AS n,
         SUM(nextRenewalAt IS NULL) AS sin_next, SUM(nextRenewalAt > NOW()) AS con_next_futuro
  FROM subscriptions WHERE status='past_due' GROUP BY renewalAttempts ORDER BY renewalAttempts`);
console.table(dist);

console.log("\n=== ALERTA: usuarios con >1 cargo MIT fallido el MISMO dia o dias consecutivos (ultimos 7 dias) ===");
const [daily] = await db.query(`
  SELECT userId, DATE(createdAt) AS dia, COUNT(*) AS intentos
  FROM charges
  WHERE provider='mit' AND status='failed' AND createdAt >= NOW() - INTERVAL 7 DAY
  GROUP BY userId, DATE(createdAt)
  HAVING COUNT(*) > 1
  ORDER BY userId, dia`);
console.table(daily.length ? daily : [{ info: "OK: ningun usuario con multiples fallos MIT el mismo dia (ultimos 7d)" }]);

console.log("\n=== Cualquier usuario con fallos MIT en dias distintos separados <5 dias (ultimos 14d) ===");
const [close] = await db.query(`
  SELECT a.userId, DATE(a.createdAt) AS dia1, DATE(b.createdAt) AS dia2,
         DATEDIFF(b.createdAt, a.createdAt) AS separacion_dias
  FROM charges a JOIN charges b
    ON a.userId=b.userId AND a.provider='mit' AND b.provider='mit'
    AND a.status='failed' AND b.status='failed'
    AND b.createdAt > a.createdAt AND DATEDIFF(b.createdAt, a.createdAt) BETWEEN 1 AND 4
  WHERE a.createdAt >= NOW() - INTERVAL 14 DAY
  ORDER BY a.userId, a.createdAt
  LIMIT 30`);
console.table(close.length ? close : [{ info: "OK: ningun reintento MIT con separacion <5 dias en los ultimos 14d" }]);

await db.end();
