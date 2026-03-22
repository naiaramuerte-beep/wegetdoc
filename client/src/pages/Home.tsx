/* =============================================================
   editPDF Home Page — Conversion-Optimised Design
   Dark hero + social proof + urgency + benefits
   ============================================================= */

import { useState, useRef, useCallback, useEffect } from "react";
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
  Shield,
  Zap,
  Monitor,
  Star,
  Users,
  CheckCircle2,
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

// ─── Accepted file types (module-level constants to avoid recreation on each render) ──
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
  'application/octet-stream', // generic binary — extension check handles actual validation
]);

const ACCEPTED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.html', '.txt',
]);

// ─── Component ─────────────────────────────────────────────────
export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("editAndSign");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fake active users counter — fluctuates between 120K and 145K
  const [activeUsers, setActiveUsers] = useState(127843);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const delta = Math.floor(Math.random() * 200) - 80; // -80 to +120
        const next = prev + delta;
        // Clamp between 120000 and 145000
        return Math.min(145000, Math.max(120000, next));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatUsers = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
  };
  const { setPendingFile, setPendingTool } = usePdfFile();
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();

  // ─── Tool definitions ─────────────────────────────────────
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

  // ─── FAQ data ─────────────────────────────────────────────
  const faqs = [
    { question: t.faq_q1, answer: t.faq_a1 },
    { question: t.faq_q2, answer: t.faq_a2 },
    { question: t.faq_q3, answer: t.faq_a3 },
    { question: t.faq_q4, answer: t.faq_a4 },
    { question: t.faq_q5, answer: t.faq_a5 },
    { question: t.faq_q6, answer: t.faq_a6 },
    { question: t.faq_q7, answer: t.faq_a7 },
  ];

  // ─── Benefits data ────────────────────────────────────────
  const benefits = [
    { icon: Zap, title: t.benefit1_title, desc: t.benefit1_desc },
    { icon: Shield, title: t.benefit2_title, desc: t.benefit2_desc },
    { icon: Edit3, title: t.benefit3_title, desc: t.benefit3_desc },
    { icon: Monitor, title: t.benefit4_title, desc: t.benefit4_desc },
  ];

  // ─── Features data ────────────────────────────────────────
  const features = [
    { title: t.feature1_title, subtitle: t.feature1_subtitle, description: t.feature1_desc, image: FEATURE_IMAGES[0] },
    { title: t.feature2_title, subtitle: t.feature2_subtitle, description: t.feature2_desc, image: FEATURE_IMAGES[1] },
    { title: t.feature3_title, subtitle: t.feature3_subtitle, description: t.feature3_desc, image: FEATURE_IMAGES[2] },
    { title: t.feature4_title, subtitle: t.feature4_subtitle, description: t.feature4_desc, image: FEATURE_IMAGES[3] },
  ];

  const activeCategory = allToolsCategories.find((c) => c.id === activeTab)!;

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
  }, [setPendingFile, setPendingTool, navigate, lang, fileInputRef]);

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

  // Navy brand colors
  const navy = "oklch(0.18 0.04 250)";
  const navyMid = "oklch(0.22 0.05 250)";
  const navyLight = "oklch(0.28 0.05 250)";
  const blue = "oklch(0.55 0.22 260)";
  const blueLight = "oklch(0.62 0.18 280)";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.98 0.005 250)" }}>
      <Navbar />

      {/* ── HERO — dark background, conversion-focused ─────── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: navy }}
      >
        {/* Background texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, oklch(0.55 0.22 260 / 0.12) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, oklch(0.55 0.22 260 / 0.08) 0%, transparent 40%),
              radial-gradient(circle at 60% 80%, oklch(0.35 0.10 260 / 0.10) 0%, transparent 40%)`,
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `linear-gradient(oklch(0.8 0.05 260) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.8 0.05 260) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container relative z-10 py-14 md:py-20">
          {/* Trust badges row */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { icon: null, text: t.hero_trust_rating, iconColor: "#00B67A", textColor: "#00B67A" },
              { icon: Users, text: t.hero_trust_users, iconColor: "oklch(0.75 0.10 260)", textColor: "oklch(0.85 0.01 250)" },
              { icon: CheckCircle2, text: t.hero_badge_instant, iconColor: "oklch(0.75 0.15 145)", textColor: "oklch(0.85 0.01 250)" },
            ].map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: "oklch(1 0 0 / 0.07)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                  color: badge.textColor,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {badge.icon && <badge.icon className="w-4 h-4" style={{ color: badge.iconColor }} />}
                {badge.text}
              </div>
            ))}
          </div>

          {/* Main headline */}
          <div className="text-center max-w-4xl mx-auto mb-10">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5"
              style={{ fontFamily: "'Sora', sans-serif", color: "white" }}
            >
              {t.hero_title_1}{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${blue}, ${blueLight})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t.hero_title_2}
              </span>
            </h1>
            <p
              className="text-lg md:text-xl max-w-2xl mx-auto"
              style={{ color: "oklch(0.80 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.hero_subtitle}
            </p>
          </div>

          {/* ── DROP ZONE ── */}
          <div id="editor-section" className="max-w-xl mx-auto">
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
              className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-5 py-10 px-8 transition-all duration-300"
              style={{
                border: `2px dashed ${isDraggingOver ? blue : "oklch(0.55 0.22 260 / 0.50)"}`,
                backgroundColor: isDraggingOver
                  ? "oklch(0.55 0.22 260 / 0.12)"
                  : "oklch(1 0 0 / 0.05)",
                boxShadow: isDraggingOver
                  ? `0 0 40px oklch(0.55 0.22 260 / 0.30)`
                  : `0 0 0px transparent`,
              }}
            >
              {/* Animated icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: "oklch(0.55 0.22 260 / 0.15)",
                  border: "1px solid oklch(0.55 0.22 260 / 0.30)",
                  animation: "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              >
                <FileText className="w-10 h-10" style={{ color: blue }} />
              </div>

              <div className="text-center">
                <p className="font-bold text-xl mb-1" style={{ color: "white", fontFamily: "'Sora', sans-serif" }}>
                  {t.hero_drag_here}
                </p>
                <p className="text-sm" style={{ color: "oklch(0.65 0.03 250)" }}>{t.hero_or}</p>
              </div>

              {/* Main CTA button */}
              <button
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all duration-200 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${blue}, ${blueLight})`,
                  boxShadow: `0 8px 24px oklch(0.55 0.22 260 / 0.40)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 12px 32px oklch(0.55 0.22 260 / 0.55)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = `0 8px 24px oklch(0.55 0.22 260 / 0.40)`;
                }}
              >
                <Upload className="w-5 h-5" />
                {t.hero_upload_btn}
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Feature badges */}
              <div className="flex flex-wrap justify-center gap-2">
                {[t.hero_badge_free, t.hero_badge_no_card].map((badge, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: "oklch(1 0 0 / 0.08)",
                      color: "oklch(0.75 0.08 260)",
                      border: "1px solid oklch(1 0 0 / 0.10)",
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" style={{ color: "oklch(0.75 0.15 145)" }} />
                    {badge}
                  </span>
                ))}
                {/* Animated active users counter */}
                <span
                  className="flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "oklch(1 0 0 / 0.08)",
                    color: "oklch(0.75 0.08 260)",
                    border: "1px solid oklch(1 0 0 / 0.10)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                  {formatUsers(activeUsers)} {t.hero_users_now ?? "active users now"}
                </span>
              </div>

              <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{t.hero_max_size_detail}</p>
            </div>


          </div>
        </div>

        {/* Wave divider */}
        <div className="relative h-12 overflow-hidden" style={{ marginBottom: "-1px" }}>
          <svg
            viewBox="0 0 1440 48"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z"
              fill="oklch(0.98 0.005 250)"
            />
          </svg>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ───────────────────────────────── */}
      <section
        className="py-6 border-b"
        style={{ backgroundColor: "oklch(0.98 0.005 250)", borderColor: "oklch(0.90 0.01 250)" }}
      >
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {[
              { value: "2.3M+", label: t.hero_social_pdfs, icon: FileText },
              { value: "★ 4.8", label: t.hero_social_rating, icon: Star },
              { value: "180K+", label: t.hero_social_users, icon: Users },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.10)" }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: blue }} />
                </div>
                <div>
                  <div
                    className="font-extrabold text-xl leading-none"
                    style={{ color: navy, fontFamily: "'Sora', sans-serif" }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.55 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS SECTION ──────────────────────────────────── */}
      <section id="tools" className="py-16" style={{ backgroundColor: "oklch(0.97 0.006 250)" }}>
        <div className="container">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: navy }}
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
                    backgroundColor: activeTab === cat.id ? navy : "transparent",
                    color: activeTab === cat.id ? "white" : "oklch(0.45 0.02 250)",
                    boxShadow: activeTab === cat.id ? `0 2px 8px oklch(0.18 0.04 250 / 0.3)` : "none",
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
                  <tool.icon className="w-5 h-5" style={{ color: blue }} />
                </div>
                <span className="text-xs font-medium leading-tight" style={{ color: "oklch(0.25 0.03 250)" }}>
                  {tool.label}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
              style={{ backgroundColor: navy, fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = blue)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = navy)}
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              {t.tools_cta}
            </button>
          </div>
        </div>
      </section>

      {/* ── BENEFITS — why choose us ───────────────────────── */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "oklch(1 0 0)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: navy }}
            >
              {t.benefits_title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-6 rounded-2xl transition-all duration-200"
                style={{
                  backgroundColor: "oklch(0.98 0.005 250)",
                  border: "1px solid oklch(0.91 0.01 250)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.55 0.22 260 / 0.35)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px oklch(0.55 0.22 260 / 0.08)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.91 0.01 250)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${blue}, ${blueLight})` }}
                >
                  <b.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3
                    className="font-bold text-base mb-2"
                    style={{ fontFamily: "'Sora', sans-serif", color: navy }}
                  >
                    {b.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "oklch(0.48 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-20" style={{ backgroundColor: "oklch(0.97 0.006 250)" }}>
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: navy }}
            >
              {t.how_title}
            </h2>
            <p className="text-base" style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
              {t.how_subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { step: "1", icon: Upload, title: t.how_step1_title, desc: t.how_step1_desc },
              { step: "2", icon: Edit3, title: t.how_step2_title, desc: t.how_step2_desc },
              { step: "3", icon: Download, title: t.how_step3_title, desc: t.how_step3_desc },
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
                    style={{ background: `linear-gradient(135deg, ${blue}, ${blueLight})`, fontFamily: "'Sora', sans-serif" }}
                  >
                    {item.step}
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.08)" }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: blue }} />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "'Sora', sans-serif", color: navy }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
              style={{ backgroundColor: navy, fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = blue)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = navy)}
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              {t.how_cta}
            </button>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US — feature showcase ──────────────── */}
      <section className="py-16 md:py-24" style={{ backgroundColor: "oklch(1 0 0)" }}>
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: navy }}
            >
              {t.features_why_title}
            </h2>
            <p className="text-base" style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
              {t.features_why_subtitle}
            </p>
          </div>

          <div className="space-y-0">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-8 items-center py-10 border-b`}
                style={{ borderColor: "oklch(0.88 0.01 250)" }}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2" style={{ color: blue, fontFamily: "'Sora', sans-serif" }}>
                    {feature.title}
                  </h3>
                  <p className="font-semibold text-lg mb-3" style={{ color: navy, fontFamily: "'Sora', sans-serif" }}>
                    {feature.subtitle}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
                    {feature.description}
                  </p>
                </div>
                <div
                  className="flex-shrink-0 w-full md:w-64 h-48 rounded-2xl overflow-hidden"
                  style={{ backgroundColor: "oklch(0.22 0.04 250)", boxShadow: "0 8px 32px oklch(0.18 0.04 250 / 0.12)" }}
                >
                  <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24" style={{ backgroundColor: "oklch(0.97 0.006 250)" }}>
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: navy }}
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
                  <span className="font-semibold text-sm pr-4" style={{ color: navy, fontFamily: "'Sora', sans-serif" }}>
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: blue }} />
                  ) : (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.50 0.02 250)" }} />
                  )}
                </button>
                {openFaq === i && (
                  <div
                    className="px-6 pb-4"
                    style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", lineHeight: "1.6" }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — dark, conversion-focused ───────────── */}
      <section className="relative py-16 md:py-20 overflow-hidden" style={{ backgroundColor: navy }}>
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, oklch(0.55 0.22 260 / 0.20) 0%, transparent 60%)`,
          }}
        />
        <div className="container relative z-10 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {t.cta_title}
          </h2>
          <p
            className="text-base mb-3 max-w-xl mx-auto"
            style={{ color: "oklch(0.70 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            {t.cta_subtitle}
          </p>

          <button
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-white text-base transition-all duration-200 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${blue}, ${blueLight})`,
              boxShadow: `0 8px 32px oklch(0.55 0.22 260 / 0.45)`,
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 14px 40px oklch(0.55 0.22 260 / 0.60)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 8px 32px oklch(0.55 0.22 260 / 0.45)`;
            }}
            onClick={() => scrollToEditor()}
          >
            <Upload className="w-5 h-5" />
            {t.cta_btn}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-xs mt-4" style={{ color: "oklch(0.50 0.02 250)" }}>
            {t.hero_max_size_detail}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
