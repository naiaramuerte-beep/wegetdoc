/* =============================================================
   EditorPage — Full-screen PDF editor page (like pdfe.com)
   No navbar. Custom editor header: logo | editable filename | close
   When accessed directly (no file loaded), shows upload zone.
   ============================================================= */
import { useEffect, useState, useRef, useCallback } from "react";
import { colors } from "@/lib/brand";
import { useLocation } from "wouter";
import PdfEditor from "@/components/PdfEditor";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Pencil, X as XIcon, Check, FileText, Upload, ArrowRight, RefreshCw, CheckCircle2, Shield, Monitor, HelpCircle } from "lucide-react";
import { ProductTour, launchTour, resetTourSeen } from "@/components/ProductTour";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/html', 'text/plain', 'text/csv',
  'application/octet-stream',
]);

const ACCEPTED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.html', '.txt', '.csv',
]);

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

/* ── Upload zone shown when editor is accessed directly (no file loaded) ── */
function EditorUploadZone({ lang }: { lang: string }) {
  const { setPendingFile, setPendingTool } = usePdfFile();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navy = "#0D47A1";
  const blue = "#1565C0";
  const blueLight = "#42A5F5";

  const openEditor = useCallback((file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isSupported = ACCEPTED_MIME_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.has(ext);
    if (!isSupported) {
      import('sonner').then(({ toast }) => {
        toast.error('Unsupported format. Upload a PDF, Word, Excel, PowerPoint, JPG or PNG.');
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPendingFile(file);
    // Stay on the same page — the component will re-render with the file loaded
  }, [setPendingFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) openEditor(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer.files[0];
    if (f) openEditor(f);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar hideLogoLink />

      {/* Hero with upload zone — white background matching home */}
      <section className="relative overflow-hidden flex-1 bg-white">
        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }} />

        <div className="container relative z-10 py-12 md:py-24">
          {/* Headline */}
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4"
              style={{ color: "#111" }}>
              {t.hero_title_1}{" "}
              <span style={{
                background: colors.gradient,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{t.hero_title_2}</span>
            </h1>
            <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: "#666" }}>
              {t.hero_subtitle}
            </p>
          </div>

          {/* Upload zone */}
          <div className="max-w-lg mx-auto">
            <input ref={fileInputRef} type="file"
              accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv"
              className="hidden" onChange={handleFileInput} />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-4 py-10 px-8 transition-all duration-300 bg-white"
              style={{
                border: isDraggingOver ? `2px solid ${colors.primary}` : `2px dashed ${colors.lightBg}`,
                boxShadow: isDraggingOver ? `0 0 0 4px ${colors.lightBg}` : "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: colors.gradient }}>
                <Upload className="w-7 h-7 text-white" />
              </div>

              <div className="text-center">
                <p className="font-bold text-lg mb-1" style={{ color: "#111" }}>
                  {t.hero_drag_here}
                </p>
                <p className="text-sm" style={{ color: "#999" }}>{t.hero_or}</p>
              </div>

              <button className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
                style={{ background: colors.gradient, boxShadow: `0 4px 15px ${colors.lightBg}` }}>
                <Upload className="w-5 h-5" />
                {t.hero_upload_btn}
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-xs" style={{ color: "#aaa" }}>{t.hero_max_size_detail}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function EditorPage() {
  const { pendingFile, pendingTool, pendingPaywall, setPendingPaywall, isRestoringFromSession } = usePdfFile();
  const [, navigate] = useLocation();
  const { lang, t } = useLanguage();
  const { productTourEnabled } = useFeatureFlags();
  const isFileFree = pendingTool ? FILE_FREE_TOOLS.includes(pendingTool) : false;
  const hasDraft = Boolean(localStorage.getItem("pdfpro_editor_draft"));

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

  /* No file loaded and no draft — show upload zone (for direct access from Google Ads etc.) */
  if (!pendingFile && !isFileFree && !pendingPaywall && !hasDraft) {
    return <EditorUploadZone lang={lang} />;
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
