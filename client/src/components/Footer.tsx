/* =============================================================
   PDFPro Footer — Deep Navy Pro design
   Dark navy background, matching the navbar
   ============================================================= */

import { FileText, Facebook, Linkedin, Twitter } from "lucide-react";
import { Link } from "wouter";

export default function Footer() {
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
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
              El editor de PDF online gratuito más completo. Convierte, edita y firma tus documentos desde cualquier dispositivo.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="#"
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-200"
                style={{ backgroundColor: "oklch(0.25 0.04 250)", color: "oklch(0.70 0.02 250)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)";
                  e.currentTarget.style.color = "oklch(0.70 0.02 250)";
                }}
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-200"
                style={{ backgroundColor: "oklch(0.25 0.04 250)", color: "oklch(0.70 0.02 250)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)";
                  e.currentTarget.style.color = "oklch(0.70 0.02 250)";
                }}
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-200"
                style={{ backgroundColor: "oklch(0.25 0.04 250)", color: "oklch(0.70 0.02 250)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)";
                  e.currentTarget.style.color = "oklch(0.70 0.02 250)";
                }}
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* PDFPro links */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              PDFPro
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/pricing", label: "Precios" },
                { href: "/#how-it-works", label: "Cómo funciona" },
                { href: "/#faq", label: "FAQ" },
                { href: "#contact", label: "Contacto" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-200"
                    style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "oklch(0.55 0.22 260)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "oklch(0.60 0.02 250)")
                    }
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
              Legal
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/terms", label: "Términos de uso" },
                { href: "/privacy", label: "Política de privacidad" },
                { href: "/cookies", label: "Política de cookies" },
                { href: "/gdpr", label: "RGPD" },
                { href: "/unsubscribe", label: "Cancelar suscripción" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-200"
                    style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "oklch(0.55 0.22 260)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "oklch(0.60 0.02 250)")
                    }
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Herramientas */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Herramientas
            </h4>
            <ul className="space-y-2">
              {[
                { href: "/", label: "Editor de PDF" },
                { href: "/", label: "Convertir PDF" },
                { href: "/", label: "Comprimir PDF" },
                { href: "/", label: "Fusionar PDF" },
                { href: "/", label: "Dividir PDF" },
                { href: "/", label: "Firmar PDF" },
              ].map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors duration-200"
                    style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "oklch(0.55 0.22 260)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "oklch(0.60 0.02 250)")
                    }
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
            © 2026 PDFPro. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <select
              className="text-xs rounded-md px-2 py-1 border"
              style={{
                backgroundColor: "oklch(0.22 0.04 250)",
                color: "oklch(0.70 0.02 250)",
                borderColor: "oklch(0.30 0.04 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <option>🌐 Español</option>
              <option>🌐 English</option>
              <option>🌐 Français</option>
            </select>
            <select
              className="text-xs rounded-md px-2 py-1 border"
              style={{
                backgroundColor: "oklch(0.22 0.04 250)",
                color: "oklch(0.70 0.02 250)",
                borderColor: "oklch(0.30 0.04 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <option>$ USD</option>
              <option>€ EUR</option>
              <option>£ GBP</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}
