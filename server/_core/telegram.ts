/**
 * Telegram "cha-ching" sale notifications + daily summary. Fire-and-forget:
 * any error is swallowed so a notification can NEVER block or break a payment.
 *
 * Config (Railway env vars):
 *   TELEGRAM_BOT_TOKEN  — the bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — the destination chat (the owner's private chat)
 */

const PROVIDER_LABEL: Record<string, string> = {
  fastpay: "Tarjeta",
  gpay: "Google Pay",
  apay: "Apple Pay",
  mit: "Renovación mensual",
};

const eur = (cents: number) => (cents / 100).toFixed(2).replace(".", ",") + " €";

/** Rough device class from a User-Agent. null when unknown (e.g. MIT cron). */
export function deviceFromUA(ua?: string | null): "mobile" | "desktop" | null {
  if (!ua) return null;
  return /Mobi|Android|iPhone|iPod|iPad|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    ? "mobile"
    : "desktop";
}

/** 2-letter ISO country → flag emoji (regional indicator letters). */
function countryFlag(code?: string | null): string {
  const c = (code || "").trim().toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "";
  return String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65, 0x1f1e6 + c.charCodeAt(1) - 65);
}

/** Country code → localized name (es), best-effort. */
function countryName(code?: string | null): string {
  const c = (code || "").trim().toUpperCase();
  if (c.length !== 2) return "";
  try { return new Intl.DisplayNames(["es"], { type: "region" }).of(c) || c; } catch { return c; }
}

async function sendTelegram(text: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
  } catch {
    /* never break a payment for a notification */
  }
}

export async function notifySale(opts: {
  amountCents: number;
  provider: string; // fastpay | gpay | apay | mit
  userId?: number;
  country?: string | null;
  maskedCard?: string | null;
  todayCount?: number;      // running total for today (incl. this sale)
  todayTotalCents?: number;
  hora?: string;            // HH:mm Madrid
  device?: "mobile" | "desktop" | null;
}): Promise<void> {
  const method = PROVIDER_LABEL[opts.provider] ?? opts.provider;
  const kind = opts.provider === "mit" ? "🔄 Renovación" : "🆕 Alta nueva";
  const flag = countryFlag(opts.country);
  const cname = countryName(opts.country);
  const deviceLabel = opts.device === "mobile" ? "📱 Móvil" : opts.device === "desktop" ? "💻 PC" : "";

  const lines = [
    `💰 <b>¡Nueva venta!</b>  <b>+${eur(opts.amountCents)}</b>`,
    `${method} · ${kind}`,
  ];
  const geoTime = [
    flag ? `${flag} ${cname}` : "",
    deviceLabel,
    opts.hora ? `🕐 ${opts.hora}` : "",
  ].filter(Boolean).join(" · ");
  if (geoTime) lines.push(geoTime);
  if (typeof opts.todayCount === "number" && typeof opts.todayTotalCents === "number") {
    lines.push(`📊 Hoy: <b>${opts.todayCount}</b> ventas · <b>${eur(opts.todayTotalCents)}</b>`);
  }
  const idCard = [
    opts.userId ? `👤 ${opts.userId}` : "",
    opts.maskedCard ? `💳 ${opts.maskedCard}` : "",
  ].filter(Boolean).join(" · ");
  if (idCard) lines.push(idCard);

  await sendTelegram(lines.join("\n"));
}

/** End-of-day summary ("resumen del día"). */
export async function notifyDailySummary(s: {
  dateLabel: string;
  count: number;
  totalCents: number;
  altasCount: number;
  altasCents: number;
  renovCount: number;
  renovCents: number;
  byMethod: { provider: string; count: number; cents: number }[];
}): Promise<void> {
  const methodLines = s.byMethod
    .map((m) => `   • ${PROVIDER_LABEL[m.provider] ?? m.provider}: <b>${m.count}</b> · ${eur(m.cents)}`)
    .join("\n");
  const text = [
    `📊 <b>Resumen del día · ${s.dateLabel}</b>`,
    `━━━━━━━━━━━━━━`,
    `💰 Total: <b>${eur(s.totalCents)}</b> · <b>${s.count}</b> ventas`,
    `🆕 Altas nuevas: <b>${s.altasCount}</b> · ${eur(s.altasCents)}`,
    `🔄 Renovaciones: <b>${s.renovCount}</b> · ${eur(s.renovCents)}`,
    s.byMethod.length ? `\nPor método:\n${methodLines}` : "",
  ].filter(Boolean).join("\n");
  await sendTelegram(text);
}
