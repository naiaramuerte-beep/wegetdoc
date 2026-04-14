/* =============================================================
   EditorPDF Signup Page — Verdant Gold design
   ============================================================= */

import { useState } from "react";
import { Link } from "wouter";
import { FileText, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import { brandName } from "@/lib/brand";

const benefits = [
  "Modificación de PDF sin restricciones",
  "Transformación a diversos formatos",
  "Rúbrica digital de archivos",
  "Trabajo en equipo en tiempo real",
];

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("El registro estará habilitado en breve");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0D47A1" }}
    >
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(13, 51, 17, 0.5)" }}
      >
        {/* Left panel — benefits */}
        <div
          className="p-8 flex flex-col justify-between"
          style={{ backgroundColor: "#1e293b" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#1565C0" }}
              >
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-xl font-bold tracking-tight text-white"
              >
                WeGet<span style={{ color: "#1565C0" }}>Doc</span>
              </span>
            </div>

            <h2
              className="text-2xl font-bold text-white mb-3"
            >
              Comienza a transformar tus documentos
            </h2>
            <p
              className="text-sm mb-8"
              style={{ color: "#94a3b8" }}
            >
              Únete a millones de profesionales que eligen {brandName} para gestionar sus archivos.
            </p>

            <ul className="space-y-3">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(76, 175, 80, 0.2)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "#42A5F5" }} />
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: "#e2e8f0" }}
                  >
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p
            className="text-xs mt-8"
            style={{ color: "#64748b" }}
          >
            Al crear tu cuenta, aceptas nuestras{" "}
            <a href="/terms" className="underline" style={{ color: "#1565C0" }}>
              Condiciones de servicio
            </a>{" "}
            y{" "}
            <a href="/privacy" className="underline" style={{ color: "#1565C0" }}>
              Normas de privacidad
            </a>
            .
          </p>
        </div>

        {/* Right panel — form */}
        <div className="p-8" style={{ backgroundColor: "#FFFFFF" }}>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: "#0f172a" }}
          >
            Registrar perfil
          </h1>
          <p
            className="text-sm mb-6"
            style={{ color: "#64748b" }}
          >
            Configura tu perfil en {brandName}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0f172a" }}
              >
                Tu nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
                style={{
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#1565C0")
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
                  (e.currentTarget.style.borderColor = "#1565C0")
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
                  placeholder="Al menos 8 caracteres"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 pr-10"
                  style={{
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#1565C0")
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

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 mt-2"
              style={{
                backgroundColor: "#1565C0",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#0D47A1")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#1565C0")
              }
            >
              Registrarme
            </button>
          </form>

          <p
            className="text-sm text-center mt-6"
            style={{ color: "#64748b" }}
          >
            ¿Ya dispones de un perfil?{" "}
            <Link
              href="/login"
              className="font-semibold transition-colors duration-200"
              style={{ color: "#1565C0" }}
            >
              Acceder a tu cuenta
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
    </div>
  );
}
