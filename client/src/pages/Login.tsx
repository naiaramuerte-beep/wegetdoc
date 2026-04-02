/* =============================================================
   CloudPDF Login Page — Deep Navy Pro design
   ============================================================= */

import { useState } from "react";
import { Link } from "wouter";
import { FileText, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { brandName } from "@/lib/brand";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Función de autenticación próximamente disponible");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: "oklch(1 0 0)",
          boxShadow: "0 24px 64px oklch(0.10 0.04 250 / 0.4)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
          >
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
          >
            PDF<span style={{ color: "oklch(0.55 0.22 260)" }}>Pro</span>
          </span>
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
        >
          Iniciar sesión
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
        >
          Accede a tu cuenta de {brandName}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
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

          <div className="flex justify-end">
            <a
              href="#"
              className="text-xs transition-colors duration-200"
              style={{ color: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200"
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
            Iniciar sesión
          </button>
        </form>

        <p
          className="text-sm text-center mt-6"
          style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
        >
          ¿No tienes cuenta?{" "}
          <Link
            href="/signup"
            className="font-semibold transition-colors duration-200"
            style={{ color: "oklch(0.55 0.22 260)" }}
          >
            Regístrate ahora
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
  );
}
