// Reembolso de los cargos DUPLICADOS del alta.
//
// SECO POR DEFECTO. Sin argumentos no toca nada: imprime exactamente lo que
// haría. Para ejecutar de verdad hay que pasar --ejecutar.
//
//   railway run node scripts/reembolsar-duplicados.mjs             ← seco
//   railway run node scripts/reembolsar-duplicados.mjs --ejecutar  ← devuelve
//
// QUÉ SE DEVUELVE Y QUÉ NO
// Para cada usuario con más de un cargo de alta, se conserva el PRIMERO (su
// alta legítima) y se devuelven los posteriores — pero SOLO si cayeron dentro
// de la ventana de duplicado. Un segundo cargo días después no es un error:
// es un cliente cuya suscripción caducó y volvió a darse de alta. Devolverle
// ese dinero sería quitarle el servicio que compró.
import crypto from "node:crypto";
import { openDb, tzCols } from "./_db.mjs";

const EJECUTAR = process.argv.includes("--ejecutar");
// Misma ventana que el guard del servidor (_core/altaGuard.ts). Los duplicados
// reales iban de 54 s a 43 min; las recompras legítimas, de 2,9 días en
// adelante. 120 min cae limpiamente en medio.
const VENTANA_MIN = 120;

const ENDPOINT = process.env.SIPAY_ENDPOINT || "https://live.sipay.es";
const KEY = process.env.SIPAY_KEY;
const SECRET = process.env.SIPAY_SECRET;
const RESOURCE = process.env.SIPAY_RESOURCE;
if (EJECUTAR && (!KEY || !SECRET || !RESOURCE)) {
  console.error("❌ Faltan SIPAY_KEY / SIPAY_SECRET / SIPAY_RESOURCE. Usa `railway run`.");
  process.exit(1);
}

async function sipayRefund({ amountCents, transactionId, order }) {
  const body = JSON.stringify({
    key: KEY, resource: RESOURCE, nonce: Date.now().toString(), mode: "sha256",
    payload: {
      amount: String(amountCents), currency: "EUR",
      ...(transactionId ? { transaction_id: transactionId } : {}),
      ...(order ? { order } : {}),
    },
  });
  const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  const res = await fetch(`${ENDPOINT}/mdwr/v1/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Signature": signature },
    body,
  });
  const raw = await res.text();
  let data = null;
  try { data = JSON.parse(raw); } catch { /* no JSON */ }
  return { ok: res.ok, data, raw };
}

const db = await openDb();
const eur = (c) => (c / 100).toFixed(2) + " €";

const [rows] = await db.query(
  `SELECT c.id, c.userId, u.email, c.provider, c.amountCents, c.refundedCents,
          c.sipayTransactionId txn, c.sipayOrder, ${tzCols("c.createdAt", "ts")},
          ROW_NUMBER() OVER (PARTITION BY c.userId ORDER BY c.createdAt) rn,
          COUNT(*) OVER (PARTITION BY c.userId) tot,
          TIMESTAMPDIFF(MINUTE,
            LAG(c.createdAt) OVER (PARTITION BY c.userId ORDER BY c.createdAt),
            c.createdAt) minsDesdeAnterior
     FROM charges c LEFT JOIN users u ON u.id = c.userId
    WHERE c.provider <> 'mit' AND c.status = 'ok'
    ORDER BY c.userId, c.createdAt`);

const aDevolver = [], recompras = [], yaDevueltos = [];
for (const r of rows) {
  if (r.tot < 2 || r.rn === 1) continue;             // alta legítima: se queda
  if ((r.refundedCents ?? 0) > 0) { yaDevueltos.push(r); continue; }
  if (r.minsDesdeAnterior !== null && r.minsDesdeAnterior > VENTANA_MIN) {
    recompras.push(r);                                // recompra, NO tocar
    continue;
  }
  aDevolver.push(r);
}

console.log(`Modo: ${EJECUTAR ? "⚠️  EJECUTAR (se devuelve dinero de verdad)" : "🔍 SECO (no se toca nada)"}`);
console.log(`Endpoint Sipay: ${ENDPOINT}\n`);

console.log(`═══ NO SE TOCAN — recompras legítimas (>${VENTANA_MIN} min de separación) ═══`);
for (const r of recompras)
  console.log(`  #${String(r.id).padEnd(5)} u=${String(r.userId).padEnd(7)} ${r.ts_mad}  +${(r.minsDesdeAnterior / 1440).toFixed(1)} días  ${r.email ?? "—"}`);
if (!recompras.length) console.log("  (ninguna)");
if (yaDevueltos.length) {
  console.log(`\n═══ YA DEVUELTOS ═══`);
  for (const r of yaDevueltos) console.log(`  #${r.id} u=${r.userId} ${eur(r.refundedCents)}`);
}

console.log(`\n═══ A DEVOLVER — ${aDevolver.length} cargos, ${eur(aDevolver.reduce((a, r) => a + r.amountCents, 0))} ═══`);
for (const r of aDevolver)
  console.log(`  #${String(r.id).padEnd(5)} u=${String(r.userId).padEnd(7)} ${r.ts_mad}  ${r.provider.padEnd(8)} ${eur(r.amountCents)}  +${r.minsDesdeAnterior} min  txn=${r.txn || "—"}  ${r.email ?? "—"}`);

const sinTxn = aDevolver.filter((r) => !r.txn);
if (sinTxn.length) console.log(`\n  ⚠️ ${sinTxn.length} sin transaction_id — se intentarán por 'order'.`);

if (!EJECUTAR) {
  console.log(`\n🔍 Seco. Nada devuelto. Para ejecutar:`);
  console.log(`   railway run node scripts/reembolsar-duplicados.mjs --ejecutar`);
  await db.end();
  process.exit(0);
}

console.log(`\n═══ EJECUTANDO ═══`);
let ok = 0, ko = 0;
for (const r of aDevolver) {
  process.stdout.write(`  #${r.id} u=${r.userId} ${eur(r.amountCents)} … `);
  try {
    const res = await sipayRefund({
      amountCents: r.amountCents,
      transactionId: r.txn || undefined,
      order: r.sipayOrder || undefined,
    });
    const code = res.data?.payload?.code ?? res.data?.code;
    if (!res.ok || code !== "0") {
      ko++;
      console.log(`❌ ${JSON.stringify(res.data ?? res.raw).slice(0, 160)}`);
      continue;
    }
    // El ledger se actualiza SOLO si Sipay confirmó, para que la tabla nunca
    // diga "devuelto" sobre dinero que sigue cobrado.
    await db.query(
      `UPDATE charges SET refundedCents = ?, status = 'refunded' WHERE id = ?`,
      [r.amountCents, r.id]);
    ok++;
    console.log(`✅ devuelto`);
  } catch (err) {
    ko++;
    console.log(`❌ excepción: ${err?.message ?? err}`);
  }
}
console.log(`\nResultado: ${ok} devueltos · ${ko} fallidos · ${eur(ok * 50)} reintegrados`);
await db.end();
