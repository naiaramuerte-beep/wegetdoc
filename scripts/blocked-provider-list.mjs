// READ-ONLY: subs en estado blocked_provider (172/174) — lista de RECUPERACIÓN
// para cuando Sipay confirme el arreglo. Incluye sipayToken (¿se puede recobrar?)
// y BIN. Uso: railway run node scripts/blocked-provider-list.mjs "<ruta_csv>"
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "node:fs";
dotenv.config();
const out = process.argv[2] || "./blocked-provider.csv";
const db = await mysql.createConnection(process.env.DATABASE_URL);
const iso = d => d ? new Date(d).toISOString() : "";
const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;

// blockedAt puede no existir aún (pre-migración) → detectarlo.
const [hasCol] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'blockedAt'`);
const blockedExpr = hasCol.length ? "s.blockedAt" : "s.updatedAt";
// Selección robusta pre/post-deploy: por categoría si existe, si no por código.
const [hasCat] = await db.query(`SHOW COLUMNS FROM subscriptions LIKE 'declineCategory'`);
const where = hasCat.length && /blocked_provider/.test(hasCat[0].Type)
  ? "s.declineCategory='blocked_provider'"
  : "s.status='past_due' AND s.lastDeclineCode IN ('172','174')";

const [rows] = await db.query(`
  SELECT s.id subId, s.userId, u.email, s.sipayProvider, s.sipayMaskedCard, s.sipayToken,
         s.lastDeclineCode, ${blockedExpr} blockedAt, s.currentPeriodEnd
  FROM subscriptions s LEFT JOIN users u ON u.id = s.userId
  WHERE ${where} ORDER BY ${blockedExpr}`);

const header = ["subId","userId","email","metodo","BIN","tarjeta","tieneToken","codigo","blockedAt","finPeriodo"];
const lines = [header.join(",")];
for (const r of rows) lines.push([
  r.subId, r.userId, esc(r.email), r.sipayProvider||"", esc((r.sipayMaskedCard||"").slice(0,7)),
  esc(r.sipayMaskedCard), r.sipayToken ? "si" : "no", r.lastDeclineCode, iso(r.blockedAt), iso(r.currentPeriodEnd)
].join(","));
fs.writeFileSync(out, "﻿" + lines.join("\r\n"), "utf8");

console.log(`En blocked_provider ahora mismo: ${rows.length}  (filtro: ${where})`);
console.log(`Recuperables con token: ${rows.filter(r=>r.sipayToken).length}`);
console.log(`CSV escrito en: ${out}`);
await db.end();
