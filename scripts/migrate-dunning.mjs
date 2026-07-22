// Migración de DATOS del dunning v2. DRY-RUN por defecto (solo SELECT + print).
// Reencaja las suscripciones que hoy están en el dunning viejo al nuevo modelo:
//   - Bucket A (CANCELAR): vencidas hace >21 días → status=canceled, nextRetryAt=null.
//   - Bucket B (REENCAJAR): vencidas hace <21 días → recomputar nextRetryAt con el
//     nuevo calendario según el último código conocido y los reintentos ya hechos.
//     Si el último código es HARD → cancelar.
//
// Uso:
//   railway run pnpm exec tsx scripts/migrate-dunning.mjs            (dry-run, no escribe)
//   railway run pnpm exec tsx scripts/migrate-dunning.mjs --execute  (aplica cambios)
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { classifyDecline, decideNextRetry } from "../server/_core/dunning.ts";
dotenv.config();

const EXECUTE = process.argv.includes("--execute");
const now = new Date();
const DAY = 24 * 3600 * 1000;
const WINDOW_DAYS = 21;

// ⚠️ BUG CONOCIDO DE ZONA HORARIA (documentado, no corregido — ver más abajo).
// Esta conexión NO fija `timezone`, así que mysql2 usa `timezone:'local'`. Al
// pasar un objeto Date como parámetro (ver el UPDATE de nextRetryAt), mysql2 lo
// serializa en la hora LOCAL del proceso Node. En el deploy (Europe/Madrid,
// UTC+2 en verano) eso convierte un Date de 07:00 UTC en el string "09:00:00",
// y como la SESIÓN MySQL está en UTC, se guarda como 09:00 UTC (= 11:00 Madrid).
// Resultado: doble conversión → los nextRetryAt migrados quedaron 2h TARDE.
// Si se reutiliza este script, fija `timezone:'Z'` aquí para escribir en UTC:
//   await mysql.createConnection({ uri: process.env.DATABASE_URL, timezone: 'Z' });
const db = await mysql.createConnection(process.env.DATABASE_URL);

// Candidatas: subs en dunning bajo el sistema viejo (past_due, o con reintentos/
// nextRenewalAt pendientes) que aún se podrían cobrar (tienen token).
const [subs] = await db.query(`
  SELECT id, userId, status, renewalAttempts, nextRenewalAt, currentPeriodEnd, sipayToken
  FROM subscriptions
  WHERE sipayToken IS NOT NULL AND sipayToken <> ''
    AND cancelAtPeriodEnd = false
    AND (status = 'past_due' OR renewalAttempts > 0 OR nextRenewalAt IS NOT NULL)
`);

async function lastDeclineCode(userId) {
  // El order de los cobros MIT es "mit-<userId>-<ts>"; buscamos el último fallo.
  const [rows] = await db.query(
    `SELECT payload FROM webhook_events
     WHERE eventType='mit_charge_failed' AND payload LIKE ?
     ORDER BY receivedAt DESC LIMIT 1`,
    [`%mit-${userId}-%`],
  );
  if (!rows.length) return null;
  try {
    const p = JSON.parse(rows[0].payload);
    const c = p?.payload?.code ?? p?.code;
    return c ? String(c) : null;
  } catch { return null; }
}

const cancelList = [];
const rescheduleList = [];

for (const s of subs) {
  const anchor = s.currentPeriodEnd ? new Date(s.currentPeriodEnd) : now;
  const daysOverdue = Math.floor((now - anchor) / DAY);
  const code = await lastDeclineCode(s.userId);

  // Bucket A: vencida hace más de la ventana → cancelar sin más intentos.
  if (daysOverdue > WINDOW_DAYS) {
    cancelList.push({ id: s.id, userId: s.userId, status: s.status, diasVencida: daysOverdue, ultimoCodigo: code ?? "—", motivo: `>21d` });
    continue;
  }

  // Bucket B: reencajar. El código HARD cancela igual.
  const info = classifyDecline(code ?? "999");
  const retryCount = Number(s.renewalAttempts ?? 0);
  const decision = decideNextRetry({ code: code ?? "999", retryCount, anchor, lastAttemptAt: now });
  if (info.category === "hard" || decision.action === "cancel") {
    cancelList.push({ id: s.id, userId: s.userId, status: s.status, diasVencida: daysOverdue, ultimoCodigo: code ?? "—", motivo: info.category === "hard" ? "hard" : decision.reason });
  } else {
    rescheduleList.push({
      id: s.id, userId: s.userId, ultimoCodigo: code ?? "(desconocido→unknown)",
      categoria: info.category, retryCount, nuevoNextRetryAt: decision.nextRetryAt.toISOString(),
    });
  }
}

console.log(`\n================  MIGRACIÓN DUNNING — ${EXECUTE ? "EXECUTE" : "DRY-RUN"}  ================`);
console.log(`Candidatas en dunning: ${subs.length}\n`);

console.log(`──── BUCKET A — SE CANCELARÍAN (${cancelList.length}) ────`);
console.table(cancelList.length ? cancelList : [{ info: "ninguna" }]);

console.log(`\n──── BUCKET B — SE REENCAJARÍAN AL NUEVO CALENDARIO (${rescheduleList.length}) ────`);
console.table(rescheduleList.length ? rescheduleList : [{ info: "ninguna" }]);

if (EXECUTE) {
  for (const c of cancelList) {
    await db.query(
      `UPDATE subscriptions SET status='canceled', nextRetryAt=NULL, lastDeclineCode=?, declineCategory=?, updatedAt=NOW() WHERE id=?`,
      [c.ultimoCodigo === "—" ? null : c.ultimoCodigo, c.motivo === "hard" ? "hard" : "soft", c.id],
    );
  }
  for (const r of rescheduleList) {
    // ⚠️ DOBLE CONVERSIÓN DE ZONA HORARIA (ver comentario de la conexión):
    // `new Date(r.nuevoNextRetryAt)` es correcto (07:00 UTC), pero mysql2 con
    // timezone:'local' (Madrid) lo escribe como "09:00:00" y la sesión UTC lo
    // guarda como 09:00 UTC → +2h. Por eso la tanda migrada del 21-jul quedó
    // citada a las 11:00 Madrid en vez de las 09:00, y se saltó la corrida del
    // cron de ese día (corre ~09:05 Madrid) — se recogen al día siguiente.
    // NO se corrige a mano (decisión: aceptar el retraso). Si se reusa el
    // script, fija timezone:'Z' en la conexión y desaparece la deriva.
    await db.query(
      `UPDATE subscriptions SET status='past_due', retryCount=?, nextRetryAt=?, lastDeclineCode=?, declineCategory=?, updatedAt=NOW() WHERE id=?`,
      [r.retryCount, new Date(r.nuevoNextRetryAt), r.ultimoCodigo.startsWith("(") ? null : r.ultimoCodigo, r.categoria, r.id],
    );
  }
  console.log(`\n✅ Aplicado: ${cancelList.length} canceladas, ${rescheduleList.length} reencajadas.`);
} else {
  console.log(`\n⚠️  DRY-RUN — no se ha escrito nada. Revisa la lista del Bucket A y, con tu OK, re-ejecuta con --execute.`);
}

await db.end();
process.exit(0);
