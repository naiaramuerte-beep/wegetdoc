import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { brandName } from "@/lib/brand";
import Home from "./Home";

// ── Tool definitions ───────────────────────────────────────────
export interface ToolDef {
  slug: string;
  i18nPrefix: string;
  // Word inside the H1 that receives the red squiggle accent.
  // Kept as a universal acronym/brand name (PDF, Word, Excel, JPG...) so it
  // matches across all 10 languages without needing per-language keys.
  highlight: string;
  editorTool?: string;
}

export const TOOL_LANDINGS: ToolDef[] = [
  { slug: "pdf-to-word",   i18nPrefix: "landing_pdf2word",   highlight: "Word" },
  { slug: "pdf-editor",    i18nPrefix: "landing_editor",     highlight: "PDF" },
  { slug: "merge-pdf",     i18nPrefix: "landing_merge",      highlight: "PDF", editorTool: "merge" },
  { slug: "compress-pdf",  i18nPrefix: "landing_compress",   highlight: "PDF" },
  { slug: "jpg-to-pdf",    i18nPrefix: "landing_jpg2pdf",    highlight: "PDF" },
  { slug: "pdf-to-jpg",    i18nPrefix: "landing_pdf2jpg",    highlight: "JPG" },
  { slug: "pdf-to-excel",  i18nPrefix: "landing_pdf2excel",  highlight: "Excel" },
  { slug: "word-to-pdf",   i18nPrefix: "landing_word2pdf",   highlight: "PDF" },
  { slug: "split-pdf",     i18nPrefix: "landing_split",      highlight: "PDF", editorTool: "split" },
  { slug: "pdf-converter", i18nPrefix: "landing_converter",  highlight: "PDF" },
  { slug: "image-to-pdf",  i18nPrefix: "landing_img2pdf",    highlight: "PDF" },
  { slug: "png-to-pdf",    i18nPrefix: "landing_png2pdf",    highlight: "PDF" },
  { slug: "jpeg-to-pdf",   i18nPrefix: "landing_jpeg2pdf",   highlight: "PDF" },
  { slug: "docx-to-pdf",   i18nPrefix: "landing_docx2pdf",   highlight: "PDF" },
];

// ── Component ───────────────────────────────────────────────────
export default function ToolLanding({ tool }: { tool: ToolDef }) {
  const { lang, t } = useLanguage();
  const tr = (key: string) => (t as any)[`${tool.i18nPrefix}_${key}`] ?? "";

  useEffect(() => {
    document.title = tr("meta_title") || `${tr("h1")} | ${brandName}`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", tr("meta_desc") || tr("subtitle"));
    window.scrollTo(0, 0);
  }, [lang, tool]);

  return (
    <Home
      overrides={{
        heroTitle: tr("h1"),
        heroHighlight: tool.highlight,
        heroSubtitle: tr("subtitle"),
        metaTitle: tr("meta_title") || `${tr("h1")} | ${brandName}`,
        metaDesc: tr("meta_desc") || tr("subtitle"),
        editorTool: tool.editorTool,
      }}
    />
  );
}
