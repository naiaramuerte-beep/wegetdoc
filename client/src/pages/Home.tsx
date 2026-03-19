/* =============================================================
   PDFPro Home Page — Deep Navy Pro design
   Hero integrates the real PdfEditor component
   ============================================================= */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FileText,
  PenTool,
  Share2,
  MessageSquare,
  Type,
  Image,
  Lock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Upload,
  Download,
  Edit3,
  Layers,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";

// Feature images (CDN)
const FEATURE_IMAGES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-convert-Y6dwg9Ks6AU4LrQ4QETGwk.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-edit-XgUdhi72HBbaZEcMtbCduV.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-sign-mNewCdtWeXAwH4MKY3HS7g.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-collaborate-Xc5uwDNsachsgLjEBvw7Qp.webp",
];

// ─── Component ─────────────────────────────────────────────────
export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("editAndSign");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPendingFile, setPendingTool } = usePdfFile();
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();

  // ─── Tool definitions (inside component to use t.) ─────────
  const editAndSignTools = [
    { icon: Type, label: t.tool_edit_text, tool: "text" },
    { icon: PenTool, label: t.tool_add_sign, tool: "sign" },
    { icon: MessageSquare, label: t.tool_annotate, tool: "notes" },
    { icon: Image, label: t.tool_images, tool: "image" },
    { icon: Lock, label: t.tool_protect, tool: "protect" },
    { icon: Share2, label: t.tool_share, tool: "share" },
  ];

  const convertFromPdfTools = [
    { icon: FileText, label: t.tool_pdf_word, tool: "convert-word" },
    { icon: FileText, label: t.tool_pdf_excel, tool: "convert-excel" },
    { icon: FileText, label: t.tool_pdf_ppt, tool: "convert-ppt" },
    { icon: Image, label: t.tool_pdf_jpg, tool: "convert-jpg" },
    { icon: Image, label: t.tool_pdf_png, tool: "convert-png" },
    { icon: FileText, label: t.tool_pdf_html, tool: "convert-html" },
  ];

  const convertToPdfTools = [
    { icon: FileText, label: t.tool_word_pdf, tool: "word-to-pdf" },
    { icon: FileText, label: t.tool_excel_pdf, tool: "excel-to-pdf" },
    { icon: FileText, label: t.tool_ppt_pdf, tool: "ppt-to-pdf" },
    { icon: Image, label: t.tool_jpg_pdf, tool: "jpg-to-pdf" },
    { icon: Image, label: t.tool_png_pdf, tool: "png-to-pdf" },
    { icon: Layers, label: t.tool_merge, tool: "merge" },
  ];

  const allToolsCategories = [
    { id: "editAndSign", label: t.tools_tab_edit, tools: editAndSignTools },
    { id: "convertFromPdf", label: t.tools_tab_from_pdf, tools: convertFromPdfTools },
    { id: "convertToPdf", label: t.tools_tab_to_pdf, tools: convertToPdfTools },
  ];

  // ─── FAQ data (inside component to use t.) ─────────────────
  const faqs = [
    { question: t.faq_q1, answer: t.faq_a1 },
    { question: t.faq_q2, answer: t.faq_a2 },
    { question: t.faq_q3, answer: t.faq_a3 },
    { question: t.faq_q4, answer: t.faq_a4 },
    { question: t.faq_q5, answer: t.faq_a5 },
    { question: t.faq_q6, answer: t.faq_a6 },
  ];

  // ─── Features data (inside component to use t.) ────────────
  const features = [
    { title: t.feature1_title, subtitle: t.feature1_subtitle, description: t.feature1_desc, image: FEATURE_IMAGES[0] },
    { title: t.feature2_title, subtitle: t.feature2_subtitle, description: t.feature2_desc, image: FEATURE_IMAGES[1] },
    { title: t.feature3_title, subtitle: t.feature3_subtitle, description: t.feature3_desc, image: FEATURE_IMAGES[2] },
    { title: t.feature4_title, subtitle: t.feature4_subtitle, description: t.feature4_desc, image: FEATURE_IMAGES[3] },
  ];

  const activeCategory = allToolsCategories.find((c) => c.id === activeTab)!;

  const openEditor = useCallback((file: File, tool?: string) => {
    setPendingFile(file);
    if (tool) setPendingTool(tool);
    navigate(`/${lang}/editor`);
  }, [setPendingFile, setPendingTool, navigate, lang]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    // Reset input value so selecting the same file again triggers onChange on mobile
    e.currentTarget.value = "";
    if (f) openEditor(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer.files[0];
    if (f) openEditor(f);
  };

  // Tools that don't require a pre-existing PDF file
  const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

  const scrollToEditor = (tool?: string) => {
    if (tool) {
      setPendingTool(tool);
      if (FILE_FREE_TOOLS.includes(tool)) {
        navigate(`/${lang}/editor`);
        return;
      }
    }
    // Trigger file input via label click — works on iOS Safari
    const label = document.getElementById("home-file-input-label");
    if (label) {
      (label as HTMLLabelElement).click();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.98 0.005 250)" }}>
      <Navbar />

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.55 0.22 260 / 0.10) 0%, transparent 65%)",
          }}
        />

        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              {t.hero_title_1}{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.22 260), oklch(0.62 0.18 280))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t.hero_title_2}
              </span>
            </h1>
            <p
              className="text-lg md:text-xl"
              style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.hero_subtitle}
            </p>
          </div>

          {/* ── DROP ZONE ── */}
          <div id="editor-section" className="max-w-2xl mx-auto">
            <input
              ref={fileInputRef}
              id="home-file-input"
              type="file"
              accept="*/*"
              className="hidden"
              onChange={handleFileInput}
            />
            {/* Hidden label used by scrollToEditor for iOS Safari compatibility */}
            <label id="home-file-input-label" htmlFor="home-file-input" className="hidden" aria-hidden="true" />
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className="rounded-3xl flex flex-col items-center justify-center gap-4 py-12 px-8 transition-all duration-200"
              style={{
                border: `2px dashed ${isDraggingOver ? "oklch(0.55 0.22 260)" : "oklch(0.80 0.05 260)"}`,
                backgroundColor: isDraggingOver
                  ? "oklch(0.55 0.22 260 / 0.06)"
                  : "oklch(1 0 0)",
                boxShadow: "0 4px 32px oklch(0.18 0.04 250 / 0.06)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.10)" }}
              >
                <FileText className="w-8 h-8" style={{ color: "oklch(0.55 0.22 260)" }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg" style={{ color: "oklch(0.55 0.22 260)" }}>
                  {t.hero_drag_here}
                </p>
                <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.05 250)" }}>{t.hero_or}</p>
              </div>
              <label
                htmlFor="home-file-input"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all cursor-pointer select-none"
                style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")}
              >
                <Upload className="w-4 h-4" />
                {t.hero_upload_btn}
              </label>
              {/* Mensaje de conversión */}
              <div
                className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm max-w-sm text-center"
                style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.07)", color: "oklch(0.40 0.10 260)" }}
              >
                <span>✨ {t.hero_any_file}</span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.6 0.02 250)" }}>{t.hero_max_size_detail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOLS SECTION ──────────────────────────────────── */}
      <section id="tools" className="py-16" style={{ backgroundColor: "oklch(0.97 0.006 250)" }}>
        <div className="container">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              {t.tools_title}
            </h2>
            <p
              className="text-base"
              style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.tools_subtitle}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div
              className="flex rounded-xl p-1 gap-1"
              style={{ backgroundColor: "oklch(0.92 0.01 250)" }}
            >
              {allToolsCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    backgroundColor:
                      activeTab === cat.id ? "oklch(0.18 0.04 250)" : "transparent",
                    color:
                      activeTab === cat.id
                        ? "white"
                        : "oklch(0.45 0.02 250)",
                    boxShadow:
                      activeTab === cat.id
                        ? "0 2px 8px oklch(0.18 0.04 250 / 0.3)"
                        : "none",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tool Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
            {activeCategory.tools.map((tool, i) => (
              <button
                key={i}
                className="flex flex-col items-center gap-3 p-4 rounded-xl text-center transition-all duration-200"
                style={{
                  backgroundColor: "oklch(1 0 0)",
                  border: "1px solid oklch(0.90 0.01 250)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.55 0.22 260 / 0.4)";
                  e.currentTarget.style.boxShadow = "0 8px 24px oklch(0.55 0.22 260 / 0.10)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.90 0.01 250)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onClick={() => scrollToEditor((tool as { tool: string }).tool)}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.08)" }}
                >
                  <tool.icon
                    className="w-5 h-5"
                    style={{ color: "oklch(0.55 0.22 260)" }}
                  />
                </div>
                <span
                  className="text-xs font-medium leading-tight"
                  style={{ color: "oklch(0.25 0.03 250)" }}
                >
                  {tool.label}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
              style={{
                backgroundColor: "oklch(0.18 0.04 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")
              }
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              {t.tools_cta}
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              {t.how_title}
            </h2>
            <p
              className="text-base"
              style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.how_subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: "1",
                icon: Upload,
                title: t.how_step1_title,
                desc: t.how_step1_desc,
              },
              {
                step: "2",
                icon: Edit3,
                title: t.how_step2_title,
                desc: t.how_step2_desc,
              },
              {
                step: "3",
                icon: Download,
                title: t.how_step3_title,
                desc: t.how_step3_desc,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-6 rounded-2xl"
                style={{
                  backgroundColor: "oklch(1 0 0)",
                  border: "1px solid oklch(0.90 0.01 250)",
                  boxShadow: "0 2px 12px oklch(0.18 0.04 250 / 0.04)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{
                      backgroundColor: "oklch(0.18 0.04 250)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {item.step}
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.08)" }}
                  >
                    <item.icon
                      className="w-5 h-5"
                      style={{ color: "oklch(0.55 0.22 260)" }}
                    />
                  </div>
                </div>
                <div>
                  <h3
                    className="font-bold text-lg mb-2"
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      color: "oklch(0.15 0.03 250)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: "oklch(0.50 0.02 250)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
              style={{
                backgroundColor: "oklch(0.18 0.04 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")
              }
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              {t.how_cta}
            </button>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ──────────────────────────────────── */}
      <section
        className="py-16 md:py-24"
        style={{ backgroundColor: "oklch(0.97 0.006 250)" }}
      >
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              {t.features_why_title}
            </h2>
            <p
              className="text-base"
              style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.features_why_subtitle}
            </p>
          </div>

          <div className="space-y-0">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 items-center py-10 border-b`}
                style={{ borderColor: "oklch(0.88 0.01 250)" }}
              >
                <div className="flex-1">
                  <h3
                    className="text-xl font-bold mb-2"
                    style={{
                      color: "oklch(0.55 0.22 260)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="font-semibold text-lg mb-3"
                    style={{
                      color: "oklch(0.15 0.03 250)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {feature.subtitle}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: "oklch(0.45 0.02 250)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {feature.description}
                  </p>
                </div>

                <div
                  className="flex-shrink-0 w-full md:w-64 h-48 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "oklch(0.22 0.04 250)",
                    boxShadow: "0 8px 32px oklch(0.18 0.04 250 / 0.12)",
                  }}
                >
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              {t.faq_title}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  border: `1px solid ${openFaq === i ? "oklch(0.55 0.22 260 / 0.3)" : "oklch(0.88 0.01 250)"}`,
                  backgroundColor: "oklch(1 0 0)",
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span
                    className="font-semibold text-sm pr-4"
                    style={{
                      color: "oklch(0.15 0.03 250)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "oklch(0.55 0.22 260)" }}
                    />
                  ) : (
                    <ChevronDown
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "oklch(0.50 0.02 250)" }}
                    />
                  )}
                </button>
                {openFaq === i && (
                  <div
                    className="px-6 pb-4"
                    style={{
                      color: "oklch(0.45 0.02 250)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.875rem",
                      lineHeight: "1.6",
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <section
        className="py-16 md:py-20"
        style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
      >
        <div className="container text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {t.cta_title}
          </h2>
          <p
            className="text-base mb-8 max-w-xl mx-auto"
            style={{ color: "oklch(0.70 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            {t.cta_subtitle}
          </p>
          <button
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
            style={{
              backgroundColor: "oklch(0.55 0.22 260)",
              color: "white",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "oklch(0.48 0.22 260)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
            }
            onClick={() => scrollToEditor()}
          >
            <Upload className="w-4 h-4" />
            {t.cta_btn}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
