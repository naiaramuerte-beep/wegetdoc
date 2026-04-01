/* =============================================================
   CloudPDF Footer — "Lumina" design
   Dark indigo-slate footer, matching the gradient CTA above
   ============================================================= */

import { FileText } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

const BG = "oklch(0.12 0.02 264)";
const BG_LIGHTER = "oklch(0.16 0.02 264)";
const BORDER = "oklch(0.20 0.02 264)";
const INDIGO = "oklch(0.60 0.22 264)";
const TEXT_LINK = "oklch(0.58 0.02 264)";
const TEXT_MUTED = "oklch(0.42 0.015 264)";

export default function Footer() {
  const { lang, t, switchLang } = useLanguage();

  const pdfproLinks = [
    { href: `/${lang}/pricing`, label: t.nav_pricing },
    { href: `/${lang}/blog`, label: "Blog" },
    { href: `/${lang}#how-it-works`, label: t.footer_how },
    { href: `/${lang}#faq`, label: t.footer_faq },
    { href: "#contact", label: t.nav_contact },
  ];

  const legalLinks = [
    { href: `/${lang}/terms`, label: t.footer_terms },
    { href: `/${lang}/privacy`, label: t.footer_privacy },
    { href: `/${lang}/cookies`, label: t.footer_cookies },
    { href: `/${lang}/gdpr`, label: t.footer_gdpr },
    { href: `/${lang}/refund`, label: t.footer_refund },
    { href: `/${lang}/cancelar-suscripcion`, label: t.footer_unsubscribe },
  ];

  const toolLinks = [
    { href: `/${lang}`, label: t.footer_editor },
    { href: `/${lang}/tools`, label: t.footer_convert },
    { href: `/${lang}`, label: t.footer_compress },
    { href: `/${lang}`, label: t.footer_merge },
    { href: `/${lang}`, label: t.footer_split },
    { href: `/${lang}`, label: t.footer_sign },
  ];

  return (
    <footer
      className="w-full pt-12 pb-8"
      style={{ backgroundColor: BG }}
    >
      <div className="container">
        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b"
          style={{ borderColor: BORDER }}
        >
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, oklch(0.47 0.24 264), oklch(0.42 0.26 290))" }}
              >
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-xl tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif", color: "white" }}
              >
                Cloud<span style={{ color: INDIGO }}>PDF</span>
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: TEXT_LINK, fontFamily: "'DM Sans', sans-serif" }}
            >
              {t.footer_desc}
            </p>
          </div>

          {/* CloudPDF links */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {t.footer_col_pdfpro}
            </h4>
            <ul className="space-y-2.5">
              {pdfproLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-150"
                    style={{ color: TEXT_LINK }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_LINK)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {t.footer_col_legal}
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-150"
                    style={{ color: TEXT_LINK }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_LINK)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {t.footer_col_tools}
            </h4>
            <ul className="space-y-2.5">
              {toolLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-150"
                    style={{ color: TEXT_LINK }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_LINK)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6">
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            {t.footer_copyright}
          </p>
          <select
            className="text-xs rounded-lg px-2.5 py-1.5 border cursor-pointer outline-none"
            style={{
              backgroundColor: BG_LIGHTER,
              color: TEXT_LINK,
              borderColor: BORDER,
              fontFamily: "'DM Sans', sans-serif",
            }}
            value={lang}
            onChange={(e) => switchLang(e.target.value as any)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </footer>
  );
}
