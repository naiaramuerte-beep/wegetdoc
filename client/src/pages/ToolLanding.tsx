import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, ArrowRight, CheckCircle, FileText, FileUp, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors } from "@/lib/brand";

// ── Tool definitions ───────────────────────────────────────────
export interface ToolDef {
  slug: string;       // URL slug: "pdf-to-word"
  editorTool: string; // editor tool param: "convert-word"
  acceptExtra?: string; // additional accepted file types beyond PDF
  i18nPrefix: string; // prefix for i18n keys: "landing_pdf_to_word"
}

export const TOOL_LANDINGS: ToolDef[] = [
  { slug: "pdf-to-word",    editorTool: "convert-word",  i18nPrefix: "landing_pdf2word" },
  { slug: "pdf-editor",     editorTool: "text",          i18nPrefix: "landing_editor" },
  { slug: "merge-pdf",      editorTool: "merge",         i18nPrefix: "landing_merge" },
  { slug: "compress-pdf",   editorTool: "compress",      i18nPrefix: "landing_compress" },
  { slug: "jpg-to-pdf",     editorTool: "jpg-to-pdf",    i18nPrefix: "landing_jpg2pdf", acceptExtra: "image/jpeg,image/png,image/webp" },
  { slug: "pdf-to-jpg",     editorTool: "convert-jpg",   i18nPrefix: "landing_pdf2jpg" },
  { slug: "pdf-to-excel",   editorTool: "convert-excel", i18nPrefix: "landing_pdf2excel" },
  { slug: "word-to-pdf",    editorTool: "word-to-pdf",   i18nPrefix: "landing_word2pdf", acceptExtra: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { slug: "split-pdf",      editorTool: "split",         i18nPrefix: "landing_split" },
  { slug: "pdf-converter",  editorTool: "convert-word",  i18nPrefix: "landing_converter" },
];

// ── Component ───────────────────────────────────────────────────
export default function ToolLanding({ tool }: { tool: ToolDef }) {
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();
  const { setPendingFile, setPendingTool } = usePdfFile();
  const fileRef = useRef<HTMLInputElement>(null);

  const tr = (key: string) => (t as any)[`${tool.i18nPrefix}_${key}`] ?? "";

  useEffect(() => {
    document.title = tr("meta_title") || `${tr("h1")} | Online`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", tr("meta_desc") || tr("subtitle"));
  }, [lang, tool]);

  const openEditor = useCallback((file: File) => {
    setPendingFile(file);
    setPendingTool(tool.editorTool);
    navigate(`/${lang}/editor`);
  }, [setPendingFile, setPendingTool, navigate, lang, tool.editorTool]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) openEditor(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) openEditor(f);
  };

  const accept = tool.acceptExtra
    ? `application/pdf,.pdf,${tool.acceptExtra}`
    : "application/pdf,.pdf";

  const features: string[] = [tr("feat1"), tr("feat2"), tr("feat3"), tr("feat4")].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#fafafa" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${colors.primary} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="container relative z-10 text-center max-w-3xl mx-auto px-4">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif", color: "#111" }}
          >
            {tr("h1")}
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: "#555" }}>
            {tr("subtitle")}
          </p>

          {/* Upload zone */}
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer mx-auto max-w-md rounded-2xl border-2 border-dashed p-8 transition-all hover:shadow-lg"
            style={{
              borderColor: colors.primary,
              backgroundColor: "white",
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: colors.gradient }}
            >
              <Upload className="w-7 h-7 text-white" />
            </div>
            <button
              className="px-8 py-3.5 rounded-xl text-white font-bold text-base transition-all hover:-translate-y-0.5"
              style={{ background: colors.gradient, boxShadow: `0 4px 15px ${colors.lightBg}` }}
            >
              {tr("cta") || "Upload PDF"}
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
            <p className="text-sm mt-3" style={{ color: "#888" }}>
              {tr("drag") || "or drag & drop your file here"}
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "white" }}>
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ fontFamily: "'Sora', sans-serif", color: "#111" }}>
            {tr("how_title") || "How it works"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: FileUp, title: tr("step1_title"), desc: tr("step1_desc") },
              { icon: FileText, title: tr("step2_title"), desc: tr("step2_desc") },
              { icon: Download, title: tr("step3_title"), desc: tr("step3_desc") },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: colors.lightBg }}
                >
                  <step.icon className="w-6 h-6" style={{ color: colors.primary }} />
                </div>
                <div
                  className="text-xs font-bold mb-2 inline-block px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.lightBg, color: colors.primary }}
                >
                  {i + 1}
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: "#111" }}>{step.title}</h3>
                <p className="text-sm" style={{ color: "#666" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      {features.length > 0 && (
        <section className="py-16 md:py-20" style={{ backgroundColor: "#fafafa" }}>
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" style={{ fontFamily: "'Sora', sans-serif", color: "#111" }}>
              {tr("features_title") || "Features"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feat, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: colors.primary }} />
                  <span className="text-sm" style={{ color: "#333" }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom CTA ── */}
      <section className="py-14 text-center" style={{ background: colors.gradient }}>
        <div className="container max-w-2xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
            {tr("bottom_cta_title") || tr("h1")}
          </h2>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all hover:-translate-y-1"
            style={{ backgroundColor: "white", color: colors.primary, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
          >
            <Upload className="w-5 h-5" />
            {tr("cta") || "Upload PDF"}
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
