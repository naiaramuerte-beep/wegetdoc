/* =============================================================
   PdfConverterHub — landing for /[lang]/pdf-converter
   Visitors arriving from broad keywords like "convert pdf" don't
   know which target format they want. This page asks them: pick
   one of Word / Excel / PowerPoint / JPG, then routes them to the
   dedicated ConverterPage for that format.
   ============================================================= */
import { useEffect } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon,
  ArrowRight, CheckCircle2, FileType, FileImage, Layers, Scissors, Minimize2,
} from "lucide-react";

const ACCENT = "#E63946";
const INK = "#0A0A0B";
const MUTED = "#5A5A62";

// Red squiggle underline — matches the Home hero / converter landings.
function SquiggleUnderline({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block px-0.5">
      {children}
      <svg
        className="absolute left-0 right-0 -bottom-1.5 w-full pointer-events-none"
        viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"
        height="12"
      >
        <path d="M2 9 Q 60 4, 150 5 T 298 7 L 296 11 Q 150 9, 4 12 Z" fill={ACCENT} />
      </svg>
    </span>
  );
}

function LogoSvg() {
  return (
    <svg width="56" height="56" viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <rect x="48" y="48" width="416" height="416" rx="112" fill={INK} />
      <path
        d="M176 180v152M176 180h82a50 50 0 010 100h-82"
        stroke="white" strokeWidth="34"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="342" cy="348" r="32" fill={ACCENT} />
    </svg>
  );
}

// Primary tiles: PDF → Office/Image. Brand label stays as a product name
// ("Word", "Excel", etc. — those don't translate). The descriptions are
// resolved at render time via `landing_hub_card_*_desc`.
const PDF_TO_TOOLS = [
  { slug: "pdf-to-word",       label: "Word",       ext: "DOCX", descKey: "landing_hub_card_word_desc",  descFallback: "Editable .docx with layout, fonts and images preserved.",  icon: FileText,        color: "#2B579A", bgColor: "#E8F0FA" },
  { slug: "pdf-to-excel",      label: "Excel",      ext: "XLSX", descKey: "landing_hub_card_excel_desc", descFallback: "Extract tables straight into a clean .xlsx spreadsheet.", icon: FileSpreadsheet, color: "#1F7244", bgColor: "#E8F5EC" },
  { slug: "pdf-to-powerpoint", label: "PowerPoint", ext: "PPTX", descKey: "landing_hub_card_ppt_desc",   descFallback: "Reuse a PDF as a .pptx deck with editable slides.",       icon: Presentation,    color: "#D04423", bgColor: "#FBEBE5" },
  { slug: "pdf-to-jpg",        label: "JPG",        ext: "JPG",  descKey: "landing_hub_card_jpg_desc",   descFallback: "Export pages as high-quality images, ready to share.",    icon: ImageIcon,       color: "#1A1A1C", bgColor: "#F0F0F2" },
] as const;

// Secondary tools shown below: X→PDF + utilities. Labels translated via
// `landing_grid_*` keys (shared with all landings' cross-tool grid).
const SECONDARY_TOOLS = [
  { slug: "word-to-pdf",  labelKey: "landing_grid_word_to_pdf_label", labelFallback: "Word to PDF",  icon: FileType,    color: "#2B579A", bgColor: "#E8F0FA" },
  { slug: "jpg-to-pdf",   labelKey: "landing_grid_jpg_to_pdf_label",  labelFallback: "JPG to PDF",   icon: FileImage,   color: "#E63946", bgColor: "#FEE7EA" },
  { slug: "png-to-pdf",   labelKey: "landing_grid_png_to_pdf_label",  labelFallback: "PNG to PDF",   icon: FileImage,   color: "#0A0A0B", bgColor: "#F0F0F2" },
  { slug: "merge-pdf",    labelKey: "landing_grid_merge_label",       labelFallback: "Merge PDF",    icon: Layers,      color: "#5A5A62", bgColor: "#F0F0F2" },
  { slug: "split-pdf",    labelKey: "landing_grid_split_label",       labelFallback: "Split PDF",    icon: Scissors,    color: "#5A5A62", bgColor: "#F0F0F2" },
  { slug: "compress-pdf", labelKey: "landing_grid_compress_label",    labelFallback: "Compress PDF", icon: Minimize2,   color: "#5A5A62", bgColor: "#F0F0F2" },
] as const;

// Renders an i18n template like "Convert {pdf} to anything", with the {pdf}
// placeholder coloured red + underlined. Supports word-order changes per
// language (e.g. German: "{pdf} in jedes Format konvertieren").
function renderHubHeadline(template: string) {
  const parts = template.split(/(\{pdf\})/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "{pdf}") {
          return (
            <SquiggleUnderline key={i}>
              <span style={{ color: ACCENT }}>PDF</span>
            </SquiggleUnderline>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function PdfConverterHub() {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string): string =>
    ((t as any)[key] as string | undefined) || fallback;
  const [location, navigate] = useLocation();
  const langMatch = location.match(/^\/([a-z]{2})(\/|$)/);
  const lang = langMatch ? langMatch[1] : "en";

  const headlineTemplate = tr("landing_hub_headline_template", "Convert {pdf} to anything");
  const docTitle = tr("landing_hub_doc_title", "Convert PDF to anything");

  useEffect(() => {
    const prev = document.title;
    document.title = `${docTitle} · editorpdf.net`;
    return () => { document.title = prev; };
  }, [docTitle]);

  const goTo = (slug: string) => navigate(`/${lang}/${slug}`);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0A0A0B]">
      <Navbar />

      <section className="relative pt-16 md:pt-[72px] pb-20 overflow-hidden flex-1">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-20">
          {/* Eyebrow */}
          <p className="text-center text-[12px] font-semibold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>
            {tr("landing_hub_preheader", "PDF Converter")}
          </p>

          {/* Headline */}
          <h1 className="text-center text-3xl md:text-5xl font-extrabold leading-[1.1] tracking-[-0.02em] mb-4">
            {renderHubHeadline(headlineTemplate)}
          </h1>
          <p className="text-center text-[15px] md:text-base max-w-xl mx-auto mb-12" style={{ color: MUTED }}>
            {tr("landing_hub_subtitle", "Pick the format you need below — we'll convert your file in seconds, with layout and formatting preserved.")}
          </p>

          {/* Primary picker — 4 tiles. Mobile: 2-col compact (no desc, smaller
              padding) so the user sees all 4 options without scrolling. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-5xl mx-auto">
            {PDF_TO_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.slug}
                  onClick={() => goTo(tool.slug)}
                  className="group relative flex flex-col items-start gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-white text-left transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(10,10,11,0.18)]"
                  style={{
                    border: "1px solid #E8E8EC",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E8EC"; }}
                >
                  {/* Icon + format chip */}
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                      style={{ background: tool.bgColor }}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: tool.color }} />
                    </div>
                    <span
                      className="text-[10px] font-extrabold tracking-[0.12em] px-2 py-1 rounded"
                      style={{ background: tool.color, color: "white" }}
                    >
                      {tool.ext}
                    </span>
                  </div>

                  {/* Label + desc (desc hidden on mobile) */}
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.12em] uppercase mb-0.5 sm:mb-1" style={{ color: MUTED }}>
                      {tr("landing_hub_pdf_to_prefix", "PDF to")}
                    </p>
                    <h3 className="text-[17px] sm:text-[22px] font-extrabold tracking-[-0.02em] leading-tight text-[#0A0A0B]">
                      {tool.label}
                    </h3>
                    <p className="hidden sm:block text-[13px] mt-2 leading-relaxed" style={{ color: MUTED }}>
                      {tr(tool.descKey, tool.descFallback)}
                    </p>
                  </div>

                  {/* CTA arrow */}
                  <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-bold mt-auto pt-1 sm:pt-2" style={{ color: ACCENT }}>
                    {tr("landing_hub_convert_now", "Convert now")}
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-6 mt-12 text-[12px] flex-wrap" style={{ color: MUTED }}>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
              {tr("landing_common_no_installation", "No installation")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
              {tr("landing_common_any_device", "Works on any device")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
              {tr("landing_hub_files_up_to", "Files up to 100 MB")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#1E9E63" }} />
              {tr("landing_hub_processed_securely", "Processed securely")}
            </span>
          </div>

          {/* Secondary tools */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[12px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: ACCENT }}>
                {tr("landing_hub_other_tools_kicker", "Other tools")}
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.02em] text-[#0A0A0B]">
                {tr("landing_hub_other_tools_title", "Convert files into PDF, or edit your PDFs")}
              </h2>
              <p className="text-[14px] mt-2" style={{ color: MUTED }}>
                {tr("landing_hub_other_tools_subtitle", "Six more tools — all free to try, no installation.")}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {SECONDARY_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.slug}
                    onClick={() => goTo(tool.slug)}
                    className="group flex flex-col items-start gap-2 rounded-xl p-3.5 bg-white text-left transition-all hover:-translate-y-px hover:shadow-[0_8px_20px_-10px_rgba(10,10,11,0.18)]"
                    style={{ border: "1px solid #E8E8EC" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(10,10,11,0.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E8EC"; }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: tool.bgColor }}
                    >
                      <Icon style={{ color: tool.color, width: 18, height: 18 }} />
                    </div>
                    <p className="text-[13px] font-bold text-[#0A0A0B] leading-tight">{tr(tool.labelKey, tool.labelFallback)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand mark */}
          <div className="flex flex-col items-center gap-3 mt-16 opacity-90">
            <LogoSvg />
            <span className="text-[13px] font-semibold tracking-[-0.02em]">
              <span className="text-[#0A0A0B]">editorpdf</span>
              <span style={{ color: ACCENT }}>.net</span>
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
