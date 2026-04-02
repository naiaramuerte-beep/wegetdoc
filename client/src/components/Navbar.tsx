/* =============================================================
   CloudPDF Navbar — "Lumina" design
   Clean white glass navbar, indigo-violet accents
   Responsive: mobile hamburger (<md), desktop nav (md+)
   ============================================================= */

import { useState, useEffect } from "react";
import { logoParts, colors } from "@/lib/brand";
import { Link, useLocation } from "wouter";
import {
  Menu, X, LogOut, LayoutDashboard, Crown,
  Globe, ChevronDown, Settings, FileText,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import ContactModal from "./ContactModal";
import AuthModal from "./AuthModal";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

const INDIGO = colors.primary;
const INDIGO_HOVER_BG = colors.lightBg;
const TEXT_MAIN = "oklch(0.13 0.015 264)";
const TEXT_MUTED = "oklch(0.48 0.015 264)";
const BORDER = "oklch(0.91 0.008 264)";

export default function Navbar({ compact }: { compact?: boolean } = {}) {
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

  const navLinks = [
    { href: `/${lang}/#how-it-works`, label: t.nav_how_it_works },
    { href: `/${lang}/pricing`, label: t.nav_pricing },
    { href: `/${lang}/blog`, label: "Blog" },
    { href: `/${lang}/#faq`, label: t.nav_faq },
    { href: "#contact", label: t.nav_contact, onClick: () => setContactOpen(true) },
  ];

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

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          scrolled || menuOpen ? "navbar-glass shadow-sm" : "bg-white border-b"
        }`}
        style={{ borderColor: BORDER }}
      >
        <div className="container flex items-center justify-between h-14 md:h-16">

          {/* ── Logo ── */}
          <Link href={`/${lang}`} className="flex items-center gap-2 group shrink-0">
            {/* Cloud + PDF icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: colors.gradient }}
            >
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontFamily: "'Sora', sans-serif" }}>
              <span className="font-semibold text-lg" style={{ color: TEXT_MAIN }}>{logoParts[0]}</span>
              <span
                className="font-extrabold text-lg"
                style={{
                  background: colors.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {logoParts[1]}
              </span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) =>
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={link.onClick}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{ color: TEXT_MUTED, background: "none", border: "none" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = TEXT_MAIN;
                    e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = TEXT_MUTED;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = TEXT_MAIN;
                    e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = TEXT_MUTED;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {link.label}
                </a>
              )
            )}
          </nav>

          {/* ── Right: Lang + Auth ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150"
                style={{ color: TEXT_MUTED }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG;
                  e.currentTarget.style.color = TEXT_MAIN;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = TEXT_MUTED;
                }}
              >
                <Globe size={14} />
                <span className="font-medium text-xs">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                <ChevronDown size={11} />
              </button>
              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-lg border overflow-hidden z-50 max-h-64 overflow-y-auto"
                    style={{ backgroundColor: "white", borderColor: BORDER, boxShadow: "0 8px 30px oklch(0.13 0.015 264 / 0.10)" }}
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { switchLang(l.code); setLangMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                        style={{
                          color: l.code === lang ? INDIGO : TEXT_MUTED,
                          backgroundColor: l.code === lang ? "oklch(0.96 0.03 264)" : "transparent",
                          fontWeight: l.code === lang ? "600" : "400",
                        }}
                        onMouseEnter={(e) => { if (l.code !== lang) e.currentTarget.style.backgroundColor = "oklch(0.98 0.005 264)"; }}
                        onMouseLeave={(e) => { if (l.code !== lang) e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl border transition-all duration-150"
                  style={{ borderColor: BORDER, color: TEXT_MAIN }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "oklch(0.47 0.24 264 / 0.4)";
                    e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = BORDER;
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: colors.gradient }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <span className="text-sm font-medium max-w-[100px] truncate">
                    {user?.name ?? user?.email?.split("@")[0] ?? "Usuario"}
                  </span>
                  <ChevronDown size={12} style={{ color: TEXT_MUTED }} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-lg border overflow-hidden z-50"
                      style={{ backgroundColor: "white", borderColor: BORDER, boxShadow: "0 8px 30px oklch(0.13 0.015 264 / 0.10)" }}
                    >
                      <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, backgroundColor: "oklch(0.985 0.003 264)" }}>
                        <p className="text-sm font-semibold truncate" style={{ color: TEXT_MAIN }}>{user?.name ?? "Usuario"}</p>
                        <p className="text-xs truncate" style={{ color: TEXT_MUTED }}>{user?.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { href: `/${lang}/dashboard`, icon: LayoutDashboard, label: t.nav_my_account },
                          { href: `/${lang}/dashboard?tab=billing`, icon: Crown, label: t.nav_billing },
                        ].map((item) => (
                          <Link key={item.href} href={item.href}>
                            <button
                              onClick={() => setUserMenuOpen(false)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left"
                              style={{ color: TEXT_MUTED }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "oklch(0.985 0.003 264)"; e.currentTarget.style.color = TEXT_MAIN; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = TEXT_MUTED; }}
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
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left"
                              style={{ color: "oklch(0.55 0.20 40)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "oklch(0.985 0.003 264)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                              <Settings size={15} />
                              Admin Panel
                            </button>
                          </Link>
                        )}
                        <div className="my-1 border-t" style={{ borderColor: BORDER }} />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left"
                          style={{ color: "oklch(0.55 0.22 25)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "oklch(0.985 0.003 264)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG; e.currentTarget.style.color = TEXT_MAIN; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = TEXT_MUTED; }}
                >
                  {t.nav_login}
                </button>
                <button
                  onClick={openSignup}
                  className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all duration-150 btn-gradient"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {t.nav_signup}
                </button>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: TEXT_MAIN }}
            onClick={() => setMenuOpen(!menuOpen)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-4 py-4 flex flex-col gap-2"
            style={{ borderColor: BORDER, backgroundColor: "white" }}
          >
            {navLinks.map((link) =>
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={() => { link.onClick!(); setMenuOpen(false); }}
                  className="text-sm font-medium text-left px-3 py-2.5 rounded-lg transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG; e.currentTarget.style.color = TEXT_MAIN; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = TEXT_MUTED; }}
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium px-3 py-2.5 rounded-lg transition-colors block"
                  style={{ color: TEXT_MUTED }}
                  onClick={() => setMenuOpen(false)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = INDIGO_HOVER_BG; e.currentTarget.style.color = TEXT_MAIN; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = TEXT_MUTED; }}
                >
                  {link.label}
                </a>
              )
            )}

            {/* Language flags */}
            <div
              className="flex flex-wrap gap-1.5 pt-3 mt-1 border-t"
              style={{ borderColor: BORDER }}
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { switchLang(l.code); setMenuOpen(false); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border"
                  style={{
                    color: l.code === lang ? INDIGO : TEXT_MUTED,
                    backgroundColor: l.code === lang ? "oklch(0.96 0.03 264)" : "transparent",
                    borderColor: l.code === lang ? "oklch(0.47 0.24 264 / 0.3)" : BORDER,
                  }}
                >
                  {l.flag} {l.code.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Auth */}
            <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: BORDER }}>
              {isAuthenticated ? (
                <>
                  <Link href={`/${lang}/dashboard`}>
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border"
                      style={{ color: TEXT_MAIN, borderColor: BORDER }}
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} />
                      {t.nav_my_account}
                    </button>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-sm font-medium rounded-xl border text-center"
                    style={{ color: "oklch(0.55 0.22 25)", borderColor: BORDER }}
                  >
                    {t.nav_logout}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { openLogin(); setMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-sm font-medium rounded-xl border text-center"
                    style={{ color: TEXT_MAIN, borderColor: BORDER }}
                  >
                    {t.nav_login}
                  </button>
                  <button
                    onClick={() => { openSignup(); setMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl text-white text-center btn-gradient"
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
