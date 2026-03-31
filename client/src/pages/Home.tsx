/* =============================================================
   CloudPDF Home Page — "Lumina" Design
   Light theme, indigo-violet gradient accents, modern SaaS feel
   Upload-first hero, tool grid, benefits, steps, FAQ, CTA
   ============================================================= */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FileText, PenTool, Share2, MessageSquare, Type, Image, Lock,
  ChevronDown, ChevronUp, ArrowRight, Upload, Download, Edit3,
  Layers, Shield, Zap, Monitor, CheckCircle2, RefreshCw, Sparkles,
  Star,
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

const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/html', 'text/plain',
  'application/octet-stream',
]);

const ACCEPTED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.html', '.txt',
]);

// Design tokens
const INDIGO = "oklch(0.47 0.24 264)";
const VIOLET = "oklch(0.42 0.26 290)";
const TEXT_MAIN = "oklch(0.13 0.015 264)";
const TEXT_MUTED = "oklch(0.48 0.015 264)";
const TEXT_LIGHT = "oklch(0.62 0.015 264)";
const BORDER = "oklch(0.91 0.008 264)";
const SURFACE = "oklch(0.985 0.003 264)";

// Tool icon colors — one per category
const TOOL_COLORS: Record<string, { bg: string; icon: string }> = {
  editAndSign: { bg: "oklch(0.96 0.03 264)", icon: INDIGO },
  convertFromPdf: { bg: "oklch(0.96 0.06 290)", icon: VIOLET },
  convertToPdf: { bg: "oklch(0.96 0.04 175)", icon: "oklch(0.45 0.18 175)" },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("editAndSign");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPendingFile, setPendingTool } = usePdfFile();
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();

  // ─── Tool definitions ────────────────────────────────────────
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

  const faqs = [
    { question: t.faq_q1, answer: t.faq_a1 },
    { question: t.faq_q2, answer: t.faq_a2 },
    { question: t.faq_q3, answer: t.faq_a3 },
    { question: t.faq_q4, answer: t.faq_a4 },
    { question: t.faq_q5, answer: t.faq_a5 },
    { question: t.faq_q6, answer: t.faq_a6 },
    { question: t.faq_q7, answer: t.faq_a7 },
  ];

  const benefits = [
    { icon: Zap,      title: t.benefit1_title, desc: t.benefit1_desc, color: "oklch(0.96 0.06 80)",  iconColor: "oklch(0.55 0.20 80)"  },
    { icon: Shield,   title: t.benefit2_title, desc: t.benefit2_desc, color: "oklch(0.96 0.05 160)", iconColor: "oklch(0.48 0.18 160)" },
    { icon: Edit3,    title: t.benefit3_title, desc: t.benefit3_desc, color: "oklch(0.96 0.03 264)", iconColor: INDIGO },
    { icon: Monitor,  title: t.benefit4_title, desc: t.benefit4_desc, color: "oklch(0.96 0.06 290)", iconColor: VIOLET },
  ];

  const features = [
    { title: t.feature1_title, subtitle: t.feature1_subtitle, description: t.feature1_desc, image: FEATURE_IMAGES[0] },
    { title: t.feature2_title, subtitle: t.feature2_subtitle, description: t.feature2_desc, image: FEATURE_IMAGES[1] },
    { title: t.feature3_title, subtitle: t.feature3_subtitle, description: t.feature3_desc, image: FEATURE_IMAGES[2] },
    { title: t.feature4_title, subtitle: t.feature4_subtitle, description: t.feature4_desc, image: FEATURE_IMAGES[3] },
  ];

  const activeCategory = allToolsCategories.find((c) => c.id === activeTab)!;
  const activeCategoryColor = TOOL_COLORS[activeTab];

  const openEditor = useCallback((file: File, tool?: string) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isSupported = ACCEPTED_MIME_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.has(ext);
    if (!isSupported) {
      import('sonner').then(({ toast }) => {
        toast.error('Formato no soportado. Sube un PDF, Word, Excel, PowerPoint, JPG o PNG.');
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPendingFile(file);
    if (tool) setPendingTool(tool);
    navigate(`/${lang}/editor`);
  }, [setPendingFile, setPendingTool, navigate, lang]);

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

  const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

  const scrollToEditor = (tool?: string) => {
    if (tool) {
      setPendingTool(tool);
      if (FILE_FREE_TOOLS.includes(tool)) {
        navigate(`/${lang}/editor`);
      } else {
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* ══════════════════════════════════════════════════════════
          HERO — Light with gradient decorations
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white">
        {/* Decorative gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30 animate-blob"
            style={{ background: "radial-gradient(circle, oklch(0.75 0.12 264) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -top-16 right-0 w-80 h-80 rounded-full opacity-20 animate-blob animation-delay-2000"
            style={{ background: "radial-gradient(circle, oklch(0.70 0.14 290) 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10 animate-blob animation-delay-4000"
            style={{ background: "radial-gradient(ellipse, oklch(0.65 0.15 264) 0%, transparent 60%)" }}
          />
        </div>

        <div className="container relative z-10 pt-10 pb-0 md:pt-16 md:pb-0">

          {/* Badge */}
          <div className="flex justify-center mb-5">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                backgroundColor: "oklch(0.96 0.03 264)",
                borderColor: "oklch(0.47 0.24 264 / 0.25)",
                color: INDIGO,
              }}
            >
              <Sparkles className="w-3 h-3" />
              {(t as any).hero_cloud_badge ?? "100% Cloud — No installation required"}
            </div>
          </div>

          {/* Headline */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4"
              style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN, letterSpacing: "-0.02em" }}
            >
              {t.hero_title_1}{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t.hero_title_2}
              </span>
            </h1>
            <p
              className="text-base md:text-lg max-w-xl mx-auto leading-relaxed"
              style={{ color: TEXT_MUTED, fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.hero_subtitle}
            </p>
          </div>

          {/* ── Upload Card ── */}
          <div className="max-w-lg mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt"
              className="hidden"
              onChange={handleFileInput}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-4 py-8 md:py-10 px-6 transition-all duration-300 upload-zone ${isDraggingOver ? "drag-over" : ""}`}
              style={{
                border: `2px dashed ${isDraggingOver ? INDIGO : "oklch(0.47 0.24 264 / 0.35)"}`,
                backgroundColor: isDraggingOver ? "oklch(0.97 0.02 264)" : "white",
                boxShadow: isDraggingOver
                  ? `0 0 0 6px oklch(0.47 0.24 264 / 0.08), 0 8px 40px oklch(0.47 0.24 264 / 0.15)`
                  : "0 4px 24px oklch(0.13 0.015 264 / 0.07), 0 1px 3px oklch(0.13 0.015 264 / 0.05)",
              }}
            >
              {/* Animated icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, oklch(0.96 0.03 264), oklch(0.93 0.06 290))`,
                  border: `1px solid oklch(0.47 0.24 264 / 0.15)`,
                  animation: "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              >
                <FileText className="w-8 h-8" style={{ color: INDIGO }} />
              </div>

              <div className="text-center">
                <p
                  className="font-bold text-lg mb-1"
                  style={{ color: TEXT_MAIN, fontFamily: "'Sora', sans-serif" }}
                >
                  {t.hero_drag_here}
                </p>
                <p className="text-sm" style={{ color: TEXT_LIGHT }}>{t.hero_or}</p>
              </div>

              {/* Main CTA */}
              <button
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-white text-sm transition-all duration-200 btn-gradient"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <Upload className="w-4 h-4" />
                {t.hero_upload_btn}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Auto-convert note */}
              <p className="flex items-center justify-center gap-1.5 text-xs" style={{ color: TEXT_LIGHT }}>
                <RefreshCw className="w-3 h-3 shrink-0" style={{ color: INDIGO }} />
                {t.hero_auto_convert}
              </p>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { text: t.hero_badge_free, color: "oklch(0.45 0.18 160)", bg: "oklch(0.96 0.05 160 / 0.6)" },
                  { text: t.hero_badge_no_card, color: "oklch(0.48 0.20 80)", bg: "oklch(0.96 0.06 80 / 0.6)" },
                ].map((badge, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium border"
                    style={{
                      color: badge.color,
                      backgroundColor: badge.bg,
                      borderColor: `${badge.color}30`,
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {badge.text}
                  </span>
                ))}
              </div>

              <p className="text-xs" style={{ color: TEXT_LIGHT }}>{t.hero_max_size_detail}</p>
            </div>
          </div>

          {/* Trust row below card */}
          <div
            className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6 pb-12 text-xs"
            style={{ color: TEXT_LIGHT }}
          >
            {[
              { icon: Shield, text: (t as any).hero_trust_secure ?? "SSL Encrypted" },
              { icon: Monitor, text: (t as any).hero_trust_browser ?? "Works in any browser" },
              { icon: CheckCircle2, text: t.hero_badge_instant },
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <item.icon className="w-3.5 h-3.5" style={{ color: INDIGO }} />
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════════ */}
      <section
        className="py-8 border-y"
        style={{ backgroundColor: SURFACE, borderColor: BORDER }}
      >
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-20">
            {[
              { value: "15+", label: (t as any).hero_social_tools ?? "PDF tools available" },
              { value: "100%", label: (t as any).hero_social_browser ?? "Browser-based" },
              { value: "0", label: (t as any).hero_social_install ?? "Installation required" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-3xl font-extrabold leading-none mb-1"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    background: `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TOOLS SECTION
      ══════════════════════════════════════════════════════════ */}
      <section id="tools" className="py-16 md:py-20 bg-white">
        <div className="container">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
            >
              {t.tools_title}
            </h2>
            <p className="text-base" style={{ color: TEXT_MUTED }}>
              {t.tools_subtitle}
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex justify-center mb-8">
            <div
              className="flex rounded-xl p-1 gap-1 border"
              style={{ backgroundColor: SURFACE, borderColor: BORDER }}
            >
              {allToolsCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: activeTab === cat.id ? "white" : "transparent",
                    color: activeTab === cat.id ? TEXT_MAIN : TEXT_MUTED,
                    boxShadow: activeTab === cat.id
                      ? "0 1px 4px oklch(0.13 0.015 264 / 0.08), 0 0 0 1px oklch(0.91 0.008 264)"
                      : "none",
                    fontWeight: activeTab === cat.id ? "600" : "400",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tool cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
            {activeCategory.tools.map((tool, i) => (
              <button
                key={i}
                className="flex flex-col items-center gap-3 p-4 rounded-xl text-center border card-hover transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: BORDER,
                }}
                onClick={() => scrollToEditor((tool as { tool: string }).tool)}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: activeCategoryColor.bg }}
                >
                  <tool.icon className="w-5 h-5" style={{ color: activeCategoryColor.icon }} />
                </div>
                <span className="text-xs font-medium leading-tight" style={{ color: TEXT_MAIN }}>
                  {tool.label}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-sm btn-gradient"
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              {t.tools_cta}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BENEFITS
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20" style={{ backgroundColor: SURFACE }}>
        <div className="container">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
            >
              {t.benefits_title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-6 rounded-2xl border bg-white card-hover"
                style={{ borderColor: BORDER }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: b.color }}
                >
                  <b.icon className="w-6 h-6" style={{ color: b.iconColor }} />
                </div>
                <div>
                  <h3
                    className="font-bold text-base mb-2"
                    style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
                  >
                    {b.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — 3 steps with connector
      ══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-16 md:py-20 bg-white">
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
            >
              {t.how_title}
            </h2>
            <p className="text-base" style={{ color: TEXT_MUTED }}>
              {t.how_subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative">
            {/* Connector lines (desktop only) */}
            <div
              className="hidden md:block absolute top-8 left-[calc(16.6%+24px)] right-[calc(16.6%+24px)] h-0.5 step-line"
              aria-hidden="true"
            />

            {[
              { step: "1", icon: Upload, title: t.how_step1_title, desc: t.how_step1_desc },
              { step: "2", icon: Edit3, title: t.how_step2_title, desc: t.how_step2_desc },
              { step: "3", icon: Download, title: t.how_step3_title, desc: t.how_step3_desc },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-5 p-6 rounded-2xl border bg-white relative"
                style={{
                  borderColor: BORDER,
                  boxShadow: "0 2px 12px oklch(0.13 0.015 264 / 0.04)",
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Step number */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 z-10"
                    style={{
                      background: `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`,
                      fontFamily: "'Sora', sans-serif",
                      boxShadow: `0 4px 12px oklch(0.47 0.24 264 / 0.30)`,
                    }}
                  >
                    {item.step}
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "oklch(0.96 0.03 264)" }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: INDIGO }} />
                  </div>
                </div>
                <div>
                  <h3
                    className="font-bold text-lg mb-2"
                    style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-sm btn-gradient"
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              {t.how_cta}
            </button>

            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
              style={{
                backgroundColor: "oklch(0.96 0.03 264)",
                borderColor: "oklch(0.47 0.24 264 / 0.2)",
                color: TEXT_MUTED,
              }}
            >
              <Monitor className="w-4 h-4 flex-shrink-0" style={{ color: INDIGO }} />
              <span style={{ color: TEXT_MUTED }}>{t.cloud_notice}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURE SHOWCASE
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24" style={{ backgroundColor: SURFACE }}>
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
            >
              {t.features_why_title}
            </h2>
            <p className="text-base" style={{ color: TEXT_MUTED }}>
              {t.features_why_subtitle}
            </p>
          </div>

          <div className="space-y-0">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-8 md:gap-12 items-center py-10 border-b`}
                style={{ borderColor: BORDER }}
              >
                <div className="flex-1">
                  <div
                    className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`,
                      color: "white",
                    }}
                  >
                    {feature.title}
                  </div>
                  <h3
                    className="text-xl font-bold mb-3"
                    style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
                  >
                    {feature.subtitle}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {feature.description}
                  </p>
                </div>
                <div
                  className="flex-shrink-0 w-full md:w-72 h-48 rounded-2xl overflow-hidden border"
                  style={{
                    borderColor: BORDER,
                    boxShadow: "0 8px 32px oklch(0.13 0.015 264 / 0.08)",
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

      {/* ══════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="container max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: "'Sora', sans-serif", color: TEXT_MAIN }}
            >
              {t.faq_title}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border transition-all duration-200"
                style={{
                  borderColor: openFaq === i ? "oklch(0.47 0.24 264 / 0.35)" : BORDER,
                  backgroundColor: "white",
                  boxShadow: openFaq === i ? "0 4px 20px oklch(0.47 0.24 264 / 0.07)" : "none",
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span
                    className="font-semibold text-sm"
                    style={{ color: TEXT_MAIN, fontFamily: "'Sora', sans-serif" }}
                  >
                    {faq.question}
                  </span>
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: openFaq === i ? "oklch(0.96 0.03 264)" : SURFACE,
                    }}
                  >
                    {openFaq === i
                      ? <ChevronUp className="w-4 h-4" style={{ color: INDIGO }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: TEXT_LIGHT }} />
                    }
                  </div>
                </button>
                {openFaq === i && (
                  <div
                    className="px-5 pb-4 text-sm leading-relaxed"
                    style={{ color: TEXT_MUTED }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA — gradient banner
      ══════════════════════════════════════════════════════════ */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, oklch(0.38 0.24 264) 0%, oklch(0.35 0.26 290) 50%, oklch(0.30 0.22 300) 100%)`,
          }}
        />
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
          />
        </div>

        <div className="container relative z-10 text-center">
          {/* Stars rating */}
          <div className="flex justify-center items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" style={{ color: "oklch(0.80 0.18 85)" }} />
            ))}
          </div>

          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {t.cta_title}
          </h2>
          <p
            className="text-base mb-8 max-w-xl mx-auto"
            style={{ color: "oklch(0.85 0.04 264)" }}
          >
            {t.cta_subtitle}
          </p>

          <button
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-sm transition-all duration-200"
            style={{
              backgroundColor: "white",
              color: INDIGO,
              boxShadow: "0 8px 32px oklch(0 0 0 / 0.20)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 14px 40px oklch(0 0 0 / 0.28)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 32px oklch(0 0 0 / 0.20)";
            }}
            onClick={() => scrollToEditor()}
          >
            <Upload className="w-5 h-5" />
            {t.cta_btn}
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-xs mt-4" style={{ color: "oklch(0.70 0.04 264)" }}>
            {t.hero_max_size_detail}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
