import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, FileText, PenTool, Shield, Zap, Lock, Image,
  Scissors, Minimize2, Merge, RotateCcw, ArrowRight,
  Star, Users, Globe, ChevronDown, ChevronUp, Type,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors, brandName } from "@/lib/brand";

const ACCEPTED = "application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.html,.txt,.csv";

// ── Tool pills inside the card ──
const TOOLS = [
  { key: "edit",     icon: Type,      label: "Edit PDF",  desc: "Modify text, images and pages of any PDF" },
  { key: "sign",     icon: PenTool,   label: "Sign",      desc: "Add your digital signature to documents" },
  { key: "convert",  icon: RotateCcw, label: "Convert",   desc: "PDF to Word, Excel, JPG and back" },
  { key: "compress", icon: Minimize2, label: "Compress",  desc: "Reduce file size up to 70%" },
  { key: "merge",    icon: Merge,     label: "Merge",     desc: "Combine multiple PDFs into one" },
  { key: "split",    icon: Scissors,  label: "Split",     desc: "Extract pages from your PDF" },
  { key: "protect",  icon: Lock,      label: "Protect",   desc: "Password-protect your files" },
  { key: "images",   icon: Image,     label: "Images",    desc: "JPG, PNG to PDF instantly" },
];

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

  const activeTool = TOOLS.find(t => t.key === activeTab)!;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFile} />

      {/* ═══════════════════════════════════════════════════
          HERO — ChatPDF style: title + ONE card with everything
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #f0fdf4 0%, #ffffff 50%)" }}>
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-6 md:pt-16 md:pb-10 text-center">

          {/* Title above the card */}
          <h1 className="text-3xl md:text-5xl lg:text-[3.2rem] font-extrabold leading-[1.12] tracking-tight mb-3"
            style={{ color: "#0f172a" }}>
            <span style={{ color: colors.primary }}>Professional PDF tools</span>
            <br className="hidden md:block" />
            {" "}for everyone
          </h1>
          <p className="text-sm md:text-base mb-8" style={{ color: "#64748b" }}>
            Edit, convert, sign, merge, compress — all from your browser
          </p>

          {/* ═══ THE CARD — contains pills + description + upload ═══ */}
          <div className="max-w-2xl mx-auto rounded-2xl bg-white overflow-hidden"
            style={{ boxShadow: "0 4px 40px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)" }}>

            {/* Tool pills row */}
            <div className="flex flex-wrap justify-center gap-1 px-4 pt-5 pb-3">
              {TOOLS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150"
                    style={{
                      backgroundColor: isActive ? colors.primary : "transparent",
                      color: isActive ? "white" : "#64748b",
                      border: isActive ? `1px solid ${colors.primary}` : "1px solid transparent",
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="mx-5" style={{ height: "1px", backgroundColor: "#f1f5f9" }} />

            {/* Description + Upload area inside the card */}
            <div className="px-5 pt-4 pb-5">
              {/* Tool description */}
              <p className="text-sm mb-4" style={{ color: "#475569" }}>
                {activeTool.desc} — drop any{" "}
                <span className="font-medium" style={{ color: "#0f172a" }}>file</span>,{" "}
                <span className="font-medium" style={{ color: "#0f172a" }}>image</span> or{" "}
                <span className="font-medium" style={{ color: "#0f172a" }}>document</span>
              </p>

              {/* Upload zone */}
              <div
                className="rounded-xl border-2 border-dashed py-6 px-4 cursor-pointer transition-all duration-150"
                style={{
                  borderColor: isDragging ? colors.primary : "#e2e8f0",
                  backgroundColor: isDragging ? "rgba(27, 94, 32, 0.03)" : "#fafbfc",
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-5 h-5" style={{ color: "#94a3b8" }} />
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    Drop a file or{" "}
                    <span className="font-semibold" style={{ color: colors.primary }}>browse</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TRUST LOGOS — like ChatPDF's university row
      ═══════════════════════════════════════════════════ */}
      <section className="py-6 md:py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-30">
            {["Google", "Microsoft", "Amazon", "Deloitte", "Accenture"].map((name) => (
              <span key={name} className="text-base md:text-lg font-bold tracking-tight" style={{ color: "#334155" }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          STATS — like ChatPDF's row
      ═══════════════════════════════════════════════════ */}
      <section className="py-4 md:py-6">
        <div className="max-w-3xl mx-auto px-4 flex flex-wrap justify-center gap-10 md:gap-16">
          {[
            { icon: FileText, value: "1,000,000+", label: "Documents per day" },
            { icon: Users, value: "2.3M+", label: "Users worldwide" },
            { icon: Star, value: "4.8/5", label: "Average rating" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
                  <Icon className="w-4 h-4" style={{ color: colors.primary }} />
                </div>
                <div>
                  <p className="text-base font-extrabold leading-tight" style={{ color: "#0f172a" }}>{s.value}</p>
                  <p className="text-[11px]" style={{ color: "#94a3b8" }}>{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          BIG QUOTE — like ChatPDF's "It's like ChatGPT..."
      ═══════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xl md:text-3xl font-bold leading-snug mb-5" style={{ color: "#0f172a" }}>
            "It's like having a{" "}
            <span className="relative inline-block">
              <span style={{ color: colors.primary }}>professional design studio</span>
              <span className="absolute bottom-0 left-0 w-full rounded-full" style={{ backgroundColor: "#4ade80", height: "4px", opacity: 0.4 }} />
            </span>
            {" "}for all your documents."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: colors.primary }}>
              JL
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Javier Lopez</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Operations Manager</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: "#0f172a" }}>
            Everything you need for your{" "}
            <span style={{ color: colors.primary }}>PDFs</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Type, title: "Edit text & images", desc: "Modify content directly in PDF" },
              { icon: PenTool, title: "Sign documents", desc: "Digital signatures in seconds" },
              { icon: RotateCcw, title: "Convert formats", desc: "PDF, Word, Excel, JPG" },
              { icon: Minimize2, title: "Compress files", desc: "Up to 70% smaller" },
              { icon: Merge, title: "Merge PDFs", desc: "Combine into one file" },
              { icon: Scissors, title: "Split pages", desc: "Extract any pages" },
              { icon: Lock, title: "Protect files", desc: "Password encryption" },
              { icon: Image, title: "Image to PDF", desc: "JPG, PNG to PDF" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i}
                  className="rounded-xl border p-4 bg-white cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
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
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Maria G.", role: "Marketing", text: "Finally a PDF editor that works in the browser. I use it daily.", initials: "MG" },
              { name: "Carlos R.", role: "Designer", text: "Word to PDF conversion keeps all my formatting perfectly.", initials: "CR" },
              { name: "Ana M.", role: "Student", text: "I can sign, merge and compress without installing anything.", initials: "AM" },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border p-4" style={{ borderColor: "#f1f5f9" }}>
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
      <section className="py-12 md:py-16" style={{ backgroundColor: "#fafbfc" }}>
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6" style={{ color: "#0f172a" }}>FAQ</h2>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "#f1f5f9" }}>
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
      <section className="py-12 md:py-16 bg-white">
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
