// READ-ONLY — tabla de los 12 casos de código 121 con su transaction_id, para
// pegar en la consulta a Sipay. Horas en UTC y Madrid (norma 2026-08-06).
import { openDb, tzCols } from "./_db.mjs";
const db = await openDb();

const [ev] = await db.query(
  `SELECT eventId, payload, ${tzCols("receivedAt", "ts")}
     FROM webhook_events WHERE eventType LIKE 'mit%' ORDER BY receivedAt`);

const casos = [];
for (const e of ev) {
  let p = e.payload;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch { continue; } }
  const pl = p?.payload ?? {};
  if (String(pl.code) !== "121") continue;
  casos.push({
    fecha_utc: e.ts_utc, fecha_mad: e.ts_mad,
    txn: pl.transaction_id ?? "", order: pl.order ?? e.eventId,
    tarjeta: pl.masked_card ?? "", marca: pl.card_brand ?? "",
    tipo: pl.card_type ?? "", caduca: pl.expiration ?? "", pais: pl.card_country ?? "",
    detail: p?.detail ?? "", descripcion: p?.description ?? "",
  });
}

console.log(`casos con código 121: ${casos.length}\n`);
console.log("| # | Fecha (UTC) | Fecha (Madrid) | transaction_id | order | Tarjeta | Marca | Tipo | Caduca |");
console.log("|---|---|---|---|---|---|---|---|---|");
casos.forEach((c, i) =>
  console.log(`| ${i + 1} | ${c.fecha_utc} | ${c.fecha_mad} | \`${c.txn}\` | \`${c.order}\` | ${c.tarjeta} | ${c.marca} | ${c.tipo} | ${c.caduca} |`));

console.log("\n— texto que nos devuelve Sipay en TODOS ellos —");
const textos = [...new Set(casos.map((c) => `detail="${c.detail}" / description="${c.descripcion}"`))];
for (const t of textos) console.log(`  ${t}`);
await db.end();
