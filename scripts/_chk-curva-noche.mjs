// SOLO LECTURA. La misma franja horaria en varios días, para distinguir "se ha
// parado algo" de "es de noche". Sin esta comparación, cualquier bajón nocturno
// parece una avería.
//   railway run node scripts/_chk-curva-noche.mjs [dias]
import { openDb, tzCols, tzShow } from "./_db.mjs";
const DIAS = Number(process.argv[2] ?? 4);
const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);

const H = (col) => `DATE_FORMAT(CONVERT_TZ(${col},'+00:00','Europe/Madrid'),'%d')`;
const HH = (col) => `HOUR(CONVERT_TZ(${col},'+00:00','Europe/Madrid'))`;

const [regs] = await db.query(
  `SELECT ${H("createdAt")} dia, ${HH("createdAt")} hora, COUNT(*) n
     FROM users WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
    GROUP BY dia, hora`, [DIAS]);
const [altas] = await db.query(
  `SELECT ${H("createdAt")} dia, ${HH("createdAt")} hora, COUNT(*) n
     FROM charges WHERE status='ok' AND amountCents <= 100
       AND createdAt >= UTC_TIMESTAMP() - INTERVAL ? DAY
    GROUP BY dia, hora`, [DIAS]);

const dias = [...new Set([...regs, ...altas].map((r) => r.dia))].sort();
const R = new Map(regs.map((r) => [`${r.dia}|${r.hora}`, Number(r.n)]));
const A = new Map(altas.map((r) => [`${r.dia}|${r.hora}`, Number(r.n)]));

console.log("REGISTROS por hora (Madrid) — filas = día del mes");
console.log("día " + Array.from({ length: 24 }, (_, h) => String(h).padStart(3)).join(""));
for (const d of dias) {
  console.log(` ${d}  ` + Array.from({ length: 24 }, (_, h) => String(R.get(`${d}|${h}`) ?? "·").padStart(3)).join(""));
}
console.log("\nALTAS COBRADAS por hora");
console.log("día " + Array.from({ length: 24 }, (_, h) => String(h).padStart(3)).join(""));
for (const d of dias) {
  console.log(` ${d}  ` + Array.from({ length: 24 }, (_, h) => String(A.get(`${d}|${h}`) ?? "·").padStart(3)).join(""));
}
console.log("\n(· = ninguno esa hora)");
await db.end();
process.exit(0);
