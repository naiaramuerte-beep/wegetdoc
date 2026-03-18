/* =============================================================
   PDFPro Navbar — Deep Navy Pro design
   Incluye: modal de contacto, dashboard, estado de auth
   ============================================================= */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, FileText, User, LogOut, LayoutDashboard, Crown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import ContactModal from "./ContactModal";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const navLinks = [
    { href: "/#how-it-works", label: "Cómo funciona" },
    { href: "/precios", label: "Precios" },
    { href: "/#faq", label: "FAQ" },
    { href: "#contact", label: "Contacto", onClick: () => setContactOpen(true) },
  ];

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
      >
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
            >
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-white font-bold text-xl tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              PDF<span style={{ color: "oklch(0.55 0.22 260)" }}>Pro</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={link.onClick}
                  className="text-sm font-medium transition-colors duration-200"
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
                  className="text-sm font-medium transition-colors duration-200"
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

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                  style={{ color: "oklch(0.85 0.02 250)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <span className="text-sm font-medium max-w-[120px] truncate">
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
                        <Link href="/dashboard">
                          <button
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                            style={{ color: "oklch(0.8 0.02 250)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <LayoutDashboard size={15} />
                            Mi panel
                          </button>
                        </Link>
                        <Link href="/dashboard?tab=billing">
                          <button
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                            style={{ color: "oklch(0.8 0.02 250)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <Crown size={15} />
                            Facturación
                          </button>
                        </Link>
                        <div className="my-1 border-t" style={{ borderColor: "oklch(0.28 0.04 250)" }} />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                          style={{ color: "oklch(0.7 0.15 25)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <LogOut size={15} />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200"
                    style={{
                      color: "oklch(0.85 0.02 250)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "oklch(0.85 0.02 250)";
                    }}
                  >
                    Iniciar sesión
                  </button>
                </a>
                <a href={getLoginUrl()}>
                  <button
                    className="px-4 py-2 text-sm font-semibold rounded-md text-white transition-all duration-200"
                    style={{
                      backgroundColor: "oklch(0.55 0.22 260)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.48 0.22 260)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")}
                  >
                    Registrarse
                  </button>
                </a>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-4 py-4 flex flex-col gap-4"
            style={{
              backgroundColor: "oklch(0.18 0.04 250)",
              borderColor: "oklch(0.28 0.04 250)",
            }}
          >
            {navLinks.map((link) => (
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={() => { link.onClick!(); setMenuOpen(false); }}
                  className="text-sm font-medium text-left"
                  style={{ color: "oklch(0.75 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.75 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              )
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "oklch(0.28 0.04 250)" }}>
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <button
                      className="w-full px-4 py-2 text-sm font-medium rounded-md text-center flex items-center justify-center gap-2"
                      style={{ color: "oklch(0.85 0.02 250)", border: "1px solid oklch(0.35 0.04 250)" }}
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} />
                      Mi panel
                    </button>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md text-center"
                    style={{ color: "oklch(0.7 0.15 25)", border: "1px solid oklch(0.35 0.04 250)" }}
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <a href={getLoginUrl()}>
                    <button
                      className="w-full px-4 py-2 text-sm font-medium rounded-md text-center"
                      style={{ color: "oklch(0.85 0.02 250)", border: "1px solid oklch(0.35 0.04 250)" }}
                    >
                      Iniciar sesión
                    </button>
                  </a>
                  <a href={getLoginUrl()}>
                    <button
                      className="w-full px-4 py-2 text-sm font-semibold rounded-md text-white text-center"
                      style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
                    >
                      Registrarse
                    </button>
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Contact Modal */}
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
