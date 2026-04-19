/* =============================================================
   EditorPDF Footer — bundle design (light, ink + PDF red)
   - White background with thin top border
   - Bundle isotipo (P + red dot) + "editorpdf.net" wordmark
   - Same logic: lang switcher, contact modal, isFastDoc branch
   ============================================================= */

import { useState } from "react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { isFastDoc, brandName } from "@/lib/brand";
import ContactModal from "./ContactModal";

export default function Footer() {
  const { lang, t, switchLang } = useLanguage();
  const [contactOpen, setContactOpen] = useState(false);

  const companyLinks: { href: string; label: string; onClick?: () => void }[] = [
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

  const LogoMark = (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 512 512" fill="none" aria-hidden="true">
        <rect x="48" y="48" width="416" height="416" rx="112" fill="#0A0A0B"/>
        <path
          d="M176 180v152M176 180h82a50 50 0 010 100h-82"
          stroke="white" strokeWidth="34"
          strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="342" cy="348" r="32" fill="#E63946"/>
      </svg>
      <span className="font-extrabold text-[17px] tracking-[-0.03em] leading-none">
        <span className="text-[#0A0A0B]">editorpdf</span>
        <span className="text-[#E63946]">.net</span>
      </span>
    </div>
  );

  return (
    <>
      <footer
        className={`w-full bg-white border-t border-[#E8E8EC] ${isFastDoc ? "pt-0 pb-4" : "pt-14 pb-8"}`}
      >
        <div className="container">
          {isFastDoc ? (
            /* ── Minimal footer for FastDoc ── */
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 py-4">
              <p className="text-xs text-[#8A8A92]">&copy; 2025 {brandName}</p>
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setContactOpen(true)}
                  className="text-xs text-[#1A1A1C] hover:text-[#E63946] transition-colors"
                >
                  {t.nav_contact}
                </button>
                <a
                  href={`/${lang}/privacy`}
                  className="text-xs text-[#1A1A1C] hover:text-[#E63946] transition-colors"
                >
                  {t.footer_privacy}
                </a>
                <a
                  href={`/${lang}/cookies`}
                  className="text-xs text-[#1A1A1C] hover:text-[#E63946] transition-colors"
                >
                  {t.footer_cookies}
                </a>
                <a
                  href={`/${lang}/terms`}
                  className="text-xs text-[#1A1A1C] hover:text-[#E63946] transition-colors"
                >
                  {t.footer_terms}
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-[#F1F1F4]">
                {/* Brand */}
                <div>
                  {LogoMark}
                  <p className="text-[13.5px] leading-relaxed text-[#5A5A62] mt-4 mb-4 max-w-[260px]">
                    {t.footer_desc}
                  </p>
                  <a
                    href="mailto:support@editorpdf.net"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A0A0B] hover:text-[#E63946] transition-colors"
                  >
                    ✉ support@editorpdf.net
                  </a>
                </div>

                {/* Tools */}
                <div>
                  <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8A8A92] mb-4">
                    {t.footer_col_tools}
                  </div>
                  <ul className="space-y-2.5">
                    {toolLinks.map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.href}
                          className="text-[13.5px] text-[#1A1A1C] hover:text-[#E63946] transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8A8A92] mb-4">
                    {t.footer_col_wegetdoc}
                  </div>
                  <ul className="space-y-2.5">
                    {companyLinks.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          onClick={link.onClick ? (e) => { e.preventDefault(); link.onClick!(); } : undefined}
                          className="text-[13.5px] text-[#1A1A1C] hover:text-[#E63946] transition-colors cursor-pointer"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8A8A92] mb-4">
                    {t.footer_col_legal}
                  </div>
                  <ul className="space-y-2.5">
                    {legalLinks.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          className="text-[13.5px] text-[#1A1A1C] hover:text-[#E63946] transition-colors"
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
                <p className="text-xs text-[#8A8A92]">{t.footer_copyright}</p>
                <select
                  className="text-xs rounded-full px-3 py-1.5 border border-[#E8E8EC] bg-white text-[#1A1A1C] cursor-pointer outline-none hover:border-[#0A0A0B]/20 transition-colors"
                  value={lang}
                  onChange={(e) => switchLang(e.target.value as any)}
                  aria-label="Change language"
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
