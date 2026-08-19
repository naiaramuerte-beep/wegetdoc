// Quita los últimos restos de Stripe de los DATOS (lo que grep no ve):
//
//  1. Las 12 plantillas de respuesta al cliente decían «Stripe — verificación
//     3D-Secure». Se envían a gente que reclama un cobro, y nombrar una pasarela
//     que no coincide con su extracto debilita justo la defensa que buscan esas
//     plantillas. Pasa a decir Sipay, que es quien aparece en el cargo.
//  2. El ajuste `active_stripe_price_id` (un Price ID de Stripe) ya no lo lee
//     nadie: el importe sale de `subscription_price_eur`.
//
// Simula por defecto.
//   railway run node scripts/limpiar-stripe-datos.mjs
//   railway run node scripts/limpiar-stripe-datos.mjs --aplicar
import { openDb, tzCols, tzShow } from "./_db.mjs";

const APLICAR = process.argv.includes("--aplicar");
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}`);
console.log(APLICAR ? "MODO REAL\n" : "SIMULACIÓN (añade --aplicar)\n");

console.log("████ PLANTILLAS DE RESPUESTA AL CLIENTE ████");
const [pl] = await db.query("SELECT id, name, body FROM email_templates WHERE body LIKE '%Stripe%' ORDER BY id");
for (const p of pl) {
  const nuevo = String(p.body).replace(/Stripe/g, "Sipay");
  const antes = String(p.body).split("\n").find(l => /Stripe/.test(l))?.trim().slice(0, 90);
  console.log(`  #${p.id} «${p.name}»`);
  console.log(`     antes:   ${antes}`);
  console.log(`     después: ${antes?.replace(/Stripe/g, "Sipay")}`);
  if (APLICAR) {
    await db.query("UPDATE email_templates SET body = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?", [nuevo, p.id]);
  }
}
console.log(`  ${pl.length} plantillas${APLICAR ? " actualizadas" : " a actualizar"}`);

console.log("\n████ AJUSTE MUERTO ████");
const [[s]] = await db.query("SELECT `key`, value FROM site_settings WHERE `key` = 'active_stripe_price_id'");
if (!s) console.log("  (ya no existe)");
else {
  console.log(`  ${s.key} = ${s.value}`);
  if (APLICAR) {
    await db.query("DELETE FROM site_settings WHERE `key` = 'active_stripe_price_id'");
    console.log("  ✓ borrado");
  }
}

// También la bandera de pasarela, que devolvía "stripe" por defecto y no leía nadie.
const [[f]] = await db.query("SELECT `key`, value FROM site_settings WHERE `key` = 'flag_payment_provider'");
if (f) {
  console.log(`  ${f.key} = ${f.value}`);
  if (APLICAR) {
    await db.query("DELETE FROM site_settings WHERE `key` = 'flag_payment_provider'");
    console.log("  ✓ borrado");
  }
}

if (APLICAR) {
  const [[q]] = await db.query(
    "SELECT (SELECT COUNT(*) FROM email_templates WHERE body LIKE '%Stripe%') plantillas, (SELECT COUNT(*) FROM site_settings WHERE `key` LIKE '%stripe%') ajustes");
  console.log(`\nQuedan: ${q.plantillas} plantillas y ${q.ajustes} ajustes con Stripe.`);
} else {
  console.log("\nNo se ha cambiado nada. Repite con --aplicar.");
}
await db.end();
process.exit(0);
