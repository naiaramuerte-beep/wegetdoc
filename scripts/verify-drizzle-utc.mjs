// Valida en RUNTIME que drizzle({ connection: { uri, timezone:'Z' } }) conecta y
// devuelve UTC (misma forma que usará server/db.ts). railway run node ...
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();
const db = drizzle({ connection: { uri: process.env.DATABASE_URL, timezone: "Z" } });
const r = await db.execute(sql`SELECT DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%d %H:%i:%s') utc,
  (SELECT DATE_FORMAT(receivedAt,'%Y-%m-%d %H:%i:%s') FROM webhook_events WHERE eventType='mit_charge_failed' ORDER BY receivedAt DESC LIMIT 1) last_cron_raw`);
console.log("drizzle({connection}) OK →", JSON.stringify(r[0]?.[0] ?? r[0]));
process.exit(0);
