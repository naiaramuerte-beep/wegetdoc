// READ-ONLY: dump real Sipay MIT failure payloads to locate the exact field
// where the Redsys decline code arrives. Prints the full JSON of a few recent
// failures + a scan of every plausible code-bearing key across all failures.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await db.query(`
  SELECT id, eventId, errorMessage, payload, receivedAt
  FROM webhook_events
  WHERE eventType = 'mit_charge_failed'
  ORDER BY receivedAt DESC
  LIMIT 60`);

console.log(`=== mit_charge_failed events: ${rows.length} ===\n`);

// 1) Full JSON of the 3 most recent, pretty-printed, to eyeball the structure.
console.log("──────── 3 PAYLOADS COMPLETOS (mas recientes) ────────");
for (const r of rows.slice(0, 3)) {
  let p;
  try { p = JSON.parse(r.payload); } catch { p = r.payload; }
  console.log(`\n# event ${r.id} @ ${r.receivedAt?.toISOString?.() ?? r.receivedAt}`);
  console.log(`  errorMessage: ${r.errorMessage}`);
  console.log(JSON.stringify(p, null, 2));
}

// 2) Scan every failure for plausible code-bearing keys at both top level and
//    inside .payload, tally which keys actually carry a non-"0" numeric code.
console.log("\n\n──────── SCAN de campos con codigo, en todas las fallidas ────────");
const KEYS = ["code","error_code","errorCode","response_code","responseCode",
  "status_code","statusCode","return_code","reason_code","reasonCode",
  "ds_response","dsResponse","detail","description","message","type"];
const tally = {};
const seenValues = {};
for (const r of rows) {
  let p; try { p = JSON.parse(r.payload); } catch { continue; }
  const scopes = { top: p, payload: p?.payload };
  for (const [scopeName, obj] of Object.entries(scopes)) {
    if (!obj || typeof obj !== "object") continue;
    for (const k of KEYS) {
      if (obj[k] !== undefined && obj[k] !== null) {
        const key = `${scopeName}.${k}`;
        tally[key] = (tally[key] ?? 0) + 1;
        (seenValues[key] ??= new Set()).add(String(obj[k]).slice(0, 40));
      }
    }
  }
}
const summary = Object.entries(tally).map(([k, n]) => ({
  campo: k, apariciones: n, valores_vistos: [...seenValues[k]].slice(0, 12).join(" | "),
})).sort((a, b) => b.apariciones - a.apariciones);
console.table(summary);

await db.end();
