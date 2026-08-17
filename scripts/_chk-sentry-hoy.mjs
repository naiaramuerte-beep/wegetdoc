// SOLO LECTURA. Errores de cliente vistos por Sentry en las últimas horas, para
// atribuir un fallo del retorno de Google a una excepción concreta en vez de a
// una hipótesis. Usa SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT de Railway.
//   railway run node scripts/_chk-sentry-hoy.mjs [horas]
const token = process.env.SENTRY_AUTH_TOKEN;
const org = process.env.SENTRY_ORG;
const project = process.env.SENTRY_PROJECT;
if (!token || !org || !project) {
  console.error("Faltan SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT (usa railway run)");
  process.exit(1);
}
const horas = Number(process.argv[2] ?? 24);
const H = { Authorization: `Bearer ${token}` };
const api = async (path) => {
  const r = await fetch(`https://sentry.io/api/0${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const desde = new Date(Date.now() - horas * 3600e3).toISOString();
console.log(`Errores desde ${desde} (últimas ${horas} h)\n`);

const issues = await api(
  `/projects/${org}/${project}/issues/?statsPeriod=${horas <= 24 ? "24h" : "14d"}&query=${encodeURIComponent("is:unresolved")}&limit=25`);

if (!issues.length) console.log("  (sin incidencias)");
for (const i of issues) {
  const visto = new Date(i.lastSeen);
  if (visto.toISOString() < desde) continue;
  console.log(`── ${i.shortId}  ${i.count} eventos, ${i.userCount} usuarios`);
  console.log(`   ${i.title}`);
  console.log(`   culprit: ${i.culprit ?? "-"}`);
  console.log(`   primero ${i.firstSeen}  último ${i.lastSeen}`);
  console.log(`   ${i.permalink}`);
}
process.exit(0);
