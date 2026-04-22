import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute(
  "SELECT plan, status, cancelAtPeriodEnd, COUNT(*) as n FROM subscriptions GROUP BY plan, status, cancelAtPeriodEnd ORDER BY n DESC"
);
console.log(rows);
await db.end();
