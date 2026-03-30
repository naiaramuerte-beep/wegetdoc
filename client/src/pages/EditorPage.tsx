/* =============================================================
   EditorPage — Full-screen PDF editor page (like pdfe.com)
   No navbar. Custom editor header: logo | editable filename | close
   ============================================================= */
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import PdfEditor from "@/components/PdfEditor";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pencil, X as XIcon, Check } from "lucide-react";

const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

/* Inline SVG logo — CloudPDF cloud icon */
const LogoSvg = () => (
  <svg width="26" height="18" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M25.5 12.5C25.5 12.5 26 12 26 11c0-2.8-2.2-5-5-5-.5 0-1 .1-1.5.2C18.3 3.7 15.9 2 13 2 9.4 2 6.5 4.9 6.5 8.5c0 .2 0 .4 0 .6C4.5 9.6 3 11.4 3 13.5 3 16 5 18 7.5 18h16c2.2 0 4-1.8 4-4 0-1.5-.8-2.8-2-3.5z" fill="oklch(0.55 0.22 260)" />
    <rect x="13" y="6" width="6" height="8" rx="0.8" fill="white" fillOpacity="0.9" />
    <path d="M16.5 6V6L19 8.5H16.5V6Z" fill="oklch(0.45 0.18 260)" />
  </svg>
);

const LogoText = () => (
  <span style={{ fontFamily: "'Sora', sans-serif" }}>
    <span className="font-medium text-lg" style={{ color: "rgba(255,255,255,0.85)" }}>Cloud</span>
    <span className="font-extrabold text-lg" style={{ color: "oklch(0.55 0.22 260)" }}>PDF</span>
  </span>
);

export default function EditorPage() {
  const { pendingFile, pendingTool, pendingPaywall, setPendingPaywall, isRestoringFromSession } = usePdfFile();
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const isFileFree = pendingTool ? FILE_FREE_TOOLS.includes(pendingTool) : false;

  /* Editable filename */
  const [fileName, setFileName] = useState("document.pdf");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (pendingFile) setFileName(pendingFile.name || "document.pdf"); }, [pendingFile]);
  useEffect(() => { if (isEditingName && nameInputRef.current) { nameInputRef.current.focus(); nameInputRef.current.select(); } }, [isEditingName]);

  const startEdit = () => { setEditNameValue(fileName.replace(/\.pdf$/i, "")); setIsEditingName(true); };
  const confirmEdit = () => { const t = editNameValue.trim(); if (t) setFileName(t.endsWith(".pdf") ? t : t + ".pdf"); setIsEditingName(false); };
  const handleClose = () => navigate(`/${lang}`);

  useEffect(() => {
    if (isRestoringFromSession) return;
    if (!pendingFile && !isFileFree && !pendingPaywall) navigate(`/${lang}`);
  }, [pendingFile, isFileFree, navigate, isRestoringFromSession, pendingPaywall, lang]);

  /* Loading / redirecting state */
  if (isRestoringFromSession || (!pendingFile && !isFileFree && !pendingPaywall)) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: "oklch(0.97 0.005 250)" }}>
        <div className="flex items-center px-4 h-12 border-b" style={{ backgroundColor: "oklch(0.18 0.04 250)", borderColor: "oklch(0.25 0.04 250)" }}>
          <div className="flex items-center gap-1"><LogoSvg /><LogoText /></div>
        </div>
        {isRestoringFromSession && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ color: "oklch(0.55 0.22 260)" }}>
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Loading document...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      {/* ── Custom Editor Header Bar ── */}
      <div className="flex items-center justify-between px-3 md:px-4 h-11 md:h-12 shrink-0 border-b"
        style={{ backgroundColor: "oklch(0.18 0.04 250)", borderColor: "oklch(0.25 0.04 250)" }}>
        {/* Left: Logo */}
        <button onClick={handleClose} className="flex items-center gap-1 shrink-0 hover:opacity-80 transition-opacity" title="Back to home">
          <LogoSvg />
          <LogoText />
        </button>
        {/* Center: Editable filename */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[50%]">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input ref={nameInputRef} type="text" value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setIsEditingName(false); }}
                onBlur={confirmEdit}
                className="bg-white/10 text-white text-sm px-2 py-0.5 rounded border border-white/20 outline-none focus:border-white/40 min-w-[120px] max-w-[300px]"
                style={{ fontFamily: "'DM Sans', sans-serif" }} />
              <button onMouseDown={e => { e.preventDefault(); confirmEdit(); }} className="p-0.5 rounded hover:bg-white/10 transition-colors" title="Confirm">
                <Check className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.18 145)" }} />
              </button>
            </div>
          ) : (
            <button onClick={startEdit} className="flex items-center gap-1.5 min-w-0 hover:bg-white/5 rounded px-2 py-0.5 transition-colors group" title="Click to rename">
              <span className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "'DM Sans', sans-serif" }}>{fileName}</span>
              <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          )}
        </div>
        {/* Right: Close */}
        <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0" title="Close editor">
          <XIcon className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
      </div>

      {/* Full-screen editor */}
      <div className="flex-1 overflow-hidden">
        <PdfEditor
          initialFile={pendingFile ?? undefined}
          initialTool={pendingTool ?? undefined}
          initialOpenPaywall={pendingPaywall}
          onPaywallOpened={() => setPendingPaywall(false)}
          fullscreen
          onFileNameChange={setFileName}
        />
      </div>
    </div>
  );
}
