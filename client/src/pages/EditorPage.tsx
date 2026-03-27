/* =============================================================
   EditorPage — Full-screen PDF editor page (like pdfe.com)
   ============================================================= */
import { useEffect } from "react";
import { useLocation } from "wouter";
import PdfEditor from "@/components/PdfEditor";
import { usePdfFile } from "@/contexts/PdfFileContext";
import Navbar from "@/components/Navbar";

// Tools that don't require a pre-existing PDF file
const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

export default function EditorPage() {
  const { pendingFile, pendingTool, pendingPaywall, setPendingPaywall, isRestoringFromSession } = usePdfFile();
  const [, navigate] = useLocation();

  const isFileFree = pendingTool ? FILE_FREE_TOOLS.includes(pendingTool) : false;

  // If no file was passed and tool requires a file, redirect back to home.
  // Wait until session restoration is complete (isRestoringFromSession = false)
  // so we don't redirect prematurely after an OAuth login redirect.
  useEffect(() => {
    if (isRestoringFromSession) return; // Wait for session restoration
    // Don't redirect if pendingPaywall is true (user returning from OAuth login)
    if (!pendingFile && !isFileFree && !pendingPaywall) {
      const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const lang = langMatch ? langMatch[1] : "es";
      navigate(`/${lang}`);
    }
  }, [pendingFile, isFileFree, navigate, isRestoringFromSession, pendingPaywall]);

  // Show navbar while loading/redirecting to avoid blank page without header
  if (isRestoringFromSession || (!pendingFile && !isFileFree && !pendingPaywall)) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        {isRestoringFromSession && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ color: "oklch(0.55 0.22 260)" }}>
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Cargando documento...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      {/* Slim navbar — no hero, just branding + nav */}
      <Navbar compact />
      {/* Full-screen editor */}
      <div className="flex-1 overflow-hidden">
        <PdfEditor
          initialFile={pendingFile ?? undefined}
          initialTool={pendingTool ?? undefined}
          initialOpenPaywall={pendingPaywall}
          onPaywallOpened={() => setPendingPaywall(false)}
          fullscreen
        />
      </div>
    </div>
  );
}
