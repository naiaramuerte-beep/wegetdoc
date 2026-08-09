// READ-ONLY — ¿ha renovado ya Railway el certificado del apex?
//
// Contexto: el 9-ago el certificado de editorpdf.net caducaba el 9-sep, o sea
// 31 días. Let's Encrypt renueva sobre los 30 restantes, así que la renovación
// era inminente. Acordamos NO activar el proxy de Cloudflare hasta verla
// hecha: con el certificado recién renovado hay ~90 días de margen para
// descubrir si el proxy rompe el desafío ACME, en vez de 31.
//
//   node scripts/check-cert-apex.mjs
//
// Sale con código 0 si ya renovó (>60 días de vida), 1 si sigue el viejo.
import { execFileSync } from "node:child_process";

const HOSTS = ["editorpdf.net", "www.editorpdf.net"];
const DIAS_PARA_DAR_POR_RENOVADO = 60;

function certDe(host) {
  // openssl s_client necesita que se le cierre la entrada, de ahí el input:"".
  const raw = execFileSync(
    "openssl",
    ["s_client", "-servername", host, "-connect", `${host}:443`],
    { input: "", encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], timeout: 20000 },
  );
  const pem = raw.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)?.[0];
  if (!pem) throw new Error("no se pudo leer el certificado");
  const txt = execFileSync("openssl", ["x509", "-noout", "-dates", "-issuer"], {
    input: pem, encoding: "utf8", timeout: 20000,
  });
  const notAfter = txt.match(/notAfter=(.+)/)?.[1]?.trim();
  const notBefore = txt.match(/notBefore=(.+)/)?.[1]?.trim();
  const issuer = txt.match(/issuer=(.+)/)?.[1]?.trim() ?? "?";
  const caduca = new Date(notAfter);
  const emitido = new Date(notBefore);
  const dias = Math.round((caduca - Date.now()) / 86400000);
  return { host, emitido, caduca, dias, issuer };
}

let renovado = true;
console.log(`Comprobación de certificados · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC\n`);
for (const h of HOSTS) {
  try {
    const c = certDe(h);
    const ok = c.dias > DIAS_PARA_DAR_POR_RENOVADO;
    if (h === "editorpdf.net" && !ok) renovado = false;
    console.log(`  ${ok ? "✅" : "⏳"} ${h.padEnd(20)} caduca ${c.caduca.toISOString().slice(0, 10)}  (${c.dias} días)  emitido ${c.emitido.toISOString().slice(0, 10)}`);
  } catch (e) {
    renovado = false;
    console.log(`  ❌ ${h.padEnd(20)} error: ${e?.message ?? e}`);
  }
}

console.log("");
if (renovado) {
  console.log("🎉 EL CERTIFICADO DEL APEX YA HA RENOVADO.");
  console.log("   Vía libre para elegir la mañana del cambio de nube de Cloudflare.");
  console.log("   Recordatorio del guion: baseline de vigilancia → Full (strict) → Bot Fight Mode OFF");
  console.log("   → reglas WAF (/api/sipay/*, /api/cron/*, /.well-known/*) → bypass de caché en /api/*");
  console.log("   → nube naranja → fichero de Apple Pay + /api/geo + pago real de 0,50 €.");
} else {
  console.log("⏳ Todavía no ha renovado. No tocar la nube de Cloudflare.");
}
process.exit(renovado ? 0 : 1);
