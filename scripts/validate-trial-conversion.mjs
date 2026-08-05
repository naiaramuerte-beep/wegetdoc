// Valida que la SQL de getTrialConversionRows ejecuta contra prod y da datos.
import { openDb } from "./_db.mjs";
const db = await openDb();
const [subs] = await db.query(`
  SELECT s.userId, u.email, s.trialDays, s.cancelAtPeriodEnd, s.status, s.declineCategory,
    DATE_FORMAT(DATE_SUB(DATE(CONVERT_TZ(s.createdAt,'+00:00','+02:00')),
      INTERVAL WEEKDAY(CONVERT_TZ(s.createdAt,'+00:00','+02:00')) DAY), '%Y-%m-%d') AS altaWeek,
    UNIX_TIMESTAMP(s.createdAt)*1000 AS createdAtMs, UNIX_TIMESTAMP(s.currentPeriodEnd)*1000 AS periodEndMs,
    (SELECT COUNT(*) FROM charges c WHERE c.userId=s.userId AND c.provider='mit' AND c.status='ok'
       AND (c.sipayOrder IS NULL OR c.sipayOrder NOT LIKE 'mit-upgrade-%')) AS mitOk
  FROM subscriptions s LEFT JOIN users u ON u.id=s.userId
  WHERE s.createdAt >= (UTC_TIMESTAMP() - INTERVAL 70 DAY)`);
const [charges] = await db.query(`
  SELECT userId, amountCents, (status='ok') AS ok, UNIX_TIMESTAMP(createdAt)*1000 AS createdAtMs,
    (sipayOrder LIKE 'mit-upgrade-%') AS isUpgrade
  FROM charges WHERE provider='mit' AND createdAt >= (UTC_TIMESTAMP() - INTERVAL 60 DAY)`);
console.log(`subs (70d): ${subs.length}  ·  charges MIT (60d): ${charges.length}`);
console.log("muestra sub:", JSON.stringify({ ...subs[0], email: subs[0]?.email ? "(hay)" : null }));
// semanas de alta detectadas
const weeks = [...new Set(subs.map(s => s.altaWeek))].sort().reverse();
console.log("semanas de alta:", weeks.join(", "));
// sanity block1: ciclos 2995 primer intento últimos 30d (proxy 25d)
const DAY=864e5, byU={};
for (const c of charges) { if (Number(c.isUpgrade)) continue; (byU[c.userId] ||= []).push(c); }
const now = Date.now(); let n=0, first=0, final=0;
for (const list of Object.values(byU)) {
  list.sort((a,b)=>a.createdAtMs-b.createdAtMs); let prev=-1e15, cur=null;
  for (const c of list) { const isF=c.createdAtMs-prev>25*DAY; if(isF){cur={amt:c.amountCents,at:c.createdAtMs,f:!!Number(c.ok),ok:!!Number(c.ok)};} else if(cur){cur.ok=cur.ok||!!Number(c.ok);} prev=c.createdAtMs;
    if(isF && cur.amt===2995 && cur.at>=now-30*DAY){ n++; if(cur.f)first++; }
    if(isF===false && cur && cur.amt===2995 && cur.at>=now-30*DAY){} }
}
console.log(`(sanity) ciclos 2995 con 1er intento en 30d: n≈${n}, 1er intento OK≈${first} → ${n?(100*first/n).toFixed(1):'—'}%`);
await db.end();
