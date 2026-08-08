// READ-ONLY — cierre del viernes 7-ago + foto del sábado 8-ago.
// 1) ¿entró el cobro de las 22:09 (u=90114)? · total final del viernes
// 2) sábado hasta ahora · 3) cohorte 7d acumulada
// 4) smoke del 121 · 5) altas reales del viernes (para cruzar con Google Ads)
// Horas en UTC y Madrid (norma 2026-08-06).
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const pct = (a, n) => (n ? ((100 * a) / n).toFixed(1) + "%" : "—");
const eur = (c) => (c / 100).toFixed(2) + " €";
const ini = (d) => `CONVERT_TZ('${d} 00:00:00','Europe/Madrid','+00:00')`;
const fin = (d) => `CONVERT_TZ('${d} 23:59:59','Europe/Madrid','+00:00')`;
const NO_UPG = `(c.sipayOrder IS NULL OR c.sipayOrder NOT LIKE 'mit-upgrade-%')`;
const VIE = "2026-08-07", SAB = "2026-08-08", JUE = "2026-08-06";

const [[t]] = await db.query(
  `SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")},
          DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','Europe/Madrid'),'%Y-%m-%d') hoyMad,
          DAYNAME(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','Europe/Madrid')) dia`);
console.log(`Corte: ${tzShow(t, "ahora")}  ·  hoy = ${t.hoyMad} (${t.dia})`);

// ══════════════ 1) el cobro pendiente de las 22:09 (u=90114) ══════════════
console.log(`\n\n████ 1) VIERNES — el cobro pendiente de las 22:09 (u=90114) ████`);
const [c90114] = await db.query(
  `SELECT c.id, c.status, c.errorDetail, c.amountCents, c.sipayTransactionId txn,
          c.sipayOrder, ${tzCols("c.createdAt", "ts")}
     FROM charges c WHERE c.userId=90114 ORDER BY c.createdAt DESC LIMIT 6`);
if (!c90114.length) console.log("  (sin cargos registrados)");
for (const r of c90114)
  console.log(`  #${r.id} ${tzShow(r, "ts")}  ${r.status === "ok" ? "✅ OK" : "❌ " + (r.errorDetail ?? "")}  ${eur(r.amountCents)}  txn=${r.txn ?? "—"}`);
const [s90114] = await db.query(
  `SELECT s.id, s.status, s.plan, s.trialDays, s.retryCount, s.declineCategory, s.lastDeclineCode,
          ${tzCols("s.currentPeriodEnd", "fin")}, ${tzCols("s.nextRetryAt", "retry")}
     FROM subscriptions s WHERE s.userId=90114`);
for (const s of s90114)
  console.log(`  sub#${s.id} ${s.status}/${s.plan} trial=${s.trialDays}d retries=${s.retryCount} cat=${s.declineCategory ?? "—"} code=${s.lastDeclineCode ?? "—"}
      periodo hasta ${tzShow(s, "fin")}  ·  próximo reintento ${tzShow(s, "retry")}`);

// ══════════════ viernes: total final de renovaciones ══════════════
console.log(`\n████ VIERNES ${VIE} — total final de renovaciones ████`);
for (const dia of [JUE, VIE]) {
  const [rows] = await db.query(
    `SELECT c.userId, c.status, c.errorDetail, ${tzCols("c.createdAt", "ts")},
            (SELECT COUNT(*) FROM charges p WHERE p.userId=c.userId AND p.provider='mit'
               AND p.createdAt < c.createdAt
               AND (p.sipayOrder IS NULL OR p.sipayOrder NOT LIKE 'mit-upgrade-%')) previos
       FROM charges c
      WHERE c.provider='mit' AND ${NO_UPG}
        AND c.createdAt >= ${ini(dia)} AND c.createdAt <= ${fin(dia)}
      ORDER BY c.createdAt`);
  const p = rows.filter((r) => r.previos === 0), re = rows.filter((r) => r.previos > 0);
  const okP = p.filter((r) => r.status === "ok").length, okR = re.filter((r) => r.status === "ok").length;
  console.log(`  ${dia}:  total ${rows.length} intentos  ·  primeros cobros ${okP}/${p.length} (${pct(okP, p.length)})  ·  reintentos ${okR}/${re.length} (${pct(okR, re.length)})`);
  if (dia === VIE) {
    const ko = rows.filter((r) => r.status !== "ok");
    const codes = {};
    for (const r of ko) { const c = String(r.errorDetail ?? "?").split(":")[0]; codes[c] = (codes[c] ?? 0) + 1; }
    console.log(`      códigos de los ${ko.length} KO: ${Object.entries(codes).map(([c, n]) => `${c}×${n}`).join(" · ") || "—"}`);
    const ultimo = rows[rows.length - 1];
    if (ultimo) console.log(`      último intento del día: ${tzShow(ultimo, "ts")} u=${ultimo.userId} ${ultimo.status}`);
  }
}

// ══════════════ dinero del día: altas + renovaciones ══════════════
console.log(`\n████ DINERO POR DÍA (últimos 10 días, Madrid) ████`);
const [dinero] = await db.query(
  `SELECT DATE_FORMAT(CONVERT_TZ(c.createdAt,'+00:00','Europe/Madrid'),'%Y-%m-%d') d,
          DAYNAME(CONVERT_TZ(c.createdAt,'+00:00','Europe/Madrid')) dia,
          SUM(c.provider<>'mit' AND c.status='ok') altas,
          SUM(CASE WHEN c.provider<>'mit' AND c.status='ok' THEN c.amountCents ELSE 0 END) altasCents,
          SUM(c.provider='mit' AND ${NO_UPG} AND c.status='ok') renov,
          SUM(CASE WHEN c.provider='mit' AND ${NO_UPG} AND c.status='ok' THEN c.amountCents ELSE 0 END) renovCents,
          SUM(CASE WHEN c.status='ok' THEN c.amountCents ELSE 0 END) totalCents,
          SUM(COALESCE(c.refundedCents,0)) devCents
     FROM charges c
    WHERE c.createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)
    GROUP BY d, dia ORDER BY d`);
console.log(`  fecha        día        altas   €altas    renov   €renov     € total   devuelto`);
for (const r of dinero)
  console.log(`  ${r.d}  ${String(r.dia).padEnd(9)}  ${String(r.altas).padStart(5)}  ${eur(r.altasCents).padStart(8)}  ${String(r.renov).padStart(5)}  ${eur(r.renovCents).padStart(9)}  ${eur(r.totalCents).padStart(10)}  ${eur(r.devCents).padStart(8)}`);
const prev = dinero.filter((r) => r.d < SAB).slice(-7);
if (prev.length) {
  const m = (k) => (prev.reduce((a, r) => a + Number(r[k]), 0) / prev.length);
  console.log(`\n  media 7 días (excl. hoy):  altas ${m("altas").toFixed(1)}  ·  €altas ${eur(m("altasCents"))}  ·  renov ${m("renov").toFixed(1)}  ·  € total ${eur(m("totalCents"))}`);
}

// ══════════════ 2) sábado hasta ahora ══════════════
console.log(`\n\n████ 2) SÁBADO ${SAB} — renovaciones hasta ahora ████`);
const DUE = `GREATEST(s.currentPeriodEnd, COALESCE(s.nextRetryAt, s.currentPeriodEnd))`;
const ELEG = `s.sipayToken IS NOT NULL AND s.sipayToken <> '' AND s.cancelAtPeriodEnd = 0
   AND (s.declineCategory IS NULL OR s.declineCategory NOT IN ('hard','blocked_provider'))`;
const [sab] = await db.query(
  `SELECT c.userId, c.status, c.errorDetail, ${tzCols("c.createdAt", "ts")},
          s.trialDays, s.retryCount, s.status subStatus,
          (SELECT COUNT(*) FROM charges p WHERE p.userId=c.userId AND p.provider='mit'
             AND p.createdAt < c.createdAt
             AND (p.sipayOrder IS NULL OR p.sipayOrder NOT LIKE 'mit-upgrade-%')) previos
     FROM charges c LEFT JOIN subscriptions s ON s.userId=c.userId
    WHERE c.provider='mit' AND ${NO_UPG}
      AND c.createdAt >= ${ini(SAB)} AND c.createdAt <= ${fin(SAB)}
    ORDER BY c.createdAt`);
const [pend] = await db.query(
  `SELECT s.id, s.userId, s.status, s.trialDays, s.retryCount, ${tzCols(DUE, "due")},
          (SELECT COUNT(*) FROM charges p WHERE p.userId=s.userId AND p.provider='mit'
             AND (p.sipayOrder IS NULL OR p.sipayOrder NOT LIKE 'mit-upgrade-%')) previos
     FROM subscriptions s
    WHERE ${ELEG} AND s.status IN ('trialing','active','past_due')
      AND ${DUE} >= ${ini(SAB)} AND ${DUE} <= ${fin(SAB)} AND ${DUE} > UTC_TIMESTAMP()
    ORDER BY ${DUE}`);
const [atras] = await db.query(
  `SELECT s.id, s.userId, s.status, s.retryCount, ${tzCols(DUE, "due")},
          ${tzCols("s.dunningLockedAt", "lk")}
     FROM subscriptions s
    WHERE ${ELEG} AND s.status IN ('trialing','active','past_due')
      AND ${DUE} >= ${ini(SAB)} AND ${DUE} <= UTC_TIMESTAMP()
      AND NOT EXISTS (SELECT 1 FROM charges c WHERE c.userId=s.userId AND c.provider='mit'
                        AND c.createdAt >= ${ini(SAB)})
    ORDER BY ${DUE}`);
console.log(`  previstas hoy (reconstruido): ${sab.length + pend.length + atras.length}`);
console.log(`    intentadas: ${sab.length}  (OK ${sab.filter(r => r.status === "ok").length} · KO ${sab.filter(r => r.status !== "ok").length})`);
console.log(`    pendientes: ${pend.length}`);
console.log(`    ${atras.length ? "⚠️ vencidas SIN intento: " + atras.length : "✅ vencidas sin intento: 0"}`);
console.log(`\n  intentos:`);
for (const r of sab)
  console.log(`    ${r.ts_mad.slice(11, 16)} Mad / ${r.ts_utc.slice(11, 16)} UTC  u=${String(r.userId).padEnd(6)} ${r.status === "ok" ? "✅ OK  " : "❌ KO  "} code=${String(r.status === "ok" ? "—" : (r.errorDetail ?? "?")).split(":")[0].padEnd(6)} ${r.previos === 0 ? "1er cobro" : `reintento (${r.previos} previos)`} trial=${r.trialDays ?? "?"}d`);
if (!sab.length) console.log("    (ninguno todavía)");
console.log(`\n  pendientes para más tarde:`);
for (const r of pend)
  console.log(`    ${r.due_mad.slice(11, 16)} Mad / ${r.due_utc.slice(11, 16)} UTC  sub#${r.id} u=${String(r.userId).padEnd(6)} ${r.status.padEnd(9)} ${r.previos === 0 ? "1er cobro" : `reintento (${r.previos})`}`);
if (!pend.length) console.log("    (ninguna)");
for (const r of atras)
  console.log(`    ⚠️ vencía ${r.due_mad} Mad  sub#${r.id} u=${r.userId} ${r.status} lock=${r.lk_utc ?? "—"}`);

// ══════════════ 3) cohorte 7 días acumulada ══════════════
console.log(`\n\n████ 3) COHORTE 7 DÍAS — primeros cobros desde el 6-ago ████`);
const [coh] = await db.query(
  `SELECT c.userId, c.status, c.errorDetail, ${tzCols("c.createdAt", "ts")}
     FROM charges c JOIN subscriptions s ON s.userId=c.userId
    WHERE c.provider='mit' AND ${NO_UPG} AND s.trialDays = 7
      AND c.createdAt >= ${ini(JUE)}
      AND (SELECT COUNT(*) FROM charges p WHERE p.userId=c.userId AND p.provider='mit'
             AND p.createdAt < c.createdAt
             AND (p.sipayOrder IS NULL OR p.sipayOrder NOT LIKE 'mit-upgrade-%')) = 0
    ORDER BY c.createdAt`);
const cohOk = coh.filter((r) => r.status === "ok").length;
const porDia = {};
for (const r of coh) {
  const d = r.ts_mad.slice(0, 10);
  porDia[d] ??= { n: 0, ok: 0 };
  porDia[d].n++; if (r.status === "ok") porDia[d].ok++;
}
for (const [d, v] of Object.entries(porDia)) console.log(`    ${d}   n=${String(v.n).padStart(2)}  ok=${v.ok}  ${pct(v.ok, v.n)}`);
console.log(`\n    ACUMULADO: ${cohOk}/${coh.length} = ${pct(cohOk, coh.length)}   (ayer 38,1% · baseline 35,3%)`);
const codesC = {};
for (const r of coh.filter((x) => x.status !== "ok")) {
  const c = String(r.errorDetail ?? "?").split(":")[0];
  codesC[c] = (codesC[c] ?? 0) + 1;
}
console.log(`    códigos de los KO: ${Object.entries(codesC).map(([c, n]) => `${c}×${n}`).join(" · ") || "—"}`);

// ══════════════ 4) smoke del 121 ══════════════
console.log(`\n\n████ 4) SMOKE DEL 121 (deploy c25ba65, noche del 6→7-ago) ████`);
const [c121] = await db.query(
  `SELECT c.id, c.userId, c.errorDetail, ${tzCols("c.createdAt", "ts")}
     FROM charges c
    WHERE c.provider='mit' AND c.status<>'ok'
      AND (c.errorDetail LIKE '121:%' OR c.errorDetail = '121' OR c.errorDetail LIKE '%code 121%')
      AND c.createdAt >= ${ini(VIE)}
    ORDER BY c.createdAt`);
console.log(`  cargos con código 121 desde el ${VIE}: ${c121.length}`);
if (!c121.length) {
  console.log("  ⏳ todavía ningún 121 post-deploy — smoke sigue pendiente (tasa base ~0,35/día)");
} else {
  for (const r of c121) {
    console.log(`\n  ❌ 121  ${tzShow(r, "ts")}  u=${r.userId}  (cargo #${r.id})  ${r.errorDetail}`);
    const [[s]] = await db.query(
      `SELECT s.id, s.status, s.plan, s.retryCount, s.declineCategory, s.lastDeclineCode,
              ${tzCols("s.nextRetryAt", "retry")}, ${tzCols("s.currentPeriodEnd", "fin")},
              ${tzCols("s.updatedAt", "upd")}
         FROM subscriptions s WHERE s.userId=? LIMIT 1`, [r.userId]);
    if (!s) { console.log("      (sin sub)"); continue; }
    const okStatus = s.status === "past_due";
    const okCat = s.declineCategory === "soft";
    const dia = s.retry_mad ? Number(s.retry_mad.slice(8, 10)) : null;
    const okDia = dia !== null && dia <= 4;
    console.log(`      sub#${s.id}  status=${s.status} ${okStatus ? "✅" : "❌ (esperado past_due)"}`);
    console.log(`      categoría=${s.declineCategory ?? "—"} ${okCat ? "✅" : "❌ (esperado soft)"}  ·  code=${s.lastDeclineCode ?? "—"}  ·  retries=${s.retryCount}`);
    console.log(`      próximo reintento: ${tzShow(s, "retry")}  ${okDia ? "✅ (día " + dia + " del mes)" : "❌ (esperado día 1-4)"}`);
    console.log(`      actualizada: ${tzShow(s, "upd")}`);
    console.log(`      VEREDICTO: ${okStatus && okCat && okDia ? "✅ SMOKE OK — aparcada, no cancelada" : "❌ REVISAR"}`);
  }
}

// ══════════════ 5) altas reales del viernes ══════════════
console.log(`\n\n████ 5) ALTAS DEL VIERNES ${VIE} — para cruzar con Google Ads ████`);
const [altas] = await db.query(
  `SELECT c.id, c.userId, c.provider, c.status, c.amountCents, c.errorDetail,
          c.sipayTransactionId txn, ${tzCols("c.createdAt", "ts")},
          u.email, u.country, ${tzCols("u.createdAt", "reg")}
     FROM charges c LEFT JOIN users u ON u.id = c.userId
    WHERE c.provider <> 'mit'
      AND c.createdAt >= ${ini(VIE)} AND c.createdAt <= ${fin(VIE)}
    ORDER BY c.createdAt`);
const esTest = (e) => /sergisd39|prueba|test@|\+test|clicklabs|iqboost/i.test(String(e ?? ""));
const ok = altas.filter((r) => r.status === "ok");
const okReal = ok.filter((r) => !esTest(r.email));
const okTest = ok.filter((r) => esTest(r.email));
console.log(`  intentos totales: ${altas.length}  ·  OK ${ok.length}  ·  KO ${altas.length - ok.length}`);
console.log(`  ── ALTAS OK REALES: ${okReal.length}  (${eur(okReal.reduce((a, r) => a + r.amountCents, 0))}) ──`);
console.log(`  hora (Mad/UTC)      método    importe   país  email`);
for (const r of okReal)
  console.log(`  ${r.ts_mad.slice(11, 16)} / ${r.ts_utc.slice(11, 16)}   ${String(r.provider).padEnd(8)} ${eur(r.amountCents).padStart(7)}   ${String(r.country ?? "—").padEnd(4)}  ${r.email ?? "—"}`);
if (okTest.length) {
  console.log(`\n  ── excluidas por parecer de prueba: ${okTest.length} ──`);
  for (const r of okTest) console.log(`  ${r.ts_mad.slice(11, 16)}  ${r.provider}  ${r.email}`);
}
const porProv = {};
for (const r of okReal) porProv[r.provider] = (porProv[r.provider] ?? 0) + 1;
console.log(`\n  por método: ${Object.entries(porProv).map(([p, n]) => `${p} ${n}`).join(" · ") || "—"}`);
const usuariosNuevos = okReal.filter((r) => r.reg_mad && r.reg_mad.slice(0, 10) === VIE).length;
console.log(`  de esas altas, registradas el mismo viernes: ${usuariosNuevos}/${okReal.length}`);
const ko = altas.filter((r) => r.status !== "ok");
if (ko.length) {
  const kc = {};
  for (const r of ko) { const c = String(r.errorDetail ?? "?").split(":")[0]; kc[c] = (kc[c] ?? 0) + 1; }
  console.log(`  intentos de alta fallidos: ${ko.length} — ${Object.entries(kc).map(([c, n]) => `${c}×${n}`).join(" · ")}`);
}

await db.end();
