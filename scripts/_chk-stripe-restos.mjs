// SOLO LECTURA. Qué queda de Stripe FUERA del código: datos en la base, ajustes,
// textos legales que lee el cliente y cabeceras que sirve la web. El código se
// audita con grep; esto es lo que grep no ve.
//   railway run node scripts/_chk-stripe-restos.mjs
import { openDb } from "./_db.mjs";
const db = await openDb();

console.log("████ COLUMNAS stripe* EN subscriptions ████");
const [cols] = await db.query(
  `SELECT COUNT(*) total,
          SUM(stripeCustomerId IS NOT NULL AND stripeCustomerId<>'') conCustomer,
          SUM(stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId<>'') conSub,
          SUM(stripeSessionId IS NOT NULL AND stripeSessionId<>'') conSesion,
          SUM((stripeSubscriptionId IS NOT NULL AND stripeSubscriptionId<>'') AND status IN ('active','trialing','past_due')) vivasConStripe
     FROM subscriptions`);
const c = cols[0];
console.log(`  filas: ${c.total}   con customerId: ${c.conCustomer}   con subscriptionId: ${c.conSub}   con sessionId: ${c.conSesion}`);
console.log(`  suscripciones VIVAS que aún llevan id de Stripe: ${c.vivasConStripe}`);

console.log("\n████ AJUSTES CON 'stripe' O 'provider' ████");
const [set] = await db.query(
  "SELECT `key`, value FROM site_settings WHERE `key` LIKE '%stripe%' OR `key` LIKE '%provider%'");
if (!set.length) console.log("  (ninguno)");
for (const s of set) console.log(`  ${s.key} = ${s.value || "(vacío)"}`);

console.log("\n████ TEXTOS LEGALES QUE MENCIONAN STRIPE ████");
try {
  const [leg] = await db.query(
    "SELECT slug, LOCATE('Stripe', content) pos FROM legal_pages WHERE content LIKE '%Stripe%'");
  if (!leg.length) console.log("  (ninguno: los legales ya nombran a Sipay)");
  for (const l of leg) console.log(`  ⚠ ${l.slug} menciona Stripe en la posición ${l.pos}`);
} catch (e) { console.log("  (legal_pages: " + e.message + ")"); }

console.log("\n████ PLANTILLAS DE EMAIL QUE MENCIONAN STRIPE ████");
try {
  const [t] = await db.query("SELECT id, name FROM email_templates WHERE body LIKE '%Stripe%' OR name LIKE '%Stripe%'");
  if (!t.length) console.log("  (ninguna)");
  for (const x of t) console.log(`  ⚠ plantilla #${x.id} «${x.name}»`);
} catch (e) { console.log("  (email_templates: " + e.message + ")"); }

await db.end();

console.log("\n████ LO QUE SIRVE LA WEB ████");
const r = await fetch("https://www.editorpdf.net/es/");
const csp = r.headers.get("content-security-policy") ?? "";
console.log(`  CSP menciona stripe: ${/stripe/i.test(csp) ? "SÍ ⚠" : "no"}`);
const html = await r.text();
console.log(`  HTML de la home menciona stripe: ${/stripe/i.test(html) ? "SÍ ⚠" : "no"}`);
const cfg = await (await fetch("https://www.editorpdf.net/api/trpc/subscription.sipayConfig")).text();
console.log(`  configuración de pago menciona stripe: ${/stripe/i.test(cfg) ? "SÍ ⚠" : "no"}`);
process.exit(0);
