/**
 * Feature flags reader. Pulls from `trpc.site.flags` (public endpoint, cached
 * 5 min). Used to disable converter landings, the product tour, blog, or
 * Google Ads tracking via the admin panel without a redeploy.
 *
 * Default is ENABLED — if the network call fails or flags are still loading,
 * every feature is treated as on so we never accidentally break the site.
 */
import { trpc } from "@/lib/trpc";

export function useFeatureFlags() {
  const q = trpc.site.flags.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    converterEnabled: q.data?.converterEnabled ?? true,
    productTourEnabled: q.data?.productTourEnabled ?? true,
    blogEnabled: q.data?.blogEnabled ?? true,
    adsTrackingEnabled: q.data?.adsTrackingEnabled ?? true,
    isLoading: q.isLoading,
  };
}
