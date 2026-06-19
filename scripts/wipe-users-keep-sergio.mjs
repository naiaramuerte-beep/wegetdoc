// DESTRUCTIVE: wipes every user from the DB except the one whose email is
// hard-coded below (KEEP_EMAIL). All rows that reference deleted users
// across `subscriptions`, `documents`, `folders`, `team_invitations`,
// `contact_messages`, `charges`, `audit_log` are removed in dependency
// order so nothing's left orphan.
//
// Files stored in Cloudflare R2 are NOT deleted by this script — they
// become orphan keys but cost cents. A separate R2 cleanup can run later.
//
// Default mode is DRY-RUN — counts every row that would be touched and
// prints the plan, but doesn't change anything. Pass `--execute` to
// actually perform the deletes (inside a transaction).
//
// Run dry-run (safe):
//   railway run node scripts/wipe-users-keep-sergio.mjs
//
// Run for real (irreversible):
//   railway run node scripts/wipe-users-keep-sergio.mjs --execute

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const KEEP_EMAIL = "sergisd39@gmail.com";
const EXECUTE = process.argv.includes("--execute");

const db = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  multipleStatements: false,
});

console.log(`\n=== wipe-users-keep-sergio @ ${new Date().toISOString()} ===`);
console.log(`Mode: ${EXECUTE ? "🔥 EXECUTE (will commit deletes)" : "🟢 DRY-RUN (no changes)"}\n`);

// ── 1) Find the user to keep ──────────────────────────────────────────────
const [keepRows] = await db.query(`SELECT id, email, name, role, createdAt FROM users WHERE email = ?`, [KEEP_EMAIL]);
if (keepRows.length === 0) {
  console.error(`❌ Aborting — no user found with email ${KEEP_EMAIL}.`);
  console.error("   Refusing to delete anything when the keep-target doesn't exist.");
  await db.end();
  process.exit(1);
}
if (keepRows.length > 1) {
  console.error(`❌ Aborting — ${keepRows.length} users with email ${KEEP_EMAIL} (should be unique).`);
  console.error(JSON.stringify(keepRows, null, 2));
  await db.end();
  process.exit(1);
}
const keepUserId = keepRows[0].id;
console.log(`User to KEEP: id=${keepUserId} email=${keepRows[0].email} role=${keepRows[0].role}\n`);

// ── 2) Pre-flight counts ──────────────────────────────────────────────────
const queries = [
  { table: "charges",           sql: `SELECT COUNT(*) AS n FROM charges          WHERE userId   <> ?`, args: [keepUserId] },
  { table: "documents",         sql: `SELECT COUNT(*) AS n FROM documents        WHERE userId   <> ?`, args: [keepUserId] },
  { table: "folders",           sql: `SELECT COUNT(*) AS n FROM folders          WHERE userId   <> ?`, args: [keepUserId] },
  { table: "subscriptions",     sql: `SELECT COUNT(*) AS n FROM subscriptions    WHERE userId   <> ?`, args: [keepUserId] },
  { table: "team_invitations",  sql: `SELECT COUNT(*) AS n FROM team_invitations WHERE ownerId  <> ? AND (inviteeId IS NULL OR inviteeId <> ?)`, args: [keepUserId, keepUserId] },
  { table: "contact_messages",  sql: `SELECT COUNT(*) AS n FROM contact_messages WHERE userId IS NOT NULL AND userId <> ?`, args: [keepUserId] },
  { table: "audit_log",         sql: `SELECT COUNT(*) AS n FROM audit_log        WHERE adminId <> ?`, args: [keepUserId] },
  { table: "users",             sql: `SELECT COUNT(*) AS n FROM users            WHERE id <> ?`,      args: [keepUserId] },
];

const plan = [];
for (const q of queries) {
  const [rows] = await db.query(q.sql, q.args);
  const n = Number(rows[0]?.n ?? 0);
  plan.push({ table: q.table, would_delete: n });
}
console.log("Pre-flight (rows that would be deleted):");
console.table(plan);

const totalToDelete = plan.reduce((sum, p) => sum + p.would_delete, 0);
if (totalToDelete === 0) {
  console.log("\n✓ Nothing to delete. DB already in the desired state.");
  await db.end();
  process.exit(0);
}

// ── 3) Show preserved rows for sanity ─────────────────────────────────────
const [preserved] = await db.query(
  `
  SELECT
    (SELECT COUNT(*) FROM users           WHERE id = ?)       AS users_kept,
    (SELECT COUNT(*) FROM subscriptions   WHERE userId = ?)   AS sergio_subs,
    (SELECT COUNT(*) FROM documents       WHERE userId = ?)   AS sergio_docs,
    (SELECT COUNT(*) FROM folders         WHERE userId = ?)   AS sergio_folders,
    (SELECT COUNT(*) FROM charges         WHERE userId = ?)   AS sergio_charges,
    (SELECT COUNT(*) FROM contact_messages WHERE userId = ?)  AS sergio_contact_msgs,
    (SELECT COUNT(*) FROM contact_messages WHERE userId IS NULL) AS anon_contact_msgs_kept,
    (SELECT COUNT(*) FROM team_invitations WHERE ownerId = ? OR inviteeId = ?) AS sergio_invitations,
    (SELECT COUNT(*) FROM audit_log       WHERE adminId = ?)   AS sergio_audit_entries
  `,
  [keepUserId, keepUserId, keepUserId, keepUserId, keepUserId, keepUserId, keepUserId, keepUserId, keepUserId],
);
console.log("\nRows that would be PRESERVED:");
console.table(preserved);

if (!EXECUTE) {
  console.log("\n🟢 Dry-run complete. Nothing was modified.");
  console.log("   To actually apply: railway run node scripts/wipe-users-keep-sergio.mjs --execute\n");
  await db.end();
  process.exit(0);
}

// ── 4) Execute in a single transaction ────────────────────────────────────
console.log("\n🔥 Executing destructive deletes inside a transaction...");
const conn = db;
await conn.beginTransaction();
try {
  const results = [];
  // Order matters even without FK constraints — keeps the operation predictable
  // and avoids surprises if FK constraints get added later.
  const deletes = [
    { table: "charges",           sql: `DELETE FROM charges          WHERE userId   <> ?`, args: [keepUserId] },
    { table: "documents",         sql: `DELETE FROM documents        WHERE userId   <> ?`, args: [keepUserId] },
    { table: "folders",           sql: `DELETE FROM folders          WHERE userId   <> ?`, args: [keepUserId] },
    { table: "subscriptions",     sql: `DELETE FROM subscriptions    WHERE userId   <> ?`, args: [keepUserId] },
    { table: "team_invitations",  sql: `DELETE FROM team_invitations WHERE ownerId  <> ? AND (inviteeId IS NULL OR inviteeId <> ?)`, args: [keepUserId, keepUserId] },
    { table: "contact_messages",  sql: `DELETE FROM contact_messages WHERE userId IS NOT NULL AND userId <> ?`, args: [keepUserId] },
    { table: "audit_log",         sql: `DELETE FROM audit_log        WHERE adminId <> ?`, args: [keepUserId] },
    { table: "users",             sql: `DELETE FROM users            WHERE id <> ?`,      args: [keepUserId] },
  ];
  for (const d of deletes) {
    const [r] = await conn.query(d.sql, d.args);
    results.push({ table: d.table, deleted: r.affectedRows });
  }
  await conn.commit();
  console.log("\n✅ Committed. Rows deleted:");
  console.table(results);
} catch (err) {
  await conn.rollback();
  console.error("\n❌ Error during delete — transaction rolled back:");
  console.error(err);
  process.exit(2);
}

// ── 5) Post-flight ────────────────────────────────────────────────────────
console.log("\nFinal counts (should mirror Sergio-only data):");
const [post] = await db.query(
  `
  SELECT
    (SELECT COUNT(*) FROM users)            AS users,
    (SELECT COUNT(*) FROM subscriptions)    AS subscriptions,
    (SELECT COUNT(*) FROM documents)        AS documents,
    (SELECT COUNT(*) FROM folders)          AS folders,
    (SELECT COUNT(*) FROM charges)          AS charges,
    (SELECT COUNT(*) FROM contact_messages) AS contact_messages,
    (SELECT COUNT(*) FROM team_invitations) AS team_invitations,
    (SELECT COUNT(*) FROM audit_log)        AS audit_log
  `,
);
console.table(post);

await db.end();
console.log("\nDone.\n");
