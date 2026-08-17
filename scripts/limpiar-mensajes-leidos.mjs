// Marca como LEÍDOS los mensajes de contacto que YA tienen respuesta enviada,
// para que el contador del panel muestre solo lo que de verdad queda por hacer.
//
// No manda ningún correo y no toca los que están sin responder: ésos deben
// seguir cantando hasta que se contesten. Simula por defecto.
//   railway run node scripts/limpiar-mensajes-leidos.mjs
//   railway run node scripts/limpiar-mensajes-leidos.mjs --aplicar
import { openDb, tzCols, tzShow } from "./_db.mjs";
const APLICAR = process.argv.includes("--aplicar");
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}`);
console.log(APLICAR ? "MODO REAL\n" : "SIMULACIÓN (añade --aplicar)\n");

const [[antes]] = await db.query(
  `SELECT SUM(\`read\` = 0) sinLeer, SUM(\`read\` = 0 AND repliedAt IS NOT NULL) yaRespondidos,
          SUM(repliedAt IS NULL) sinResponder FROM contact_messages`);
console.log(`Sin leer: ${antes.sinLeer}   de ellos ya respondidos: ${antes.yaRespondidos}   sin responder: ${antes.sinResponder}`);

if (APLICAR) {
  const [r] = await db.query(
    "UPDATE contact_messages SET `read` = 1 WHERE `read` = 0 AND repliedAt IS NOT NULL");
  console.log(`\n✓ Marcados como leídos: ${r.affectedRows}`);
  const [[d]] = await db.query(
    "SELECT SUM(`read` = 0) sinLeer, SUM(repliedAt IS NULL) sinResponder FROM contact_messages");
  console.log(`Ahora el panel muestra: ${d.sinLeer} sin leer · ${d.sinResponder} sin responder`);
} else {
  console.log(`\nSe marcarían ${antes.yaRespondidos}. Los ${antes.sinResponder} sin responder NO se tocan.`);
}
await db.end();
process.exit(0);
