/* =============================================================
   PDFPro Navbar — Deep Navy Pro design
   Auth propia con AuthModal + selector de idioma
   Responsive: mobile hamburger (<md), desktop nav (md+)
   ============================================================= */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, FileText, LogOut, LayoutDashboard, Crown, Globe, ChevronDown, Settings } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import ContactModal from "./ContactModal";
import AuthModal from "./AuthModal";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Navbar({ compact }: { compact?: boolean } = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { lang, switchLang, t } = useLanguage();

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  const navLinks = [
    { href: `/${lang}/#how-it-works`, label: t.nav_how_it_works },
    { href: `/${lang}/pricing`, label: t.nav_pricing },
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

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
      >
        <div className="container flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-2 group shrink-0">
            {/* Document + pencil icon */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              {/* Document outline */}
              <rect x="3" y="2" width="16" height="20" rx="2.5" stroke="white" strokeWidth="1.8" fill="none"/>
              <path d="M15 2v5h4" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
              {/* Pencil */}
              <path d="M13 18.5l8-8 2.5 2.5-8 8L13 21z" fill="oklch(0.55 0.22 260)" stroke="oklch(0.55 0.22 260)" strokeWidth="0.5"/>
              <path d="M21 10.5l2.5 2.5" stroke="oklch(0.55 0.22 260)" strokeWidth="1.5"/>
            </svg>
            <span
              className="tracking-tight leading-none"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <span className="font-light text-xs md:text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>edit</span><span className="font-extrabold text-xl md:text-2xl" style={{ color: "oklch(0.55 0.22 260)" }}>PDF</span>
            </span>
          </Link>

          {/* Desktop Nav — visible on md+ */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-7">
            {navLinks.map((link) => (
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={link.onClick}
                  className="text-sm font-medium transition-colors duration-200 whitespace-nowrap"
                  style={{
                    color: "oklch(0.75 0.02 250)",
                    fontFamily: "'DM Sans', sans-serif",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.95 0.01 250)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.75 0.02 250)")}
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium transition-colors duration-200 whitespace-nowrap"
                  style={{
                    color: "oklch(0.75 0.02 250)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.95 0.01 250)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.75 0.02 250)")}
                >
                  {link.label}
                </a>
              )
            ))}
          </nav>

          {/* Right side: Lang + Auth — visible on md+ */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2 shrink-0">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 lg:gap-1.5 px-2 py-1.5 rounded-lg text-xs lg:text-sm transition-colors"
                style={{ color: "oklch(0.75 0.02 250)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Globe size={13} />
                <span className="font-medium">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                <ChevronDown size={11} />
              </button>
              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl border overflow-hidden z-50 max-h-64 overflow-y-auto"
                    style={{ backgroundColor: "oklch(0.18 0.04 250)", borderColor: "oklch(0.28 0.04 250)" }}
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { switchLang(l.code); setLangMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
                        style={{
                          color: l.code === lang ? "white" : "oklch(0.75 0.02 250)",
                          backgroundColor: l.code === lang ? "oklch(0.28 0.04 250)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (l.code !== lang) e.currentTarget.style.backgroundColor = "oklch(0.22 0.04 250)"; }}
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
                  className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg transition-colors"
                  style={{ color: "oklch(0.85 0.02 250)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <span className="text-xs lg:text-sm font-medium max-w-[80px] lg:max-w-[120px] truncate hidden lg:block">
                    {user?.name ?? user?.email?.split("@")[0] ?? "Usuario"}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl border overflow-hidden z-50"
                      style={{ backgroundColor: "oklch(0.18 0.04 250)", borderColor: "oklch(0.28 0.04 250)" }}
                    >
                      <div className="px-4 py-3 border-b" style={{ borderColor: "oklch(0.28 0.04 250)" }}>
                        <p className="text-white text-sm font-medium truncate">{user?.name ?? "Usuario"}</p>
                        <p className="text-xs truncate" style={{ color: "oklch(0.6 0.02 250)" }}>{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link href={`/${lang}/dashboard`}>
                          <button
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                            style={{ color: "oklch(0.8 0.02 250)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <LayoutDashboard size={15} />
                            {t.nav_my_account}
                          </button>
                        </Link>
                        <Link href={`/${lang}/dashboard?tab=billing`}>
                          <button
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                            style={{ color: "oklch(0.8 0.02 250)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <Crown size={15} />
                            {t.nav_billing}
                          </button>
                        </Link>
                        {user?.role === "admin" && (
                          <Link href={`/${lang}/admin`}>
                            <button
                              onClick={() => setUserMenuOpen(false)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                              style={{ color: "oklch(0.75 0.2 60)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              <Settings size={15} />
                              Admin Panel
                            </button>
                          </Link>
                        )}
                        <div className="my-1 border-t" style={{ borderColor: "oklch(0.28 0.04 250)" }} />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "oklch(0.7 0.15 25)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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
                  className="px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap"
                  style={{ color: "oklch(0.85 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "oklch(0.85 0.02 250)"; }}
                >
                  {t.nav_login}
                </button>
                <button
                  onClick={openSignup}
                  className="px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md text-white transition-all duration-200 whitespace-nowrap"
                  style={{ backgroundColor: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.48 0.22 260)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")}
                >
                  {t.nav_signup}
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger — only on mobile (<md) */}
          <button
            className="md:hidden text-white p-2 shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu — only on mobile (<md) */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-4 py-4 flex flex-col gap-3"
            style={{ backgroundColor: "oklch(0.18 0.04 250)", borderColor: "oklch(0.28 0.04 250)" }}
          >
            {/* Nav links */}
            {navLinks.map((link) => (
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={() => { link.onClick!(); setMenuOpen(false); }}
                  className="text-sm font-medium text-left py-1.5"
                  style={{ color: "oklch(0.75 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium py-1.5"
                  style={{ color: "oklch(0.75 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              )
            ))}

            {/* Language selector */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t" style={{ borderColor: "oklch(0.28 0.04 250)" }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { switchLang(l.code); setMenuOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    color: l.code === lang ? "white" : "oklch(0.65 0.02 250)",
                    backgroundColor: l.code === lang ? "oklch(0.35 0.04 250)" : "oklch(0.22 0.04 250)",
                  }}
                >
                  {l.flag} {l.code.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Auth buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "oklch(0.28 0.04 250)" }}>
              {isAuthenticated ? (
                <>
                  <Link href={`/${lang}/dashboard`}>
                    <button
                      className="w-full px-4 py-2 text-sm font-medium rounded-md text-center flex items-center justify-center gap-2"
                      style={{ color: "oklch(0.85 0.02 250)", border: "1px solid oklch(0.35 0.04 250)" }}
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} />
                      {t.nav_my_account}
                    </button>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md text-center"
                    style={{ color: "oklch(0.7 0.15 25)", border: "1px solid oklch(0.35 0.04 250)" }}
                  >
                    {t.nav_logout}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { openLogin(); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md text-center"
                    style={{ color: "oklch(0.85 0.02 250)", border: "1px solid oklch(0.35 0.04 250)" }}
                  >
                    {t.nav_login}
                  </button>
                  <button
                    onClick={() => { openSignup(); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-md text-white text-center"
                    style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
                  >
                    {t.nav_signup}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modals */}
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />
    </>
  );
}
