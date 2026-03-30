/* =============================================================
   CloudPDF Navbar — Deep Navy Pro design
   Auth propia con AuthModal + selector de idioma
   Responsive: mobile hamburger (<md), desktop nav (md+)
   ============================================================= */

import { useState, useEffect } from "react";
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

  // Auto-open login modal when redirected with ?login=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "true" && !isAuthenticated) {
      openLogin();
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [isAuthenticated]);

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
      >
        <div className="container flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-1 group shrink-0">
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              {/* Cloud icon */}
              <path d="M25.5 12.5C25.5 12.5 26 12 26 11c0-2.8-2.2-5-5-5-.5 0-1 .1-1.5.2C18.3 3.7 15.9 2 13 2 9.4 2 6.5 4.9 6.5 8.5c0 .2 0 .4 0 .6C4.5 9.6 3 11.4 3 13.5 3 16 5 18 7.5 18h16c2.2 0 4-1.8 4-4 0-1.5-.8-2.8-2-3.5z" fill="oklch(0.55 0.22 260)" />
              {/* Small document on cloud */}
              <rect x="13" y="6" width="6" height="8" rx="0.8" fill="white" fillOpacity="0.9" />
              <path d="M16.5 6V6L19 8.5H16.5V6Z" fill="oklch(0.45 0.18 260)" />
            </svg>
            <span
              className="tracking-tight leading-none"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <span className="font-medium text-xl md:text-2xl" style={{ color: "rgba(255,255,255,0.85)" }}>Cloud</span><span className="font-extrabold text-xl md:text-2xl" style={{ color: "oklch(0.55 0.22 260)" }}>PDF</span>
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
