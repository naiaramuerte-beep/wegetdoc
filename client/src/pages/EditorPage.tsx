/* =============================================================
   EditorPage — Full-screen PDF editor page (like pdfe.com)

   Uses pendingFileRef (synchronous) instead of pendingFile (async state)
   to avoid the race condition on mobile where the context state hasn't
   flushed yet when this component first mounts.
   ============================================================= */
import { useEffect } from "react";
import { useLocation } from "wouter";
import PdfEditor from "@/components/PdfEditor";
import { usePdfFile } from "@/contexts/PdfFileContext";
import Navbar from "@/components/Navbar";

// Tools that don't require a pre-existing PDF file
const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

export default function EditorPage() {
  const {
    pendingFile,
    pendingFileRef,
    pendingTool,
    pendingToolRef,
    pendingPaywall,
    setPendingPaywall,
  } = usePdfFile();
  const [, navigate] = useLocation();

  // Use ref values (synchronous) as the source of truth on first render.
  // React state may not have propagated yet when this component mounts on mobile.
  const file = pendingFileRef.current ?? pendingFile ?? undefined;
  const tool = pendingToolRef.current ?? pendingTool ?? undefined;
  const isFree = tool ? FILE_FREE_TOOLS.includes(tool) : false;

  useEffect(() => {
    // Only redirect if we truly have no file AND it's not a file-free tool.
    // Check both the ref (synchronous) and the state (async) to be safe.
    const hasFile = (pendingFileRef.current !== null) || (pendingFile !== null);
    const hasFreeTool = pendingToolRef.current
      ? FILE_FREE_TOOLS.includes(pendingToolRef.current)
      : isFree;

    if (!hasFile && !hasFreeTool) {
      navigate("/es");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!file && !isFree) return null;

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      {/* Slim navbar — no hero, just branding + nav */}
      <Navbar compact />
      {/* Full-screen editor */}
      <div className="flex-1 overflow-hidden">
        <PdfEditor
          initialFile={file}
          initialTool={tool}
          initialOpenPaywall={pendingPaywall}
          onPaywallOpened={() => setPendingPaywall(false)}
          fullscreen
        />
      </div>
    </div>
  );
}
