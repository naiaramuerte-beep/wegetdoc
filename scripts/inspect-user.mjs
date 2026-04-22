/**
 * Quick deep-dive on a single user — docs, sub, downloads.
 * Usage: railway run node scripts/inspect-user.mjs <email>
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const email = process.argv[2];
if (!email) { console.error("Usage: node scripts/inspect-user.mjs <email>"); process.exit(1); }

const db = await mysql.createConnection(process.env.DATABASE_URL);

const [[user]] = await db.execute(
  "SELECT id, email, name, role, country, createdAt, lastSignedIn FROM users WHERE email = ? LIMIT 1",
  [email]
);
if (!user) { console.error("User not found"); process.exit(1); }
console.log("\n── User ──");
console.table([user]);

const [subs] = await db.execute(
  "SELECT id, plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, stripeSubscriptionId, createdAt FROM subscriptions WHERE userId = ? ORDER BY createdAt DESC",
  [user.id]
);
console.log(`\n── Subscriptions (${subs.length}) ──`);
console.table(subs);

const [docs] = await db.execute(
  "SELECT id, name, ROUND(fileSize/1048576, 1) as sizeMB, paymentStatus, createdAt, firstDownloadedAt FROM documents WHERE userId = ? ORDER BY createdAt DESC",
  [user.id]
);
console.log(`\n── Documents (${docs.length} total) ──`);
console.table(docs);

const downloaded = docs.filter(d => d.firstDownloadedAt);
console.log(`\nEffective DOWNLOADS (firstDownloadedAt set): ${downloaded.length}`);
console.log(`Uploads-only (firstDownloadedAt null): ${docs.length - downloaded.length}`);

await db.end();
