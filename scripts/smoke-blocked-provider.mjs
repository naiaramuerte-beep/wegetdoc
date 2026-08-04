// READ-ONLY smoke: tras el cron, ¿los 172/174 quedan en past_due+blocked_provider
// (NO canceled) y fuera del cron al día siguiente? Avisa si aparecen 173/175.
import { openDb } from "./_db.mjs"; // conexión UTC (regla bug-zona-horaria nº4)
const db = await openDb();
const f = x => x ? new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(x)) : '—';

// 1) Subs marcadas blocked_provider (deberían estar en past_due, blockedAt puesto)
const [blocked] = await db.query(`
  SELECT id, userId, status, lastDeclineCode, declineCategory, blockedAt, nextRetryAt, currentPeriodEnd
  FROM subscriptions WHERE declineCategory='blocked_provider' ORDER BY blockedAt DESC`);
console.log(`=== blocked_provider: ${blocked.length} ===`);
let bad = 0;
for (const r of blocked) {
  const ok = r.status==='past_due' && !r.nextRetryAt;
  if (!ok) bad++;
  console.log(`  sub#${r.id} u=${r.userId} status=${r.status} code=${r.lastDeclineCode} blockedAt=${f(r.blockedAt)} nextRetry=${r.nextRetryAt?f(r.nextRetryAt):'null'} ${ok?'✓':'✗ REVISAR'}`);
}
console.log(bad ? `  ⚠ ${bad} no cumplen (past_due + nextRetryAt null)` : `  ✓ todas en past_due sin nextRetryAt`);

// 2) ¿alguna 172/174 quedó CANCELADA después del deploy? (no debería, desde hoy)
const [wrongCancel] = await db.query(`
  SELECT id, userId, updatedAt FROM subscriptions
  WHERE status='canceled' AND lastDeclineCode IN ('172','174')
    AND updatedAt >= '2026-08-04 22:00:00'`);
console.log(`\n=== 172/174 canceladas tras el deploy (debería ser 0): ${wrongCancel.length} ===`);
for (const r of wrongCancel) console.log(`  ⚠ sub#${r.id} u=${r.userId} ${f(r.updatedAt)}`);

// 3) ¿aparecen 173 o 175? (siguen en HARD → cancelarían; avisar)
const [emerging] = await db.query(`
  SELECT eventId, receivedAt, payload FROM webhook_events
  WHERE eventType='mit_charge_failed' AND receivedAt >= (UTC_TIMESTAMP() - INTERVAL 2 DAY)`);
const rc = p => { try { const j=typeof p==='string'?JSON.parse(p):p; return String(j?.payload?.code??j?.code??''); } catch { return ''; } };
const hits = emerging.filter(r=>['173','175'].includes(rc(r.payload)));
console.log(`\n=== 173/175 en las últimas 48h (aún en HARD → cancelan): ${hits.length} ===`);
if (hits.length) console.log("  ⚠⚠ AVISAR AL DUEÑO antes de que se cancelen más");
for (const r of hits) console.log(`  ${f(r.receivedAt)} code=${rc(r.payload)} order=${r.eventId}`);

await db.end();
