// SOLO LECTURA. Embudo hora a hora: cuánta gente llega al modal, cuánta se
// registra, cuánta arranca un pago, cuánta paga y cuánta falla — para separar
// "no entra gente" de "entra y algo la para". Marca la hora del despliegue y la
// del cambio de precio.
//   railway run node scripts/_chk-embudo-horas.mjs [horas]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const HORAS = Number(process.argv[2] ?? 12);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}   (ventana: últimas ${HORAS} h)\n`);

const H = (col) => `DATE_FORMAT(CONVERT_TZ(${col},'+00:00','Europe/Madrid'),'%d %Hh')`;
const filas = new Map();
const meter = (h, campo, n) => {
  if (!filas.has(h)) filas.set(h, { reg: 0, ini: 0, alta: 0, fallo: 0, doc: 0 });
  filas.get(h)[campo] += Number(n);
};

const [regs] = await db.query(
  `SELECT ${H("createdAt")} h, COUNT(*) n FROM users
    WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL ? HOUR GROUP BY h`, [HORAS]);
for (const r of regs) meter(r.h, "reg", r.n);

const [docs] = await db.query(
  `SELECT ${H("createdAt")} h, COUNT(*) n FROM documents
    WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL ? HOUR GROUP BY h`, [HORAS]);
for (const r of docs) meter(r.h, "doc", r.n);

const [ev] = await db.query(
  `SELECT ${H("receivedAt")} h,
          SUM(eventType LIKE '%init_started') ini,
          SUM(eventType LIKE '%intro_charge') alta,
          SUM(eventType LIKE '%charge_failed' OR eventType LIKE '%confirm_failed' OR eventType LIKE '%callback_ko') fallo
     FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? HOUR
      AND eventType NOT LIKE 'mit%'
    GROUP BY h`, [HORAS]);
for (const r of ev) { meter(r.h, "ini", r.ini); meter(r.h, "alta", r.alta); meter(r.h, "fallo", r.fallo); }

console.log("hora (Madrid)   registros   documentos   inicios de pago   altas   fallos");
console.log("─".repeat(76));
for (const [h, f] of [...filas].sort()) {
  console.log(`  ${h.padEnd(12)}${String(f.reg).padStart(8)}${String(f.doc).padStart(13)}${String(f.ini).padStart(18)}${String(f.alta).padStart(8)}${String(f.fallo).padStart(9)}`);
}
console.log("\n  (deploy del anclaje de precio: 17 21:0x · precio a 39,90 €: 17 20:57)");

// Detalle de los fallos recientes del ALTA (no renovaciones): qué dice Sipay.
const [fallos] = await db.query(
  `SELECT id, eventType, ${tzCols("receivedAt", "r")}, LEFT(payload, 220) p
     FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? HOUR
      AND eventType NOT LIKE 'mit%'
      AND (eventType LIKE '%failed' OR eventType LIKE '%ko' OR eventType LIKE '%error%' OR eventType LIKE '%missing%')
    ORDER BY id DESC LIMIT 12`, [HORAS]);
console.log(`\n████ FALLOS DEL ALTA EN LA VENTANA (${fallos.length}) ████`);
for (const f of fallos) {
  console.log(`#${f.id} ${f.eventType}  ${tzShow(f, "r")}`);
  console.log(`   ${String(f.p).replace(/\s+/g, " ").slice(0, 190)}`);
}
await db.end();
process.exit(0);
