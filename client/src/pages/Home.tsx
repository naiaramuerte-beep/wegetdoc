/* =============================================================
   EditorPDF Home — bundle design (ChatPDF-inspired, ink + PDF red)
   - Hero with centered upload box, functional tabs, hand-note
   - Trust line, stats, tool grid by 6 categories
   - Restyled how-it-works, testimonials, features, FAQ, final CTA
   - All copy via i18n keys (no hardcoded strings)
   ============================================================= */

import { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import {
  FileText, PenTool, MessageSquare, Type, Image, Lock,
  ChevronDown, Upload, Edit3, Cloud, RefreshCw, Download, Check,
  Shield, Zap, Star, Sparkles, ArrowRight,
  Merge, Scissors, RotateCcw, Minimize2, Droplet,
  FileImage, FileSpreadsheet, Presentation, FileCode,
  LayoutGrid,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { checkUploadSize } from "@/lib/uploadLimit";
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
// `landingSlug` (optional) makes the home-grid button navigate to that
// dedicated SEO landing instead of triggering the editor upload flow.
// `tint` + `iconBg` give each tile a brand-tinted icon chip (matches
// the colour language used inside the landings' "All PDF tools" grid).
type ToolDef = {
  icon: any;
  label_key: string;
  tool: string;
  landingSlug?: string;
  tint: string;
  iconBg: string;
};

// Brand palette helpers — kept inline so the array stays readable.
const RED       = "#E63946"; const RED_BG    = "#FEE7EA";
const BLUE      = "#2B579A"; const BLUE_BG   = "#E8F0FA";
const GREEN     = "#1F7244"; const GREEN_BG  = "#E8F5EC";
const ORANGE    = "#D04423"; const ORANGE_BG = "#FBEBE5";
const PURPLE    = "#8A57DC"; const PURPLE_BG = "#F1EAFB";
const INK       = "#0A0A0B"; const INK_BG    = "#F0F0F2";
const CYAN      = "#0F8FA3"; const CYAN_BG   = "#E4F4F7";

const TOOLS_EDIT_CAT: ToolDef[] = [
  { icon: Type,          label_key: "tool_edit_text", tool: "text",  tint: RED,    iconBg: RED_BG    },
  { icon: MessageSquare, label_key: "tool_annotate",  tool: "notes", tint: BLUE,   iconBg: BLUE_BG   },
  { icon: Image,         label_key: "tool_images",    tool: "image", tint: ORANGE, iconBg: ORANGE_BG },
];
const TOOLS_ORGANIZE: ToolDef[] = [
  { icon: Merge,     label_key: "tool_merge",  tool: "merge",  landingSlug: "merge-pdf",  tint: BLUE,   iconBg: BLUE_BG   },
  { icon: Scissors,  label_key: "tool_split",  tool: "split",  landingSlug: "split-pdf",  tint: GREEN,  iconBg: GREEN_BG  },
  { icon: RotateCcw, label_key: "tool_rotate", tool: "rotate", landingSlug: "rotate-pdf", tint: PURPLE, iconBg: PURPLE_BG },
];
const TOOLS_OPTIMIZE: ToolDef[] = [
  { icon: Minimize2, label_key: "tool_compress",  tool: "compress",  landingSlug: "compress-pdf",  tint: ORANGE, iconBg: ORANGE_BG },
  { icon: Droplet,   label_key: "tool_watermark", tool: "watermark", landingSlug: "watermark-pdf", tint: CYAN,   iconBg: CYAN_BG   },
];
const TOOLS_SECURITY: ToolDef[] = [
  { icon: PenTool, label_key: "tool_add_sign", tool: "sign",    tint: RED, iconBg: RED_BG },
  { icon: Lock,    label_key: "tool_protect",  tool: "protect", tint: INK, iconBg: INK_BG },
];
const TOOLS_FROM_PDF: ToolDef[] = [
  { icon: FileText,        label_key: "tool_pdf_word",  tool: "convert-word",  landingSlug: "pdf-to-word",       tint: BLUE,   iconBg: BLUE_BG   },
  { icon: FileSpreadsheet, label_key: "tool_pdf_excel", tool: "convert-excel", landingSlug: "pdf-to-excel",      tint: GREEN,  iconBg: GREEN_BG  },
  { icon: Presentation,    label_key: "tool_pdf_ppt",   tool: "convert-ppt",   landingSlug: "pdf-to-powerpoint", tint: ORANGE, iconBg: ORANGE_BG },
  { icon: FileImage,       label_key: "tool_pdf_jpg",   tool: "convert-jpg",   landingSlug: "pdf-to-jpg",        tint: RED,    iconBg: RED_BG    },
  { icon: FileImage,       label_key: "tool_pdf_png",   tool: "convert-png",                                     tint: INK,    iconBg: INK_BG    },
  { icon: FileCode,        label_key: "tool_pdf_html",  tool: "convert-html",                                    tint: PURPLE, iconBg: PURPLE_BG },
];
const TOOLS_TO_PDF: ToolDef[] = [
  { icon: FileText,        label_key: "tool_word_pdf",  tool: "word-to-pdf",  landingSlug: "word-to-pdf", tint: BLUE,   iconBg: BLUE_BG   },
  { icon: FileSpreadsheet, label_key: "tool_excel_pdf", tool: "excel-to-pdf",                             tint: GREEN,  iconBg: GREEN_BG  },
  { icon: Presentation,    label_key: "tool_ppt_pdf",   tool: "ppt-to-pdf",                               tint: ORANGE, iconBg: ORANGE_BG },
  { icon: FileImage,       label_key: "tool_jpg_pdf",   tool: "jpg-to-pdf",   landingSlug: "jpg-to-pdf",  tint: RED,    iconBg: RED_BG    },
  { icon: FileImage,       label_key: "tool_png_pdf",   tool: "png-to-pdf",   landingSlug: "png-to-pdf",  tint: INK,    iconBg: INK_BG    },
  { icon: FileCode,        label_key: "tool_html_pdf",  tool: "html-to-pdf",                              tint: PURPLE, iconBg: PURPLE_BG },
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
  const [toolsBarOpen, setToolsBarOpen] = useState(false); // mobile Adobe-style tools accordion
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

  // Preload the editor bundle in the background so upload -> /editor
  // does not flash the generic LazyFallback screen before PdfEditor mounts.
  useEffect(() => {
    import("./EditorPage");
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
    if (!checkUploadSize(file, t.upload_too_large)) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isSupported = ACCEPTED_MIME_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.has(ext);
    if (!isSupported) {
      import('sonner').then(({ toast }) => {
        toast.error('Formato no soportado. Sube un PDF, Word, Excel, PowerPoint, JPG o PNG.');
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    // flushSync guarantees the context state is committed BEFORE we navigate,
    // so EditorPage mounts with pendingFile already set. Without this, the
    // state update and the route change can land in different renders and the
    // editor opens empty on the first click (worked on the 2nd click).
    flushSync(() => {
      setPendingFile(file);
      if (tool) setPendingTool(tool);
    });
    navigate(`/${lang}/editor`);
  }, [setPendingFile, setPendingTool, navigate, lang, t]);

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

  // Hero quick-access cards. Each card navigates to its dedicated landing
  // when `landingSlug` is set; otherwise it triggers the editor upload flow
  // with `toolForUpload`. Designed as a 2-row × 6-col grid on desktop so the
  // visitor sees every common tool above the fold.
  type HeroToolDef = {
    id: string;
    labelKey: string;
    icon: any;
    tint: string;
    iconBg: string;
    landingSlug?: string;
    toolForUpload?: string;
  };
  const HERO_TOOLS: HeroToolDef[] = [
    // Row 1 — editor-centric tools (most common)
    { id: "edit",      labelKey: "hero_pill_edit",     icon: Edit3,           tint: "#E63946", iconBg: "#FEE7EA", toolForUpload: "text" },
    { id: "merge",     labelKey: "hero_pill_merge",    icon: Merge,           tint: "#2B579A", iconBg: "#E8F0FA", landingSlug: "merge-pdf" },
    { id: "split",     labelKey: "hero_pill_split",    icon: Scissors,        tint: "#1F7244", iconBg: "#E8F5EC", landingSlug: "split-pdf" },
    { id: "compress",  labelKey: "hero_pill_compress", icon: Minimize2,       tint: "#D04423", iconBg: "#FBEBE5", landingSlug: "compress-pdf" },
    { id: "convert",   labelKey: "hero_pill_convert",  icon: RefreshCw,       tint: "#8A57DC", iconBg: "#F1EAFB", landingSlug: "convert" },
    { id: "sign",      labelKey: "hero_pill_sign",     icon: PenTool,         tint: "#0A0A0B", iconBg: "#F0F0F2", toolForUpload: "sign" },
    // Row 2 — organize/convert specifics, each goes to its landing
    { id: "rotate",    labelKey: "tool_rotate",        icon: RotateCcw,       tint: "#8A57DC", iconBg: "#F1EAFB", landingSlug: "rotate-pdf" },
    { id: "watermark", labelKey: "tool_watermark",     icon: Droplet,         tint: "#0F8FA3", iconBg: "#E4F4F7", landingSlug: "watermark-pdf" },
    { id: "pdf-word",  labelKey: "tool_pdf_word",      icon: FileText,        tint: "#2B579A", iconBg: "#E8F0FA", landingSlug: "pdf-to-word" },
    { id: "pdf-excel", labelKey: "tool_pdf_excel",     icon: FileSpreadsheet, tint: "#1F7244", iconBg: "#E8F5EC", landingSlug: "pdf-to-excel" },
    { id: "pdf-jpg",   labelKey: "tool_pdf_jpg",       icon: FileImage,       tint: "#E63946", iconBg: "#FEE7EA", landingSlug: "pdf-to-jpg" },
    { id: "jpg-pdf",   labelKey: "tool_jpg_pdf",       icon: FileImage,       tint: "#0A0A0B", iconBg: "#F0F0F2", landingSlug: "jpg-to-pdf" },
  ];

  const handleHeroToolClick = (tool: HeroToolDef) => {
    if (tool.landingSlug) {
      navigate(`/${lang}/${tool.landingSlug}`);
      return;
    }
    // edit + sign have no dedicated landing — open editor upload flow
    if (tool.toolForUpload) triggerUpload(tool.toolForUpload);
  };

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
          {/* Desktop: "Arrastra … o [Subir archivo]" (drag works there).
              Mobile: no drag — icon + lead + full-width button + size + trust badges. */}
          <div className="md:hidden w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: "#FDECEE" }}>
            <Upload className="w-6 h-6" style={{ color: ACCENT }} />
          </div>
          <strong className="hidden md:inline text-[15px] font-bold text-[#0A0A0B]">{t.hero_drag_here}</strong>
          <span className="hidden md:inline text-[15px] text-[#1A1A1C] font-medium">{t.hero_or}</span>
          <strong className="md:hidden text-[16px] font-bold text-[#0A0A0B]">{t.hero_upload_mobile_lead}</strong>
          <button
            onClick={(e) => { e.stopPropagation(); triggerUpload(TAB_TO_TOOL[activeTab]); }}
            className="flex md:inline-flex w-full md:w-auto items-center justify-center gap-2 px-5 py-4 md:py-3 rounded-xl bg-[#E63946] text-white text-base md:text-sm font-bold border border-[#E63946] shadow-[0_6px_16px_-6px_rgba(230,57,70,0.55)] hover:bg-[#C72738] hover:border-[#C72738] hover:shadow-[0_10px_24px_-8px_rgba(230,57,70,0.65)] hover:-translate-y-px transition-all"
            type="button"
          >
            <Upload className="w-5 h-5 md:w-4 md:h-4" />
            <span className="md:hidden">{t.hero_upload_device}</span>
            <span className="hidden md:inline">{t.hero_upload_btn}</span>
          </button>
          {/* Mobile only: size hint + honest trust badges (no fabricated reviews). */}
          <p className="md:hidden text-[13px] text-[#5A5A62] font-medium mt-0.5">{t.hero_max_size}</p>
          {/* Two clear trust badges (PDFServices-style): SSL + files private.
              Simpler and clearer than three cramped pills; both green = "safe". */}
          <div className="md:hidden flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3 text-[12px] font-bold text-[#3f4650]">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Shield className="w-4 h-4 text-[#16a34a] shrink-0" />{t.hero_trust_ssl}</span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Lock className="w-4 h-4 text-[#16a34a] shrink-0" />{t.hero_trust_delete}</span>
          </div>
        </div>

        {withTabs && (
          <div className="md:hidden flex flex-wrap justify-center gap-1.5 mt-4">
            {([["PDF", "#E63946", "#FDECEE"], ["Word", "#2B5BEA", "#E8EEFE"], ["Excel", "#1E9E63", "#E4F5EC"], ["PowerPoint", "#E8710A", "#FDEEDD"], ["JPG", "#8E24AA", "#F3E6F8"]] as const).map(([l, c, bg]) => (
              <span key={l} className="text-[11.5px] font-extrabold px-2.5 py-1 rounded-lg" style={{ color: c, background: bg }}>{l}</span>
            ))}
          </div>
        )}

        {withTabs && (
          <div className="mt-5 -mx-1 sm:mx-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {HERO_TOOLS.map(tool => {
                const Ico = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleHeroToolClick(tool)}
                    className="group relative flex flex-col items-center justify-start gap-1.5 px-1.5 py-3 sm:py-3.5 rounded-xl bg-white border border-[#EBEBEE] hover:border-[#0A0A0B]/15 hover:-translate-y-px hover:shadow-[0_10px_24px_-12px_rgba(10,10,11,0.18)] transition-all"
                    type="button"
                    aria-label={resolveLabel(tool.labelKey)}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: tool.iconBg }}
                    >
                      <Ico className="w-[18px] h-[18px]" style={{ color: tool.tint }} />
                    </div>
                    <span className="text-[12px] sm:text-[13px] font-bold text-[#0A0A0B] leading-tight text-center">
                      {resolveLabel(tool.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

      {/* ══════ MOBILE TOOLS BAR — Adobe-style accordion (collapsed by default,
          sticky under the header). Gives one-tap access to every tool + internal
          SEO links to each landing. Desktop keeps the full tools grid below. ══════ */}
      {!isFastDoc && (
        <div className="md:hidden sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-[#F1F1F4]">
          <button
            type="button"
            onClick={() => setToolsBarOpen((o) => !o)}
            aria-expanded={toolsBarOpen}
            className="w-full flex items-center justify-between px-4 py-3 text-[15px] font-extrabold text-[#0A0A0B]"
          >
            <span className="inline-flex items-center gap-2">
              <LayoutGrid className="w-[18px] h-[18px] text-[#E63946]" />
              {t.nav_tools}
            </span>
            <ChevronDown className={`w-5 h-5 text-[#5A5A62] transition-transform ${toolsBarOpen ? "rotate-180" : ""}`} />
          </button>
          {toolsBarOpen && (
            <div className="px-3 pb-3 max-h-[68vh] overflow-y-auto border-t border-[#F1F1F4]">
              {TOOL_CATEGORIES.map((cat) => (
                <div key={cat.titleKey} className="py-1.5">
                  <div className="px-1 mb-1 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[#8A8A92]">
                    {resolveLabel(cat.titleKey)}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {cat.tools.map((tool) => (
                      <button
                        key={tool.label_key}
                        type="button"
                        onClick={() => {
                          setToolsBarOpen(false);
                          if (tool.landingSlug) {
                            navigate(`/${lang}/${tool.landingSlug}`);
                          } else {
                            triggerUpload(tool.tool);
                          }
                        }}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-left active:bg-[#F1F1F4] hover:bg-[#F6F6F7] transition-colors"
                      >
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: tool.iconBg }}
                        >
                          <tool.icon className="w-4 h-4" style={{ color: tool.tint }} />
                        </span>
                        <span className="text-[13px] font-bold text-[#0A0A0B] leading-tight">
                          {resolveLabel(tool.label_key)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* ══════ HERO — bundle variant A (centered upload) ══════ */}
      <section className="relative pt-6 md:pt-[72px] pb-20 overflow-hidden">
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
          {/* Mobile pitch line (desktop keeps the ✓ benefit lines below). */}
          <p className="md:hidden text-[15px] leading-relaxed text-[#5A5A62] max-w-[340px] mx-auto mb-4">{t.hero_pitch}</p>
          {/* Ad-compliance reassurance. This is the SINGLE explicit "web app —
              no download/installation" signal on the page, kept above the fold
              for the Google Ads human reviewer. Every other landing string was
              rewritten to positive, keyword-free copy so the classifier bot
              stops scoring the page as downloadable desktop software. */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-4 text-[13px] md:text-sm font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#0A0A0B]">
              <span className="text-[#16a34a]">✓</span> {t.hero_no_download}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#0A0A0B]">
              <span className="text-[#16a34a]">✓</span> {t.hero_browser}
            </span>
          </div>
          {(overrides?.heroSubtitle || isFastDoc) && (
            <p className="text-base md:text-[17px] text-[#5A5A62] mb-8 max-w-xl mx-auto leading-relaxed">
              {overrides?.heroSubtitle ?? t.fastdoc_hero_subtitle}
            </p>
          )}

          <div className="relative max-w-[720px] mx-auto">
            <UploadBox withTabs withHandNote />
          </div>
        </div>
      </section>

      {/* ══════ TRUST LINE — replaces fake logos ══════ */}
      {!isFastDoc && (
        <section className="pb-12 -mt-6">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-center">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0,1,2,3,4].map((i) => {
                    // brand-red stars with precise partial fill for 4.8 (no Trustpilot green)
                    const fill = Math.max(0, Math.min(1, 4.8 - i));
                    return (
                      <span key={i} className="relative inline-block w-4 h-4">
                        <Star className="w-4 h-4 fill-current text-[#E4E4E7]" />
                        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                          <Star className="w-4 h-4 fill-current text-[#E63946]" />
                        </span>
                      </span>
                    );
                  })}
                </div>
                <span className="font-bold text-sm text-[#0A0A0B]">4.8</span>
              </div>
              <span className="hidden sm:inline text-[#8A8A92] text-sm">·</span>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A8A92] font-bold max-w-[320px] sm:max-w-none leading-relaxed">
                {(() => {
                  // Show the actual logo (icon + wordmark) as a brand signature at
                  // the end of the trust line, uniformly in every language. ES/IT
                  // mention "EditorPDF" in the sentence → strip it so it isn't
                  // duplicated; the other languages just get the logo appended.
                  const sub = t.testimonials_subtitle;
                  const idx = sub.toLowerCase().indexOf("editorpdf");
                  const text = (idx === -1 ? sub : sub.slice(0, idx) + sub.slice(idx + 9)).replace(/\s+$/, "");
                  return (
                    <>
                      {text}{" "}
                      <span className="inline-flex items-center gap-1 align-middle normal-case tracking-normal">
                        <svg width="15" height="15" viewBox="0 0 512 512" fill="none" aria-hidden="true" className="flex-shrink-0">
                          <rect x="48" y="48" width="416" height="416" rx="112" fill="#0A0A0B" />
                          <path d="M176 180v152M176 180h82a50 50 0 010 100h-82" stroke="white" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="342" cy="348" r="32" fill="#E63946" />
                        </svg>
                        <span className="font-extrabold text-[13px] tracking-[-0.03em] text-[#0A0A0B] leading-none">editorpdf<span className="text-[#E63946]">.net</span></span>
                      </span>
                    </>
                  );
                })()}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ══════ STATS ══════ */}
      {!isFastDoc && (
        <section className="pb-14">
          <div className="container">
            <div className="max-w-[760px] mx-auto grid grid-cols-3 gap-0">
              {[
                { big: docsCount.toLocaleString(), label: t.hero_social_pdfs, emoji: "📄" },
                { big: "12M+", label: t.hero_social_users, emoji: "👥" },
                { big: "4.8 ★", label: t.hero_social_rating, emoji: "🏆" },
              ].map((s, i) => (
                <div key={i} className={`text-center px-1.5 py-2 sm:px-4 ${i > 0 ? "border-l border-[#E8E8EC]" : ""}`}>
                  <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{s.emoji}</div>
                  <div className="text-[19px] sm:text-[28px] font-extrabold tracking-[-0.02em] text-[#0A0A0B] leading-none">{s.big}</div>
                  <div className="text-[11px] sm:text-xs text-[#5A5A62] mt-1.5 sm:mt-2 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════ HOW IT WORKS (kept for #how-it-works anchor) ══════ */}
      {!isFastDoc && (
        <section id="how-it-works" className="py-14 md:py-20">
          <div className="container">
            <div className="text-center mb-10 md:mb-14">
              <h2
                className="font-extrabold tracking-[-0.025em] leading-[1.1] text-[#0A0A0B] mb-3"
                style={{ fontSize: "clamp(32px, 4vw, 42px)" }}
              >
                {t.how_title}
              </h2>
              <p className="text-base text-[#5A5A62]">{t.how_subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 max-w-5xl mx-auto">
              {[1, 2, 3].map((n) => {
                const title = n === 1 ? t.how_step1_title : n === 2 ? t.how_step2_title : t.how_step3_title;
                const desc = n === 1 ? t.how_step1_desc : n === 2 ? t.how_step2_desc : t.how_step3_desc;
                return (
                  <div key={n} className="flex flex-col">
                    {/* ── Faithful UI mockup in a browser frame ── */}
                    <div className="relative">
                      <span className="absolute -top-3 left-3 z-10 w-8 h-8 rounded-full bg-[#0A0A0B] text-white text-sm font-bold flex items-center justify-center ring-4 ring-white shadow-[0_4px_12px_-2px_rgba(10,10,11,0.3)]">
                        {n}
                      </span>
                      <div className="rounded-2xl border border-[#E8E8EC] bg-white overflow-hidden shadow-[0_20px_44px_-22px_rgba(10,10,11,0.28)]">
                        {/* faux browser bar */}
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#FAFAFB] border-b border-[#F1F1F4]">
                          <span className="w-2 h-2 rounded-full bg-[#E4E4E7]" />
                          <span className="w-2 h-2 rounded-full bg-[#E4E4E7]" />
                          <span className="w-2 h-2 rounded-full bg-[#E4E4E7]" />
                          <span className="ml-2 flex-1 text-center text-[9px] font-bold tracking-tight text-[#8A8A92] truncate">editorpdf.net</span>
                        </div>
                        <div className="h-[176px] p-3 flex items-center justify-center bg-white">
                          {/* STEP 1 — upload box */}
                          {n === 1 && (
                            <div className="w-full rounded-xl border-[1.5px] border-dashed border-[#F2C1C6] py-6 px-3 flex flex-col items-center gap-2" style={{ background: "linear-gradient(180deg,#FEF6F7,#FFFBFB)" }}>
                              <div className="w-10 h-10 rounded-xl bg-[#FDECEE] flex items-center justify-center"><Upload className="w-5 h-5 text-[#E63946]" /></div>
                              <div className="text-[11px] font-extrabold text-[#0A0A0B] text-center leading-tight px-1">{t.hero_upload_mobile_lead}</div>
                              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E63946] text-white text-[10px] font-bold shadow-[0_6px_14px_-6px_rgba(230,57,70,0.6)] whitespace-nowrap"><Upload className="w-3 h-3" />{t.hero_upload_btn}</div>
                              <div className="text-[9px] text-[#8A8A92] font-medium">100 MB</div>
                            </div>
                          )}
                          {/* STEP 2 — editor: toolbar + page with editable text & signature */}
                          {n === 2 && (
                            <div className="w-full h-full flex gap-2">
                              <div className="flex flex-col gap-1.5 pt-0.5">
                                {[{ I: Type, on: true }, { I: PenTool, on: false }, { I: Image, on: false }, { I: Droplet, on: false }].map(({ I, on }, i) => (
                                  <span key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${on ? "bg-[#FDECEE]" : "bg-[#F4F4F6]"}`}>
                                    <I className={`w-3.5 h-3.5 ${on ? "text-[#E63946]" : "text-[#8A8A92]"}`} />
                                  </span>
                                ))}
                              </div>
                              <div className="flex-1 rounded-md border border-[#E8E8EC] bg-white p-2.5 flex flex-col justify-center">
                                <div className="h-1.5 w-2/3 rounded bg-[#E4E4E7] mb-2" />
                                <div className="h-1.5 w-full rounded bg-[#EFEFF1] mb-1.5" />
                                <div className="inline-flex items-center self-start rounded border border-[#E63946] bg-[#FDECEE]/40 px-1.5 py-0.5 my-0.5">
                                  <span className="text-[9px] font-semibold text-[#0A0A0B] leading-none whitespace-nowrap">{t.how_mock_editable}</span>
                                  <span className="w-px h-3 bg-[#E63946] ml-0.5 animate-pulse" />
                                </div>
                                <div className="h-1.5 w-5/6 rounded bg-[#EFEFF1] mt-2 mb-1.5" />
                                <svg viewBox="0 0 90 20" className="w-[70px] h-[16px] mt-0.5" fill="none">
                                  <path d="M2 14 C 10 4, 16 4, 22 12 S 34 18, 40 8 S 54 2, 62 12 S 78 16, 86 6" stroke="#E63946" strokeWidth="2.2" strokeLinecap="round" />
                                </svg>
                              </div>
                            </div>
                          )}
                          {/* STEP 3 — file ready + download */}
                          {n === 3 && (
                            <div className="flex flex-col items-center gap-2.5">
                              <div className="relative">
                                <div className="w-12 h-14 rounded-lg bg-[#FDECEE] border border-[#F2C1C6] flex items-center justify-center"><FileText className="w-6 h-6 text-[#E63946]" /></div>
                                <span className="absolute -right-1.5 -bottom-1.5 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center ring-2 ring-white"><Check className="w-3 h-3 text-white" /></span>
                              </div>
                              <div className="text-[10px] font-extrabold text-[#0A0A0B]">{t.how_mock_file}</div>
                              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A0A0B] text-white text-[10px] font-bold whitespace-nowrap"><Download className="w-3 h-3" />{t.landing_common_download}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-[#0A0A0B] mt-5 mb-1.5 text-center">{title}</h3>
                    <p className="text-sm text-[#5A5A62] leading-relaxed text-center">{desc}</p>
                  </div>
                );
              })}
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

          <div className="flex flex-col gap-12">
            {TOOL_CATEGORIES.map((cat) => (
              <div key={cat.titleKey}>
                <div className="flex items-center gap-4 mb-5 flex-wrap">
                  <h3 className="text-[20px] md:text-[22px] font-extrabold tracking-[-0.015em] text-[#0A0A0B]">
                    {resolveLabel(cat.titleKey)}
                  </h3>
                  <span className="text-[10px] font-extrabold tracking-[0.12em] text-[#8A8A92] uppercase px-2 py-0.5 rounded-full bg-white border border-[#E8E8EC]">
                    {cat.tools.length}
                  </span>
                  <div className="flex-1 h-px bg-[#E8E8EC]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cat.tools.map((tool) => (
                    <button
                      key={tool.label_key}
                      onClick={() => {
                        if (tool.landingSlug) {
                          navigate(`/${lang}/${tool.landingSlug}`);
                        } else {
                          triggerUpload(tool.tool);
                        }
                      }}
                      className="group relative bg-white border border-[#E8E8EC] rounded-2xl p-4 flex items-center gap-3.5 text-left text-[#0A0A0B] hover:border-[#0A0A0B]/15 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-18px_rgba(10,10,11,0.25)] transition-all overflow-hidden"
                    >
                      {/* subtle tinted glow on hover — gives the card a personality colour */}
                      <span
                        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `radial-gradient(120% 80% at 0% 0%, ${tool.iconBg} 0%, transparent 55%)` }}
                        aria-hidden="true"
                      />
                      <div
                        className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-[1.06]"
                        style={{ background: tool.iconBg }}
                      >
                        <tool.icon className="w-5 h-5" style={{ color: tool.tint }} />
                      </div>
                      <span className="relative text-[14px] font-bold leading-tight flex-1 min-w-0">
                        {resolveLabel(tool.label_key)}
                      </span>
                      <ArrowRight
                        className="relative w-4 h-4 flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                        style={{ color: tool.tint }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
