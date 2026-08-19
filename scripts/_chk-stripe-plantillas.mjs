// SOLO LECTURA. Dónde dice "Stripe" cada plantilla de respuesta al cliente y con
// qué frase, para reescribirlas sin cambiar el sentido. Estas plantillas se
// envían a clientes que reclaman un cobro: nombrar una pasarela que ya no
// usamos, y que no coincide con lo que ven en su extracto, es justo lo que no
// puede pasar en una defensa contra un contracargo.
import { openDb } from "./_db.mjs";
const db = await openDb();
const [t] = await db.query("SELECT id, name, body FROM email_templates WHERE body LIKE '%Stripe%' ORDER BY id");
for (const x of t) {
  console.log(`\n── #${x.id} «${x.name}»`);
  for (const linea of String(x.body).split(/\n+/)) {
    if (/stripe/i.test(linea)) console.log(`   ${linea.trim().slice(0, 200)}`);
  }
}
console.log(`\nTotal plantillas afectadas: ${t.length}`);

// La única suscripción viva que aún arrastra identificadores de Stripe.
const [s] = await db.query(
  `SELECT id, userId, status, plan, sipayToken, stripeCustomerId, stripeSubscriptionId
     FROM subscriptions
    WHERE (stripeCustomerId IS NOT NULL AND stripeCustomerId<>'')
       OR (stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId<>'')`);
console.log("\n████ FILAS CON IDENTIFICADORES DE STRIPE ████");
for (const x of s) {
  console.log(`  sub#${x.id} user=${x.userId} ${x.status}/${x.plan}  tokenSipay=${x.sipayToken ? "sí" : "NO"}  customer=${x.stripeCustomerId ?? "-"}  sub=${x.stripeSubscriptionId ?? "-"}`);
}
await db.end();
process.exit(0);
