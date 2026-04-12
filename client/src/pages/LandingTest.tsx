import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, FileText, PenTool, Lock, Image,
  Scissors, Minimize2, Merge, RotateCcw,
  Star, ChevronDown, ChevronUp, Type, Award,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors, brandName } from "@/lib/brand";

const ACCEPTED = "application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv";

// ── Tool pills (like ChatPDF's Chat/Resumen/Detector IA) ──
const TOOLS = [
  { key: "edit",     icon: Type,      label: "Edit PDF" },
  { key: "sign",     icon: PenTool,   label: "Sign" },
  { key: "convert",  icon: RotateCcw, label: "Convert" },
  { key: "compress", icon: Minimize2, label: "Compress" },
  { key: "merge",    icon: Merge,     label: "Merge" },
  { key: "split",    icon: Scissors,  label: "Split" },
  { key: "images",   icon: Image,     label: "JPG to PDF" },
  { key: "protect",  icon: Lock,      label: "Protect" },
];

const TOOL_DESC: Record<string, string> = {
  edit: "Edit any PDF, Word, image or document",
  sign: "Sign any PDF, contract or document",
  convert: "Convert any PDF, Word, Excel or image",
  compress: "Compress any PDF, document or file",
  merge: "Merge any PDF, document or file",
  split: "Split any PDF into separate pages",
  images: "Convert any JPG, PNG or image to PDF",
  protect: "Protect any PDF with password encryption",
};

const FAQS = [
  { q: "Is my data secure?", a: "Yes. All files are encrypted and automatically deleted after processing. We never store your documents." },
  { q: "What formats are supported?", a: "PDF, Word, Excel, PowerPoint, JPG, PNG, WEBP, BMP, TIFF, HTML, TXT, and CSV." },
  { q: "Do I need to install anything?", a: "No. Works entirely in your browser — no downloads, no plugins." },
  { q: "Does it work on mobile?", a: "Yes. Fully responsive on phones, tablets, and desktops." },
];

export default function LandingTest() {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { setPendingFile } = usePdfFile();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = `${brandName} — Edit, Convert, Sign & Protect PDFs Online`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "The all-in-one PDF editor. Edit, convert, sign, compress and protect your documents directly in the browser.");
    window.scrollTo(0, 0);
  }, []);

  const openEditor = useCallback((file: File) => {
    setPendingFile(file);
    navigate(`/${lang}/editor`);
  }, [setPendingFile, navigate, lang]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) openEditor(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) openEditor(f);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFile} />

      {/* ═══════════════════════════════════════════════════
          HERO — Exact ChatPDF structure
      ═══════════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 pt-10 md:pt-16 text-center">

          {/* Title — like "Herramientas de IA de primera clase" */}
          <h1 className="text-2xl md:text-4xl lg:text-[2.8rem] font-extrabold leading-[1.15] tracking-tight mb-2">
            <span style={{ color: colors.primary }}>Professional PDF tools</span>
            <br />
            <span style={{ color: "#0f172a" }}>for businesses and individuals</span>
          </h1>

          {/* ═══ THE MAIN CARD — like ChatPDF's central card ═══ */}
          <div className="max-w-2xl mx-auto mt-8 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "white",
              boxShadow: "0 2px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.03)",
            }}>

            {/* Tool pills — like Chat | Resumen | Detector IA | ... */}
            <div className="flex flex-wrap justify-center gap-1 px-3 pt-4 pb-3">
              {TOOLS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
                    style={{
                      backgroundColor: isActive ? colors.primary : "transparent",
                      color: isActive ? "white" : "#64748b",
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Subtitle inside card — like "Chatea con cualquier archivo, video o sitio web" */}
            <div className="px-6 pt-2 pb-4">
              <p className="text-base md:text-lg font-bold" style={{ color: "#0f172a" }}>
                {TOOL_DESC[activeTab]}{" "}
                <span className="inline-block align-middle">📄</span>{" "}
                <span className="font-bold" style={{ color: "#0f172a" }}>directly in your browser</span>
              </p>
            </div>

            {/* Upload zone — like ChatPDF's dashed box with "Suelta un archivo o sube" */}
            <div className="px-5 pb-5">
              <div
                className="rounded-xl border-2 border-dashed py-5 px-4 cursor-pointer transition-all duration-200"
                style={{
                  borderColor: isDragging ? colors.primary : "#e5e7eb",
                  backgroundColor: isDragging ? "rgba(27, 94, 32, 0.02)" : "white",
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm" style={{ color: "#9ca3af" }}>Drop a file or</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium border"
                    style={{ borderColor: "#e5e7eb", color: "#374151", backgroundColor: "#fafafa" }}>
                    browse <Upload className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TRUST LOGOS — like Harvard | Cambridge | Oxford | Stanford
      ═══════════════════════════════════════════════════ */}
      <section className="pt-10 pb-4 md:pt-14 md:pb-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {[
              { name: "Google", sub: "" },
              { name: "Microsoft", sub: "" },
              { name: "Amazon", sub: "" },
              { name: "Deloitte", sub: "" },
            ].map((logo) => (
              <div key={logo.name}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border"
                style={{ borderColor: "#f1f5f9", backgroundColor: "white" }}>
                {/* Simple text logo — professional look */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#f1f5f9" }}>
                  <span className="text-xs font-bold" style={{ color: "#94a3b8" }}>
                    {logo.name[0]}
                  </span>
                </div>
                <span className="text-sm font-bold tracking-tight" style={{ color: "#475569" }}>
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STATS — like ChatPDF's "Preguntas respondidas 1,000,000+" row
      ═══════════════════════════════════════════════════ */}
      <section className="py-6 md:py-8">
        <div className="max-w-3xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 md:gap-12">

          {/* Stat 1: Documents processed — like "Preguntas respondidas al día" */}
          <div className="flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5"
              style={{ backgroundColor: "rgba(27, 94, 32, 0.1)" }}>
              <FileText className="w-4 h-4" style={{ color: colors.primary }} />
            </div>
            <p className="text-xs" style={{ color: "#64748b" }}>Documents processed daily</p>
            <p className="text-lg font-extrabold" style={{ color: "#0f172a" }}>1,000,000+</p>
          </div>

          {/* Stat 2: Users — like "Amado por 10M+ usuarios" with avatar circles */}
          <div className="flex flex-col items-center text-center">
            {/* Avatar group */}
            <div className="flex -space-x-2 mb-1.5">
              {["#1B5E20", "#2E7D32", "#388E3C", "#43A047", "#4CAF50"].map((bg, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: bg }}>
                  {["MG", "CR", "AL", "JP", "SM"][i]}
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Loved by <span className="font-bold" style={{ color: "#0f172a" }}>2.3M+</span> users
            </p>
          </div>

          {/* Stat 3: Rating — like "Gen AI 2024 Top 50" */}
          <div className="flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5"
              style={{ backgroundColor: "#fef3c7" }}>
              <Award className="w-4 h-4" style={{ color: "#d97706" }} />
            </div>
            <p className="text-xs" style={{ color: "#64748b" }}>PDF Editor 2024</p>
            <p className="text-lg font-extrabold" style={{ color: "#0f172a" }}>Top Rated</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          BIG QUOTE — like ChatPDF's "Es como ChatGPT pero para..."
      ═══════════════════════════════════════════════════ */}
      <section className="py-10 md:py-14" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xl md:text-3xl font-bold leading-snug mb-5" style={{ color: "#0f172a" }}>
            "It's like having a personal{" "}
            <span className="relative inline-block">
              <span style={{ color: colors.primary }}>document studio</span>
              <span className="absolute bottom-0 left-0 w-full rounded-full" style={{ backgroundColor: "#4ade80", height: "4px", opacity: 0.5 }} />
            </span>
            ,{" "}right in your browser."
          </p>
          {/* Author with avatar */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: colors.primary }}>
              JL
            </div>
            <div className="text-left">
              <p className="text-sm font-bold" style={{ color: "#0f172a" }}>Javier Lopez, PhD</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>@JavierLopezPhD</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: "#0f172a" }}>
            Everything you need for your{" "}
            <span style={{ color: colors.primary }}>PDFs</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Type, title: "Edit text & images", desc: "Modify content directly" },
              { icon: PenTool, title: "Sign documents", desc: "Digital signatures" },
              { icon: RotateCcw, title: "Convert formats", desc: "PDF, Word, Excel, JPG" },
              { icon: Minimize2, title: "Compress files", desc: "Up to 70% smaller" },
              { icon: Merge, title: "Merge PDFs", desc: "Combine into one" },
              { icon: Scissors, title: "Split pages", desc: "Extract any pages" },
              { icon: Lock, title: "Protect files", desc: "Password encryption" },
              { icon: Image, title: "Image to PDF", desc: "JPG, PNG to PDF" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i}
                  className="rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ borderColor: "#f1f5f9" }}
                  onClick={() => fileRef.current?.click()}>
                  <Icon className="w-5 h-5 mb-2" style={{ color: colors.primary }} />
                  <p className="text-xs font-bold mb-0.5" style={{ color: "#0f172a" }}>{f.title}</p>
                  <p className="text-[11px]" style={{ color: "#94a3b8" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Maria G.", role: "Marketing", text: "Finally a PDF editor that works in the browser. I use it daily.", initials: "MG" },
              { name: "Carlos R.", role: "Designer", text: "Word to PDF conversion keeps all formatting perfectly.", initials: "CR" },
              { name: "Ana M.", role: "Student", text: "I can sign, merge and compress without installing anything.", initials: "AM" },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border p-4 bg-white" style={{ borderColor: "#f1f5f9" }}>
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 fill-current" style={{ color: "#facc15" }} />)}
                </div>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: "#475569" }}>"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: colors.primary }}>{t.initials}</div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: "#0f172a" }}>{t.name}</p>
                    <p className="text-[10px]" style={{ color: "#94a3b8" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6" style={{ color: "#0f172a" }}>FAQ</h2>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "#f1f5f9" }}>
                <button className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />
                    : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          BOTTOM CTA
      ═══════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "#0f172a" }}>
            Ready to get started?
          </h2>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>Upload your first document and see the difference.</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            style={{ backgroundColor: colors.primary, boxShadow: "0 6px 20px rgba(27, 94, 32, 0.25)" }}>
            <Upload className="w-4 h-4" />
            Upload your file
          </button>
          <p className="text-xs mt-3" style={{ color: "#cbd5e1" }}>No registration required</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
