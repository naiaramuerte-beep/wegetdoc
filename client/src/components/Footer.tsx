/* =============================================================
   EditorPDF Footer — "Clean White" design
   Dark green footer, matching the gradient CTA above
   ============================================================= */

import { useState } from "react";
import { FileText } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { logoParts, colors, isFastDoc, brandName } from "@/lib/brand";
import ContactModal from "./ContactModal";

const BG = "#0f172a";
const BG_LIGHTER = "#1e293b";
const BORDER = "#334155";
const INDIGO = colors.light;
const TEXT_LINK = "#94a3b8";
const TEXT_MUTED = "#64748b";

export default function Footer() {
  const { lang, t, switchLang } = useLanguage();
  const [contactOpen, setContactOpen] = useState(false);

  const wegetdocLinks: { href: string; label: string; onClick?: () => void }[] = [
    { href: `/${lang}/pricing`, label: t.nav_pricing },
    { href: `/${lang}/blog`, label: "Blog" },
    { href: `/${lang}#how-it-works`, label: t.footer_how },
    { href: `/${lang}#faq`, label: t.footer_faq },
    { href: "#contact", label: t.nav_contact, onClick: () => setContactOpen(true) },
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
    <>
    <footer
      className={`w-full ${isFastDoc ? "pt-0 pb-6" : "pt-12 pb-8"}`}
      style={{ backgroundColor: BG }}
    >
      <div className="container">
        {isFastDoc ? (
          /* ── FastDoc minimal footer ── */
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
            <p className="text-xs" style={{ color: "#9CA3AF" }}>
              &copy; 2025 {brandName}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setContactOpen(true)}
                className="text-xs transition-colors duration-150 cursor-pointer"
                style={{ color: TEXT_LINK, background: "none", border: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E8590C")}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_LINK)}
              >
                {t.nav_contact}
              </button>
              <a
                href={`/${lang}/privacy`}
                className="text-xs transition-colors duration-150"
                style={{ color: TEXT_LINK }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E8590C")}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_LINK)}
              >
                {t.footer_privacy}
              </a>
              <a
                href={`/${lang}/cookies`}
                className="text-xs transition-colors duration-150"
                style={{ color: TEXT_LINK }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E8590C")}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_LINK)}
              >
                {t.footer_cookies}
              </a>
              <a
                href={`/${lang}/terms`}
                className="text-xs transition-colors duration-150"
                style={{ color: TEXT_LINK }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E8590C")}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_LINK)}
              >
                {t.footer_terms}
              </a>
            </div>
          </div>
        ) : (
          /* ── EditorPDF full footer ── */
          <>
        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b"
          style={{ borderColor: BORDER }}
        >
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: colors.gradient }}
              >
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-xl tracking-tight"
                style={{ color: "white" }}
              >
                {logoParts[0]}<span style={{ color: INDIGO }}>{logoParts[1]}</span>
              </span>
            </div>
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: TEXT_LINK }}
            >
              {t.footer_desc}
            </p>
            <a
              href="mailto:support@editorpdf.net"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
              style={{ color: INDIGO }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
              onMouseLeave={(e) => (e.currentTarget.style.color = INDIGO)}
            >
              ✉ support@editorpdf.net
            </a>
          </div>

          {/* EditorPDF links */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-4"
            >
              {t.footer_col_wegetdoc}
            </h4>
            <ul className="space-y-2.5">
              {wegetdocLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={link.onClick ? (e) => { e.preventDefault(); link.onClick!(); } : undefined}
                    className="text-sm transition-colors duration-150 cursor-pointer"
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
          </>
        )}
      </div>
    </footer>
    <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
  </>
  );
}
