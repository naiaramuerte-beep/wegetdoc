import { useEffect } from "react";
import { CheckCircle, ArrowRight, FileText } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function PaymentSuccess() {
  const utils = trpc.useUtils();

  useEffect(() => {
    // Invalidate subscription status so it refreshes
    utils.subscription.status.invalidate();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "oklch(0.98 0.005 250)" }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.12)" }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: "oklch(0.55 0.22 260)" }} />
      </div>

      <h1
        className="text-3xl font-extrabold mb-3"
        style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
      >
        ¡Pago completado!
      </h1>
      <p
        className="text-base mb-8 max-w-md"
        style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
      >
        Tu suscripción está activa. Ya puedes descargar y usar todas las herramientas PDF sin restricciones.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
            style={{
              backgroundColor: "oklch(0.55 0.22 260)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <FileText className="w-4 h-4" />
            Ir al editor PDF
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      <div
        className="mt-10 p-5 rounded-xl max-w-sm w-full text-left"
        style={{
          backgroundColor: "oklch(1 0 0)",
          border: "1px solid oklch(0.90 0.01 250)",
        }}
      >
        <h3
          className="font-bold mb-3 text-sm"
          style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
        >
          ¿Qué puedes hacer ahora?
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "oklch(0.40 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
          {[
            "Descargar PDFs editados sin marca de agua",
            "Añadir texto, firmas y anotaciones",
            "Comprimir, fusionar y dividir PDFs",
            "Convertir páginas a imágenes JPG",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
