/**
 * Reenvía el email de bienvenida a las altas cuyo envío falló.
 *
 *   railway run npx tsx scripts/reenviar-bienvenida.mjs            ← SECO
 *   railway run npx tsx scripts/reenviar-bienvenida.mjs --ejecutar ← envía
 *   ... --horas 48        ventana de altas a revisar (defecto 30)
 *
 * SECO POR DEFECTO. Sin --ejecutar no manda nada: imprime a quién escribiría,
 * con la fecha y hora exactas de cobro que llevaría cada correo.
 *
 * Por qué existe: el 12-ago-2026 la cuota diaria de Resend se agotaba de
 * madrugada con los emails de recuperación, y las altas del día se quedaban sin
 * su correo de bienvenida — que es el que dice cuándo se cobra. Los envíos
 * masivos ya están apagados, pero las altas que se quedaron sin aviso siguen
 * necesitándolo, sobre todo con la prueba de 24 h.
 *
 * La fecha de cobro NO se recalcula: se lee `currentPeriodEnd` de la propia
 * suscripción, que es la que va a usar el cron. Así el correo no puede prometer
 * una hora distinta de la que se cobrará.
 */
import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

const EJECUTAR = process.argv.includes("--ejecutar");
const iH = process.argv.indexOf("--horas");
const HORAS = iH >= 0 ? Math.max(1, Number(process.argv[iH + 1]) || 30) : 30;

const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, timezone: "Z" });

// El idioma sale del evento del alta (la página en la que compró) y solo si no
// lo hay se cae a users.language. Hasta el backfill del 12-ago esa columna era
// "es" para todo el mundo, así que fiarse de ella a secas habría escrito en
// castellano a compradores de gmx.at y gmx.de.
const [evs] = await db.query(
  `SELECT CAST(payload AS CHAR) p FROM webhook_events
    WHERE eventType IN ('fastpay_3ds_pending','fastpay_init_started')
      AND payload LIKE '%"lang"%' ORDER BY receivedAt`);
const SUPPORTED = ["es","en","fr","de","pt","it","nl","pl","ru","uk","ro","zh"];
const langDeEvento = new Map();
for (const e of evs) {
  let o; try { o = JSON.parse(e.p); } catch { continue; }
  const uid = Number(o?.userId);
  const l = String(o?.lang ?? "").trim().slice(0,2).toLowerCase();
  if (uid && SUPPORTED.includes(l)) langDeEvento.set(uid, l);
}
const [rows] = await db.query(
  `SELECT c.userId, u.email, u.name, u.language, s.currentPeriodEnd, s.trialHours,
          DATE_FORMAT(CONVERT_TZ(c.createdAt,'+00:00','Europe/Madrid'),'%Y-%m-%d %H:%i') alta_mad,
          DATE_FORMAT(CONVERT_TZ(s.currentPeriodEnd,'+00:00','Europe/Madrid'),'%Y-%m-%d %H:%i') cobro_mad
     FROM charges c
     JOIN users u ON u.id = c.userId
     JOIN subscriptions s ON s.userId = c.userId
    WHERE c.provider <> 'mit' AND c.status = 'ok'
      AND c.createdAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
      AND s.status IN ('trialing','active')
    ORDER BY c.createdAt`, [HORAS]);

// Un usuario puede tener más de un cargo de alta (recompra). El correo se manda
// una vez por persona, con la fecha de cobro de su suscripción viva.
const vistos = new Set();
const unicos = rows.filter((r) => !vistos.has(r.userId) && vistos.add(r.userId));

console.log(`Modo: ${EJECUTAR ? "✉️  ENVÍO REAL" : "🔍 SECO (no se manda nada)"}`);
console.log(`Altas de las últimas ${HORAS} h con suscripción viva: ${rows.length}\n`);

const { sendTrialWelcomeEmail } = EJECUTAR ? await import("../server/email.ts") : { sendTrialWelcomeEmail: null };

let ok = 0, fallos = 0;
for (const r of unicos) {
  const lang = langDeEvento.get(r.userId) ?? (r.language || "es").slice(0, 2);
  const plazo = r.trialHours ? `${r.trialHours} h` : "7 d (cohorte antigua)";
  console.log(`  ${r.email}  ·  lang=${lang}  ·  prueba ${plazo}`);
  console.log(`     alta ${r.alta_mad} Madrid  →  cobro ${r.cobro_mad} Madrid`);
  if (!EJECUTAR) continue;
  try {
    const enviado = await sendTrialWelcomeEmail({
      to: r.email,
      name: r.name ?? r.email,
      lang,
      trialEndDate: new Date(r.currentPeriodEnd),
    });
    if (enviado) { ok++; console.log("     ✅ enviado"); }
    else { fallos++; console.log("     ❌ NO enviado (revisa la cuota de Resend)"); }
  } catch (err) {
    fallos++;
    console.log(`     ❌ error: ${err?.message ?? err}`);
  }
}

if (EJECUTAR) console.log(`\nEnviados ${ok} · fallidos ${fallos}`);
else console.log(`\n🔍 Seco. Para enviar de verdad:\n   railway run npx tsx scripts/reenviar-bienvenida.mjs --ejecutar`);

await db.end();
process.exit(0);
