// SOLO LECTURA. ¿Cuántas veces se reintenta DE VERDAD cada cobro rechazado?
//
// La política dice: 190 → 3 reintentos, 116 → 4, 181/182 → 2, 121 → 2,
// 172/174 → 0 (bloqueado, no se toca), hard → 0 (cancelar). Esto comprueba si
// eso es lo que ocurre, contando los intentos reales de `payment_attempts` y
// agrupándolos por suscripción y ciclo. Interesa por los dos lados:
//   · pasarse = machacar al banco con cargos que no van a pasar (y arriesgarse
//     a que marquen el comercio),
//   · quedarse corto = dejar dinero sin cobrar porque el reintento nunca sale.
//
//   railway run node scripts/_chk-reintentos-reales.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";

const DIAS = Number(process.argv[2] ?? 30);
const MAXIMOS = { "190": 3, "116": 4, "181": 2, "182": 2, "121": 2, "912": 3, "9912": 3, TECH: 3, TIMEOUT: 3, "172": 0, "174": 0 };
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}   (ventana: ${DIAS} días)\n`);

// Intentos de renovación (los del cron, importe >= 10 €) por suscripción.
const [at] = await db.query(
  `SELECT subscriptionId, userId, responseCode, success,
          ${tzCols("attemptedAt", "cuando")}
     FROM payment_attempts
    WHERE attemptedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND (amountCents IS NULL OR amountCents >= 1000)
    ORDER BY subscriptionId, attemptedAt`, [DIAS]);

// Agrupar por suscripción: cuántos intentos, con qué códigos, y si acabó bien.
const porSub = new Map();
for (const a of at) {
  if (!porSub.has(a.subscriptionId)) porSub.set(a.subscriptionId, { userId: a.userId, intentos: [], ok: false });
  const g = porSub.get(a.subscriptionId);
  g.intentos.push({ code: String(a.responseCode ?? "?"), ok: !!a.success, cuando: a.cuando_mad });
  if (a.success) g.ok = true;
}

const reparto = new Map();
const excesos = [];
for (const [subId, g] of porSub) {
  const fallos = g.intentos.filter((x) => !x.ok);
  const n = fallos.length;
  reparto.set(n, (reparto.get(n) ?? 0) + 1);
  // ¿Se ha pasado del máximo que marca su propio código?
  const codigo = fallos.length ? fallos[fallos.length - 1].code : null;
  const max = codigo != null ? MAXIMOS[codigo] : undefined;
  // n intentos fallidos = 1 original + (n-1) reintentos.
  if (max !== undefined && n - 1 > max) {
    excesos.push({ subId, userId: g.userId, codigo, reintentos: n - 1, max, cobrado: g.ok });
  }
}

console.log("████ INTENTOS FALLIDOS POR SUSCRIPCIÓN (ventana) ████");
console.log("fallos   suscripciones   (1 fallo = cobro original sin reintentar aún)");
for (const [n, c] of [...reparto].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${String(n).padStart(2)}      ${String(c).padStart(5)}   ${"█".repeat(Math.min(50, c))}`);
}
const totalSubs = porSub.size;
const conReintento = [...porSub.values()].filter((g) => g.intentos.filter((x) => !x.ok).length > 1).length;
console.log(`\nSuscripciones con algún intento: ${totalSubs}`);
console.log(`De ésas, con AL MENOS un reintento: ${conReintento} (${totalSubs ? Math.round(100 * conReintento / totalSubs) : 0} %)`);

console.log(`\n████ ¿ALGUNA SE PASA DE SU MÁXIMO? (${excesos.length}) ████`);
if (!excesos.length) console.log("  ninguna: el tope por código se respeta");
for (const e of excesos.slice(0, 15)) {
  console.log(`  ⚠ sub#${e.subId} user=${e.userId} código ${e.codigo}: ${e.reintentos} reintentos (máx ${e.max})${e.cobrado ? " — acabó cobrando" : ""}`);
}

// Cuántos de los reintentos sirven de algo.
const [ren] = await db.query(
  `SELECT COUNT(*) n, SUM(success) ok FROM payment_attempts
    WHERE attemptedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND (amountCents IS NULL OR amountCents >= 1000)`, [DIAS]);
console.log(`\nIntentos totales en la ventana: ${ren[0].n}   con éxito: ${ren[0].ok}   (${ren[0].n ? Math.round(100 * ren[0].ok / ren[0].n) : 0} %)`);

await db.end();
process.exit(0);
