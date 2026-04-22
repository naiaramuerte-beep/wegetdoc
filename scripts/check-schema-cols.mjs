import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const db = await mysql.createConnection(process.env.DATABASE_URL);

const [cols] = await db.execute(`
  SELECT TABLE_NAME, COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND (
      (TABLE_NAME = 'users' AND COLUMN_NAME IN ('deletedAt','adminNotes'))
      OR (TABLE_NAME = 'subscriptions' AND COLUMN_NAME IN ('cancelReason','cancelFeedback'))
    )
  ORDER BY TABLE_NAME, COLUMN_NAME
`);
console.log("existing columns relevant to upcoming migration:");
console.table(cols);

const [tables] = await db.execute(`
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('audit_log','webhook_events')
`);
console.log("existing tables:");
console.table(tables);

await db.end();
