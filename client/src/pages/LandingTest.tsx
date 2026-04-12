import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, FileText, PenTool, Shield, Zap, Lock, Image,
  Scissors, Minimize2, Merge, RotateCcw, ArrowRight,
  CheckCircle2, Star, Users, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors, brandName } from "@/lib/brand";

const ACCEPTED = "application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv";

const FEATURES = [
  { icon: FileText, title: "Edit PDF", desc: "Modify text, images and pages of any PDF directly in your browser" },
  { icon: PenTool, title: "Sign PDF", desc: "Add your digital signature to documents in seconds" },
  { icon: Merge, title: "Merge PDF", desc: "Combine multiple PDF files into a single document" },
  { icon: Scissors, title: "Split PDF", desc: "Extract pages or split your PDF into separate files" },
  { icon: Minimize2, title: "Compress PDF", desc: "Reduce PDF file size by up to 70% without losing quality" },
  { icon: RotateCcw, title: "Convert PDF", desc: "Convert between PDF, Word, Excel, JPG and more formats" },
  { icon: Image, title: "JPG to PDF", desc: "Turn images into professional PDF documents instantly" },
  { icon: Lock, title: "Protect PDF", desc: "Add password protection and encryption to your files" },
];

const STATS = [
  { value: "2.3M+", label: "Users worldwide" },
  { value: "15M+", label: "Documents processed" },
  { value: "4.8/5", label: "Average rating" },
];

const FAQS = [
  { q: "Is my data secure?", a: "Yes. All files are processed securely and automatically deleted after processing. We use enterprise-grade encryption and never store your documents." },
  { q: "What file formats are supported?", a: "We support PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), images (JPG, PNG, WEBP, BMP, TIFF), HTML, TXT, and CSV files." },
  { q: "Do I need to install any software?", a: "No. EditorPDF works entirely in your browser. No downloads, no plugins, no installation required." },
  { q: "Can I use it on mobile?", a: "Yes. EditorPDF is fully responsive and works on any device with a modern browser — phones, tablets, and desktops." },
];

export default function LandingTest() {
  const [isDragging, setIsDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { setPendingFile } = usePdfFile();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "EditorPDF — Edit, Convert, Sign & Protect PDFs Online";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "The all-in-one PDF editor. Edit, convert, sign, compress and protect your documents directly in the browser. Fast, secure, private.");
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#fafbfc" }}>
      <Navbar />

      <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFile} />

      {/* ═══════════════════════════════════════════════════
          HERO — ChatPDF-inspired centered layout
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(27, 94, 32, 0.06) 0%, transparent 70%)",
        }} />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
            style={{ backgroundColor: "white", borderColor: "#e2e8f0" }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#4ade80" }} />
            <span className="text-xs font-medium" style={{ color: "#64748b" }}>
              All-in-one PDF toolkit — no installation needed
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5"
            style={{ color: "#0f172a" }}>
            Edit, convert & sign{" "}
            <span className="relative inline-block">
              <span style={{ color: colors.primary }}>any PDF</span>
              <svg className="absolute -bottom-1 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none" preserveAspectRatio="none">
                <path d="M0 5 Q50 0, 100 5 T200 5" stroke="#4ade80" strokeWidth="3" fill="none" opacity="0.6" />
              </svg>
            </span>{" "}
            in seconds
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: "#64748b" }}>
            Drop your file below and start editing. Works with PDF, Word, Excel, PowerPoint, images and more.
          </p>

          {/* Upload Zone */}
          <div
            className="relative max-w-lg mx-auto rounded-2xl border-2 border-dashed p-8 md:p-10 cursor-pointer transition-all duration-200"
            style={{
              borderColor: isDragging ? colors.primary : "#d1d5db",
              backgroundColor: isDragging ? "rgba(27, 94, 32, 0.04)" : "white",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.04)",
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
                <Upload className="w-7 h-7" style={{ color: colors.primary }} />
              </div>
              <div>
                <p className="text-base font-semibold mb-1" style={{ color: "#0f172a" }}>
                  Drop your file here or <span style={{ color: colors.primary }}>browse</span>
                </p>
                <p className="text-sm" style={{ color: "#94a3b8" }}>
                  PDF, Word, Excel, PPT, JPG, PNG, CSV — up to 100 MB
                </p>
              </div>
            </div>
          </div>

          {/* Format badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {["PDF", "Word", "Excel", "PPT", "JPG", "PNG", "CSV"].map(f => (
              <span key={f} className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: "white", border: "1px solid #e2e8f0", color: "#64748b" }}>
                {f}
              </span>
            ))}
          </div>

          {/* Trust line */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-8 text-sm" style={{ color: "#64748b" }}>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" style={{ color: colors.primary }} />
              Secure & encrypted
            </span>
            <span className="w-px h-4" style={{ backgroundColor: "#e2e8f0" }} />
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" style={{ color: colors.primary }} />
              Instant processing
            </span>
            <span className="w-px h-4" style={{ backgroundColor: "#e2e8f0" }} />
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" style={{ color: colors.primary }} />
              Works in any browser
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════════════ */}
      <section className="border-y" style={{ borderColor: "#f1f5f9", backgroundColor: "white" }}>
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-wrap justify-center gap-12 md:gap-20">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold" style={{ color: colors.primary }}>{s.value}</p>
              <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              Everything you need for your{" "}
              <span style={{ color: colors.primary }}>PDFs</span>
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: "#64748b" }}>
              One platform, all the tools. No switching between apps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="group rounded-xl border p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  style={{ backgroundColor: "white", borderColor: "#f1f5f9" }}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors"
                    style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
                    <Icon className="w-5 h-5" style={{ color: colors.primary }} />
                  </div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: "#0f172a" }}>{feat.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "white" }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              Three steps.{" "}
              <span style={{ color: colors.primary }}>That's it.</span>
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-stretch justify-center gap-6">
            {[
              { num: "1", icon: Upload, title: "Upload your file", desc: "Drop any document — PDF, Word, Excel, images or more" },
              { num: "2", icon: FileText, title: "Edit in browser", desc: "Use our tools to edit, sign, convert, compress or merge" },
              { num: "3", icon: ArrowRight, title: "Download result", desc: "Get your finished document in seconds, ready to share" },
            ].map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={i} className="flex-1 text-center p-6 rounded-xl border" style={{ borderColor: "#f1f5f9", backgroundColor: "#fafbfc" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-sm font-bold"
                    style={{ backgroundColor: colors.primary }}>
                    {step.num}
                  </div>
                  <StepIcon className="w-6 h-6 mx-auto mb-3" style={{ color: colors.primary }} />
                  <h3 className="text-sm font-bold mb-1" style={{ color: "#0f172a" }}>{step.title}</h3>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SOCIAL PROOF
      ═══════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              Trusted by millions
            </h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current" style={{ color: "#facc15" }} />
              ))}
            </div>
            <p className="text-sm" style={{ color: "#64748b" }}>
              4.8 out of 5 from 12,000+ reviews
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: "Maria G.", role: "Marketing Manager", text: "Finally a PDF editor that actually works in the browser. I use it daily for contracts and presentations." },
              { name: "Carlos R.", role: "Freelance Designer", text: "The conversion quality is excellent. Word to PDF keeps all my formatting perfectly." },
              { name: "Ana M.", role: "University Student", text: "So easy to use. I can sign, merge and compress my PDFs without installing anything." },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border p-5" style={{ backgroundColor: "white", borderColor: "#f1f5f9" }}>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: "#facc15" }} />
                  ))}
                </div>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: "#475569" }}>"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: colors.primary }}>
                    {t.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#0f172a" }}>{t.name}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{t.role}</p>
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
      <section className="py-16 md:py-20" style={{ backgroundColor: "white" }}>
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10" style={{ color: "#0f172a" }}>
            Frequently asked questions
          </h2>

          <div className="flex flex-col gap-3">
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
      <section className="py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#0f172a" }}>
            Ready to get started?
          </h2>
          <p className="text-base mb-8" style={{ color: "#64748b" }}>
            Upload your first document and see the difference.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
            style={{ backgroundColor: colors.primary, boxShadow: "0 8px 24px rgba(27, 94, 32, 0.25)" }}
          >
            <Upload className="w-5 h-5" />
            Upload your file
          </button>
          <p className="text-xs mt-4" style={{ color: "#94a3b8" }}>
            No registration required to try
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
