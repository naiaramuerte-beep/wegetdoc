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
  const { pendingFile, pendingTool, pendingPaywall, setPendingPaywall } = usePdfFile();
  const [, navigate] = useLocation();

  const isFileFree = pendingTool ? FILE_FREE_TOOLS.includes(pendingTool) : false;

  // If no file was passed and tool requires a file, redirect back to home
  useEffect(() => {
    if (!pendingFile && !isFileFree) {
      navigate("/es");
    }
  }, [pendingFile, isFileFree, navigate]);

  if (!pendingFile && !isFileFree) return null;

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
