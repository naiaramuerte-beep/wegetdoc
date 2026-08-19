// SOLO LECTURA. Clientes a los que se les rechazó el cobro y a los que NUNCA se
// les ha pedido pagar: ni correo, ni aviso en su panel, ni enlace a la página de
// reintento (que existe, pero sólo se llega a ella desde un 3DS fallido del alta).
// Es la respuesta con números a "si querían pagar, ¿por qué no les dejamos?".
import { openDb, tzCols, tzShow } from "./_db.mjs";
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const [[imp]] = await db.query(
  `SELECT COUNT(*) n, SUM(recurringCents)/100 euros
     FROM subscriptions WHERE status = 'past_due' AND cancelAtPeriodEnd = 0`);
console.log(`Suscripciones en impago ahora mismo: ${imp.n}   valor mensual: ${Number(imp.euros ?? 0).toFixed(2)} €`);

const [[can]] = await db.query(
  `SELECT COUNT(*) n FROM subscriptions
    WHERE status = 'canceled' AND updatedAt >= UTC_TIMESTAMP() - INTERVAL 30 DAY
      AND EXISTS (SELECT 1 FROM charges c WHERE c.userId = subscriptions.userId AND c.status <> 'ok' AND c.amountCents >= 1000)`);
console.log(`Canceladas en 30 días que antes tuvieron un cobro rechazado: ${can.n}`);

const [ch] = await db.query(
  `SELECT COUNT(DISTINCT userId) personas, COUNT(*) intentos, SUM(amountCents)/100 euros
     FROM charges WHERE status <> 'ok' AND amountCents >= 1000
       AND createdAt >= UTC_TIMESTAMP() - INTERVAL 10 DAY`);
console.log(`\nEn 10 días: ${ch[0].intentos} cobros rechazados a ${ch[0].personas} personas distintas = ${Number(ch[0].euros).toFixed(2)} € no cobrados`);

// ¿A alguna se le ha escrito? Los correos salientes quedan en webhook_events solo
// si alguien los registró; el canal real es Resend. Aquí se comprueba lo que sí
// se puede saber: si existe algún rastro de aviso de impago.
const [av] = await db.query(
  `SELECT eventType, COUNT(*) n FROM webhook_events
    WHERE (eventType LIKE '%dunning%' OR eventType LIKE '%past_due%' OR eventType LIKE '%recordatorio%'
        OR eventType LIKE '%payment_failed_mail%' OR eventType LIKE '%aviso%')
    GROUP BY eventType`);
console.log(`\nRastros de aviso de impago al cliente: ${av.length ? av.map(x => x.eventType + "=" + x.n).join(", ") : "NINGUNO"}`);

// Los que ya pagaron una vez y se quedaron a medias: los más recuperables.
const [rec] = await db.query(
  `SELECT s.id, s.userId, u.email, s.recurringCents, s.retryCount, s.lastDeclineCode,
          ${tzCols("s.currentPeriodEnd", "vencio")}
     FROM subscriptions s JOIN users u ON u.id = s.userId
    WHERE s.status = 'past_due' AND s.cancelAtPeriodEnd = 0
    ORDER BY s.currentPeriodEnd DESC LIMIT 12`);
console.log(`\n████ MUESTRA DE IMPAGADOS (los ${rec.length} más recientes) ████`);
for (const r of rec) {
  console.log(`  sub#${r.id} <${r.email}> ${(r.recurringCents / 100).toFixed(2)} €  reintentos=${r.retryCount}  último código=${r.lastDeclineCode ?? "-"}  venció ${r.vencio_mad}`);
}
await db.end();
process.exit(0);
