/**
 * One-off script: set role='admin' for a user by email.
 * Usage: railway run node scripts/promote-admin.mjs <email>
 *        node scripts/promote-admin.mjs <email>   # uses local .env
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run with `railway run` or set it in .env.");
  process.exit(1);
}

const db = await mysql.createConnection(process.env.DATABASE_URL);
const [before] = await db.execute("SELECT id, email, role FROM users WHERE email = ? LIMIT 1", [email]);
if (!before.length) {
  console.error(`No user found with email: ${email}`);
  await db.end();
  process.exit(1);
}
console.log("Before:", before[0]);

const [result] = await db.execute("UPDATE users SET role = ? WHERE email = ?", ["admin", email]);
console.log("Affected rows:", result.affectedRows);

const [after] = await db.execute("SELECT id, email, role FROM users WHERE email = ? LIMIT 1", [email]);
console.log("After:", after[0]);

await db.end();
