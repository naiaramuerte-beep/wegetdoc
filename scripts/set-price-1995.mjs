// Persist the live monthly price (19.95) to site_settings so it doesn't
// depend on the code default. Re-runnable; UPSERT on the key.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const KEY = "subscription_price_eur";
const VALUE = "19.95";

const db = await mysql.createConnection(process.env.DATABASE_URL);

const [before] = await db.query(`SELECT \`key\`, \`value\`, updatedAt FROM site_settings WHERE \`key\` = ?`, [KEY]);
console.log("Before:");
console.table(before.length ? before : [{ key: KEY, value: "(not set)" }]);

const [r] = await db.query(
  `INSERT INTO site_settings (\`key\`, \`value\`, updatedAt) VALUES (?, ?, NOW())
   ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updatedAt = NOW()`,
  [KEY, VALUE],
);
console.log(`\nUPSERT affected rows: ${r.affectedRows}`);

const [after] = await db.query(`SELECT \`key\`, \`value\`, updatedAt FROM site_settings WHERE \`key\` = ?`, [KEY]);
console.log("\nAfter:");
console.table(after);

await db.end();
