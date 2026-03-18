/* =============================================================
   EditorPage — Full-screen PDF editor page (like pdfe.com)
   ============================================================= */
import { useEffect } from "react";
import { useLocation } from "wouter";
import PdfEditor from "@/components/PdfEditor";
import { usePdfFile } from "@/contexts/PdfFileContext";
import Navbar from "@/components/Navbar";

export default function EditorPage() {
  const { pendingFile, pendingTool } = usePdfFile();
  const [, navigate] = useLocation();

  // If no file was passed, redirect back to home
  useEffect(() => {
    if (!pendingFile) {
      navigate("/es");
    }
  }, [pendingFile, navigate]);

  if (!pendingFile) return null;

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      {/* Slim navbar — no hero, just branding + nav */}
      <Navbar compact />
      {/* Full-screen editor */}
      <div className="flex-1 overflow-hidden">
        <PdfEditor
          initialFile={pendingFile}
          initialTool={pendingTool ?? undefined}
          fullscreen
        />
      </div>
    </div>
  );
}
