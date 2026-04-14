/* =============================================================
   EditorPDF Home Page — Professional & Trustworthy Design
   Light theme, green-gold accents, upload-first hero,
   social proof, testimonials, security section, tools, FAQ
   ============================================================= */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FileText, PenTool, Share2, MessageSquare, Type, Image, Lock,
  ChevronDown, ChevronUp, ArrowRight, Upload, Download, Edit3,
  Layers, Shield, Zap, Monitor, CheckCircle2, RefreshCw, Sparkles,
  Star, Trash2, Clock, Globe, Cloud, Users, FileLock2, Check, Merge,
  Scissors, RotateCcw, Minimize2, FileImage, FileSpreadsheet,
  Presentation, FileCode,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { colors, isFastDoc } from "@/lib/brand";

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

// ─── Design tokens ───────────────────────────────────────────
const INDIGO     = colors.primary;
const VIOLET     = colors.secondary;
const TEXT_MAIN  = "#0f172a";
const TEXT_MUTED = "#64748b";
const TEXT_LIGHT = "#94a3b8";
const BORDER     = "#e2e8f0";
const SURFACE    = "#ffffff";

const GRAD = `linear-gradient(135deg, ${INDIGO}, ${VIOLET})`;

/** Highlight specific words in a title with a colored underline */
function highlightWords(text: string, words: string[], color = "#60a5fa") {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  for (const word of words) {
    const idx = remaining.toLowerCase().indexOf(word.toLowerCase());
    if (idx === -1) continue;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    const matched = remaining.slice(idx, idx + word.length);
    parts.push(
      <span key={key++} className="relative inline-block pb-1">
        <span style={{ color: INDIGO }}>{matched}</span>
        <span className="absolute bottom-0 left-0 w-full rounded-full" style={{ backgroundColor: color, height: "6px", opacity: 0.5 }} />
      </span>
    );
    remaining = remaining.slice(idx + word.length);
  }
  if (remaining) parts.push(remaining);
  return parts;
}

// ─── Tool definitions ─────────────────────────────────────────
const TOOLS_EDIT = [
  { icon: Type,           label_key: "tool_edit_text",  tool: "text",         color: "#f1f5f9", iconColor: INDIGO },
  { icon: PenTool,        label_key: "tool_add_sign",   tool: "sign",         color: "#f1f5f9", iconColor: INDIGO },
  { icon: MessageSquare,  label_key: "tool_annotate",   tool: "notes",        color: "#f1f5f9", iconColor: INDIGO },
  { icon: Image,          label_key: "tool_images",     tool: "image",        color: "#f1f5f9", iconColor: INDIGO },
  { icon: Lock,           label_key: "tool_protect",    tool: "protect",      color: "#f1f5f9", iconColor: INDIGO },
  { icon: Merge,          label_key: "tool_merge",      tool: "merge",        color: "#f1f5f9", iconColor: INDIGO },
  { icon: Scissors,       label_key: "tool_split",      tool: "split",        color: "#f1f5f9", iconColor: INDIGO },
  { icon: RotateCcw,      label_key: "tool_rotate",     tool: "rotate",       color: "#f1f5f9", iconColor: INDIGO },
  { icon: Minimize2,      label_key: "tool_compress",   tool: "compress",     color: "#f1f5f9", iconColor: INDIGO },
];
const TOOLS_FROM_PDF = [
  { icon: FileText,        label_key: "tool_pdf_word",  tool: "convert-word",  color: "#f1f5f9", iconColor: "#1565C0" },
  { icon: FileSpreadsheet, label_key: "tool_pdf_excel", tool: "convert-excel", color: "#f1f5f9", iconColor: "#1565C0" },
  { icon: Presentation,    label_key: "tool_pdf_ppt",   tool: "convert-ppt",   color: "#f1f5f9", iconColor: "#1565C0" },
  { icon: FileImage,       label_key: "tool_pdf_jpg",   tool: "convert-jpg",   color: "#f1f5f9", iconColor: "#1565C0" },
  { icon: FileImage,       label_key: "tool_pdf_png",   tool: "convert-png",   color: "#f1f5f9", iconColor: "#1565C0" },
  { icon: FileCode,        label_key: "tool_pdf_html",  tool: "convert-html",  color: "#f1f5f9", iconColor: "#1565C0" },
];
const TOOLS_TO_PDF = [
  { icon: FileText,        label_key: "tool_word_pdf",  tool: "word-to-pdf",  color: "#f8fafc", iconColor: "#2563EB" },
  { icon: FileSpreadsheet, label_key: "tool_excel_pdf", tool: "excel-to-pdf", color: "#f8fafc", iconColor: "#2563EB" },
  { icon: Presentation,    label_key: "tool_ppt_pdf",   tool: "ppt-to-pdf",   color: "#f8fafc", iconColor: "#2563EB" },
  { icon: FileImage,       label_key: "tool_jpg_pdf",   tool: "jpg-to-pdf",   color: "#f8fafc", iconColor: "#2563EB" },
  { icon: FileImage,       label_key: "tool_png_pdf",   tool: "png-to-pdf",   color: "#f8fafc", iconColor: "#2563EB" },
  { icon: FileCode,        label_key: "tool_html_pdf",  tool: "html-to-pdf",  color: "#f8fafc", iconColor: "#2563EB" },
];

const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf", "html-to-pdf"];

// ─── Testimonials ─────────────────────────────────────────────
const TESTIMONIALS_META = [
  { name: "María García",      avatar: "MG", avatarColor: "#1565C0", textKey: "testimonial1_text", roleKey: "testimonial1_role" },
  { name: "Carlos Rodríguez",  avatar: "CR", avatarColor: "#1565C0", textKey: "testimonial2_text", roleKey: "testimonial2_role" },
  { name: "Ana Martínez",      avatar: "AM", avatarColor: "#42A5F5",  textKey: "testimonial3_text", roleKey: "testimonial3_role" },
];

export interface HomeOverrides {
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  metaTitle?: string;
  metaDesc?: string;
}

export default function Home({ overrides }: { overrides?: HomeOverrides } = {}) {
  const [activeTab, setActiveTab] = useState<"edit" | "fromPdf" | "toPdf">("edit");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [docsCount, setDocsCount] = useState(3847);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPendingFile, setPendingTool } = usePdfFile();
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();

  // Animated counter: +1 to +8 every 0.5-1s randomly
  useEffect(() => {
    const tick = () => {
      setDocsCount((c) => c + 1 + Math.floor(Math.random() * 8));
      const next = 500 + Math.random() * 500;
      timer = window.setTimeout(tick, next);
    };
    let timer = window.setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, []);

  // Override meta tags for ad landing pages
  useEffect(() => {
    if (overrides?.metaTitle) document.title = overrides.metaTitle;
    if (overrides?.metaDesc) {
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", overrides.metaDesc);
    }
  }, [overrides]);

  const toolsMap = { edit: TOOLS_EDIT, fromPdf: TOOLS_FROM_PDF, toPdf: TOOLS_TO_PDF };
  const activeTools = toolsMap[activeTab].map((tool) => ({
    ...tool,
    label: (t as any)[tool.label_key] ?? tool.label_key,
  }));

  const faqs = [
    { question: t.faq_q1, answer: t.faq_a1 },
    { question: t.faq_q2, answer: t.faq_a2 },
    { question: t.faq_q3, answer: t.faq_a3 },
    { question: t.faq_q4, answer: t.faq_a4 },
    { question: t.faq_q5, answer: t.faq_a5 },
    { question: t.faq_q6, answer: t.faq_a6 },
    { question: t.faq_q7, answer: t.faq_a7 },
  ];

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

  // Resolved tool labels for the grid
  const editTools = TOOLS_EDIT.map((tool) => ({
    ...tool,
    label: (t as any)[tool.label_key] ?? tool.label_key,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* ══════════════════════════════════════════════════════════
          HERO — Single centered column
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="container pt-10 pb-12 md:pt-16 md:pb-16">
          <div className="flex flex-col items-center gap-2">
            {/* Centered content */}
            <div className="w-full max-w-2xl flex flex-col items-center text-center">
              <h1
                className="text-4xl md:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.12] mb-5 tracking-tight"
                style={{ color: TEXT_MAIN }}
              >
                {overrides?.heroTitle ? (
                  <>
                    {overrides.heroTitle}{" "}
                    {overrides.heroHighlight && (
                      <span className="relative inline-block pb-1">
                        <span style={{ color: INDIGO }}>{overrides.heroHighlight}</span>
                        <span className="absolute bottom-0 left-0 w-full rounded-full" style={{ backgroundColor: "#60a5fa", height: "6px", opacity: 0.5 }} />
                      </span>
                    )}
                  </>
                ) : isFastDoc ? (
                  <>
                    {t.fastdoc_hero_title_1}{" "}
                    <span style={{ color: colors.primary }}>
                      {t.fastdoc_hero_title_2}
                    </span>
                  </>
                ) : (
                  <>
                    {t.hero_title_1.replace("PDF", "").trim()}{" "}
                    <span className="relative inline-block pb-1">
                      <span style={{ color: INDIGO }}>PDF</span>
                      <span
                        className="absolute bottom-0 left-0 w-full rounded-full"
                        style={{ backgroundColor: "#60a5fa", height: "6px", opacity: 0.5 }}
                      />
                    </span>{" "}
                    <span style={{ color: INDIGO }}>
                      {t.hero_title_2}
                    </span>
                  </>
                )}
              </h1>
              <p
                className="text-base md:text-lg leading-relaxed mb-6 max-w-xl"
                style={{ color: TEXT_MUTED }}
              >
                {overrides?.heroSubtitle ?? (isFastDoc ? t.fastdoc_hero_subtitle : t.hero_subtitle)}
              </p>

              {/* Social proof inline */}
              {!isFastDoc && (
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs mb-2" style={{ color: TEXT_MUTED }}>
                  <span className="flex items-center gap-1.5">
                    <span className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: "#facc15" }} />
                      ))}
                    </span>
                    <strong style={{ color: TEXT_MAIN }}>4.8/5</strong>
                    <span style={{ color: TEXT_LIGHT }}>{(t as any).hero_social_rating ?? "Valoracion media"}</span>
                  </span>
                  <span className="w-px h-3 rounded-full" style={{ backgroundColor: BORDER }} />
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" style={{ color: INDIGO }} />
                    <strong style={{ color: TEXT_MAIN }}>2.3M+</strong>
                    <span style={{ color: TEXT_LIGHT }}>{(t as any).hero_social_users ?? "usuarios activos"}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Upload drop zone — centered with CTA + badges inside */}
            <div className="w-full max-w-xl">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                className="rounded-2xl border-2 border-dashed transition-all duration-300"
                style={{
                  borderColor: isDraggingOver ? INDIGO : "rgba(0, 0, 0, 0.15)",
                  backgroundColor: isDraggingOver ? "#f0f7ff" : "#fafbfc",
                  boxShadow: isDraggingOver
                    ? `0 0 0 5px rgba(21, 101, 192, 0.08)`
                    : "none",
                }}
              >
                <div className="flex flex-col items-center gap-4 px-6 py-10">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: INDIGO }}
                  >
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <p className="font-bold text-base" style={{ color: TEXT_MAIN }}>
                    {t.hero_drag_here}
                  </p>
                  <p className="text-sm" style={{ color: TEXT_LIGHT }}>
                    {(t as any).hero_or ?? "or"}
                  </p>
                  <button
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                    style={{ backgroundColor: INDIGO, boxShadow: `0 4px 16px rgba(0, 0, 0, 0.18)` }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    {t.hero_upload_btn}
                  </button>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    {["PDF", "Word", "Excel", "PPT", "JPG", "PNG"].map((fmt) => (
                      <span
                        key={fmt}
                        className="text-xs px-2.5 py-0.5 rounded-md font-medium border"
                        style={{ backgroundColor: "white", borderColor: BORDER, color: TEXT_MUTED }}
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: TEXT_LIGHT }}>{t.hero_max_size}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS — Horizontal bar
      ══════════════════════════════════════════════════════════ */}
      {!isFastDoc && (
        <section style={{ backgroundColor: "#f8fafc" }}>
          <div className="container py-6">
            <div className="flex flex-wrap items-center justify-center gap-y-4">
              {[
                { value: "15+",   label: (t as any).hero_social_tools ?? "Herramientas PDF", icon: Sparkles },
                { value: docsCount.toLocaleString(), label: (t as any).hero_social_pdfs ?? "Documentos procesados hoy", icon: FileText },
                { value: "4.8★",  label: (t as any).hero_social_rating ?? "Valoracion media", icon: Star },
                { value: "100%",  label: (t as any).hero_social_install ?? "Sin instalacion", icon: Cloud },
              ].map((stat, i, arr) => (
                <div key={i} className="flex items-center">
                  <div className="flex items-center gap-3 px-6">
                    <stat.icon className="w-4 h-4 flex-shrink-0" style={{ color: INDIGO, opacity: 0.6 }} />
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold" style={{ color: TEXT_MAIN }}>
                        {stat.value}
                      </span>
                      <span className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
                        {stat.label}
                      </span>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="hidden md:block w-px h-8" style={{ backgroundColor: BORDER }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          TOOLS — 3-column grid, no tabs
      ══════════════════════════════════════════════════════════ */}
      <section id="tools" className="py-16 md:py-20 bg-white">
        <div className="container">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: TEXT_MAIN }}
            >
              {highlightWords(t.tools_title, ["complete toolkit", "Todas las utilidades", "suite complète", "Alle PDF-Funktionen", "kit completo", "Un kit completo", "Alle professionele", "Kompletny zestaw", "Весь арсенал", "完整的专业"])}
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: TEXT_MUTED }}>
              {t.tools_subtitle}
            </p>
          </div>

          {/* 3-column grid of TOOLS_EDIT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            {editTools.map((tool, i) => (
              <button
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-md"
                style={{ backgroundColor: "white", borderColor: BORDER }}
                onClick={() => scrollToEditor(tool.tool)}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: tool.color }}
                >
                  <tool.icon className="w-5 h-5" style={{ color: tool.iconColor }} />
                </div>
                <span className="text-sm font-medium" style={{ color: TEXT_MAIN }}>
                  {tool.label}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <a
              href={`/${lang}/tools`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200"
              style={{ color: INDIGO }}
            >
              {(t as any).tools_view_all ?? "Ver todas las herramientas"}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — Horizontal 3 steps
      ══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-16 md:py-20 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: TEXT_MAIN }}
            >
              {highlightWords(t.how_title, ["Three quick steps", "Así de sencillo", "Drei einfache Schritte", "Trois étapes", "Três passos", "Tre semplici", "Drie stappen", "Trzy kroki", "Три шага", "三步"])}
            </h2>
            <p className="text-base" style={{ color: TEXT_MUTED }}>{t.how_subtitle}</p>
          </div>

          <div className="flex flex-col md:flex-row items-start justify-center gap-4 max-w-4xl mx-auto">
            {[
              { step: 1, icon: Upload,   title: t.how_step1_title, desc: t.how_step1_desc },
              { step: 2, icon: Edit3,    title: t.how_step2_title, desc: t.how_step2_desc },
              { step: 3, icon: Download, title: t.how_step3_title, desc: t.how_step3_desc },
            ].map((item, i, arr) => (
              <div key={i} className="flex items-start flex-1">
                {/* Step content */}
                <div className="flex flex-col items-center text-center flex-1">
                  {/* Step number circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-3"
                    style={{ backgroundColor: INDIGO }}
                  >
                    {item.step}
                  </div>
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: "#f1f5f9" }}
                  >
                    <item.icon className="w-6 h-6" style={{ color: INDIGO }} />
                  </div>
                  <h3 className="font-bold text-base mb-2" style={{ color: TEXT_MAIN }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {item.desc}
                  </p>
                </div>
                {/* Arrow connector */}
                {i < arr.length - 1 && (
                  <div className="hidden md:flex items-center pt-8 px-2">
                    <ArrowRight className="w-5 h-5" style={{ color: TEXT_LIGHT }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: INDIGO, boxShadow: `0 4px 16px rgba(0, 0, 0, 0.18)` }}
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              {t.how_cta}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BENEFITS — 2x2 grid
      ══════════════════════════════════════════════════════════ */}
      {!isFastDoc && (
        <section className="py-16 md:py-20" style={{ backgroundColor: "#f8fafc" }}>
          <div className="container">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold"
                style={{ color: TEXT_MAIN }}
              >
                {highlightWords(t.benefits_title, ["EditorPDF"])}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  icon: Zap,
                  title: t.benefit1_title,
                  desc: t.benefit1_desc,
                  color: "#f1f5f9",
                  iconColor: "#1565C0",
                  points: [(t as any).benefit1_point1, (t as any).benefit1_point2, (t as any).benefit1_point3],
                },
                {
                  icon: Shield,
                  title: t.benefit2_title,
                  desc: t.benefit2_desc,
                  color: "#f8fafc",
                  iconColor: "#2563EB",
                  points: [(t as any).benefit2_point1, (t as any).benefit2_point2, (t as any).benefit2_point3],
                },
                {
                  icon: Edit3,
                  title: t.benefit3_title,
                  desc: t.benefit3_desc,
                  color: "#f1f5f9",
                  iconColor: INDIGO,
                  points: [(t as any).benefit3_point1, (t as any).benefit3_point2, (t as any).benefit3_point3],
                },
                {
                  icon: Monitor,
                  title: t.benefit4_title,
                  desc: t.benefit4_desc,
                  color: "#f1f5f9",
                  iconColor: VIOLET,
                  points: [(t as any).benefit4_point1, (t as any).benefit4_point2, (t as any).benefit4_point3],
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-4 p-8 rounded-2xl bg-white border"
                  style={{ borderColor: BORDER }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: b.color }}
                  >
                    <b.icon className="w-6 h-6" style={{ color: b.iconColor }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-2" style={{ color: TEXT_MAIN }}>
                      {b.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: TEXT_MUTED }}>
                      {b.desc}
                    </p>
                    <ul className="space-y-1.5">
                      {b.points.map((point, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs" style={{ color: TEXT_MUTED }}>
                          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: b.iconColor }} />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          TESTIMONIALS — Single row, 3 cards
      ══════════════════════════════════════════════════════════ */}
      {!isFastDoc && (
        <section className="py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-10">
              <h2
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ color: TEXT_MAIN }}
              >
                {(t as any).testimonials_title}
              </h2>
              <p className="text-base" style={{ color: TEXT_MUTED }}>
                {(t as any).testimonials_subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS_META.map((tm, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-4 p-6 rounded-2xl"
                  style={{ backgroundColor: "#f8fafc" }}
                >
                  {/* Stars */}
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-current" style={{ color: "#facc15" }} />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-sm leading-relaxed flex-1" style={{ color: TEXT_MUTED }}>
                    "{(t as any)[tm.textKey]}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-2">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: tm.avatarColor }}
                    >
                      {tm.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: TEXT_MAIN }}>
                        {tm.name}
                      </div>
                      <div className="text-xs" style={{ color: TEXT_LIGHT }}>
                        {(t as any)[tm.roleKey]}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECURITY — Horizontal badges
      ══════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#f8fafc" }}>
        <div className="container py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: TEXT_MAIN }}>
              {(t as any).security_title}
            </h2>
            <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>
              {(t as any).security_subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Shield,
                title: (t as any).security_ssl_title,
                desc: (t as any).security_ssl_desc,
                color: "#2563EB",
              },
              {
                icon: Trash2,
                title: (t as any).security_delete_title,
                desc: (t as any).security_delete_desc,
                color: "#1565C0",
              },
              {
                icon: Globe,
                title: (t as any).security_privacy_title,
                desc: (t as any).security_privacy_desc,
                color: INDIGO,
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}18` }}
                >
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: TEXT_MAIN }}>
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FAQ — Clean accordion
      ══════════════════════════════════════════════════════════ */}
      {!isFastDoc && (
        <section id="faq" className="py-16 md:py-20 bg-white">
          <div className="container max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold"
                style={{ color: TEXT_MAIN }}
              >
                {t.faq_title}
              </h2>
            </div>

            <div>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="border-b"
                  style={{ borderColor: BORDER }}
                >
                  <button
                    className="w-full flex items-center justify-between py-4 text-left gap-4"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-sm" style={{ color: TEXT_MAIN }}>
                      {faq.question}
                    </span>
                    {openFaq === i
                      ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: INDIGO }} />
                      : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: TEXT_LIGHT }} />
                    }
                  </button>
                  {openFaq === i && (
                    <div className="pb-4 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA — Simple green background
      ══════════════════════════════════════════════════════════ */}
      <section
        className="py-16 md:py-24"
        style={{
          backgroundColor: isFastDoc ? "#E8590C" : INDIGO,
        }}
      >
        <div className="container text-center">
          <h2
            className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight"
          >
            {t.cta_title}
          </h2>
          <p
            className="text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          >
            {t.cta_subtitle}
          </p>

          <button
            className="inline-flex items-center gap-2.5 px-10 py-4 rounded-xl font-bold text-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:scale-95"
            style={{
              backgroundColor: "white",
              color: isFastDoc ? "#C2410C" : INDIGO,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.22)",
            }}
            onClick={() => scrollToEditor()}
          >
            <Upload className="w-5 h-5" />
            {t.cta_btn}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
