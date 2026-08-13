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

/**
 * Method + kind labels for a sale alert. A "mit-upgrade-…" order is a user
 * pressing "upgrade to monthly now" from the trial-limit paywall — an immediate
 * trial→monthly conversion, NOT the daily cron's recurring renewal. Labelling
 * the two distinctly lets the owner tell them apart at a glance in Telegram.
 */
export function saleLabels(provider: string, order?: string | null): { method: string; kind: string } {
  const isUpgrade = provider === "mit" && (order || "").startsWith("mit-upgrade-");
  if (isUpgrade) return { method: "Upgrade a mensual", kind: "⬆️ Desde trial" };
  const method = PROVIDER_LABEL[provider] ?? provider;
  const kind = provider === "mit" ? "🔄 Renovación" : "🆕 Alta nueva";
  return { method, kind };
}

/** Rough device class from a User-Agent. null when unknown (e.g. MIT cron). */
export function deviceFromUA(ua?: string | null): "mobile" | "desktop" | null {
  if (!ua) return null;
  return /Mobi|Android|iPhone|iPod|iPad|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    ? "mobile"
    : "desktop";
}

/**
 * ISO 3166-1 numeric → alpha-2. Sipay returns the card's issuing country as a
 * numeric code (`card_country`, e.g. 724), which is present on every charge —
 * unlike our browser-geo `users.country`, which is often empty. Covers the
 * markets we see; unknown codes fall through to "".
 */
const NUMERIC_TO_ALPHA2: Record<number, string> = {
  4:"AF",8:"AL",12:"DZ",20:"AD",24:"AO",32:"AR",36:"AU",40:"AT",48:"BH",50:"BD",
  56:"BE",68:"BO",70:"BA",76:"BR",100:"BG",112:"BY",124:"CA",152:"CL",156:"CN",170:"CO",
  188:"CR",191:"HR",196:"CY",203:"CZ",208:"DK",214:"DO",218:"EC",222:"SV",233:"EE",246:"FI",
  250:"FR",268:"GE",275:"PS",276:"DE",280:"DE",288:"GH",300:"GR",320:"GT",324:"GN",340:"HN",
  344:"HK",348:"HU",352:"IS",356:"IN",360:"ID",364:"IR",368:"IQ",372:"IE",376:"IL",380:"IT",
  388:"JM",392:"JP",398:"KZ",400:"JO",404:"KE",410:"KR",414:"KW",417:"KG",422:"LB",428:"LV",
  434:"LY",440:"LT",442:"LU",446:"MO",458:"MY",480:"MU",484:"MX",496:"MN",498:"MD",504:"MA",
  516:"NA",524:"NP",528:"NL",554:"NZ",558:"NI",566:"NG",578:"NO",586:"PK",591:"PA",600:"PY",
  604:"PE",608:"PH",616:"PL",620:"PT",630:"PR",634:"QA",642:"RO",643:"RU",682:"SA",686:"SN",
  688:"RS",702:"SG",703:"SK",704:"VN",705:"SI",710:"ZA",716:"ZW",724:"ES",752:"SE",756:"CH",
  760:"SY",764:"TH",784:"AE",788:"TN",792:"TR",795:"TM",800:"UG",804:"UA",807:"MK",818:"EG",
  826:"GB",840:"US",854:"BF",858:"UY",860:"UZ",862:"VE",887:"YE",894:"ZM",
};

/**
 * Resolve a 2-letter country code from the browser-geo value (preferred) or the
 * card's numeric issuing country (fallback). Returns "" when neither is usable.
 */
export function resolveCountryCode(geo?: string | null, cardCountry?: string | number | null): string {
  const g = (geo || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(g)) return g;
  const n = typeof cardCountry === "number" ? cardCountry : parseInt(String(cardCountry ?? ""), 10);
  if (Number.isFinite(n) && NUMERIC_TO_ALPHA2[n]) return NUMERIC_TO_ALPHA2[n];
  return "";
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
  country?: string | null;          // browser geo (users.country), often empty
  cardCountry?: string | number | null; // card issuing country from Sipay (reliable)
  maskedCard?: string | null;
  todayCount?: number;      // running total for today (incl. this sale)
  todayTotalCents?: number;
  todayAltas?: number;      // de ese total, cuántas son altas nuevas
  todayRenov?: number;      // y cuántas cobros recurrentes
  hora?: string;            // HH:mm Madrid
  device?: "mobile" | "desktop" | null;
  order?: string | null;    // sipay order — "mit-upgrade-…" marks a trial→monthly upgrade
}): Promise<void> {
  const { method, kind } = saleLabels(opts.provider, opts.order);
  // Prefer real browser geo; fall back to the card's issuing country (present on
  // every Sipay charge) so the flag shows even when users.country is empty.
  const cc = resolveCountryCode(opts.country, opts.cardCountry);
  const flag = countryFlag(cc);
  const cname = countryName(cc);
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
    // Desglosado, porque 20 ventas no dicen lo mismo si son 20 clientes nuevos
    // que si son 20 cobros de gente que ya estaba.
    const desglose = typeof opts.todayAltas === "number" && typeof opts.todayRenov === "number"
      ? `🆕 <b>${opts.todayAltas}</b> altas · 🔄 <b>${opts.todayRenov}</b> renovaciones`
      : `<b>${opts.todayCount}</b> ventas`;
    lines.push(`📊 Hoy: ${desglose} · <b>${eur(opts.todayTotalCents)}</b>`);
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
