/* =============================================================
   EditorPage — Full-screen PDF editor page

   Reads file/tool from the module-level sync store (getPendingFileSync)
   on first render to avoid the mobile race condition where React context
   state hasn't propagated yet when this component mounts.
   ============================================================= */
import { useEffect } from "react";
import { useLocation } from "wouter";
import PdfEditor from "@/components/PdfEditor";
import { usePdfFile, getPendingFileSync, getPendingToolSync, getPendingPaywallSync } from "@/contexts/PdfFileContext";
import Navbar from "@/components/Navbar";

// Tools that don't require a pre-existing PDF file
const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

export default function EditorPage() {
  const { setPendingPaywall } = usePdfFile();
  const [, navigate] = useLocation();

  // Read from the synchronous module store — always up-to-date even on first render
  const file = getPendingFileSync() ?? undefined;
  const tool = getPendingToolSync() ?? undefined;
  const paywall = getPendingPaywallSync();
  const isFree = tool ? FILE_FREE_TOOLS.includes(tool) : false;

  useEffect(() => {
    // Only redirect if we truly have no file AND it's not a file-free tool
    if (!getPendingFileSync() && !isFree) {
      navigate("/es");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!file && !isFree) return null;

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <Navbar compact />
      <div className="flex-1 overflow-hidden">
        <PdfEditor
          initialFile={file}
          initialTool={tool}
          initialOpenPaywall={paywall}
          onPaywallOpened={() => setPendingPaywall(false)}
          fullscreen
        />
      </div>
    </div>
  );
}
