/**
 * Telegram "cha-ching" sale notifications. Fire-and-forget: any error is
 * swallowed so a notification can NEVER block or break a payment.
 *
 * Config (Railway env vars):
 *   TELEGRAM_BOT_TOKEN  — the bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — the destination chat (the owner's private chat)
 *
 * The "money sound" is set by the user on their side: Telegram → chat settings
 * → Notifications → Sound → a cash-register tone.
 */

const PROVIDER_LABEL: Record<string, string> = {
  fastpay: "Tarjeta",
  gpay: "Google Pay",
  apay: "Apple Pay",
  mit: "Renovación mensual",
};

export async function notifySale(opts: {
  amountCents: number;
  provider: string; // fastpay | gpay | apay | mit
  userId?: number;
}): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const eur = (opts.amountCents / 100).toFixed(2).replace(".", ",");
    const method = PROVIDER_LABEL[opts.provider] ?? opts.provider;
    const kind = opts.provider === "mit" ? "Renovación" : "Alta nueva";
    const text =
      `💰 <b>¡Nueva venta!</b>\n` +
      `<b>+${eur} €</b> · ${method}\n` +
      `${kind}${opts.userId ? ` · user ${opts.userId}` : ""}`;

    // Short timeout so a slow Telegram call never delays the payment path.
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
