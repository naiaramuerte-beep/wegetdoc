// READ-ONLY: lista de subs YA canceladas por 172/174 (no se tocan; solo export).
// Uso: railway run node scripts/canceled-172-174-list.mjs "<ruta_csv_salida>"
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "node:fs";
dotenv.config();
const out = process.argv[2] || "./canceled-172-174.csv";
const db = await mysql.createConnection(process.env.DATABASE_URL);
const iso = d => d ? new Date(d).toISOString() : "";
const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;

const [rows] = await db.query(`
  SELECT s.id subId, s.userId, u.email, s.sipayProvider, s.sipayMaskedCard,
         s.lastDeclineCode, s.updatedAt cancelDate, s.currentPeriodEnd
  FROM subscriptions s LEFT JOIN users u ON u.id = s.userId
  WHERE s.status='canceled' AND s.lastDeclineCode IN ('172','174')
  ORDER BY s.updatedAt`);

// importe del último cargo MIT fallido de cada usuario
for (const r of rows) {
  const [[c]] = await db.query(
    `SELECT amountCents FROM charges WHERE userId=? AND provider='mit' AND status='failed' ORDER BY createdAt DESC LIMIT 1`, [r.userId]);
  r.amountEur = c ? (c.amountCents/100).toFixed(2) : "";
  r.bin = (r.sipayMaskedCard || "").slice(0,7);
}

const header = ["subId","userId","email","metodo","BIN","tarjeta","codigo","importeEur","fechaCancelacion","finPeriodo"];
const lines = [header.join(",")];
for (const r of rows) lines.push([
  r.subId, r.userId, esc(r.email), r.sipayProvider||"", esc(r.bin), esc(r.sipayMaskedCard),
  r.lastDeclineCode, r.amountEur, iso(r.cancelDate), iso(r.currentPeriodEnd)
].join(","));
fs.writeFileSync(out, "﻿" + lines.join("\r\n"), "utf8");

console.log(`Canceladas por 172/174: ${rows.length}`);
console.log(`Recurrente proyectado: ${(rows.length*29.95).toFixed(2)}€/mes (a 29,95€)`);
console.log(`CSV escrito en: ${out}`);
await db.end();
