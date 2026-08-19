// SOLO LECTURA. La comprobación estricta: ¿se reintenta DESPUÉS de un código de
// bloqueo (172/174)? Esos códigos significan "no lo vuelvas a intentar por
// cobro automático", así que un intento posterior es una violación real de la
// política — no basta con mirar el último código de la serie, porque una sub
// puede fallar con 190 (reintentos legítimos) y devolver 172 al final.
//
// También separa lo anterior al despliegue del bloqueo (2026-08-04) de lo
// posterior: lo de antes es historia, lo de después sería un fallo vivo.
//   railway run node scripts/_chk-reintento-tras-bloqueo.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";

const DIAS = Number(process.argv[2] ?? 30);
const BLOQUEO = new Set(["172", "174"]);
const DESPLIEGUE_BLOQUEO = "2026-08-04 16:00:00"; // UTC, merge del blocked_provider
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}   (ventana: ${DIAS} días)`);
console.log(`Despliegue del bloqueo 172/174: ${DESPLIEGUE_BLOQUEO} UTC\n`);

const [at] = await db.query(
  `SELECT subscriptionId, userId, responseCode, success,
          ${tzCols("attemptedAt", "c")}
     FROM payment_attempts
    WHERE attemptedAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
      AND (amountCents IS NULL OR amountCents >= 1000)
    ORDER BY subscriptionId, attemptedAt`, [DIAS]);

const porSub = new Map();
for (const a of at) {
  if (!porSub.has(a.subscriptionId)) porSub.set(a.subscriptionId, []);
  porSub.get(a.subscriptionId).push(a);
}

const antes = [], despues = [];
for (const [subId, lista] of porSub) {
  for (let i = 0; i < lista.length - 1; i++) {
    const code = String(lista[i].responseCode ?? "");
    if (!BLOQUEO.has(code)) continue;
    // Hay al menos un intento POSTERIOR a un código de bloqueo.
    const siguiente = lista[i + 1];
    const caso = {
      subId, userId: lista[i].userId, code,
      bloqueo: lista[i].c_mad, siguiente: siguiente.c_mad,
      codigoSiguiente: String(siguiente.responseCode ?? "?"),
      ok: !!siguiente.success,
    };
    (siguiente.c_utc >= DESPLIEGUE_BLOQUEO ? despues : antes).push(caso);
    break; // uno por sub basta para contarla
  }
}

console.log(`████ REINTENTOS DESPUÉS DE UN 172/174 ████`);
console.log(`  ANTES del despliegue del bloqueo (historia): ${antes.length}`);
console.log(`  DESPUÉS del despliegue (fallo vivo):         ${despues.length}`);
if (despues.length) {
  console.log("\n  Casos posteriores al despliegue:");
  for (const c of despues.slice(0, 15)) {
    console.log(`    ⚠ sub#${c.subId} user=${c.userId}: ${c.code} el ${c.bloqueo} → nuevo intento ${c.siguiente} (código ${c.codigoSiguiente}${c.ok ? ", COBRÓ" : ""})`);
  }
} else {
  console.log("\n  ✓ Ni un solo reintento tras un bloqueo desde que se desplegó.");
}

// Y el reverso: ¿cuántas quedaron correctamente paradas en blocked_provider?
const [[bl]] = await db.query(
  `SELECT COUNT(*) n FROM subscriptions WHERE declineCategory = 'blocked_provider'`);
console.log(`\nSuscripciones marcadas como blocked_provider (paradas a propósito): ${bl.n}`);
await db.end();
process.exit(0);
