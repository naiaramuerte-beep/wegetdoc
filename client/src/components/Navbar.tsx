/* =============================================================
   EditorPDF Navbar — bundle palette (ink + PDF red accent)
   - Glass header, ink/line tokens, accent for active states
   - Same logic: auth, i18n, routing, contact modal (untouched)
   ============================================================= */

import { useState, useEffect } from "react";
import { colors, isFastDoc } from "@/lib/brand";
import { Link, useLocation } from "wouter";
import {
  Menu, X, LogOut, LayoutDashboard,
  ChevronDown, Settings,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import ContactModal from "./ContactModal";
import AuthModal from "./AuthModal";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Navbar({ compact, hideLogoLink }: { compact?: boolean; hideLogoLink?: boolean } = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { lang, switchLang, t } = useLanguage();

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const allNavLinks = [
    { href: `/${lang}/#how-it-works`, label: t.nav_how_it_works },
    { href: `/${lang}/#faq`, label: t.nav_faq },
    { href: "#contact", label: t.nav_contact, onClick: () => setContactOpen(true) },
  ];

  const navLinks = isFastDoc
    ? allNavLinks.filter((link) =>
        [t.nav_how_it_works, t.nav_pricing, t.nav_faq].includes(link.label)
      )
    : allNavLinks;

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate(`/${lang}`);
  };

  const openLogin = () => { setAuthMode("login"); setAuthOpen(true); };
  const openSignup = () => { setAuthMode("signup"); setAuthOpen(true); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "true" && !isAuthenticated) {
      openLogin();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [isAuthenticated]);

  const logoInner = (
    <>
      <svg
        width="32" height="32" viewBox="0 0 512 512" fill="none"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <rect x="48" y="48" width="416" height="416" rx="112" fill="#0A0A0B"/>
        <path
          d="M176 180v152M176 180h82a50 50 0 010 100h-82"
          stroke="white" strokeWidth="34"
          strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="342" cy="348" r="32" fill="#E63946"/>
      </svg>
      <span className="font-extrabold text-[18px] tracking-[-0.03em] text-[#0A0A0B] leading-none">
        editorpdf<span className="text-[#E63946]">.net</span>
      </span>
    </>
  );

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-[#F1F1F4] backdrop-blur-md bg-white/85 transition-shadow duration-200 ${
          scrolled || menuOpen ? "shadow-sm" : ""
        }`}
      >
        <div className={`container flex items-center h-16 md:h-[68px] ${isFastDoc ? "md:grid md:grid-cols-[auto_1fr_auto]" : "justify-between"}`}>

          {/* ── Logo ── */}
          {hideLogoLink ? (
            <div className="flex items-center gap-2 shrink-0">{logoInner}</div>
          ) : (
            <Link href={`/${lang}`} className="flex items-center gap-2 group shrink-0 transition-opacity hover:opacity-90">
              {logoInner}
            </Link>
          )}

          {/* ── Desktop Nav ── */}
          <nav className={`hidden md:flex items-center gap-1 ${isFastDoc ? "justify-center" : ""}`}>
            {navLinks.map((link) =>
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={link.onClick}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[#1A1A1C] hover:bg-[#F6F6F7] transition-colors"
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[#1A1A1C] hover:bg-[#F6F6F7] transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>

          {/* ── Right: Lang + Auth ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">

            {/* Language selector — pill with circular flag */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                aria-expanded={langMenuOpen}
                aria-label="Change language"
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-[#E8E8EC] bg-white text-[#0A0A0B] hover:border-[#0A0A0B]/20 hover:bg-[#FAFAFA] transition-colors"
              >
                <span className="w-5 h-5 rounded-full overflow-hidden inline-flex items-center justify-center text-base leading-none ring-1 ring-black/[0.08]">
                  {currentLang.flag}
                </span>
                <span className="text-[13px] font-bold tracking-wide">{currentLang.code.toUpperCase()}</span>
                <ChevronDown size={13} className={`text-[#5A5A62] transition-transform ${langMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-white ring-1 ring-[#E8E8EC] shadow-[0_8px_30px_rgba(10,10,11,0.10)] overflow-hidden z-50 max-h-64 overflow-y-auto">
                    {LANGUAGES.map((l) => {
                      const active = l.code === lang;
                      return (
                        <button
                          key={l.code}
                          onClick={() => { switchLang(l.code); setLangMenuOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                            active
                              ? "bg-[#FDECEE] text-[#E63946] font-semibold"
                              : "text-[#1A1A1C] hover:bg-[#F6F6F7]"
                          }`}
                        >
                          <span>{l.flag}</span>
                          <span>{l.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-[#E8E8EC] text-[#0A0A0B] hover:bg-[#FAFAFA] hover:border-[#0A0A0B]/20 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm"
                    style={{ background: colors.gradient }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <span className="text-sm font-medium max-w-[100px] truncate">
                    {user?.name ?? user?.email?.split("@")[0] ?? "Usuario"}
                  </span>
                  <ChevronDown size={12} className={`text-[#8A8A92] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white ring-1 ring-[#E8E8EC] shadow-[0_8px_30px_rgba(10,10,11,0.10)] overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-[#F1F1F4] bg-[#FAFAFA]">
                        <p className="text-sm font-semibold truncate text-[#0A0A0B]">{user?.name ?? "Usuario"}</p>
                        <p className="text-xs truncate text-[#5A5A62]">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { href: `/${lang}/dashboard?tab=documents`, icon: LayoutDashboard, label: t.nav_my_account },
                        ].map((item) => (
                          <Link key={item.href} href={item.href}>
                            <button
                              onClick={() => setUserMenuOpen(false)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A1A1C] hover:bg-[#F6F6F7] transition-colors text-left"
                            >
                              <item.icon size={15} />
                              {item.label}
                            </button>
                          </Link>
                        ))}
                        {user?.role === "admin" && (
                          <Link href={`/${lang}/admin`}>
                            <button
                              onClick={() => setUserMenuOpen(false)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#E63946] hover:bg-[#F6F6F7] transition-colors text-left"
                            >
                              <Settings size={15} />
                              Admin Panel
                            </button>
                          </Link>
                        )}
                        <div className="my-1 border-t border-[#F1F1F4]" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#E63946] hover:bg-[#F6F6F7] transition-colors text-left"
                        >
                          <LogOut size={15} />
                          {t.nav_logout}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={openLogin}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-[#1A1A1C] hover:bg-[#F6F6F7] transition-colors"
                >
                  {t.nav_login}
                </button>
                <button
                  onClick={openSignup}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0A0A0B] text-white hover:bg-[#1A1A1C] shadow-sm hover:shadow-md transition-all"
                >
                  {t.nav_signup}
                </button>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 rounded-lg text-[#0A0A0B] hover:bg-[#F6F6F7] transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#F1F1F4] bg-white px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) =>
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={() => { link.onClick!(); setMenuOpen(false); }}
                  className="text-sm font-medium text-left px-3 py-3 rounded-lg text-[#1A1A1C] hover:bg-[#F6F6F7] transition-colors"
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium px-3 py-3 rounded-lg block text-[#1A1A1C] hover:bg-[#F6F6F7] transition-colors"
                >
                  {link.label}
                </a>
              )
            )}

            {/* Language chips */}
            <div className="grid grid-cols-5 gap-1.5 pt-3 mt-2 border-t border-[#F1F1F4]">
              {LANGUAGES.map((l) => {
                const active = l.code === lang;
                return (
                  <button
                    key={l.code}
                    onClick={() => { switchLang(l.code); setMenuOpen(false); }}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? "bg-[#FDECEE] text-[#E63946] border-[#F2C1C6]"
                        : "text-[#1A1A1C] border-[#E8E8EC] hover:bg-[#F6F6F7]"
                    }`}
                  >
                    {l.flag} {l.code.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Auth */}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-[#F1F1F4]">
              {isAuthenticated ? (
                <>
                  <Link href={`/${lang}/dashboard?tab=documents`}>
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border border-[#E8E8EC] text-[#0A0A0B] hover:bg-[#FAFAFA] transition-colors"
                    >
                      <LayoutDashboard size={15} />
                      {t.nav_my_account}
                    </button>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-[#E8E8EC] text-[#E63946] hover:bg-[#FAFAFA] text-center transition-colors"
                  >
                    {t.nav_logout}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { openLogin(); setMenuOpen(false); }}
                    className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-[#E8E8EC] text-[#0A0A0B] hover:bg-[#FAFAFA] text-center transition-colors"
                  >
                    {t.nav_login}
                  </button>
                  <button
                    onClick={() => { openSignup(); setMenuOpen(false); }}
                    className="w-full px-4 py-3 text-sm font-semibold rounded-xl bg-[#0A0A0B] text-white text-center hover:bg-[#1A1A1C] shadow-sm hover:shadow-md transition-all"
                  >
                    {t.nav_signup}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />
    </>
  );
}
