// SOLO LECTURA. Cuánto se espera entre un cobro rechazado y su reintento.
// Un reintento a las pocas horas es machacar al banco (y arriesgarse a que
// marquen el comercio); la política escribe días, y esto comprueba si se cumple.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const DIAS = Number(process.argv[2] ?? 30);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}   (ventana: ${DIAS} días)\n`);

const [at] = await db.query(
  `SELECT subscriptionId, responseCode, success, attemptedAt
     FROM payment_attempts
    WHERE attemptedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND (amountCents IS NULL OR amountCents >= 1000)
    ORDER BY subscriptionId, attemptedAt`, [DIAS]);

const porSub = new Map();
for (const a of at) {
  if (!porSub.has(a.subscriptionId)) porSub.set(a.subscriptionId, []);
  porSub.get(a.subscriptionId).push(a);
}

const huecos = [];
for (const lista of porSub.values()) {
  for (let i = 1; i < lista.length; i++) {
    const h = (new Date(lista[i].attemptedAt) - new Date(lista[i - 1].attemptedAt)) / 3600000;
    huecos.push({ horas: h, code: String(lista[i - 1].responseCode ?? "?") });
  }
}
huecos.sort((a, b) => a.horas - b.horas);

const tramos = [
  ["menos de 1 h", (h) => h < 1],
  ["1-6 h", (h) => h >= 1 && h < 6],
  ["6-24 h", (h) => h >= 6 && h < 24],
  ["1-3 días", (h) => h >= 24 && h < 72],
  ["3-7 días", (h) => h >= 72 && h < 168],
  ["más de 7 días", (h) => h >= 168],
];
console.log("████ ESPACIADO ENTRE INTENTOS ████");
for (const [nombre, test] of tramos) {
  const n = huecos.filter((x) => test(x.horas)).length;
  console.log(`  ${nombre.padEnd(15)} ${String(n).padStart(4)}  ${"█".repeat(Math.min(40, n))}`);
}
if (huecos.length) {
  const mediana = huecos[Math.floor(huecos.length / 2)].horas;
  console.log(`\n  intervalos medidos: ${huecos.length}   mediana: ${(mediana / 24).toFixed(1)} días   mínimo: ${huecos[0].horas.toFixed(1)} h`);
  const sospechosos = huecos.filter((x) => x.horas < 20);
  if (sospechosos.length) {
    console.log(`  ⚠ ${sospechosos.length} intervalos por debajo de 20 h (la política exige mínimo 24 h)`);
    for (const s of sospechosos.slice(0, 6)) console.log(`     ${s.horas.toFixed(1)} h tras un ${s.code}`);
  } else {
    console.log("  ✓ ningún reintento antes de 20 h: se respeta el mínimo de 24 h");
  }
}
await db.end();
process.exit(0);
