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

// ────────────────────────────────────────────────────────────────────────────
// NORMA (2026-08-06): TODO script de diagnóstico saca las horas en las DOS zonas,
// UTC y Madrid, siempre etiquetadas. Motivo: una falsa alarma de "retraso de 2h"
// en el cron salió de comparar un vencimiento leído en UTC (14:24) con un cobro
// leído en Madrid (16:31) — el mismo bug de zona horaria nº4, pero del lado de la
// LECTURA. Un solo número sin zona es un número que alguien va a comparar mal.
//
// `CONVERT_TZ(..., 'Europe/Madrid')` (zona NOMBRADA, no '+02:00') está verificado
// en la TiDB de producción y respeta el cambio de hora — no hardcodear el offset.

/** Columnas SQL `<alias>_utc` y `<alias>_mad` para una columna TIMESTAMP. */
export function tzCols(col, alias) {
  return `DATE_FORMAT(${col},'%Y-%m-%d %H:%i:%s') ${alias}_utc,
          DATE_FORMAT(CONVERT_TZ(${col},'+00:00','Europe/Madrid'),'%Y-%m-%d %H:%i:%s') ${alias}_mad`;
}

/** Formatea el par de columnas que produce `tzCols` para imprimir en una línea. */
export function tzShow(row, alias) {
  const u = row[`${alias}_utc`], m = row[`${alias}_mad`];
  if (!u && !m) return "—";
  return `${u} UTC / ${m} Madrid`;
}
