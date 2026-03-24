/* =============================================================
   PDFUp Tools Page — All PDF tools in one place
   Deep Navy Pro design — fully i18n-ready
   ============================================================= */

import { toast } from "sonner";
import {
  FileText,
  Layers,
  PenTool,
  Share2,
  MessageSquare,
  Type,
  Image,
  Lock,
  Scissors,
  Merge,
  Minimize2,
  RotateCcw,
  FileImage,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UploadZone from "@/components/UploadZone";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKeys } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";

/* ── Tool definition (icon + i18n key references) ────────────── */
interface ToolDef {
  icon: LucideIcon;
  titleKey: keyof TranslationKeys;
  descKey: keyof TranslationKeys;
  color: string;
  bg: string;
}

interface ToolGroup {
  categoryKey: keyof TranslationKeys;
  tools: ToolDef[];
}

const EDIT_COLOR = "oklch(0.55 0.22 260)";
const EDIT_BG = "oklch(0.55 0.22 260 / 0.08)";
const ORG_COLOR = "oklch(0.50 0.18 290)";
const ORG_BG = "oklch(0.50 0.18 290 / 0.08)";
const FROM_COLOR = "oklch(0.45 0.18 145)";
const FROM_BG = "oklch(0.45 0.18 145 / 0.08)";
const TO_COLOR = "oklch(0.60 0.20 30)";
const TO_BG = "oklch(0.60 0.20 30 / 0.08)";

const toolGroups: ToolGroup[] = [
  {
    categoryKey: "tools_tab_edit",
    tools: [
      { icon: Type, titleKey: "tool_edit_text", descKey: "tool_edit_text_desc", color: EDIT_COLOR, bg: EDIT_BG },
      { icon: PenTool, titleKey: "tool_add_sign", descKey: "tool_add_sign_desc", color: EDIT_COLOR, bg: EDIT_BG },
      { icon: MessageSquare, titleKey: "tool_annotate", descKey: "tool_annotate_desc", color: EDIT_COLOR, bg: EDIT_BG },
      { icon: Image, titleKey: "tool_images", descKey: "tool_images_desc", color: EDIT_COLOR, bg: EDIT_BG },
      { icon: Lock, titleKey: "tool_protect", descKey: "tool_protect_desc", color: EDIT_COLOR, bg: EDIT_BG },
      { icon: Share2, titleKey: "tool_share", descKey: "tool_share_desc", color: EDIT_COLOR, bg: EDIT_BG },
    ],
  },
  {
    categoryKey: "tools_cat_organize",
    tools: [
      { icon: Layers, titleKey: "tool_rearrange", descKey: "tool_rearrange_desc", color: ORG_COLOR, bg: ORG_BG },
      { icon: Scissors, titleKey: "tool_split", descKey: "tool_split_desc", color: ORG_COLOR, bg: ORG_BG },
      { icon: Merge, titleKey: "tool_merge", descKey: "tool_merge_desc", color: ORG_COLOR, bg: ORG_BG },
      { icon: RotateCcw, titleKey: "tool_rotate", descKey: "tool_rotate_desc", color: ORG_COLOR, bg: ORG_BG },
      { icon: Minimize2, titleKey: "tool_compress", descKey: "tool_compress_desc", color: ORG_COLOR, bg: ORG_BG },
      { icon: FileText, titleKey: "tool_delete_pages", descKey: "tool_delete_pages_desc", color: ORG_COLOR, bg: ORG_BG },
    ],
  },
  {
    categoryKey: "tools_tab_from_pdf",
    tools: [
      { icon: FileText, titleKey: "tool_pdf_word", descKey: "tool_pdf_word_desc", color: FROM_COLOR, bg: FROM_BG },
      { icon: FileSpreadsheet, titleKey: "tool_pdf_excel", descKey: "tool_pdf_excel_desc", color: FROM_COLOR, bg: FROM_BG },
      { icon: Presentation, titleKey: "tool_pdf_ppt", descKey: "tool_pdf_ppt_desc", color: FROM_COLOR, bg: FROM_BG },
      { icon: FileImage, titleKey: "tool_pdf_jpg", descKey: "tool_pdf_jpg_desc", color: FROM_COLOR, bg: FROM_BG },
      { icon: FileImage, titleKey: "tool_pdf_png", descKey: "tool_pdf_png_desc", color: FROM_COLOR, bg: FROM_BG },
      { icon: FileText, titleKey: "tool_pdf_html", descKey: "tool_pdf_html_desc", color: FROM_COLOR, bg: FROM_BG },
    ],
  },
  {
    categoryKey: "tools_tab_to_pdf",
    tools: [
      { icon: FileText, titleKey: "tool_word_pdf", descKey: "tool_word_pdf_desc", color: TO_COLOR, bg: TO_BG },
      { icon: FileSpreadsheet, titleKey: "tool_excel_pdf", descKey: "tool_excel_pdf_desc", color: TO_COLOR, bg: TO_BG },
      { icon: Presentation, titleKey: "tool_ppt_pdf", descKey: "tool_ppt_pdf_desc", color: TO_COLOR, bg: TO_BG },
      { icon: FileImage, titleKey: "tool_jpg_pdf", descKey: "tool_jpg_pdf_desc", color: TO_COLOR, bg: TO_BG },
      { icon: FileImage, titleKey: "tool_png_pdf", descKey: "tool_png_pdf_desc", color: TO_COLOR, bg: TO_BG },
      { icon: FileText, titleKey: "tool_html_pdf", descKey: "tool_html_pdf_desc", color: TO_COLOR, bg: TO_BG },
    ],
  },
];

export default function Tools() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.98 0.005 250)" }}>
      <Navbar />

      {/* Hero */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1
              className="text-4xl md:text-5xl font-extrabold mb-4"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              {t.tools_page_title}
            </h1>
            <p
              className="text-lg"
              style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.tools_page_subtitle}
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-16">
            <UploadZone compact />
          </div>

          {/* Tool groups */}
          <div className="space-y-16">
            {toolGroups.map((group, gi) => (
              <div key={gi}>
                <h2
                  className="text-2xl font-bold mb-6"
                  style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
                >
                  {t[group.categoryKey]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {group.tools.map((tool, ti) => (
                    <button
                      key={ti}
                      className="flex items-start gap-4 p-5 rounded-xl text-left transition-all duration-200"
                      style={{
                        backgroundColor: "oklch(1 0 0)",
                        border: "1px solid oklch(0.90 0.01 250)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = tool.color + " / 0.4";
                        e.currentTarget.style.boxShadow = `0 8px 24px ${tool.color} / 0.10`;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "oklch(0.90 0.01 250)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                      onClick={() => toast.info(t.tool_upload_cta)}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: tool.bg }}
                      >
                        <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                      </div>
                      <div>
                        <h3
                          className="font-semibold text-sm mb-1"
                          style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
                        >
                          {t[tool.titleKey]}
                        </h3>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {t[tool.descKey]}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
