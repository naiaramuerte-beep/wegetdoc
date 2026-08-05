// Valida la SQL de getAdminMobileSummary contra prod.
import { openDb } from "./_db.mjs";
const db = await openDb();
const [today] = await db.query(`
  SELECT SUM(amountCents<=100 AND status='ok') altas, SUM(provider='mit' AND status='ok') renov,
    SUM(CASE WHEN status='ok' THEN amountCents ELSE 0 END) totalCents
  FROM charges WHERE DATE(CONVERT_TZ(createdAt,'+00:00','+02:00'))=DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+02:00'))`);
console.log("HOY:", JSON.stringify({ altas:Number(today[0].altas||0), renov:Number(today[0].renov||0), totalEur:Number(today[0].totalCents||0)/100 }));
const [ok] = await db.query(`SELECT provider, amountCents, DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+02:00'),'%d/%m %H:%i') w FROM charges WHERE status='ok' ORDER BY createdAt DESC LIMIT 5`);
console.log("Últimos cobros:"); for (const r of ok) console.log(`  ${r.w}  ${r.provider}  ${r.amountCents/100}€`);
const [fail] = await db.query(`SELECT provider, errorDetail, DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','+02:00'),'%d/%m %H:%i') w FROM charges WHERE status='failed' ORDER BY createdAt DESC LIMIT 5`);
console.log("Últimos fallos:"); for (const r of fail) console.log(`  ${r.w}  ${r.provider}  code=${String(r.errorDetail||'?').split(':')[0]}`);
await db.end();
