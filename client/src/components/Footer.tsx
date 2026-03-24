/* =============================================================
   PDFPro Footer — Deep Navy Pro design — fully i18n-ready
   Dark navy background, matching the navbar
   ============================================================= */

import { FileText, Facebook, Linkedin, Twitter } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

const socialBg = "oklch(0.25 0.04 250)";
const socialColor = "oklch(0.70 0.02 250)";
const accentColor = "oklch(0.55 0.22 260)";
const linkColor = "oklch(0.60 0.02 250)";

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
      style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
    >
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b" style={{ borderColor: "oklch(0.28 0.04 250)" }}>
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-white font-bold text-xl tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                PDF<span style={{ color: accentColor }}>Pro</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: linkColor, fontFamily: "'DM Sans', sans-serif" }}>
              {t.footer_desc}
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[Facebook, Linkedin, Twitter].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-200"
                  style={{ backgroundColor: socialBg, color: socialColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = accentColor;
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = socialBg;
                    e.currentTarget.style.color = socialColor;
                  }}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* PDFPro links */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {t.footer_col_pdfpro}
            </h4>
            <ul className="space-y-2">
              {pdfproLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-200"
                    style={{ color: linkColor, fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
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
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-200"
                    style={{ color: linkColor, fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
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
            <ul className="space-y-2">
              {toolLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-200"
                    style={{ color: linkColor, fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
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
          <p
            className="text-xs"
            style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            {t.footer_copyright}
          </p>
          <div className="flex items-center gap-4">
            <select
              className="text-xs rounded-md px-2 py-1 border cursor-pointer"
              style={{
                backgroundColor: "oklch(0.22 0.04 250)",
                color: "oklch(0.70 0.02 250)",
                borderColor: "oklch(0.30 0.04 250)",
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
      </div>
    </footer>
  );
}
