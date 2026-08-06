// READ-ONLY: subs canceladas por códigos que creemos MAL clasificados y que
// entran en la MISMA ola de re-autorización. No toca nada, solo exporta.
//
//   172 / 174 → blocked_provider (cambio de Sipay del 19/07/2026, sin confirmar)
//   121        → "límite excedido" (forense 2026-08-06: 8/8 tarjetas vivas,
//                0/12 caducadas). Ver [[code-121-classification]].
//
// Sustituye a scripts/canceled-172-174-list.mjs (que solo cubría 172/174 y usaba
// conexión sin UTC). Horas en UTC y Madrid (norma 2026-08-06).
//
// Uso: railway run node scripts/lista-recuperacion.mjs [ruta_csv_salida]
import { openDb, tzCols } from "./_db.mjs";
import fs from "node:fs";

const CODIGOS = ["172", "174", "121"];
const out = process.argv[2] || "./docs/reauth-canceladas.csv";
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const db = await openDb();

const [rows] = await db.query(
  `SELECT s.id subId, s.userId, u.email, s.sipayProvider, s.sipayMaskedCard,
          s.lastDeclineCode, s.plan, s.trialDays,
          ${tzCols("s.updatedAt", "cancel")},
          ${tzCols("s.currentPeriodEnd", "fin")},
          ${tzCols("s.createdAt", "alta")}
     FROM subscriptions s LEFT JOIN users u ON u.id = s.userId
    WHERE s.status='canceled' AND s.lastDeclineCode IN (?)
    ORDER BY s.lastDeclineCode, s.updatedAt`, [CODIGOS]);

// importe del último cargo MIT fallido + si la tarjeta llegó a cobrar alguna vez
for (const r of rows) {
  const [[c]] = await db.query(
    `SELECT amountCents FROM charges WHERE userId=? AND provider='mit' AND status='failed'
      ORDER BY createdAt DESC LIMIT 1`, [r.userId]);
  r.amountEur = c ? (c.amountCents / 100).toFixed(2) : "";
  const [[ok]] = await db.query(
    `SELECT COUNT(*) n FROM charges WHERE userId=? AND status='ok'`, [r.userId]);
  r.cobrosOk = ok.n;                      // >0 ⇒ tarjeta demostrablemente viva
  r.bin = (r.sipayMaskedCard || "").slice(0, 7);
}

const header = ["subId", "userId", "email", "codigo", "metodo", "BIN", "tarjeta",
  "cobrosOkHistoricos", "importeEur", "plan", "trialDays",
  "altaUTC", "altaMadrid", "cancelUTC", "cancelMadrid", "finPeriodoUTC"];
const lines = [header.join(",")];
for (const r of rows) lines.push([
  r.subId, r.userId, esc(r.email), r.lastDeclineCode, r.sipayProvider || "",
  esc(r.bin), esc(r.sipayMaskedCard), r.cobrosOk, r.amountEur, r.plan, r.trialDays ?? "",
  esc(r.alta_utc), esc(r.alta_mad), esc(r.cancel_utc), esc(r.cancel_mad), esc(r.fin_utc),
].join(","));
fs.writeFileSync(out, "﻿" + lines.join("\r\n"), "utf8");

const porCodigo = {};
for (const r of rows) porCodigo[r.lastDeclineCode] = (porCodigo[r.lastDeclineCode] ?? 0) + 1;
const vivas = rows.filter((r) => r.cobrosOk > 0).length;

console.log("=== OLA DE RE-AUTORIZACIÓN — canceladas por código mal clasificado ===");
for (const [c, n] of Object.entries(porCodigo).sort()) console.log(`  código ${c}: ${n} subs`);
console.log(`  TOTAL: ${rows.length} subs`);
console.log(`  con cobro OK histórico (tarjeta viva): ${vivas}/${rows.length}`);
// OJO: la cifra que vale es la REALISTA. El techo teórico (100% de recuperación)
// se coló una vez en el plan como si fuera el valor esperado — no repetirlo.
const TASA_RENOV = 0.32;                     // renovación efectiva observada
const techo = rows.length * 29.95;
console.log(`  recurrente REALISTA (${(TASA_RENOV * 100).toFixed(0)}% renovación): ${(techo * TASA_RENOV).toFixed(2)} €/mes  ← usar esta`);
console.log(`  techo teórico (100% recuperación, NO usar como previsión): ${techo.toFixed(2)} €/mes`);
console.log(`  CSV: ${out}`);
await db.end();
