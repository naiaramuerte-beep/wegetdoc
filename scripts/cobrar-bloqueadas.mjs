// Intento de cobro a las subs bloqueadas por el emisor (códigos 172/174).
//
//   railway run node scripts/cobrar-bloqueadas.mjs             ← SECO
//   railway run node scripts/cobrar-bloqueadas.mjs --ejecutar
//
// SECO POR DEFECTO. Sin --ejecutar no cobra nada.
//
// QUÉ ES 172/174: el emisor no rechaza por saldo, rechaza el TIPO de operación
// —un cobro recurrente sin que el titular esté presente—. Reintentar lo mismo da
// lo mismo: de 56 clientes en esta situación se han hecho 100 intentos y han
// entrado 2 (3,6 %). Esto se ejecuta sabiendo eso.
//
// POR QUÉ SE COBRA UN PERIODO NUEVO Y NO EL VENCIDO: estas subs están canceladas
// o en impago, y en ambos estados el sistema ya les cerró el acceso. Cobrarles el
// mes que ya pasó sería cobrar un mes sin servicio — un cargo que se pierde en
// disputa siempre, porque no hay nada que el cliente haya recibido a cambio. Al
// cobrar entra un periodo de 30 días desde hoy y se les restablece el acceso, así
// que los 29,95 € compran algo.
import { openDb, tzCols, tzShow } from "./_db.mjs";
import crypto from "node:crypto";

const EJECUTAR = process.argv.includes("--ejecutar");
const iL = process.argv.indexOf("--limite");
const LIMITE = iL >= 0 ? Math.max(1, Number(process.argv[iL + 1]) || 999) : 999;

const ENDPOINT = process.env.SIPAY_ENDPOINT || "https://live.sipay.es";
const KEY = process.env.SIPAY_KEY, SECRET = process.env.SIPAY_SECRET, RESOURCE = process.env.SIPAY_RESOURCE;
if (EJECUTAR && (!KEY || !SECRET || !RESOURCE)) {
  console.error("❌ Faltan credenciales de Sipay. Usa `railway run`.");
  process.exit(1);
}

const db = await openDb();
const eur = (c) => (c / 100).toFixed(2).replace(".", ",") + " €";

// Precio vigente, no uno escrito a mano.
const [[ps]] = await db.query("SELECT value FROM site_settings WHERE `key`='subscription_price_eur'");
const PRECIO_CENTS = Math.round(Number(String(ps?.value ?? "29.95").replace(",", ".")) * 100);

const [subs] = await db.query(
  `SELECT s.id, s.userId, u.email, s.status, s.sipayToken, s.lastDeclineCode,
          ${tzCols("s.currentPeriodEnd", "fin")},
          DATEDIFF(UTC_TIMESTAMP(), s.currentPeriodEnd) dias_vencida
     FROM subscriptions s JOIN users u ON u.id = s.userId
    WHERE s.lastDeclineCode IN ('172','174')
      AND s.sipayToken IS NOT NULL AND s.sipayToken <> ''
      AND s.status IN ('canceled','past_due')
    ORDER BY s.currentPeriodEnd DESC
    LIMIT ${LIMITE}`);

console.log(`Modo: ${EJECUTAR ? "💳 COBRO REAL" : "🔍 SECO (no se cobra nada)"}`);
console.log(`Precio vigente: ${eur(PRECIO_CENTS)}`);
console.log(`Subs bloqueadas por 172/174 con token: ${subs.length}\n`);

const porEstado = {};
for (const s of subs) porEstado[s.status] = (porEstado[s.status] ?? 0) + 1;
console.log("Reparto:", Object.entries(porEstado).map(([k, v]) => `${k}=${v}`).join(" · "));
console.log(`Expectativa realista según el histórico (3,6 %): ${Math.round(subs.length * 0.036)} cobros de ${subs.length}\n`);

for (const s of subs.slice(0, 12)) {
  console.log(`  #${s.id} ${String(s.email).padEnd(34)} ${s.status.padEnd(9)} código ${s.lastDeclineCode} · venció hace ${s.dias_vencida}d`);
}
if (subs.length > 12) console.log(`  … y ${subs.length - 12} más`);

if (!EJECUTAR) {
  console.log(`\n🔍 Seco. Nada cobrado. Para ejecutar de verdad:`);
  console.log(`   railway run node scripts/cobrar-bloqueadas.mjs --ejecutar`);
  console.log(`\n   Sugerencia: prueba primero con --limite 5 para ver si el emisor sigue bloqueando`);
  console.log(`   antes de lanzar 65 intentos más contra el ratio de denegaciones.`);
  await db.end();
  process.exit(0);
}

// ── cobro MIT-R en dos pasos (all-in-one + confirm) ─────────────────────────
/**
 * ¿Cobró de verdad?
 *
 * NO basta con que Sipay devuelva un `transaction_id`. El 12-ago-2026 este
 * script dio 5 cobros por buenos y los 5 estaban DENEGADOS (172/174/180): el
 * identificador existe siempre, porque identifica el INTENTO, no el cargo.
 * Lo que distingue un cobro de un rechazo es `code === "0"` con un
 * `authorization_id` no vacío — el número que da el banco al autorizar.
 */
function cobroReal(payload) {
  const code = String(payload?.code ?? "");
  const auth = String(payload?.authorization_id ?? payload?.approval ?? "").trim();
  return code === "0" && auth.length > 0;
}

async function sipay(path, payload) {
  const body = JSON.stringify({ key: KEY, resource: RESOURCE, nonce: Date.now().toString(), mode: "sha256", payload });
  const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  const res = await fetch(`${ENDPOINT}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Signature": signature },
    body,
  });
  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return { _raw: raw }; }
}

let ok = 0, fallos = 0;
const codigos = {};

for (const s of subs) {
  const order = `mit-recover-${s.userId}-${Date.now()}`;
  // Paso 1: MIT-R no captura, solo arranca. Devuelve un request_id.
  const r1 = await sipay("/mdwr/v1/all-in-one", {
    amount: String(PRECIO_CENTS), currency: "EUR", order,
    token: s.sipayToken, sca_exemptions: "MIT", reason: "R",
  });
  const reqId = r1?.request_id ?? r1?.payload?.request_id ?? null;

  // Paso 2: el cargo solo ocurre al confirmar ese request_id.
  let resp = r1;
  if (!cobroReal(r1?.payload) && reqId) {
    resp = await sipay("/mdwr/v1/all-in-one/confirm", { request_id: reqId });
  }
  const txn = resp?.payload?.transaction_id ?? null;

  if (!cobroReal(resp?.payload)) {
    const cod = String(resp?.payload?.code ?? resp?.code ?? "?");
    codigos[cod] = (codigos[cod] ?? 0) + 1;
    fallos++;
    console.log(`  ❌ #${s.id} ${s.email} → código ${cod}${txn ? ` (txn ${txn}, sin autorización)` : ""}`);
    continue;
  }

  // Cobrado: periodo NUEVO de 30 días desde hoy y acceso restablecido — el
  // dinero compra servicio, no cubre un hueco en el que no lo tuvo.
  const ahora = new Date();
  const fin = new Date(ahora.getTime() + 30 * 24 * 3600 * 1000);
  await db.query(
    `UPDATE subscriptions
        SET status='active', plan='monthly', currentPeriodStart=?, currentPeriodEnd=?,
            retryCount=0, nextRetryAt=NULL, lastDeclineCode=NULL, declineCategory=NULL,
            blockedAt=NULL, updatedAt=UTC_TIMESTAMP()
      WHERE id=?`, [ahora, fin, s.id]);
  await db.query(
    `INSERT INTO charges (userId, provider, amountCents, currency, sipayTransactionId, sipayOrder, status, createdAt)
     VALUES (?, 'mit', ?, 'EUR', ?, ?, 'ok', UTC_TIMESTAMP())`,
    [s.userId, PRECIO_CENTS, txn, order]);
  ok++;
  console.log(`  ✅ #${s.id} ${s.email} → cobrado ${eur(PRECIO_CENTS)} · txn ${txn} · acceso hasta ${fin.toISOString().slice(0, 10)}`);
}

console.log(`\nCobrados ${ok} · fallidos ${fallos}`);
if (Object.keys(codigos).length) console.log("Códigos de rechazo:", Object.entries(codigos).map(([k, v]) => `${k}×${v}`).join(" · "));
console.log(`Ingreso: ${eur(ok * PRECIO_CENTS)}`);

await db.end();
process.exit(0);
