/* =============================================================
   EditorPage — Full-screen PDF editor page (like pdfe.com)
   No navbar. Custom editor header: logo | editable filename | close
   When accessed directly (no file loaded), shows the home landing
   so the page mirrors the rest of the site instead of a stripped
   upload card. The home upload flow already drops a file into
   PdfFileContext + navigates back to /editor — so it just works.
   ============================================================= */
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import PdfEditor from "@/components/PdfEditor";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Home from "./Home";
import { Pencil, X as XIcon, Check, HelpCircle } from "lucide-react";
import { ProductTour, launchTour, resetTourSeen } from "@/components/ProductTour";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

/* Inline brand mark — bundle isotipo (P + red dot) for dark editor header */
const LogoSvg = () => (
  <svg width="26" height="26" viewBox="0 0 512 512" fill="none" className="shrink-0" aria-hidden="true">
    <rect x="48" y="48" width="416" height="416" rx="112" fill="#0A0A0B" />
    <path
      d="M176 180v152M176 180h82a50 50 0 010 100h-82"
      stroke="white" strokeWidth="34"
      strokeLinecap="round" strokeLinejoin="round"
    />
    <circle cx="342" cy="348" r="32" fill="#E63946" />
  </svg>
);

const LogoText = () => (
  <span className="font-extrabold text-[16px] tracking-[-0.03em] leading-none">
    <span className="text-white">editorpdf</span>
    <span className="text-[#E63946]">.net</span>
  </span>
);

export default function EditorPage() {
  const { pendingFile, pendingTool, pendingPaywall, setPendingPaywall, isRestoringFromSession } = usePdfFile();
  const [, navigate] = useLocation();
  const { lang, t } = useLanguage();
  const { productTourEnabled } = useFeatureFlags();
  const isFileFree = pendingTool ? FILE_FREE_TOOLS.includes(pendingTool) : false;
  const hasDraft = Boolean(localStorage.getItem("pdfpro_editor_draft"));
  // Monotonic latch: true once the editor has been shown at least once. Keeps
  // the OAuth resume flow from bouncing back to Home when the paywall opens.
  const enteredEditorRef = useRef(false);

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

  /* Loading state while restoring from session */
  if (isRestoringFromSession) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
        <div className="flex items-center px-4 h-12 border-b" style={{ backgroundColor: "#0A0A0B", borderColor: "#1A1A1C" }}>
          <div className="flex items-center gap-1"><LogoSvg /><LogoText /></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: "#E63946" }}>
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium" style={{ color: "#5A5A62" }}>Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  /* No file loaded and no draft — render the Home landing so /editor mirrors
     the main site instead of a stripped-down upload card. Home's upload
     button stamps the file into PdfFileContext and navigates back here,
     at which point pendingFile is truthy and we drop into the editor.

     LATCH: once the editor has EVER been shown (a file loaded, a paywall
     resume, a free tool or a draft), never fall back to <Home/> again. The
     OAuth resume flow (register with Google → return with ?resume=download)
     opens the paywall and, in doing so, flips pendingPaywall back to false;
     without this latch EditorPage would then see "no file + no paywall" and
     swap the mounted editor — and its just-opened paywall — for the home
     page mid-flow, sending the user "back to home" and losing their edits. */
  if (pendingFile || isFileFree || pendingPaywall || hasDraft) {
    enteredEditorRef.current = true;
  }
  if (!enteredEditorRef.current) {
    return <Home />;
  }

  // When the product-tour flag is off, skip the auto-start (but leave the
  // ProductTour wrapper in place so the "?" help button keeps working).
  return (
    <ProductTour pdfReady={productTourEnabled}>
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      {/* ── Custom Editor Header Bar ── */}
      <div className="flex items-center justify-between px-3 md:px-4 h-11 md:h-12 shrink-0 border-b"
        style={{ backgroundColor: "#0A0A0B", borderColor: "#1A1A1C" }}>
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
                />
              <button onMouseDown={e => { e.preventDefault(); confirmEdit(); }} className="p-0.5 rounded hover:bg-white/10 transition-colors" title="Confirm">
                <Check className="w-3.5 h-3.5" style={{ color: "#E63946" }} />
              </button>
            </div>
          ) : (
            <button data-tour="filename" onClick={startEdit} className="flex items-center gap-1.5 min-w-0 hover:bg-white/5 rounded px-2 py-0.5 transition-colors group" title="Click to rename">
              <span className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{fileName}</span>
              <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          )}
        </div>
        {/* Right: Help (desktop only) + Close */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { resetTourSeen(); launchTour(); }}
            className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={t.tour_show}
            aria-label={t.tour_show}
          >
            <HelpCircle className="w-[18px] h-[18px]" style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Close editor">
            <XIcon className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
        </div>
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
          displayName={fileName}
        />
      </div>
    </div>
    </ProductTour>
  );
}
