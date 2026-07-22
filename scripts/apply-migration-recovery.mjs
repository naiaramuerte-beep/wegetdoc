// Migración additiva para los emails de recuperación. Idempotente.
//   railway run node scripts/apply-migration-recovery.mjs
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);

async function addColumn(table, col, ddl) {
  const [rows] = await db.query(
    `SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, col],
  );
  if (rows[0].n > 0) { console.log(`= ${table}.${col} ya existe`); return; }
  await db.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  console.log(`+ ${table}.${col} añadida`);
}

await addColumn("users", "recoveryUnsubscribed", "`recoveryUnsubscribed` boolean NOT NULL DEFAULT false");
await addColumn("documents", "recoveryStage", "`recoveryStage` int NOT NULL DEFAULT 0");
await addColumn("documents", "recoveryLastSentAt", "`recoveryLastSentAt` timestamp NULL");

console.log("✅ Migración de recuperación aplicada.");
await db.end();
process.exit(0);
