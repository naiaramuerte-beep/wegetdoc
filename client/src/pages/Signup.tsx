/* =============================================================
   CloudPDF Signup Page — Deep Navy Pro design
   ============================================================= */

import { useState } from "react";
import { Link } from "wouter";
import { FileText, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import { brandName } from "@/lib/brand";

const benefits = [
  "Edición de PDF sin límites",
  "Conversión a múltiples formatos",
  "Firma digital de documentos",
  "Colaboración en tiempo real",
];

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Función de registro próximamente disponible");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
    >
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px oklch(0.10 0.04 250 / 0.5)" }}
      >
        {/* Left panel — benefits */}
        <div
          className="p-8 flex flex-col justify-between"
          style={{ backgroundColor: "oklch(0.22 0.04 250)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
              >
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-xl font-bold tracking-tight text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                PDF<span style={{ color: "oklch(0.55 0.22 260)" }}>Pro</span>
              </span>
            </div>

            <h2
              className="text-2xl font-bold text-white mb-3"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Empieza a editar hoy
            </h2>
            <p
              className="text-sm mb-8"
              style={{ color: "oklch(0.65 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Únete a millones de usuarios que confían en {brandName} para gestionar sus documentos.
            </p>

            <ul className="space-y-3">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.2)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "oklch(0.55 0.22 260)" }} />
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: "oklch(0.80 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p
            className="text-xs mt-8"
            style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Al registrarte, aceptas nuestros{" "}
            <a href="/terms" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
              Términos de uso
            </a>{" "}
            y{" "}
            <a href="/privacy" className="underline" style={{ color: "oklch(0.55 0.22 260)" }}>
              Política de privacidad
            </a>
            .
          </p>
        </div>

        {/* Right panel — form */}
        <div className="p-8" style={{ backgroundColor: "oklch(1 0 0)" }}>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
          >
            Crear cuenta
          </h1>
          <p
            className="text-sm mb-6"
            style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Crea tu cuenta de {brandName}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "oklch(0.25 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Nombre completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
                style={{
                  border: "1px solid oklch(0.88 0.01 250)",
                  backgroundColor: "oklch(0.99 0.003 250)",
                  color: "oklch(0.15 0.03 250)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)")
                }
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "oklch(0.25 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
                style={{
                  border: "1px solid oklch(0.88 0.01 250)",
                  backgroundColor: "oklch(0.99 0.003 250)",
                  color: "oklch(0.15 0.03 250)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)")
                }
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "oklch(0.25 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 pr-10"
                  style={{
                    border: "1px solid oklch(0.88 0.01 250)",
                    backgroundColor: "oklch(0.99 0.003 250)",
                    color: "oklch(0.15 0.03 250)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)")
                  }
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ color: "oklch(0.55 0.02 250)" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 mt-2"
              style={{
                backgroundColor: "oklch(0.55 0.22 260)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.48 0.22 260)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
              }
            >
              Crear cuenta
            </button>
          </form>

          <p
            className="text-sm text-center mt-6"
            style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold transition-colors duration-200"
              style={{ color: "oklch(0.55 0.22 260)" }}
            >
              Iniciar sesión
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs transition-colors duration-200"
              style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
