import { Link } from "wouter";
import { FileText, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
    >
      <div className="flex items-center gap-2 mb-12">
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

      <h1
        className="text-8xl md:text-9xl font-extrabold mb-6"
        style={{
          fontFamily: "'Sora', sans-serif",
          background: "linear-gradient(135deg, oklch(0.55 0.22 260), oklch(0.62 0.18 280))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        404
      </h1>

      <h2
        className="text-2xl font-bold text-white mb-3"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        Página no encontrada
      </h2>
      <p
        className="text-sm mb-8 max-w-md"
        style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
      >
        La página que estás buscando no existe o no está disponible. Verifica la URL o regresa al inicio.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            border: "1px solid oklch(0.35 0.04 250)",
            color: "oklch(0.75 0.02 250)",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "oklch(0.25 0.04 250)";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.75 0.02 250)";
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <Link href="/">
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
            style={{
              backgroundColor: "oklch(0.55 0.22 260)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "oklch(0.48 0.22 260)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "oklch(0.55 0.22 260)")
            }
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </Link>
      </div>
    </div>
  );
}
