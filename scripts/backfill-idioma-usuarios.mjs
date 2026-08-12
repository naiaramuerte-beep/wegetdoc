// Rellena `users.language` mirando el idioma de la página en la que cada
// cliente compró de verdad.
//
//   railway run node scripts/backfill-idioma-usuarios.mjs             ← SECO
//   railway run node scripts/backfill-idioma-usuarios.mjs --ejecutar
//
// SECO POR DEFECTO. Sin --ejecutar no escribe nada.
//
// Por qué: hasta el 12-ago-2026 nadie escribía esa columna y 2.557 de 2.562
// filas se quedaron en el "es" por defecto, compradores austriacos y alemanes
// incluidos. El correo de bienvenida iba bien (toma el idioma del checkout),
// pero cualquier cosa enviada DESPUÉS leía la columna y habría escrito en
// castellano a quien no lo lee.
//
// La fuente es `webhook_events`: el evento `fastpay_3ds_pending` lleva el
// `lang` de la página, y para los wallets se usa el idioma que el navegador
// declaró en el propio alta. Solo se toca a quien tiene una señal REAL — quien
// no la tenga se queda como está, porque "es" adivinado no es peor que "es"
// inventado, pero sobrescribirlo con una suposición sí lo sería.
import { openDb } from "./_db.mjs";

const EJECUTAR = process.argv.includes("--ejecutar");
const SUPPORTED = ["es", "en", "fr", "de", "pt", "it", "nl", "pl", "ru", "uk", "ro", "zh"];

const db = await openDb();

// Idioma declarado en el alta, por usuario (el más reciente).
const [rows] = await db.query(
  `SELECT eventId, eventType, CAST(payload AS CHAR) p, receivedAt
     FROM webhook_events
    WHERE eventType IN ('fastpay_3ds_pending','fastpay_init_started')
      AND payload LIKE '%"lang"%'
    ORDER BY receivedAt`);

const porUsuario = new Map();
for (const r of rows) {
  let o; try { o = JSON.parse(r.p); } catch { continue; }
  const uid = Number(o?.userId);
  const lang = String(o?.lang ?? "").trim().slice(0, 2).toLowerCase();
  if (!uid || !SUPPORTED.includes(lang)) continue;
  porUsuario.set(uid, lang); // el más reciente gana (van ordenados)
}

console.log(`Modo: ${EJECUTAR ? "✍️  ESCRITURA REAL" : "🔍 SECO (no se escribe nada)"}`);
console.log(`Usuarios con idioma declarado en su alta: ${porUsuario.size}\n`);

if (!porUsuario.size) { await db.end(); process.exit(0); }

const ids = [...porUsuario.keys()];
const [actuales] = await db.query(
  `SELECT id, email, COALESCE(NULLIF(language,''),'(vacío)') lang FROM users WHERE id IN (${ids.map(() => "?").join(",")})`,
  ids);
const mapa = new Map(actuales.map((u) => [u.id, u]));

const cambios = [];
for (const [uid, lang] of porUsuario) {
  const u = mapa.get(uid);
  if (!u) continue;              // usuario borrado
  if (u.lang === lang) continue; // ya está bien
  cambios.push({ uid, email: u.email, de: u.lang, a: lang });
}

console.log(`A corregir: ${cambios.length}`);
const porIdioma = {};
for (const c of cambios) porIdioma[c.a] = (porIdioma[c.a] ?? 0) + 1;
console.log("Reparto del idioma nuevo:", Object.entries(porIdioma).map(([k, v]) => `${k}=${v}`).join(" · ") || "—");
console.log();
for (const c of cambios.slice(0, 40)) console.log(`  ${String(c.email).padEnd(38)} ${c.de} → ${c.a}`);
if (cambios.length > 40) console.log(`  … y ${cambios.length - 40} más`);

if (EJECUTAR) {
  let n = 0;
  for (const c of cambios) {
    await db.query("UPDATE users SET language=? WHERE id=?", [c.a, c.uid]);
    n++;
  }
  console.log(`\n✅ Actualizados ${n} usuarios.`);
} else {
  console.log(`\n🔍 Seco. Para escribir:\n   railway run node scripts/backfill-idioma-usuarios.mjs --ejecutar`);
}

await db.end();
process.exit(0);
