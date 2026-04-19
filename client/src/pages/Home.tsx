/* =============================================================
   EditorPDF Home — bundle design (ChatPDF-inspired, ink + PDF red)
   - Hero with centered upload box, functional tabs, hand-note
   - Trust line, stats, tool grid by 6 categories
   - Restyled how-it-works, testimonials, features, FAQ, final CTA
   - All copy via i18n keys (no hardcoded strings)
   ============================================================= */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  FileText, PenTool, MessageSquare, Type, Image, Lock,
  ChevronDown, Upload, Edit3, Cloud, RefreshCw,
  Shield, Zap, Star, Sparkles,
  Merge, Scissors, RotateCcw, Minimize2,
  FileImage, FileSpreadsheet, Presentation, FileCode,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { isFastDoc } from "@/lib/brand";

// ─── Accepted file types (preserved) ───────────────────────────
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

// ─── Bundle palette tokens ─────────────────────────────────────
const ACCENT = "#E63946";
const ACCENT_BORDER = "#F2C1C6";

// ─── Tool definitions, grouped into bundle's 6 categories ──────
type ToolDef = { icon: any; label_key: string; tool: string };

const TOOLS_EDIT_CAT: ToolDef[] = [
  { icon: Type,          label_key: "tool_edit_text", tool: "text"  },
  { icon: MessageSquare, label_key: "tool_annotate",  tool: "notes" },
  { icon: Image,         label_key: "tool_images",    tool: "image" },
];
const TOOLS_ORGANIZE: ToolDef[] = [
  { icon: Merge,     label_key: "tool_merge",  tool: "merge"  },
  { icon: Scissors,  label_key: "tool_split",  tool: "split"  },
  { icon: RotateCcw, label_key: "tool_rotate", tool: "rotate" },
];
const TOOLS_OPTIMIZE: ToolDef[] = [
  { icon: Minimize2, label_key: "tool_compress", tool: "compress" },
];
const TOOLS_SECURITY: ToolDef[] = [
  { icon: PenTool, label_key: "tool_add_sign", tool: "sign"    },
  { icon: Lock,    label_key: "tool_protect",  tool: "protect" },
];
const TOOLS_FROM_PDF: ToolDef[] = [
  { icon: FileText,        label_key: "tool_pdf_word",  tool: "convert-word"  },
  { icon: FileSpreadsheet, label_key: "tool_pdf_excel", tool: "convert-excel" },
  { icon: Presentation,    label_key: "tool_pdf_ppt",   tool: "convert-ppt"   },
  { icon: FileImage,       label_key: "tool_pdf_jpg",   tool: "convert-jpg"   },
  { icon: FileImage,       label_key: "tool_pdf_png",   tool: "convert-png"   },
  { icon: FileCode,        label_key: "tool_pdf_html",  tool: "convert-html"  },
];
const TOOLS_TO_PDF: ToolDef[] = [
  { icon: FileText,        label_key: "tool_word_pdf",  tool: "word-to-pdf"  },
  { icon: FileSpreadsheet, label_key: "tool_excel_pdf", tool: "excel-to-pdf" },
  { icon: Presentation,    label_key: "tool_ppt_pdf",   tool: "ppt-to-pdf"   },
  { icon: FileImage,       label_key: "tool_jpg_pdf",   tool: "jpg-to-pdf"   },
  { icon: FileImage,       label_key: "tool_png_pdf",   tool: "png-to-pdf"   },
  { icon: FileCode,        label_key: "tool_html_pdf",  tool: "html-to-pdf"  },
];

const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf", "html-to-pdf"];

// ─── Testimonials (preserved) ──────────────────────────────────
const TESTIMONIALS_META = [
  { name: "María García",     avatar: "MG", color: "linear-gradient(135deg,#E63946,#F4A442)", textKey: "testimonial1_text", roleKey: "testimonial1_role" },
  { name: "Carlos Rodríguez", avatar: "CR", color: "linear-gradient(135deg,#1E9E63,#2B5BEA)", textKey: "testimonial2_text", roleKey: "testimonial2_role" },
  { name: "Ana Martínez",     avatar: "AM", color: "linear-gradient(135deg,#2B5BEA,#E63946)", textKey: "testimonial3_text", roleKey: "testimonial3_role" },
];

export interface HomeOverrides {
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  metaTitle?: string;
  metaDesc?: string;
  editorTool?: string;
}

// ─── Squiggle accent (bundle .accent-text em::after) ───────────
const SquiggleUnderline = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-block px-0.5">
    {children}
    <svg
      className="absolute left-0 right-0 -bottom-1.5 w-full pointer-events-none"
      viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"
      style={{ height: "0.28em" }}
    >
      <path d="M2 9 Q 60 4, 150 5 T 298 7 L 296 11 Q 150 9, 4 12 Z" fill={ACCENT}/>
    </svg>
  </span>
);

// Render a heading title and apply the red squiggle to `highlight`.
// - If the highlight word appears inside the title, wrap it in place.
// - Otherwise append it at the end (AdLanding style: title + highlighted suffix).
const renderHighlightedTitle = (title: string, highlight?: string) => {
  if (!highlight) return title;
  const idx = title.lastIndexOf(highlight);
  if (idx === -1) {
    return <>{title} <SquiggleUnderline>{highlight}</SquiggleUnderline></>;
  }
  return (
    <>
      {title.slice(0, idx)}
      <SquiggleUnderline>{title.slice(idx, idx + highlight.length)}</SquiggleUnderline>
      {title.slice(idx + highlight.length)}
    </>
  );
};

// ─── Hand-drawn note + arrow (bundle HandNote 'left' placement) ─
const HandNote = ({ text }: { text: string }) => (
  <div
    className="hidden lg:flex absolute -left-44 top-12 w-44 flex-col items-end pointer-events-none z-10 text-right"
  >
    <div
      className="text-[#0A0A0B] text-[22px] leading-tight mb-1.5"
      style={{ fontFamily: "'Patrick Hand', 'Caveat', cursive", transform: "rotate(-5deg)" }}
    >
      {text}
    </div>
    <svg width="110" height="68" viewBox="0 0 110 68" className="ml-14 block">
      <path d="M6 6 Q 40 10, 58 30 Q 78 50, 100 58" stroke="#0A0A0B" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M90 48 L102 60 L88 62" stroke="#0A0A0B" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

type TabId = "edit" | "merge" | "split" | "compress" | "convert" | "sign";

export default function Home({ overrides }: { overrides?: HomeOverrides } = {}) {
  const [activeTab, setActiveTab] = useState<TabId>("edit");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [docsCount, setDocsCount] = useState(3847);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPendingFile, setPendingTool } = usePdfFile();
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();

  // Animated counter
  useEffect(() => {
    const tick = () => {
      setDocsCount((c) => c + 1 + Math.floor(Math.random() * 8));
      const next = 500 + Math.random() * 500;
      timer = window.setTimeout(tick, next);
    };
    let timer = window.setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, []);

  // Override meta tags
  useEffect(() => {
    if (overrides?.metaTitle) document.title = overrides.metaTitle;
    if (overrides?.metaDesc) {
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", overrides.metaDesc);
    }
  }, [overrides]);

  // Load handwritten font (Patrick Hand) for the hand-note accent
  useEffect(() => {
    const id = "editorpdf-handnote-font";
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  const TAB_TO_TOOL: Record<TabId, string> = {
    edit: "text",
    merge: "merge",
    split: "split",
    compress: "compress",
    convert: "convert-word",
    sign: "sign",
  };

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
    if (f) openEditor(f, overrides?.editorTool ?? TAB_TO_TOOL[activeTab]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer.files[0];
    if (f) openEditor(f, overrides?.editorTool ?? TAB_TO_TOOL[activeTab]);
  };

  const triggerUpload = (tool?: string) => {
    if (tool) setPendingTool(tool);
    if (tool && FILE_FREE_TOOLS.includes(tool)) {
      navigate(`/${lang}/editor`);
    } else {
      fileInputRef.current?.click();
    }
  };

  const resolveLabel = (key: string) => (t as any)[key] ?? key;

  const HERO_TABS: { id: TabId; labelKey: string; icon: any; alwaysShow?: boolean }[] = [
    { id: "edit",     labelKey: "hero_pill_edit",     icon: Edit3,     alwaysShow: true },
    { id: "merge",    labelKey: "hero_pill_merge",    icon: Merge },
    { id: "split",    labelKey: "hero_pill_split",    icon: Scissors },
    { id: "compress", labelKey: "hero_pill_compress", icon: Minimize2 },
    { id: "convert",  labelKey: "hero_pill_convert",  icon: RefreshCw, alwaysShow: true },
    { id: "sign",     labelKey: "hero_pill_sign",     icon: PenTool,   alwaysShow: true },
  ];

  const TOOL_CATEGORIES: { titleKey: string; tools: ToolDef[] }[] = [
    { titleKey: "tools_tab_edit",     tools: TOOLS_EDIT_CAT },
    { titleKey: "tools_cat_organize", tools: TOOLS_ORGANIZE },
    { titleKey: "tools_cat_optimize", tools: TOOLS_OPTIMIZE },
    { titleKey: "tools_cat_security", tools: TOOLS_SECURITY },
    { titleKey: "tools_tab_from_pdf", tools: TOOLS_FROM_PDF },
    { titleKey: "tools_tab_to_pdf",   tools: TOOLS_TO_PDF   },
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

  // ─── UploadBox (reused in hero + final CTA) ──────────────────
  const UploadBox = ({ withTabs, withHandNote }: { withTabs?: boolean; withHandNote?: boolean }) => (
    <div className="relative">
      {withHandNote && <HandNote text={t.hero_handnote} />}
      <div
        className="rounded-[22px] p-6 transition-all"
        style={{
          background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)",
          border: "1px solid rgba(10,10,11,0.08)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(10,10,11,0.02), 0 2px 4px rgba(10,10,11,0.04), 0 12px 24px -8px rgba(10,10,11,0.08), 0 32px 56px -16px rgba(10,10,11,0.12)",
        }}
      >
        {withTabs && (
          <div className="flex justify-center gap-1.5 mb-5 flex-nowrap">
            {HERO_TABS.map(tab => {
              const active = tab.id === activeTab;
              const Ico = tab.icon;
              const visibility = tab.alwaysShow ? "flex" : "hidden md:flex";
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${visibility} shrink-0 px-2.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm"
                      : "bg-white text-[#1A1A1C] border-[#E8E8EC] hover:border-[#0A0A0B]/30 hover:bg-[#F6F6F7]"
                  }`}
                  type="button"
                  aria-pressed={active}
                >
                  <Ico className="w-3.5 h-3.5" style={{ color: active ? "#E63946" : "#5A5A62" }} />
                  {resolveLabel(tab.labelKey)}
                </button>
              );
            })}
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          onClick={() => triggerUpload(TAB_TO_TOOL[activeTab])}
          className="rounded-2xl border-[1.5px] border-dashed cursor-pointer transition-all flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-2 md:gap-3 text-center"
          style={{
            borderColor: isDraggingOver ? ACCENT : ACCENT_BORDER,
            background: isDraggingOver
              ? "linear-gradient(180deg,#FDE3E6,#FFF1F2)"
              : "linear-gradient(180deg,#FEF6F7,#FFFBFB)",
            padding: "40px 24px",
            minHeight: 140,
          }}
        >
          <strong className="text-[15px] font-bold text-[#0A0A0B]">{t.hero_drag_here}</strong>
          <span className="text-[15px] text-[#1A1A1C] font-medium">{t.hero_or}</span>
          <button
            onClick={(e) => { e.stopPropagation(); triggerUpload(TAB_TO_TOOL[activeTab]); }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E63946] text-white text-sm font-bold border border-[#E63946] shadow-[0_6px_16px_-6px_rgba(230,57,70,0.55)] hover:bg-[#C72738] hover:border-[#C72738] hover:shadow-[0_10px_24px_-8px_rgba(230,57,70,0.65)] hover:-translate-y-px transition-all"
            type="button"
          >
            <Upload className="w-4 h-4" />
            {t.hero_upload_btn}
          </button>
        </div>

        <div className="flex justify-center mt-4">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#5A5A62] font-medium">
            <Cloud className="w-3.5 h-3.5 text-[#8A8A92]" />
            {t.hero_max_size}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0A0A0B]">
      <Navbar />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* ══════ HERO — bundle variant A (centered upload) ══════ */}
      <section className="relative pt-16 md:pt-[72px] pb-20 overflow-hidden">
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, #F6F6F7 0%, transparent 70%)" }}
        />
        <div className="container relative z-[1] text-center">
          <h1
            className="font-extrabold leading-[1.08] tracking-[-0.03em] mb-4 max-w-[880px] mx-auto text-[#0A0A0B]"
            style={{ fontSize: "clamp(30px, 4.6vw, 48px)", textWrap: "balance" as any }}
          >
            {overrides?.heroTitle ? (
              renderHighlightedTitle(overrides.heroTitle, overrides.heroHighlight)
            ) : isFastDoc ? (
              <>{t.fastdoc_hero_title_1} <SquiggleUnderline>{t.fastdoc_hero_title_2}</SquiggleUnderline></>
            ) : (
              <>{t.hero_title_1} <SquiggleUnderline>{t.hero_title_2}</SquiggleUnderline></>
            )}
          </h1>
          <p className="text-base md:text-[17px] text-[#5A5A62] mb-8 max-w-xl mx-auto leading-relaxed">
            {overrides?.heroSubtitle ?? (isFastDoc ? t.fastdoc_hero_subtitle : t.hero_subtitle)}
          </p>

          <div className="relative max-w-[720px] mx-auto">
            <UploadBox withTabs withHandNote />
          </div>
        </div>
      </section>

      {/* ══════ TRUST LINE — replaces fake logos ══════ */}
      {!isFastDoc && (
        <section className="pb-12 -mt-6">
          <div className="container">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: i <= 4 ? "#F4A442" : "#E4E4E7" }} />
                ))}
              </div>
              <span className="font-bold text-sm text-[#0A0A0B]">4.8</span>
              <span className="text-[#8A8A92] text-sm">·</span>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A8A92] font-bold">
                {t.testimonials_subtitle}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ══════ STATS ══════ */}
      {!isFastDoc && (
        <section className="pb-14">
          <div className="container">
            <div className="max-w-[760px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-0">
              {[
                { big: docsCount.toLocaleString(), label: t.hero_social_pdfs, emoji: "📄" },
                { big: "12M+", label: t.hero_social_users, emoji: "👥" },
                { big: "4.8 ★", label: t.hero_social_rating, emoji: "🏆" },
              ].map((s, i) => (
                <div key={i} className={`text-center px-4 py-2 ${i > 0 ? "sm:border-l sm:border-[#E8E8EC]" : ""}`}>
                  <div className="text-2xl mb-2">{s.emoji}</div>
                  <div className="text-[28px] font-extrabold tracking-[-0.02em] text-[#0A0A0B] leading-none">{s.big}</div>
                  <div className="text-xs text-[#5A5A62] mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════ TOOLS GRID — 6 categories ══════ */}
      <section id="tools" className="py-20 bg-[#FAFAFA] border-y border-[#F1F1F4]">
        <div className="container">
          <div className="text-center mb-12">
            <h2
              className="font-extrabold tracking-[-0.025em] leading-[1.1] mb-3.5 text-[#0A0A0B]"
              style={{ fontSize: "clamp(32px, 4vw, 44px)" }}
            >
              {t.tools_title}
            </h2>
            <p className="text-[17px] text-[#5A5A62] max-w-[540px] mx-auto">
              {t.tools_subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {TOOL_CATEGORIES.map((cat) => (
              <div key={cat.titleKey}>
                <div className="flex items-baseline gap-4 mb-4 pb-3 border-b border-[#F1F1F4] flex-wrap">
                  <h3 className="text-[22px] font-extrabold tracking-[-0.015em] text-[#0A0A0B]">
                    {resolveLabel(cat.titleKey)}
                  </h3>
                  <span className="ml-auto text-[11px] font-bold tracking-[0.12em] text-[#8A8A92] uppercase">
                    {cat.tools.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {cat.tools.map((tool) => (
                    <button
                      key={tool.label_key}
                      onClick={() => triggerUpload(tool.tool)}
                      className="bg-white border border-[#E8E8EC] rounded-xl px-4 py-3.5 flex items-center gap-3 text-left text-[#0A0A0B] hover:border-[#E63946] hover:-translate-y-px hover:shadow-[0_8px_18px_-10px_rgba(230,57,70,0.28)] transition-all"
                    >
                      <div className="w-[34px] h-[34px] rounded-lg bg-[#F6F6F7] flex items-center justify-center flex-shrink-0">
                        <tool.icon className="w-[17px] h-[17px] text-[#0A0A0B]" />
                      </div>
                      <span className="text-sm font-semibold">
                        {resolveLabel(tool.label_key)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS (kept for #how-it-works anchor) ══════ */}
      {!isFastDoc && (
        <section id="how-it-works" className="py-20">
          <div className="container">
            <div className="text-center mb-14">
              <h2
                className="font-extrabold tracking-[-0.025em] leading-[1.1] text-[#0A0A0B] mb-3"
                style={{ fontSize: "clamp(32px, 4vw, 42px)" }}
              >
                {t.how_title}
              </h2>
              <p className="text-base text-[#5A5A62]">{t.how_subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { n: 1, icon: Upload, title: t.how_step1_title, desc: t.how_step1_desc },
                { n: 2, icon: Edit3,  title: t.how_step2_title, desc: t.how_step2_desc },
                { n: 3, icon: Cloud,  title: t.how_step3_title, desc: t.how_step3_desc },
              ].map((s) => (
                <div key={s.n} className="text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-[#0A0A0B] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4 ring-4 ring-[#FDECEE]">
                    {s.n}
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#F6F6F7] flex items-center justify-center mx-auto mb-3">
                    <s.icon className="w-5 h-5 text-[#0A0A0B]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0A0A0B] mb-2">{s.title}</h3>
                  <p className="text-sm text-[#5A5A62] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════ TESTIMONIALS — 3 cards in bundle aesthetic ══════ */}
      {!isFastDoc && (
        <section className="py-20 border-t border-[#F1F1F4]">
          <div className="container">
            <div className="text-center mb-12">
              <h2
                className="font-extrabold tracking-[-0.025em] text-[#0A0A0B] mb-2"
                style={{ fontSize: "clamp(28px, 3.5vw, 36px)" }}
              >
                {t.testimonials_title}
              </h2>
              <p className="text-base text-[#5A5A62]">{t.testimonials_subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {TESTIMONIALS_META.map((tm, i) => (
                <div key={i} className="bg-[#F6F6F7] rounded-3xl p-7 flex flex-col gap-4 relative">
                  <div className="absolute right-5 top-5 text-xl">✦</div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-current text-[#F4A442]" />
                    ))}
                  </div>
                  <p className="text-[15px] leading-relaxed text-[#1A1A1C] flex-1">
                    "{(t as any)[tm.textKey]}"
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <div
                      className="w-10 h-10 rounded-full text-white font-bold text-sm flex items-center justify-center flex-shrink-0"
                      style={{ background: tm.color }}
                    >
                      {tm.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0A0A0B]">{tm.name}</div>
                      <div className="text-xs text-[#5A5A62]">{(t as any)[tm.roleKey]}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════ FEATURES — 4 cards reusing benefit_* keys ══════ */}
      {!isFastDoc && (
        <section id="features" className="py-20 border-t border-[#F1F1F4] bg-[#FAFAFA]">
          <div className="container">
            <div className="text-center mb-14">
              <h2
                className="font-extrabold tracking-[-0.025em] leading-[1.1] text-[#0A0A0B] mb-3.5"
                style={{ fontSize: "clamp(32px, 4vw, 44px)" }}
              >
                {t.benefits_title}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Zap,      tint: ACCENT,    title: t.benefit1_title, desc: t.benefit1_desc, points: [(t as any).benefit1_point1, (t as any).benefit1_point2, (t as any).benefit1_point3] },
                { icon: Shield,   tint: "#1E9E63", title: t.benefit2_title, desc: t.benefit2_desc, points: [(t as any).benefit2_point1, (t as any).benefit2_point2, (t as any).benefit2_point3] },
                { icon: Edit3,    tint: "#2B5BEA", title: t.benefit3_title, desc: t.benefit3_desc, points: [(t as any).benefit3_point1, (t as any).benefit3_point2, (t as any).benefit3_point3] },
                { icon: Sparkles, tint: "#F4A442", title: t.benefit4_title, desc: t.benefit4_desc, points: [(t as any).benefit4_point1, (t as any).benefit4_point2, (t as any).benefit4_point3] },
              ].map((f, i) => (
                <div key={i} className="bg-white rounded-3xl p-7 border border-[#E8E8EC]">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: `${f.tint}1F` }}
                  >
                    <f.icon className="w-6 h-6" style={{ color: f.tint }} />
                  </div>
                  <h3 className="text-xl font-bold tracking-[-0.015em] text-[#0A0A0B] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#5A5A62] leading-relaxed mb-3">{f.desc}</p>
                  <ul className="space-y-1.5">
                    {f.points.filter(Boolean).map((p, j) => (
                      <li key={j} className="text-xs text-[#5A5A62] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.tint }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════ FAQ ══════ */}
      {!isFastDoc && (
        <section id="faq" className="py-20 bg-[#FAFAFA] border-t border-[#F1F1F4]">
          <div className="container max-w-[760px]">
            <h2
              className="font-extrabold tracking-[-0.025em] text-center mb-10 text-[#0A0A0B]"
              style={{ fontSize: "clamp(32px, 4vw, 42px)" }}
            >
              {t.faq_title}
            </h2>
            <div className="flex flex-col gap-2">
              {faqs.map((faq, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="bg-white rounded-xl border border-[#E8E8EC] overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full text-left px-5 py-4 flex justify-between items-center text-[15px] font-semibold text-[#0A0A0B]"
                      type="button"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown size={18} className={`text-[#5A5A62] transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-5 text-sm text-[#5A5A62] leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════ FINAL CTA — UploadBox repeated with hand note ══════ */}
      <section className="py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, #FDECEE 0%, transparent 70%)" }}
        />
        <div className="container relative z-[1] max-w-[780px]">
          <div className="text-center mb-8">
            <h2
              className="font-extrabold tracking-[-0.025em] leading-[1.1] text-[#0A0A0B] mb-3"
              style={{ fontSize: "clamp(28px, 3.5vw, 36px)" }}
            >
              {t.cta_title}
            </h2>
            <p className="text-[15px] text-[#5A5A62]">{t.cta_subtitle}</p>
          </div>
          <UploadBox withHandNote />
        </div>
      </section>

      <Footer />
    </div>
  );
}
