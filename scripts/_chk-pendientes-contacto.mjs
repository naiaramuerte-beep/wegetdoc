// SOLO LECTURA. Los mensajes SIN responder, con lo que hace falta para
// contestarlos bien: motivo, idioma en que escribieron, si son clientes, si
// tienen suscripción viva, a qué precio están anclados y si ya la cancelaron.
// Sin esto, una respuesta en bloque le manda a alguien instrucciones de baja
// cuando lo que preguntaba era otra cosa.
//   railway run node scripts/_chk-pendientes-contacto.mjs [limite]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const LIMITE = Number(process.argv[2] ?? 60);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

// "Sin leer" y "sin responder" son cosas distintas: el badge del panel cuenta
// los NO LEÍDOS, y ahí caben mensajes que ya están contestados. Confundirlos
// lleva a escribir por segunda vez a gente ya atendida.
const [[c]] = await db.query(
  `SELECT COUNT(*) n, SUM(repliedAt IS NULL) pendientes, SUM(archivedAt IS NOT NULL) archivados,
          SUM(\`read\` = 0) sinLeer, SUM(\`read\` = 0 AND repliedAt IS NOT NULL) sinLeerYaRespondidos
     FROM contact_messages`);
console.log(`Mensajes: ${c.n}   SIN RESPONDER: ${c.pendientes}   sin leer: ${c.sinLeer} (de ellos ${c.sinLeerYaRespondidos} ya respondidos)   archivados: ${c.archivados}\n`);

const [ms] = await db.query(
  `SELECT m.id, m.name, m.email, m.reason, m.subject, m.message, m.userId,
          ${tzCols("m.createdAt", "c")},
          u.id uid, u.language lang, u.country,
          s.id subId, s.status subStatus, s.plan, s.recurringCents, s.cancelAtPeriodEnd,
          ${tzCols("s.currentPeriodEnd", "fin")}
     FROM contact_messages m
     LEFT JOIN users u ON u.email = m.email
     LEFT JOIN subscriptions s ON s.userId = u.id
    WHERE m.repliedAt IS NULL AND m.archivedAt IS NULL
    ORDER BY m.createdAt DESC LIMIT ?`, [LIMITE]);

// Reparto por motivo y por idioma, que es lo que decide cuántas plantillas hacen falta.
const porMotivo = new Map(), porIdioma = new Map();
for (const m of ms) {
  const mo = m.reason || "(sin motivo)";
  porMotivo.set(mo, (porMotivo.get(mo) ?? 0) + 1);
  const id = m.lang || "(desconocido)";
  porIdioma.set(id, (porIdioma.get(id) ?? 0) + 1);
}
console.log("████ POR MOTIVO ████");
for (const [k, n] of [...porMotivo].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log("\n████ POR IDIOMA GUARDADO ████");
for (const [k, n] of [...porIdioma].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);

console.log("\n████ UNO A UNO ████");
for (const m of ms) {
  const sub = m.subId
    ? `${m.subStatus}/${m.plan} ${m.recurringCents ? (m.recurringCents / 100).toFixed(2) + "€" : "?"}${m.cancelAtPeriodEnd ? " YA CANCELADA" : ""} hasta ${m.fin_mad ?? "?"}`
    : (m.uid ? "cuenta sin suscripción" : "NO tiene cuenta con ese email");
  console.log(`\n#${m.id} ${m.c_mad}  <${m.email}> ${m.name}`);
  console.log(`   motivo=${m.reason ?? "-"}  idioma=${m.lang ?? "?"}  país=${m.country || "?"}`);
  console.log(`   suscripción: ${sub}`);
  console.log(`   asunto: ${String(m.subject).replace(/\s+/g, " ").slice(0, 90)}`);
  console.log(`   texto: ${String(m.message).replace(/\s+/g, " ").slice(0, 240)}`);
}
await db.end();
process.exit(0);
