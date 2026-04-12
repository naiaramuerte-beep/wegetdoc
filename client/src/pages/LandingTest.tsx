import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, FileText, PenTool, Shield, Zap, Lock, Image,
  Scissors, Minimize2, Merge, RotateCcw, ArrowRight,
  CheckCircle2, Star, Users, Globe, ChevronDown, ChevronUp,
  FileSpreadsheet, Presentation, Type, MessageSquare,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors, brandName } from "@/lib/brand";

const ACCEPTED = "application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv";

// ── Tool tabs (like ChatPDF's Chat/Summary/Detect AI pills) ──
const TOOL_TABS = [
  { key: "edit",     icon: Type,           label: "Edit PDF" },
  { key: "sign",     icon: PenTool,        label: "Sign" },
  { key: "convert",  icon: RotateCcw,      label: "Convert" },
  { key: "compress", icon: Minimize2,      label: "Compress" },
  { key: "merge",    icon: Merge,          label: "Merge" },
  { key: "split",    icon: Scissors,       label: "Split" },
  { key: "protect",  icon: Lock,           label: "Protect" },
  { key: "images",   icon: Image,          label: "Images" },
];

// ── Stats ──
const STATS = [
  { icon: FileText, value: "1,000,000+", label: "Documents processed daily" },
  { icon: Users, value: "2.3M+", label: "Loved by users worldwide" },
  { icon: Star, value: "4.8/5", label: "Average user rating" },
];

// ── Features for "What you can do" grid ──
const FEATURES = [
  { icon: Type, title: "Edit text & images", desc: "Modify any content directly inside your PDF" },
  { icon: PenTool, title: "Sign documents", desc: "Draw or upload your signature in seconds" },
  { icon: RotateCcw, title: "Convert formats", desc: "PDF to Word, Excel, JPG and back" },
  { icon: Minimize2, title: "Compress files", desc: "Reduce size up to 70% without quality loss" },
  { icon: Merge, title: "Merge PDFs", desc: "Combine multiple files into one document" },
  { icon: Scissors, title: "Split pages", desc: "Extract specific pages from any PDF" },
  { icon: Lock, title: "Password protect", desc: "Secure your files with encryption" },
  { icon: Image, title: "Image to PDF", desc: "Turn JPG, PNG images into PDFs instantly" },
];

// ── FAQ ──
const FAQS = [
  { q: "Is my data secure?", a: "Absolutely. All files are processed securely with enterprise-grade encryption. We never store your documents — they are automatically deleted after processing." },
  { q: "What file formats are supported?", a: "We support PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), images (JPG, PNG, WEBP, BMP, TIFF), HTML, TXT, and CSV." },
  { q: "Do I need to install anything?", a: "No. EditorPDF works entirely in your browser. No downloads, no plugins — just open and start working." },
  { q: "Does it work on mobile?", a: "Yes. Fully responsive design that works perfectly on phones, tablets, and desktops." },
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
          HERO — ChatPDF style: title + pills + upload card
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-4xl mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12 text-center">

          {/* Main title */}
          <h1 className="text-3xl md:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.12] tracking-tight mb-3"
            style={{ color: "#0f172a" }}>
            <span style={{ color: colors.primary }}>Professional PDF tools</span>
            <br />
            for everyone
          </h1>

          {/* Tool pills / tabs */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-8 mb-8">
            {TOOL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? colors.primary : "#f8fafc",
                    color: isActive ? "white" : "#64748b",
                    border: isActive ? "none" : "1px solid #e2e8f0",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Subtitle describing active tool */}
          <p className="text-base md:text-lg mb-6" style={{ color: "#64748b" }}>
            {activeTab === "edit" && "Edit text, images and pages of any PDF — directly in your browser"}
            {activeTab === "sign" && "Add your digital signature to any document in seconds"}
            {activeTab === "convert" && "Convert between PDF, Word, Excel, JPG, PNG and more"}
            {activeTab === "compress" && "Reduce PDF file size by up to 70% without losing quality"}
            {activeTab === "merge" && "Combine multiple PDF files into a single document"}
            {activeTab === "split" && "Extract pages or split your PDF into separate files"}
            {activeTab === "protect" && "Add password protection and encryption to secure your files"}
            {activeTab === "images" && "Convert JPG, PNG, WEBP images to professional PDF documents"}
          </p>

          {/* Upload card — the main CTA area */}
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-2xl border p-6 md:p-8 transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: isDragging ? "rgba(27, 94, 32, 0.03)" : "white",
                borderColor: isDragging ? colors.primary : "#e2e8f0",
                boxShadow: "0 8px 40px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                {/* Upload icon area */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
                    <Upload className="w-5 h-5" style={{ color: colors.primary }} />
                  </div>
                </div>

                <p className="text-sm" style={{ color: "#64748b" }}>
                  Drop a file or{" "}
                  <span className="font-semibold underline underline-offset-2" style={{ color: colors.primary }}>browse</span>
                </p>

                {/* Format chips */}
                <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                  {["PDF", "Word", "Excel", "PPT", "JPG", "PNG"].map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: "#f8fafc", border: "1px solid #f1f5f9", color: "#94a3b8" }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TRUST LOGOS — like ChatPDF's university logos
      ═══════════════════════════════════════════════════ */}
      <section className="py-8 md:py-10">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-center text-xs font-medium mb-5 tracking-wide uppercase" style={{ color: "#cbd5e1" }}>
            Trusted by professionals at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-40">
            {["Google", "Microsoft", "Amazon", "Deloitte", "Accenture"].map((name) => (
              <span key={name} className="text-lg md:text-xl font-bold tracking-tight" style={{ color: "#334155" }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STATS — like ChatPDF's "1,000,000+ questions/day"
      ═══════════════════════════════════════════════════ */}
      <section className="py-8 md:py-10">
        <div className="max-w-3xl mx-auto px-4 flex flex-wrap justify-center gap-10 md:gap-16">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
                  <Icon className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <div>
                  <p className="text-lg font-extrabold leading-tight" style={{ color: "#0f172a" }}>{s.value}</p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          BIG QUOTE — like ChatPDF's "It's like ChatGPT..."
      ═══════════════════════════════════════════════════ */}
      <section className="py-14 md:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-2xl md:text-4xl font-bold leading-snug" style={{ color: "#0f172a" }}>
            "It's like having a{" "}
            <span style={{ color: colors.primary }}>professional design studio</span>
            {" "}for all your documents."
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: colors.primary }}>
              JL
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Javier Lopez</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Operations Manager, Tech Startup</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════════════════ */}
      <section className="py-14 md:py-20" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              Everything you need,{" "}
              <span style={{ color: colors.primary }}>nothing you don't</span>
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: "#64748b" }}>
              One platform replaces dozens of tools. Edit, convert, sign, merge, compress — all from your browser.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-white"
                  style={{ borderColor: "#f1f5f9" }}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5"
                    style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: colors.primary }} />
                  </div>
                  <h3 className="text-xs font-bold mb-0.5" style={{ color: "#0f172a" }}>{feat.title}</h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#94a3b8" }}>{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          HOW IT WORKS — 3 steps
      ═══════════════════════════════════════════════════ */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10" style={{ color: "#0f172a" }}>
            How it works
          </h2>

          <div className="flex flex-col md:flex-row gap-6">
            {[
              { n: "1", icon: Upload, t: "Upload", d: "Drop any file — PDF, Word, Excel, images" },
              { n: "2", icon: Type, t: "Edit", d: "Use the tool you need directly in the browser" },
              { n: "3", icon: ArrowRight, t: "Download", d: "Get your finished document instantly" },
            ].map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="flex-1 text-center">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-sm font-bold"
                    style={{ backgroundColor: colors.primary }}>
                    {s.n}
                  </div>
                  <SIcon className="w-5 h-5 mx-auto mb-2" style={{ color: colors.primary }} />
                  <h3 className="text-sm font-bold mb-1" style={{ color: "#0f172a" }}>{s.t}</h3>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{s.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TESTIMONIALS — 3 cards
      ═══════════════════════════════════════════════════ */}
      <section className="py-14 md:py-20" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-10" style={{ color: "#0f172a" }}>
            What people say
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Maria G.", role: "Marketing Manager", text: "Finally a PDF editor that actually works in the browser. I use it daily for contracts and presentations.", initials: "MG" },
              { name: "Carlos R.", role: "Freelance Designer", text: "The conversion quality is excellent. Word to PDF keeps all my formatting perfectly.", initials: "CR" },
              { name: "Ana M.", role: "University Student", text: "So easy to use. I can sign, merge and compress my PDFs without installing anything.", initials: "AM" },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border p-5 bg-white" style={{ borderColor: "#f1f5f9" }}>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: "#facc15" }} />
                  ))}
                </div>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: "#475569" }}>"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: colors.primary }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#0f172a" }}>{t.name}</p>
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
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-8" style={{ color: "#0f172a" }}>
            FAQ
          </h2>

          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "#f1f5f9" }}>
                <button
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />
                    : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />
                  }
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
      <section className="py-14 md:py-20" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "#0f172a" }}>
            Ready to get started?
          </h2>
          <p className="text-sm mb-7" style={{ color: "#64748b" }}>
            Upload your first document and see the difference.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            style={{ backgroundColor: colors.primary, boxShadow: "0 6px 20px rgba(27, 94, 32, 0.25)" }}
          >
            <Upload className="w-4 h-4" />
            Upload your file
          </button>
          <p className="text-xs mt-3" style={{ color: "#cbd5e1" }}>
            No registration required
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
