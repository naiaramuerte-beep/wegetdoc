/* =============================================================
   PDFPro Navbar — Deep Navy Pro design
   Dark navy background, electric blue accents, Sora font
   ============================================================= */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, FileText } from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const navLinks = [
    { href: "/#how-it-works", label: "Cómo funciona" },
    { href: "/pricing", label: "Precios" },
    { href: "/#faq", label: "FAQ" },
  ];

  return (
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
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors duration-200"
              style={{
                color: "oklch(0.75 0.02 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "oklch(0.95 0.01 250)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "oklch(0.75 0.02 250)")
              }
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <button
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200"
              style={{
                color: "oklch(0.85 0.02 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "oklch(0.25 0.04 250)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "oklch(0.85 0.02 250)";
              }}
            >
              Iniciar sesión
            </button>
          </Link>
          <Link href="/signup">
            <button
              className="px-4 py-2 text-sm font-semibold rounded-md text-white transition-all duration-200"
              style={{
                backgroundColor: "oklch(0.55 0.22 260)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "oklch(0.48 0.22 260)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "oklch(0.55 0.22 260)")
              }
            >
              Registrarse
            </button>
          </Link>
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
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium"
              style={{
                color: "oklch(0.75 0.02 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "oklch(0.28 0.04 250)" }}>
            <Link href="/login">
              <button
                className="w-full px-4 py-2 text-sm font-medium rounded-md text-center"
                style={{
                  color: "oklch(0.85 0.02 250)",
                  border: "1px solid oklch(0.35 0.04 250)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Iniciar sesión
              </button>
            </Link>
            <Link href="/signup">
              <button
                className="w-full px-4 py-2 text-sm font-semibold rounded-md text-white text-center"
                style={{
                  backgroundColor: "oklch(0.55 0.22 260)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Registrarse
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
