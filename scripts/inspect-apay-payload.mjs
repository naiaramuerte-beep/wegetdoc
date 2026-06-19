// Dump the raw payload Sipay returned for the successful Apple Pay charge
// so we can see EXACTLY which field carries the reusable token (if any).
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

// The successful apay_intro_charge event — id 4071 from the prior inspect run.
const [rows] = await db.query(`
  SELECT id, eventType, status, eventId, payload, receivedAt
  FROM webhook_events
  WHERE eventType = 'apay_intro_charge'
  ORDER BY id DESC
  LIMIT 1
`);

if (!rows[0]) {
  console.log("No apay_intro_charge events found.");
  await db.end();
  process.exit(0);
}

const row = rows[0];
console.log(`\nEvent #${row.id} @ ${row.receivedAt.toISOString()}`);
console.log(`type=${row.eventType}  status=${row.status}  eventId=${row.eventId}\n`);

let parsed;
try {
  parsed = JSON.parse(row.payload);
} catch (err) {
  console.error("Couldn't JSON.parse the payload:", err.message);
  console.log("Raw payload (first 2000 chars):");
  console.log(row.payload?.slice(0, 2000));
  await db.end();
  process.exit(1);
}

console.log("Parsed payload (full):");
console.log(JSON.stringify(parsed, null, 2));

// Try to find any field that looks like a token (top-level + payload-level keys)
console.log("\nKeys at top level:", Object.keys(parsed));
if (parsed.payload && typeof parsed.payload === "object") {
  console.log("Keys inside payload:", Object.keys(parsed.payload));
}

await db.end();
