import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()","ahora")}`);
console.log(`Corte: ${tzShow(t,"ahora")}   ·   deploy fue a las 11:17 Madrid\n`);

console.log("=== ¿HAY GENTE EN LA WEB? (últimos 90 min) ===");
for (const [et, tabla] of [["usuarios registrados","users"],["documentos subidos","documents"]]) {
  const [[r]] = await db.query(
    `SELECT COUNT(*) n, ${tzCols("MAX(createdAt)","ult")} FROM ${tabla}
      WHERE createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)`);
  console.log(`  ${et.padEnd(22)} ${String(r.n).padStart(3)}   último: ${r.ult_mad ?? "—"} Madrid`);
}

console.log("\n=== ¿ALGUIEN HA INTENTADO PAGAR? (últimos 90 min) ===");
const [ev] = await db.query(
  `SELECT ${tzCols("receivedAt","ts")}, eventType, status, LEFT(COALESCE(errorMessage,''),60) err
     FROM webhook_events
    WHERE receivedAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)
      AND (eventType LIKE 'gpay%' OR eventType LIKE 'apay%' OR eventType LIKE 'fastpay%' OR eventType LIKE 'alta_%')
    ORDER BY receivedAt`);
if (!ev.length) console.log("  NINGÚN evento de checkout → nadie ha pulsado pagar");
for (const r of ev) console.log(`  ${r.ts_mad.slice(11)}  ${r.eventType.padEnd(24)} ${r.status==='error'?'❌ '+r.err:''}`);

console.log("\n=== ALTAS DE HOY POR HORA (Madrid) ===");
const [h] = await db.query(
  `SELECT HOUR(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid')) hora, COUNT(*) n
     FROM charges WHERE provider<>'mit' AND status='ok'
      AND createdAt >= CONVERT_TZ(CONCAT(CURDATE(),' 00:00:00'),'Europe/Madrid','+00:00')
    GROUP BY hora ORDER BY hora`);
console.log("  " + (h.map(r=>`${r.hora}h:${r.n}`).join("  ") || "(ninguna hoy)"));

console.log("\n=== MISMO DOMINGO PASADO, MISMA FRANJA 10-12h ===");
const [d] = await db.query(
  `SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid'),'%Y-%m-%d') d,
          DAYNAME(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid')) dia, COUNT(*) n
     FROM charges WHERE provider<>'mit' AND status='ok'
      AND HOUR(CONVERT_TZ(createdAt,'+00:00','Europe/Madrid')) BETWEEN 10 AND 12
      AND createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY)
    GROUP BY d, dia ORDER BY d`);
for (const r of d) console.log(`  ${r.d} ${String(r.dia).padEnd(10)} ${r.n}`);
await db.end();
