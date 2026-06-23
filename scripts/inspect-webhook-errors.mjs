import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);

console.log("\n─── Latest 30 errors of ALL TIME ───");
const [errs] = await db.execute(`
  SELECT id, eventType, eventId,
         SUBSTRING(errorMessage, 1, 250) as errorMessage,
         SUBSTRING(payload, 1, 600) as payloadSnippet,
         durationMs, receivedAt
  FROM webhook_events
  WHERE status = 'error'
  ORDER BY receivedAt DESC
  LIMIT 30
`);
console.log(`Found ${errs.length} error events.`);
for (const e of errs) {
  console.log(`\n  [${e.receivedAt.toISOString().slice(0,19)}] ${e.eventType}`);
  console.log(`    eventId: ${e.eventId ?? "(none)"}`);
  console.log(`    error:   ${e.errorMessage ?? "(none)"}`);
  if (e.payloadSnippet) console.log(`    payload: ${e.payloadSnippet.slice(0, 400)}`);
}

console.log("\n─── ALL events grouped by type (any time) ───");
const [agg] = await db.execute(`
  SELECT eventType, status, COUNT(*) as n,
         MAX(receivedAt) as lastSeen
  FROM webhook_events
  GROUP BY eventType, status
  ORDER BY lastSeen DESC
  LIMIT 30
`);
console.table(agg);

await db.end();
