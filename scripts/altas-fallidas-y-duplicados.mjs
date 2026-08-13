// READ-ONLY — (A) ¿qué caminos de alta fallida dejan rastro y dónde?
//             (B) lista AL DÍA de duplicados de alta, para reembolsar.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const eur = (c) => (c / 100).toFixed(2) + " €";

// ══════════ A) rastro de las altas fallidas ══════════
console.log("████ A) ALTAS FALLIDAS — ¿dónde queda el rastro? ████\n");
console.log("=== charges (solo éxitos, por diseño) ===");
const [ch] = await db.query(
  `SELECT provider, status, COUNT(*) n FROM charges WHERE provider<>'mit'
    GROUP BY provider, status ORDER BY provider, status`);
for (const r of ch) console.log(`  charges  ${r.provider.padEnd(8)} ${r.status.padEnd(8)} ${r.n}`);

console.log("\n=== webhook_events — eventos del embudo de alta (histórico completo) ===");
const [ev] = await db.query(
  `SELECT eventType, status, COUNT(*) n,
          ${tzCols("MIN(receivedAt)", "min")}, ${tzCols("MAX(receivedAt)", "max")}
     FROM webhook_events
    WHERE eventType LIKE 'gpay%' OR eventType LIKE 'apay%' OR eventType LIKE 'fastpay%'
    GROUP BY eventType, status ORDER BY eventType`);
console.log(`  ${"eventType".padEnd(26)} ${"status".padEnd(7)} ${"n".padStart(5)}   primero → último`);
for (const r of ev)
  console.log(`  ${r.eventType.padEnd(26)} ${String(r.status).padEnd(7)} ${String(r.n).padStart(5)}   ${r.min_mad} → ${r.max_mad}`);

console.log("\n=== embudo por método (últimos 10 días) ===");
const D10 = `receivedAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)`;
for (const [m, ini, fail] of [
  ["Google Pay", "gpay_init_started", "gpay_charge_failed"],
  ["Apple Pay", "apay_init_started", "apay_charge_failed"],
]) {
  const [[a]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType=? AND ${D10}`, [ini]);
  const [[b]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType=? AND ${D10}`, [fail]);
  const okE = m === "Google Pay" ? "gpay_intro_charge" : "apay_intro_charge";
  const [[c]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType=? AND ${D10}`, [okE]);
  console.log(`  ${m.padEnd(11)} iniciados ${String(a.n).padStart(4)} → OK ${String(c.n).padStart(4)} · fallidos ${String(b.n).padStart(4)}  (aprobación ${a.n ? ((100 * c.n) / a.n).toFixed(1) : "—"}%)`);
}
const [[fi]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType='fastpay_init_started' AND ${D10}`);
const [[fp]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType='fastpay_3ds_pending' AND ${D10}`);
const [[fk]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType='fastpay_callback_ko' AND ${D10}`);
const [[fo]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType='fastpay_intro_charge' AND ${D10}`);
const [[fif]] = await db.query(`SELECT COUNT(*) n FROM webhook_events WHERE eventType='fastpay_init_failed' AND ${D10}`);
console.log(`  ${"Tarjeta".padEnd(11)} iniciados ${String(fi.n).padStart(4)} → 3DS ${String(fp.n).padStart(4)} → OK ${String(fo.n).padStart(4)} · KO ${String(fk.n).padStart(4)} · init_failed ${fif.n}`);
console.log(`  ${"".padEnd(11)} sin desenlace (ni OK ni KO tras el 3DS): ${fp.n - fo.n - fk.n}  ← ABANDONO, el único hueco real`);

console.log("\n=== ejemplos reales de cada camino fallido ===");
for (const et of ["gpay_charge_failed", "apay_charge_failed", "fastpay_callback_ko", "fastpay_init_failed"]) {
  const [[e]] = await db.query(
    `SELECT eventType, eventId, LEFT(COALESCE(errorMessage,''),110) err, ${tzCols("receivedAt", "ts")}
       FROM webhook_events WHERE eventType=? ORDER BY receivedAt DESC LIMIT 1`, [et]);
  if (!e) { console.log(`  ${et.padEnd(22)} (sin ejemplos)`); continue; }
  console.log(`  ${et.padEnd(22)} ${tzShow(e, "ts")}\n      id=${e.eventId ?? "—"}  ${e.err}`);
}

// ¿algún fallo tiene fila en charges? (no debería)
const [[cruz]] = await db.query(
  `SELECT COUNT(*) n FROM webhook_events w JOIN charges c ON c.sipayOrder = w.eventId
    WHERE w.eventType IN ('gpay_charge_failed','apay_charge_failed','fastpay_callback_ko')`);
console.log(`\n  fallos que además tienen fila en charges: ${cruz.n} ${cruz.n === 0 ? "✅ (ninguno — separación limpia)" : "⚠️"}`);

// ══════════ B) duplicados de alta, lista al día ══════════
console.log("\n\n████ B) DUPLICADOS DE ALTA — lista al día para reembolsar ████\n");
const [dups] = await db.query(
  `SELECT c.id, c.userId, u.email, c.provider, c.amountCents, c.refundedCents,
          c.sipayTransactionId txn, c.sipayOrder, c.status,
          ${tzCols("c.createdAt", "ts")},
          ROW_NUMBER() OVER (PARTITION BY c.userId ORDER BY c.createdAt) rn,
          COUNT(*) OVER (PARTITION BY c.userId) tot
     FROM charges c LEFT JOIN users u ON u.id = c.userId
    WHERE c.provider <> 'mit' AND c.status = 'ok'
    ORDER BY c.userId, c.createdAt`);
const afectados = new Map();
for (const r of dups) {
  if (r.tot < 2) continue;
  if (!afectados.has(r.userId)) afectados.set(r.userId, []);
  afectados.get(r.userId).push(r);
}
let nExtra = 0, centsExtra = 0, sinTxn = 0, yaDev = 0;
console.log(`usuarios con más de un cargo de alta: ${afectados.size}\n`);
console.log(`${"fecha/hora Madrid".padEnd(20)} ${"user".padEnd(7)} ${"método".padEnd(8)} ${"#fila".padEnd(6)} ${"transaction_id".padEnd(22)} acción`);
console.log("─".repeat(108));
for (const [uid, rows] of afectados) {
  console.log(`u=${uid}  ${rows[0].email ?? "—"}   (${rows.length} cargos)`);
  for (const r of rows) {
    const primero = r.rn === 1;
    const dev = (r.refundedCents ?? 0) > 0;
    if (!primero) { nExtra++; centsExtra += r.amountCents; if (!r.txn) sinTxn++; if (dev) yaDev++; }
    const accion = primero ? "conservar (alta legítima)" : dev ? "✅ ya devuelto" : r.txn ? "💸 REEMBOLSAR" : "⚠️ REEMBOLSAR — sin txn, requiere panel";
    console.log(`  ${r.ts_mad.padEnd(20)} ${String(r.userId).padEnd(7)} ${r.provider.padEnd(8)} #${String(r.id).padEnd(5)} ${String(r.txn || "—").padEnd(22)} ${accion}`);
  }
}
console.log("─".repeat(108));
console.log(`\nRESUMEN:`);
console.log(`  usuarios afectados:        ${afectados.size}`);
console.log(`  cargos de más:             ${nExtra}   (${eur(centsExtra)})`);
console.log(`  ya reembolsados:           ${yaDev}`);
console.log(`  PENDIENTES de devolver:    ${nExtra - yaDev}   (${eur(centsExtra - yaDev * 50)})`);
console.log(`  sin transaction_id (no se pueden devolver por API): ${sinTxn}`);

console.log("\n=== distribución por separación temporal ===");
for (const [uid, rows] of afectados) {
  for (let i = 1; i < rows.length; i++) {
    const d = (new Date(rows[i].ts_utc + "Z") - new Date(rows[i - 1].ts_utc + "Z")) / 1000;
    console.log(`  u=${String(uid).padEnd(7)} ${rows[i - 1].provider}→${rows[i].provider}  +${d < 120 ? d + " s" : (d / 60).toFixed(1) + " min"}`);
  }
}

await db.end();
