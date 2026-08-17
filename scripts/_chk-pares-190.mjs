// SOLO LECTURA. ¿Tenemos la prueba de "la misma tarjeta deniega y luego aprueba"?
// Los cargos denegados a menudo no traen `sipayMaskedCard` (la respuesta de error
// no lo incluye), así que hay que emparejar por usuario: en MIT-R el token es
// `usr-<userId>` y apunta SIEMPRE a la misma tarjeta guardada, así que dos cargos
// del mismo usuario son de la misma tarjeta por construcción.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const [[cob]] = await db.query(
  `SELECT SUM(status<>'ok') ko, SUM(status<>'ok' AND (sipayMaskedCard IS NULL OR sipayMaskedCard='')) koSinTarjeta
     FROM charges WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL 7 DAY`);
console.log(`Denegados en 7 días: ${cob.ko}   de ellos SIN tarjeta enmascarada: ${cob.koSinTarjeta}`);

const [pares] = await db.query(
  `SELECT c1.id koId, c1.userId, c1.amountCents impKo, c1.provider,
          ${tzCols("c1.createdAt", "ko")},
          c2.id okId, c2.amountCents impOk, c2.sipayMaskedCard tarjeta,
          ${tzCols("c2.createdAt", "ok")},
          TIMESTAMPDIFF(MINUTE, c1.createdAt, c2.createdAt) minutos
     FROM charges c1
     JOIN charges c2 ON c2.userId = c1.userId AND c2.status='ok' AND c2.createdAt > c1.createdAt
    WHERE c1.status <> 'ok' AND c1.createdAt >= UTC_TIMESTAMP() - INTERVAL 14 DAY
      AND c1.amountCents >= 1000 AND c2.amountCents >= 1000
    ORDER BY c1.createdAt DESC, c2.createdAt ASC`);
const vistos = new Set(); const buenos = [];
for (const p of pares) { if (vistos.has(p.koId)) continue; vistos.add(p.koId); buenos.push(p); }
console.log(`\nPares "denegada → aprobada" (misma tarjeta guardada, 14 días): ${buenos.length}`);
for (const p of buenos.slice(0, 20)) {
  console.log(`  user=${p.userId} ${p.provider}  DENEGADA ${p.ko_mad} (${(p.impKo / 100).toFixed(2)} €)  →  APROBADA ${p.ok_mad} (${(p.impOk / 100).toFixed(2)} €)  tras ${p.minutos} min  tarjeta ${p.tarjeta ?? "?"}`);
}
await db.end();
process.exit(0);
