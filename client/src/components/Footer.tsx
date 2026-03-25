/* =============================================================
   PDFUp Footer — Deep Navy Pro design — fully i18n-ready
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
              <svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M2 0H19L26 7V30C26 31.1 25.1 32 24 32H2C0.9 32 0 31.1 0 30V2C0 0.9 0.9 0 2 0Z" fill="white" fillOpacity="0.15" />
                <path d="M2 0H19L26 7V30C26 31.1 25.1 32 24 32H2C0.9 32 0 31.1 0 30V2C0 0.9 0.9 0 2 0Z" stroke="white" strokeWidth="1.5" />
                <path d="M19 0V5C19 6.1 19.9 7 21 7H26" stroke="white" strokeWidth="1.5" />
                <path d="M13 24V13M13 13L8.5 17.5M13 13L17.5 17.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span
                className="text-white font-bold text-xl tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                PDF<span style={{ color: accentColor }}>Up</span>
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

          {/* PDFUp links */}
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
