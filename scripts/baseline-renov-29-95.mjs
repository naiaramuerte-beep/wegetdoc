// READ-ONLY BASELINE (pre-deploy): aprobación de renovaciones MIT a PRIMER intento,
// a igual importe (29,95€), últimas 2 semanas, con n. Para medir dentro de 2 semanas
// si espaciar los cobros mejora la aceptación, sin confusores.
// Usa la conexión UTC (regla bug-zona-horaria nº4): scripts/_db.mjs.
import { openDb } from "./_db.mjs";
const db = await openDb();
const pct = (a, n) => n ? (100 * a / n).toFixed(1) + "%" : "—";

// Hora exacta del corte (UTC), en crudo desde SQL (sin Date de mysql2).
const [[t]] = await db.query(`SELECT DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%d %H:%i:%s') utc,
  DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+02:00'),'%Y-%m-%d %H:%i:%s') madrid`);
console.log(`Corte baseline: ${t.utc} UTC  (${t.madrid} Madrid)`);

// Todas las MIT (sin upgrades) para clasificar primer intento por usuario.
const [rows] = await db.query(`
  SELECT userId, amountCents, status, createdAt FROM charges
  WHERE provider='mit' AND (sipayOrder IS NULL OR sipayOrder NOT LIKE 'mit-upgrade-%')
  ORDER BY userId, createdAt`);
const byUser = {};
for (const r of rows) (byUser[r.userId] ||= []).push(r);
for (const u of Object.values(byUser)) for (let i = 0; i < u.length; i++) {
  const ti = new Date(u[i].createdAt).getTime();
  u[i].first = !u.slice(0, i).some(p => (ti - new Date(p.createdAt).getTime()) <= 25 * 864e5);
}
const now = Date.now();
const win = rows.filter(r => (now - new Date(r.createdAt).getTime()) <= 14 * 864e5);

function stat(f) { const s = win.filter(f); const ok = s.filter(r => r.status === 'ok').length; return { n: s.length, ok, pct: pct(ok, s.length) }; }
const firstAll = stat(r => r.first);
const first2995 = stat(r => r.first && r.amountCents === 2995);
const all2995 = stat(r => r.amountCents === 2995);

console.log("\n=== BASELINE — últimas 2 semanas ===");
console.log(`  ★ 29,95€ + PRIMER intento:  n=${first2995.n}  ok=${first2995.ok}  aprobación=${first2995.pct}`);
console.log(`    (contexto) 29,95€ todos los intentos:  n=${all2995.n}  ok=${all2995.ok}  ${all2995.pct}`);
console.log(`    (contexto) primer intento, todo importe: n=${firstAll.n}  ok=${firstAll.ok}  ${firstAll.pct}`);

await db.end();
