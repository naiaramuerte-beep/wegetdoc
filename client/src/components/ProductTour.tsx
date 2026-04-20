/* =============================================================
   ProductTour — editor onboarding (desktop ≥768px only)
   - Auto-starts 1.5s after a PDF has loaded, first visit only
   - Persists "seen" flag in localStorage; can be relaunched via
     the ? button in the editor header (see EditorPage.tsx)
   - Uses existing data-tour="..." attributes to locate targets
   ============================================================= */

import { useEffect, useRef } from "react";
import { TourProvider, useTour, type StepType } from "@reactour/tour";
import { useIsMobile } from "@/hooks/useMobile";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "editorpdf_tour_seen_v1";
const AUTO_START_DELAY_MS = 1500;

const ACCENT = "#E63946";
const INK = "#0A0A0B";
const MUTED = "#5A5A62";
const LINE = "#E8E8EC";

export function hasSeenTour(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; }
  catch { return false; }
}
export function markTourSeen() {
  try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
}
export function resetTourSeen() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ─── Bridge: exposes `startTour()` imperatively via a ref ──────
// EditorPage uses this to launch the tour from the help "?" button
// without prop-drilling tour state into PdfEditor.
export type TourBridge = { start: () => void };
let tourBridge: TourBridge | null = null;
export function launchTour() { tourBridge?.start(); }

// ─── Build steps using i18n ────────────────────────────────────
function useSteps(): StepType[] {
  const { t } = useLanguage();
  const common = {
    styles: {
      popover: (base: any) => ({
        ...base,
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 20px 48px rgba(10,10,11,0.14)",
        border: `1px solid ${LINE}`,
        fontFamily: "inherit",
      }),
    },
  };
  return [
    { selector: "body", position: "center" as any,
      content: <TourCard title={t.tour_step1_title} body={t.tour_step1_body} />, ...common },
    { selector: "[data-tour='filename']",
      content: <TourCard title={t.tour_step2_title} body={t.tour_step2_body} />, ...common },
    { selector: "[data-tour='toolbar']",
      content: <TourCard title={t.tour_step3_title} body={t.tour_step3_body} />, ...common },
    { selector: "[data-tour='tool-edit-text']",
      content: <TourCard title={t.tour_step4_title} body={t.tour_step4_body} />, ...common },
    { selector: "[data-tour='tool-sign']",
      content: <TourCard title={t.tour_step5_title} body={t.tour_step5_body} />, ...common },
    { selector: "[data-tour='thumbnails']",
      content: <TourCard title={t.tour_step6_title} body={t.tour_step6_body} />, ...common },
    { selector: "[data-tour='download-btn']",
      content: <TourCard title={t.tour_step7_title} body={t.tour_step7_body} />, ...common },
  ];
}

function TourCard({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 style={{ color: INK, fontWeight: 800, fontSize: 16, marginBottom: 6, letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

// ─── Inner component: handles auto-start + bridge registration ─
function TourAutoStart({ pdfReady, children }: { pdfReady: boolean; children: React.ReactNode }) {
  const { setIsOpen, setCurrentStep } = useTour();
  const firedRef = useRef(false);

  // Register the imperative bridge on mount
  useEffect(() => {
    tourBridge = {
      start: () => { setCurrentStep(0); setIsOpen(true); },
    };
    return () => { tourBridge = null; };
  }, [setIsOpen, setCurrentStep]);

  // Auto-start once, 1.5s after PDF is loaded, if first visit
  useEffect(() => {
    if (!pdfReady || firedRef.current || hasSeenTour()) return;
    firedRef.current = true;
    const id = window.setTimeout(() => {
      setCurrentStep(0);
      setIsOpen(true);
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [pdfReady, setIsOpen, setCurrentStep]);

  return <>{children}</>;
}

// ─── Public component: TourProvider + desktop gate ─────────────
export function ProductTour({
  pdfReady,
  children,
}: { pdfReady: boolean; children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const steps = useSteps();

  // Mobile: bypass entirely — no provider, no DOM overhead
  if (isMobile) return <>{children}</>;

  return (
    <TourProvider
      steps={steps}
      onClickMask={() => {}} // don't close on backdrop click — user must use buttons
      beforeClose={() => { markTourSeen(); }}
      showBadge={false}
      disableInteraction
      padding={{ mask: 8, popover: 12 }}
      styles={{
        maskWrapper: (base) => ({ ...base, color: "rgba(10,10,11,0.55)" }),
        badge: (base) => ({ ...base, background: ACCENT }),
        dot: (base, { current, disabled }: any = {}) => ({
          ...base,
          background: current ? ACCENT : "#E4E4E7",
          opacity: disabled ? 0.4 : 1,
        }),
        close: (base) => ({ ...base, color: MUTED, top: 12, right: 12 }),
      }}
      prevButton={({ currentStep, setCurrentStep }) =>
        currentStep > 0 ? (
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#1A1A1C] hover:bg-[#F6F6F7] transition-colors"
          >{t.tour_prev}</button>
        ) : null
      }
      nextButton={({ currentStep, stepsLength, setIsOpen, setCurrentStep }) => {
        const isLast = currentStep === stepsLength - 1;
        return (
          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                onClick={() => { markTourSeen(); setIsOpen(false); }}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#5A5A62] hover:bg-[#F6F6F7] transition-colors"
              >{t.tour_skip}</button>
            )}
            <button
              onClick={() => {
                if (isLast) { markTourSeen(); setIsOpen(false); }
                else setCurrentStep((s) => s + 1);
              }}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-[#E63946] text-white hover:bg-[#C72738] shadow-sm transition-all"
            >{isLast ? t.tour_done : t.tour_next}</button>
          </div>
        );
      }}
    >
      <TourAutoStart pdfReady={pdfReady}>{children}</TourAutoStart>
    </TourProvider>
  );
}
