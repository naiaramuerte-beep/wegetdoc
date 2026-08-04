// Configuración de conexión MySQL. REGLA DURA (bug de zona horaria nº4):
// `timezone: 'Z'` fuerza a mysql2 a parsear las columnas TIMESTAMP como UTC,
// NUNCA en la zona local del proceso. Sin esto, un proceso en Europe/Madrid leía
// "07:04 UTC" y construía un Date en hora local → 05:04Z (−2h), envenenando todo
// razonamiento temporal (incluido el calendario de cobros). En prod (Railway=UTC)
// 'Z' y 'local' coinciden, pero lo dejamos explícito para no depender del host.
// Ver dbConfig.test.ts. Los scripts usan la misma regla vía scripts/_db.mjs.
export const DB_TIMEZONE = "Z" as const;

export function dbConnectionConfig(url: string | undefined = process.env.DATABASE_URL) {
  return { uri: url, timezone: DB_TIMEZONE };
}
