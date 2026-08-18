// SOLO LECTURA. Aprobación de las renovaciones separando PRIMER INTENTO de
// REINTENTO. Mezclarlos hunde el número y hace parecer que la pasarela se ha
// roto: los reintentos van sobre tarjetas que ya fallaron 2-3 veces y rinden
// ~1 %, así que un día con mucha cola heredada da una aprobación pésima aunque
// la pasarela esté perfecta.
//   railway run node scripts/_chk-primeros-vs-reintentos.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const DIAS = Number(process.argv[2] ?? 5);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const [ch] = await db.query(
  `SELECT id, userId, amountCents, status, ${tzCols("createdAt", "c")}
     FROM charges
    WHERE amountCents >= 1000 AND createdAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
    ORDER BY createdAt`, [DIAS]);

const porDia = new Map();
for (const c of ch) {
  // ¿Había un intento fallido anterior de ESTE usuario en los 45 días previos?
  // Si lo hay, esto es un reintento del dunning, no un primer cobro.
  const [[prev]] = await db.query(
    `SELECT COUNT(*) n FROM charges
      WHERE userId = ? AND amountCents >= 1000 AND status <> 'ok'
        AND createdAt < ? AND createdAt >= DATE_SUB(?, INTERVAL 45 DAY)`,
    [c.userId, c.c_utc, c.c_utc]);
  const tipo = Number(prev.n) > 0 ? "reintento" : "primero";
  const d = c.c_mad.slice(0, 10);
  const k = `${d}|${tipo}`;
  if (!porDia.has(k)) porDia.set(k, { ok: 0, ko: 0 });
  c.status === "ok" ? porDia.get(k).ok++ : porDia.get(k).ko++;
}

console.log("día          tipo         cobrados   fallidos   % aprobación");
console.log("─".repeat(62));
for (const [k, v] of [...porDia].sort()) {
  const [d, tipo] = k.split("|");
  const n = v.ok + v.ko;
  console.log(`  ${d}  ${tipo.padEnd(11)}${String(v.ok).padStart(8)}${String(v.ko).padStart(11)}       ${n ? Math.round(100 * v.ok / n) + " %" : "—"}`);
}
console.log("\nEl número que dice si la pasarela va bien es el de PRIMERO.");
await db.end();
process.exit(0);
