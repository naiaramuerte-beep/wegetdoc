// SOLO LECTURA. Aperturas del modal de pago por HORA (objetos temp/ de R2, que
// se crean al abrirse el modal y no necesitan cuenta). Comparado con registros e
// intentos de pago, dice en qué escalón se cae la gente hoy.
//   railway run node scripts/_chk-modal-horas.mjs [horas]
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { openDb, tzCols, tzShow } from "./_db.mjs";

const HORAS = Number(process.argv[2] ?? 10);
const accountId = process.env.R2_ACCOUNT_ID ?? process.env.CF_R2_ACCOUNT_ID ?? "";
const Bucket = process.env.R2_BUCKET_NAME ?? process.env.CF_R2_BUCKET_NAME ?? "";
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? process.env.CF_R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? process.env.CF_R2_SECRET_ACCESS_KEY ?? "",
  },
});

const desde = new Date(Date.now() - HORAS * 3600e3);
const H = (d) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", hour: "2-digit", hour12: false }).format(d).replace(/\D+$/, "") + "h";
const modal = new Map();
let token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: "temp/", ContinuationToken: token, MaxKeys: 1000 }));
  for (const o of r.Contents ?? []) {
    if (!o.LastModified || o.LastModified < desde) continue;
    const h = H(o.LastModified);
    if (!modal.has(h)) modal.set(h, new Set());
    modal.get(h).add(String(o.Key).replace(/^temp\/[a-z0-9]+-/, ""));
  }
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);

const db = await openDb();
const [[t]] = await db.query(`SELECT ${tzCols("UTC_TIMESTAMP()", "ahora")}`);
console.log(`Corte: ${tzShow(t, "ahora")}\n`);
const HH = (col) => `DATE_FORMAT(CONVERT_TZ(${col},'+00:00','Europe/Madrid'),'%d %Hh')`;
const [regs] = await db.query(
  `SELECT ${HH("createdAt")} h, COUNT(*) n FROM users
    WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL ? HOUR GROUP BY h`, [HORAS]);
const [ini] = await db.query(
  `SELECT ${HH("receivedAt")} h, SUM(eventType LIKE '%init_started') ini,
          SUM(eventType LIKE '%intro_charge') altas
     FROM webhook_events
    WHERE receivedAt >= UTC_TIMESTAMP() - INTERVAL ? HOUR AND eventType NOT LIKE 'mit%'
    GROUP BY h`, [HORAS]);
const R = new Map(regs.map(r => [r.h, Number(r.n)]));
const I = new Map(ini.map(r => [r.h, { i: Number(r.ini), a: Number(r.altas) }]));

console.log("hora     modales abiertos   registros   intentos   altas   % modal→registro");
console.log("─".repeat(78));
for (const h of [...new Set([...modal.keys(), ...R.keys(), ...I.keys()])].sort()) {
  const m = modal.get(h)?.size ?? 0;
  const r = R.get(h) ?? 0;
  const x = I.get(h) ?? { i: 0, a: 0 };
  console.log(`  ${h.padEnd(8)}${String(m).padStart(12)}${String(r).padStart(12)}${String(x.i).padStart(11)}${String(x.a).padStart(8)}${(m ? Math.round(100 * r / m) + " %" : "—").padStart(14)}`);
}
await db.end();
process.exit(0);
