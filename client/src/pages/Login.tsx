/* =============================================================
   WeGetDoc Login Page — Verdant Gold design
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
    toast.info("La autenticación estará habilitada en breve");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#14532d" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "0 24px 64px rgba(13, 51, 17, 0.4)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#1B5E20" }}
          >
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: "#0f172a" }}
          >
            WeGet<span style={{ color: "#1B5E20" }}>Doc</span>
          </span>
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "#0f172a" }}
        >
          Acceder a tu cuenta
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "#64748b" }}
        >
          Ingresa tus credenciales de {brandName}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0f172a" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
              style={{
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                color: "#0f172a",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "#1B5E20")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "#e2e8f0")
              }
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0f172a" }}
            >
              Clave de acceso
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 pr-10"
                style={{
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#1B5E20")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "#e2e8f0")
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: "#64748b" }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <a
              href="#"
              className="text-xs transition-colors duration-200"
              style={{ color: "#1B5E20" }}
            >
              ¿No recuerdas tus credenciales?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200"
            style={{
              backgroundColor: "#1B5E20",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#14532d")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#1B5E20")
            }
          >
            Acceder
          </button>
        </form>

        <p
          className="text-sm text-center mt-6"
          style={{ color: "#64748b" }}
        >
          ¿Aún no tienes perfil?{" "}
          <Link
            href="/signup"
            className="font-semibold transition-colors duration-200"
            style={{ color: "#1B5E20" }}
          >
            Crea tu cuenta
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs transition-colors duration-200"
            style={{ color: "#64748b" }}
          >
            ← Regresar a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}
