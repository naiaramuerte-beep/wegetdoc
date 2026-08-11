import { trpc } from "@/lib/trpc";
import { fillNotice } from "@shared/trial";

/**
 * Live subscription price, sourced from `site_settings.subscription_price_eur`
 * via the public `site.pricing` tRPC procedure. Lets the admin run an A/B
 * pricing test without redeploying.
 *
 * Usage:
 *   const { price, priceEur, withPrice } = usePricing();
 *   <p>{withPrice(t.paywall_legal_text)}</p>   // {price} → "39,90€"
 *   <p>{price}/mes</p>                          // direct render
 *
 * Falls back to "19,95€" / 19.95 while the query is loading or if it fails,
 * so the UI never shows a broken `{price}` token.
 */
export function usePricing() {
  const q = trpc.site.pricing.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const price = q.data?.priceFormattedEs ?? "19,95€";
  const priceEur = q.data?.priceEur ?? 19.95;
  // Trial length in HOURS (24 since 2026-08-11). Falls back to the policy value
  // while the query is in flight so the copy never renders a raw placeholder.
  const trialHours = q.data?.trialHours ?? 24;
  const withPrice = (s: string | undefined | null) =>
    (s ?? "").replace(/\{price\}/g, price);
  // For the checkout billing notice: also fills {hours} (trial length) and
  // {intro} (the €0,50 today), so the copy always matches the live config.
  const withNotice = (s: string | undefined | null) =>
    fillNotice(s, { intro: "0,50€", hours: trialHours, price });
  return { price, priceEur, trialHours, withPrice, withNotice };
}
