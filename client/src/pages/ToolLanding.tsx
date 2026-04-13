import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { brandName } from "@/lib/brand";
import Home from "./Home";

// ── Tool definitions ───────────────────────────────────────────
export interface ToolDef {
  slug: string;
  i18nPrefix: string;
}

export const TOOL_LANDINGS: ToolDef[] = [
  { slug: "pdf-to-word",   i18nPrefix: "landing_pdf2word" },
  { slug: "pdf-editor",    i18nPrefix: "landing_editor" },
  { slug: "merge-pdf",     i18nPrefix: "landing_merge" },
  { slug: "compress-pdf",  i18nPrefix: "landing_compress" },
  { slug: "jpg-to-pdf",    i18nPrefix: "landing_jpg2pdf" },
  { slug: "pdf-to-jpg",    i18nPrefix: "landing_pdf2jpg" },
  { slug: "pdf-to-excel",  i18nPrefix: "landing_pdf2excel" },
  { slug: "word-to-pdf",   i18nPrefix: "landing_word2pdf" },
  { slug: "split-pdf",     i18nPrefix: "landing_split" },
  { slug: "pdf-converter", i18nPrefix: "landing_converter" },
  { slug: "image-to-pdf",  i18nPrefix: "landing_img2pdf" },
  { slug: "png-to-pdf",    i18nPrefix: "landing_png2pdf" },
  { slug: "jpeg-to-pdf",   i18nPrefix: "landing_jpeg2pdf" },
  { slug: "docx-to-pdf",   i18nPrefix: "landing_docx2pdf" },
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
        heroSubtitle: tr("subtitle"),
        metaTitle: tr("meta_title") || `${tr("h1")} | ${brandName}`,
        metaDesc: tr("meta_desc") || tr("subtitle"),
      }}
    />
  );
}
