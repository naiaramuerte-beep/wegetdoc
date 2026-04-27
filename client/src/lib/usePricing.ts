import { trpc } from "@/lib/trpc";

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
 * Falls back to "19,99€" / 19.99 while the query is loading or if it fails,
 * so the UI never shows a broken `{price}` token.
 */
export function usePricing() {
  const q = trpc.site.pricing.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const price = q.data?.priceFormattedEs ?? "19,99€";
  const priceEur = q.data?.priceEur ?? 19.99;
  const withPrice = (s: string | undefined | null) =>
    (s ?? "").replace(/\{price\}/g, price);
  return { price, priceEur, withPrice };
}
