// SOLO LECTURA. De las suscripciones sin anclar, ¿cuántas no tienen NI cobro de
// renovación NI consentimiento con importe? Para ésas hay que deducir el precio
// por la fecha de alta (el ajuste vigente ese día), no por el ajuste de hoy.
import { openDb, tzCols, tzShow } from "./_db.mjs";
const CAMBIO = "2026-07-16"; // 19,95 € hasta el 15-jul; 29,95 € desde el 16-jul
const db = await openDb();
const [r] = await db.query(
  `SELECT s.id, s.userId, u.email, s.status,
          DATE(CONVERT_TZ(s.createdAt,'+00:00','Europe/Madrid')) alta
     FROM subscriptions s JOIN users u ON u.id = s.userId
    WHERE s.recurringCents IS NULL AND s.status IN ('trialing','active','past_due')
      AND NOT EXISTS (SELECT 1 FROM charges c WHERE c.userId=s.userId AND c.status='ok' AND c.amountCents>=1000)
      AND NOT EXISTS (SELECT 1 FROM consents co WHERE co.userId=s.userId AND co.recurringCents IS NOT NULL)
    ORDER BY s.createdAt`);
const antes = r.filter(x => new Date(x.alta).toISOString().slice(0, 10) < CAMBIO);
const despues = r.filter(x => new Date(x.alta).toISOString().slice(0, 10) >= CAMBIO);
console.log(`Sin cobro ni consentimiento: ${r.length}`);
console.log(`  altas ANTES del ${CAMBIO} (les tocaría 19,95 €): ${antes.length}`);
for (const x of antes) console.log(`     sub#${x.id} <${x.email}> ${x.status} alta ${new Date(x.alta).toISOString().slice(0, 10)}`);
console.log(`  altas DESDE el ${CAMBIO} (29,95 €): ${despues.length}`);
await db.end();
process.exit(0);
