import { openDb, tzCols } from "./_db.mjs";
const db = await openDb();
const ini = (d) => `CONVERT_TZ('${d} 00:00:00','Europe/Madrid','+00:00')`;
const fin = (d) => `CONVERT_TZ('${d} 23:59:59','Europe/Madrid','+00:00')`;

console.log("=== A) ¿se registran los FALLOS de alta en charges? (todo el histórico) ===");
const [st] = await db.query(
  `SELECT provider, status, COUNT(*) n FROM charges WHERE provider<>'mit' GROUP BY provider, status ORDER BY provider, status`);
for (const r of st) console.log(`  ${r.provider.padEnd(8)} ${r.status.padEnd(8)} ${r.n}`);

console.log("\n=== B) duplicados de alta del viernes 7-ago ===");
const [dup] = await db.query(
  `SELECT c.userId, u.email, COUNT(*) n, GROUP_CONCAT(c.provider) provs,
          GROUP_CONCAT(DATE_FORMAT(CONVERT_TZ(c.createdAt,'+00:00','Europe/Madrid'),'%H:%i:%s')) horas,
          SUM(c.amountCents) cents
     FROM charges c LEFT JOIN users u ON u.id=c.userId
    WHERE c.provider<>'mit' AND c.status='ok'
      AND c.createdAt >= ${ini("2026-08-07")} AND c.createdAt <= ${fin("2026-08-07")}
    GROUP BY c.userId, u.email HAVING n>1`);
for (const r of dup) console.log(`  u=${r.userId} ${r.email}  ×${r.n}  ${r.provs}  ${r.horas}  = ${(r.cents/100).toFixed(2)} €`);
const extra = dup.reduce((a,r)=>a+(r.n-1),0);
const [[tot]] = await db.query(
  `SELECT COUNT(*) n, COUNT(DISTINCT userId) u FROM charges
    WHERE provider<>'mit' AND status='ok'
      AND createdAt >= ${ini("2026-08-07")} AND createdAt <= ${fin("2026-08-07")}`);
console.log(`\n  cargos ${tot.n} · usuarios distintos ${tot.u} · cargos de más ${extra} (${(extra*0.5).toFixed(2)} €)`);

console.log("\n=== C) duplicados de alta por día (últimos 10) ===");
const [pd] = await db.query(
  `SELECT d, COUNT(*) cargos, COUNT(DISTINCT userId) usuarios, COUNT(*)-COUNT(DISTINCT userId) extra FROM (
     SELECT userId, DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'),'%Y-%m-%d') d
       FROM charges WHERE provider<>'mit' AND status='ok'
        AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)) x
   GROUP BY d ORDER BY d`);
for (const r of pd) console.log(`  ${r.d}  cargos ${String(r.cargos).padStart(3)}  usuarios ${String(r.usuarios).padStart(3)}  de más ${r.extra}`);
const totExtra = pd.reduce((a,r)=>a+r.extra,0);
console.log(`  → cargos de más en 10 días: ${totExtra} (${(totExtra*0.5).toFixed(2)} €)`);
await db.end();
