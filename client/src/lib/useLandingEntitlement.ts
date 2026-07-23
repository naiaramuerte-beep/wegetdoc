import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Shared download-entitlement rule for the tool landings (split/merge/compress/
 * rotate/watermark/converter). Decides whether a user can download WITHOUT
 * paying the 0,50 €:
 *
 *   - Truly premium (monthly/annual + active) → always free, unlimited.
 *   - Trial (paid 0,50 €) → free only while under the download limit (<2).
 *     The download is saved + recorded server-side so the limit is enforced
 *     (otherwise landings would be an unlimited free bypass).
 *   - Everyone else → paywall.
 *
 * IMPORTANT: subscription.status.isPremium is true for TRIALING subs too, so we
 * must gate "truly premium" on the plan, not on isPremium.
 */
export function useLandingEntitlement() {
  // Only query the (auth-protected) subscription endpoints when logged in.
  // For anonymous visitors these threw UNAUTHORIZED, which the global query-
  // error handler in main.tsx turned into a redirect to `/{lang}?login=true`
  // → the landing pages (convert/split/merge/…) bounced logged-out users to the
  // home. Anonymous users simply aren't premium/trialing → they hit the paywall.
  const { isAuthenticated } = useAuth();
  const { data: sub } = trpc.subscription.status.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const { data: usage, refetch: refetchUsage } = trpc.subscription.trialUsage.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const recordDownload = trpc.subscription.recordDownload.useMutation();

  const plan = sub?.subscription?.plan;
  const status = sub?.subscription?.status;
  const isTrulyPremium = (plan === "monthly" || plan === "annual") && status === "active";
  const isTrialing = usage?.isTrialing ?? plan === "trial";
  const trialBlocked = usage?.blocked ?? false;

  async function saveDoc(bytes: Uint8Array, name: string): Promise<number | null> {
    const fd = new FormData();
    fd.append("file", new Blob([bytes as unknown as ArrayBuffer], { type: "application/pdf" }), name);
    fd.append("name", name);
    const res = await fetch("/api/documents/auto-save", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.doc?.id ?? null;
  }

  /**
   * Returns "free" if the user may download without paying, else "paywall".
   * For trial users it saves the doc + records the download (server enforces
   * the <2 limit); a blocked result falls through to "paywall".
   */
  async function claim(bytes: Uint8Array, name: string): Promise<"free" | "paywall"> {
    if (isTrulyPremium) return "free";
    if (!isTrialing || trialBlocked) return "paywall";
    try {
      const docId = await saveDoc(bytes, name);
      if (!docId) return "paywall";
      const gate = await recordDownload.mutateAsync({ docId });
      await refetchUsage();
      return gate.allowed ? "free" : "paywall";
    } catch {
      return "paywall";
    }
  }

  return { isTrulyPremium, isTrialing, trialBlocked, claim };
}
