// Conexión UTC para TODOS los scripts de diagnóstico. REGLA (bug de zona horaria
// nº4): `timezone:'Z'` fuerza a mysql2 a parsear TIMESTAMP en UTC, no en la zona
// local del proceso. Sin esto, en una máquina en Madrid `receivedAt.toISOString()`
// devolvía 05:04Z cuando el valor real era 07:04 UTC (09:04 Madrid). Usa SIEMPRE
// openDb() aquí — nunca `mysql.createConnection(DATABASE_URL)` a pelo.
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const DB_TIMEZONE = "Z";

export async function openDb() {
  return mysql.createConnection({ uri: process.env.DATABASE_URL, timezone: DB_TIMEZONE });
}
