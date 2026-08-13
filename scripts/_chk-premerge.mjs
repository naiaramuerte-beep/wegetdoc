import { openDb } from "./_db.mjs";
const db = await openDb();
console.log("=== índices de `charges` ===");
const [idx] = await db.query(`SHOW INDEX FROM charges`);
for (const r of idx) console.log(`  ${r.Key_name.padEnd(24)} col=${r.Column_name.padEnd(22)} unique=${r.Non_unique === 0}`);
const [[n]] = await db.query(`SELECT COUNT(*) n FROM charges`);
console.log(`  filas: ${n.n}`);
console.log("\n=== coste real de la consulta del guard ===");
const t0 = Date.now();
const [q] = await db.query(
  `SELECT id FROM charges WHERE userId=94494 AND status='ok' AND provider<>'mit'
     AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 120 MINUTE) ORDER BY createdAt DESC LIMIT 1`);
console.log(`  filas devueltas: ${q.length} · ${Date.now() - t0} ms`);
console.log("\n=== site_settings relevantes ===");
const [s] = await db.query(
  `SELECT \`key\`, value FROM site_settings
    WHERE \`key\` IN ('intro_price_eur','subscription_price_eur','trial_days')`);
for (const r of s) console.log(`  ${r.key.padEnd(24)} = ${r.value}`);
const tiene = s.some((r) => r.key === "intro_price_eur");
console.log(`  intro_price_eur presente: ${tiene ? "SÍ" : "NO → se usa el defecto 50 c"}`);
console.log("\n=== tipos de evento ya usados (para confirmar que eventType es libre) ===");
const [e] = await db.query(`SELECT COUNT(DISTINCT eventType) n FROM webhook_events`);
console.log(`  eventTypes distintos en uso: ${e[0].n}`);
await db.end();
