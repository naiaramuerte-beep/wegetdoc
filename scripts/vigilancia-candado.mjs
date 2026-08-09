// READ-ONLY — vigilancia de la primera hora tras desplegar el candado del alta.
// Cubre exactamente los 4 puntos acordados:
//   1. que las altas sigan entrando con normalidad
//   2. (indirecto) que la hoja de wallet muestre el importe correcto
//   3. cero tormenta de alta_price_mismatch
//   4. el smoke de verdad: el primer doble intento REALMENTE bloqueado
//
//   railway run node scripts/vigilancia-candado.mjs [minutos]   (defecto 60)
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const MIN = Number(process.argv[2] ?? 60);
const eur = (c) => (c / 100).toFixed(2) + " €";
const VENTANA = `receivedAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)`;

const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}  ·  ventana: últimos ${MIN} min\n`);

// ── 1) ¿siguen entrando altas? ───────────────────────────────────────────────
console.log("████ 1) ALTAS — ¿entran con normalidad? ████");
const [[act]] = await db.query(
  `SELECT COUNT(*) n, COALESCE(SUM(amountCents),0) cents, COUNT(DISTINCT userId) u
     FROM charges
    WHERE provider<>'mit' AND status='ok'
      AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)`);
// Comparación honesta: la MISMA franja horaria de los 7 días anteriores, no la
// media del día entero — a las 9:00 no entran las mismas altas que a las 18:00.
const [[base]] = await db.query(
  `SELECT COUNT(*) n, COUNT(DISTINCT DATE(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'))) dias
     FROM charges
    WHERE provider<>'mit' AND status='ok'
      AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
      AND createdAt < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)
      -- Franja horaria equivalente. El BETWEEN simple falla cuando la ventana
      -- cruza medianoche (22:12 → 00:12): TIME(inicio) > TIME(fin) y no casa
      -- ninguna fila. Se parte en los dos casos.
      AND ((TIME(DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)) <= TIME(UTC_TIMESTAMP())
            AND TIME(createdAt) BETWEEN TIME(DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE))
                                    AND TIME(UTC_TIMESTAMP()))
        OR (TIME(DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)) > TIME(UTC_TIMESTAMP())
            AND (TIME(createdAt) >= TIME(DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE))
              OR TIME(createdAt) <= TIME(UTC_TIMESTAMP()))))`);
const esperado = base.dias ? base.n / base.dias : 0;
// Intentos de checkout en la ventana. ESTE es el dato que decide si hay
// bloqueo: sin intentos no puede haber nada bloqueado, por muchas altas que
// falten. La primera versión de este script gritaba "POSIBLE BLOQUEO TOTAL"
// un domingo por la mañana en el que sencillamente nadie había pulsado pagar.
const [[intentos]] = await db.query(
  `SELECT COUNT(*) n FROM webhook_events
    WHERE eventType IN ('gpay_init_started','apay_init_started','fastpay_init_started')
      AND ${VENTANA}`);

// Y la referencia se toma del MISMO día de la semana, no de los 7 anteriores:
// un domingo comparado contra una media que incluye el viernes siempre parece
// una catástrofe. En este sitio el viernes hace ×17 lo que hace el domingo.
const [[mismoDia]] = await db.query(
  `SELECT COUNT(*) n, COUNT(DISTINCT DATE(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'))) dias
     FROM charges
    WHERE provider<>'mit' AND status='ok'
      AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY)
      AND createdAt < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)
      AND DAYOFWEEK(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'))
          = DAYOFWEEK(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','Europe/Madrid'))
      AND HOUR(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'))
          = HOUR(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','Europe/Madrid'))`);
const esperadoDia = mismoDia.dias ? mismoDia.n / mismoDia.dias : 0;

console.log(`  altas en la ventana:      ${act.n}  (${act.u} usuarios distintos, ${eur(act.cents)})`);
console.log(`  intentos de pago:         ${intentos.n}`);
console.log(`  esperado, mismo día/hora: ${esperadoDia.toFixed(1)}  (media de ${mismoDia.dias} ${mismoDia.dias === 1 ? "semana" : "semanas"})`);
console.log(`  esperado, franja 7 días:  ${esperado.toFixed(1)}  (contaminado por días fuertes — solo de contexto)`);

if (intentos.n === 0) {
  console.log(`  ℹ️  sin intentos de pago en la ventana → esto es TRÁFICO, no bloqueo.`);
  console.log(`      El candado no puede bloquear lo que nadie intenta. No es motivo de rollback.`);
} else if (act.n === 0) {
  console.log(`  🚨 ${intentos.n} intentos y CERO altas — mira los códigos abajo antes de nada.`);
  console.log(`      Si son 190/authorization_error es el problema conocido de los wallets, NO el candado.`);
  console.log(`      Si son otra cosa, o si hay bloqueos inesperados en el punto 4 → rollback.`);
} else if (esperadoDia >= 3 && act.n < esperadoDia * 0.4) {
  console.log(`  ⚠️ caída fuerte (${((100 * act.n) / esperadoDia).toFixed(0)}% de lo normal para este día) — vigilar`);
} else {
  console.log(`  ✅ dentro de lo normal`);
}

const [porMetodo] = await db.query(
  `SELECT provider, COUNT(*) n FROM charges
    WHERE provider<>'mit' AND status='ok'
      AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)
    GROUP BY provider`);
console.log(`  por método: ${porMetodo.map((r) => `${r.provider} ${r.n}`).join(" · ") || "—"}`);

// ── 2) importes: todo debe ser 50 c ──────────────────────────────────────────
console.log("\n████ 2) IMPORTES — todos deben ser 0,50 € ████");
const [imp] = await db.query(
  `SELECT amountCents, COUNT(*) n FROM charges
    WHERE provider<>'mit'
      AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${MIN} MINUTE)
    GROUP BY amountCents`);
for (const r of imp) console.log(`  ${eur(r.amountCents).padStart(8)} × ${r.n} ${r.amountCents === 50 ? "✅" : "🚨 IMPORTE INESPERADO"}`);
if (!imp.length) console.log("  (sin cargos en la ventana)");

// ── 3) tormenta de price_mismatch ────────────────────────────────────────────
console.log("\n████ 3) alta_price_mismatch — debe ser 0 ████");
const [mism] = await db.query(
  `SELECT ${tzCols("receivedAt", "ts")}, LEFT(COALESCE(errorMessage,''),80) err, payload
     FROM webhook_events WHERE eventType='alta_price_mismatch' AND ${VENTANA}
    ORDER BY receivedAt DESC LIMIT 20`);
console.log(`  eventos: ${mism.length}`);
for (const r of mism) console.log(`  ⚠️ ${tzShow(r, "ts")}  ${r.err}`);
if (!mism.length) console.log("  ✅ ninguno — cliente y servidor coinciden en el importe");
else if (mism.length > 5) console.log("  🚨 TORMENTA: el cliente manda otro importe. Sospechar bundle cacheado viejo.");

// ── 4) EL SMOKE: dobles intentos bloqueados ──────────────────────────────────
console.log("\n████ 4) SMOKE — dobles intentos BLOQUEADOS ████");
const [blk] = await db.query(
  `SELECT ${tzCols("receivedAt", "ts")}, payload FROM webhook_events
    WHERE eventType='alta_duplicate_blocked' AND ${VENTANA} ORDER BY receivedAt`);
console.log(`  bloqueos en la ventana: ${blk.length}`);
for (const r of blk) {
  let p = r.payload;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch { /* raw */ } }
  console.log(`  🛡️  ${tzShow(r, "ts")}  u=${p?.userId ?? "?"}  método=${p?.method ?? "?"}  motivo=${p?.reason ?? "?"}  cargo_original=#${p?.existingChargeId ?? "—"}`);
}
if (!blk.length) console.log("  ⏳ ninguno todavía — el smoke sigue pendiente");
else console.log(`\n  💰 ahorrado: ${eur(blk.length * 50)} que antes se habrían cobrado dos veces`);

// verificación dura: ¿de verdad NO hubo doble cobro para esos usuarios?
if (blk.length) {
  console.log("\n  comprobación: ¿algún usuario bloqueado acabó con 2 cargos igualmente?");
  let fallos = 0;
  for (const r of blk) {
    let p = r.payload;
    if (typeof p === "string") { try { p = JSON.parse(p); } catch { /* raw */ } }
    if (!p?.userId) continue;
    const [[c]] = await db.query(
      `SELECT COUNT(*) n FROM charges WHERE userId=? AND provider<>'mit' AND status='ok'
         AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)`, [p.userId]);
    if (c.n > 1) { fallos++; console.log(`    🚨 u=${p.userId} tiene ${c.n} cargos — EL CANDADO NO SIRVIÓ`); }
  }
  if (!fallos) console.log("    ✅ ninguno: todos los bloqueados tienen exactamente 1 cargo");
}

// ── extra: errores nuevos en el embudo ───────────────────────────────────────
console.log("\n████ EXTRA — fallos del embudo en la ventana ████");
const [fall] = await db.query(
  `SELECT eventType, COUNT(*) n FROM webhook_events
    WHERE status='error' AND ${VENTANA} GROUP BY eventType ORDER BY n DESC`);
for (const r of fall) console.log(`  ${r.eventType.padEnd(28)} ${r.n}`);
if (!fall.length) console.log("  ✅ ningún evento de error");

await db.end();
