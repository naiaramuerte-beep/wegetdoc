/* =============================================================
   AnnouncementBanner — site-wide toast configurable from admin.
   Pulls from trpc.site.announcement (public). Returns null when
   the flag is off or no text is configured. Dismiss is per-session
   via sessionStorage so the banner reappears on fresh visits.
   ============================================================= */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const LEVEL_STYLES: Record<string, { bg: string; fg: string; border: string }> = {
  info:    { bg: "#0A0A0B", fg: "#FFFFFF", border: "#1A1A1C" },
  warning: { bg: "#F59E0B", fg: "#0A0A0B", border: "#D97706" },
  success: { bg: "#10B981", fg: "#0A0A0B", border: "#059669" },
};

const DISMISS_KEY = "editorpdf_banner_dismissed_v1";

export default function AnnouncementBanner() {
  const annQ = trpc.site.announcement.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY));
    } catch {}
  }, []);

  if (!annQ.data) return null;
  // Use the message itself as the dismiss key so a new message reappears.
  if (dismissed === annQ.data.message) return null;

  const colors = LEVEL_STYLES[annQ.data.level] ?? LEVEL_STYLES.info;

  return (
    <div
      className="w-full text-center text-[13px] font-medium px-4 py-2 flex items-center justify-center gap-3"
      style={{ backgroundColor: colors.bg, color: colors.fg, borderBottom: `1px solid ${colors.border}` }}
      role="alert"
    >
      <span className="max-w-3xl">{annQ.data.message}</span>
      <button
        onClick={() => {
          try { sessionStorage.setItem(DISMISS_KEY, annQ.data.message); } catch {}
          setDismissed(annQ.data.message);
        }}
        aria-label="Dismiss"
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
