// SOLO LECTURA (no manda ningún mensaje). ¿El bot de avisos de venta sigue vivo
// y puede escribir en el chat? El código de notifySale traga todos los errores en
// silencio y ni mira la respuesta de Telegram, así que si el bot se cae, el dueño
// deja de ver ventas y no queda rastro en ninguna parte.
//   railway run node scripts/_chk-telegram.mjs
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
console.log(`TELEGRAM_BOT_TOKEN: ${token ? "presente (" + token.slice(0, 8) + "…)" : "AUSENTE"}`);
console.log(`TELEGRAM_CHAT_ID:   ${chatId ?? "AUSENTE"}\n`);
if (!token || !chatId) {
  console.log("Sin estas dos variables, notifySale() sale por la puerta de atrás sin avisar: nunca llega ningún aviso de venta.");
  process.exit(0);
}
const api = async (m, q = "") => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${m}${q}`);
  const j = await r.json().catch(() => ({}));
  return { http: r.status, ...j };
};
const me = await api("getMe");
console.log(`getMe  → HTTP ${me.http}  ok=${me.ok}  ${me.ok ? "@" + me.result?.username : JSON.stringify(me).slice(0, 200)}`);
const chat = await api("getChat", `?chat_id=${encodeURIComponent(chatId)}`);
console.log(`getChat → HTTP ${chat.http}  ok=${chat.ok}  ${chat.ok ? (chat.result?.type + " " + (chat.result?.username ?? chat.result?.title ?? "")) : JSON.stringify(chat).slice(0, 200)}`);
console.log(`\n${me.ok && chat.ok ? "El bot puede escribir: los avisos deberían llegar." : "AQUÍ ESTÁ EL PROBLEMA: el bot no puede entregar, y el código no lo reporta."}`);
process.exit(0);
