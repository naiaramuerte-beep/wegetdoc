/* =============================================================
   PDFPro Tools Page — All PDF tools in one place
   Deep Navy Pro design
   ============================================================= */

import { toast } from "sonner";
import {
  FileText,
  Layers,
  PenTool,
  Share2,
  MessageSquare,
  Type,
  Image,
  Lock,
  Scissors,
  Merge,
  Minimize2,
  RotateCcw,
  FileImage,
  FileSpreadsheet,
  Presentation,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UploadZone from "@/components/UploadZone";

const toolGroups = [
  {
    category: "Editar y firmar",
    tools: [
      {
        icon: Type,
        title: "Editar texto PDF",
        description: "Reemplaza o añade texto con fuentes personalizables directamente en tu PDF.",
        color: "oklch(0.55 0.22 260)",
        bg: "oklch(0.55 0.22 260 / 0.08)",
      },
      {
        icon: PenTool,
        title: "Firmar PDF",
        description: "Añade tu firma digital usando el cursor, escribiendo o subiendo una imagen.",
        color: "oklch(0.55 0.22 260)",
        bg: "oklch(0.55 0.22 260 / 0.08)",
      },
      {
        icon: MessageSquare,
        title: "Anotar PDF",
        description: "Añade comentarios, notas y anotaciones a tus documentos PDF.",
        color: "oklch(0.55 0.22 260)",
        bg: "oklch(0.55 0.22 260 / 0.08)",
      },
      {
        icon: Image,
        title: "Editar imágenes",
        description: "Modifica, reemplaza o elimina imágenes en tus archivos PDF.",
        color: "oklch(0.55 0.22 260)",
        bg: "oklch(0.55 0.22 260 / 0.08)",
      },
      {
        icon: Lock,
        title: "Proteger PDF",
        description: "Añade contraseña y cifrado para proteger tus documentos confidenciales.",
        color: "oklch(0.55 0.22 260)",
        bg: "oklch(0.55 0.22 260 / 0.08)",
      },
      {
        icon: Share2,
        title: "Compartir PDF",
        description: "Comparte tus documentos por enlace o correo electrónico fácilmente.",
        color: "oklch(0.55 0.22 260)",
        bg: "oklch(0.55 0.22 260 / 0.08)",
      },
    ],
  },
  {
    category: "Organizar páginas",
    tools: [
      {
        icon: Layers,
        title: "Reorganizar páginas",
        description: "Mueve, reordena y organiza las páginas de tu PDF con facilidad.",
        color: "oklch(0.50 0.18 290)",
        bg: "oklch(0.50 0.18 290 / 0.08)",
      },
      {
        icon: Scissors,
        title: "Dividir PDF",
        description: "Divide un PDF en múltiples archivos por páginas o rangos específicos.",
        color: "oklch(0.50 0.18 290)",
        bg: "oklch(0.50 0.18 290 / 0.08)",
      },
      {
        icon: Merge,
        title: "Fusionar PDFs",
        description: "Combina múltiples archivos PDF en un único documento organizado.",
        color: "oklch(0.50 0.18 290)",
        bg: "oklch(0.50 0.18 290 / 0.08)",
      },
      {
        icon: RotateCcw,
        title: "Rotar páginas",
        description: "Rota páginas individuales o todas las páginas de tu PDF.",
        color: "oklch(0.50 0.18 290)",
        bg: "oklch(0.50 0.18 290 / 0.08)",
      },
      {
        icon: Minimize2,
        title: "Comprimir PDF",
        description: "Reduce el tamaño de tus PDFs sin perder calidad visual.",
        color: "oklch(0.50 0.18 290)",
        bg: "oklch(0.50 0.18 290 / 0.08)",
      },
      {
        icon: FileText,
        title: "Eliminar páginas",
        description: "Elimina páginas específicas o no deseadas de tu documento PDF.",
        color: "oklch(0.50 0.18 290)",
        bg: "oklch(0.50 0.18 290 / 0.08)",
      },
    ],
  },
  {
    category: "Convertir desde PDF",
    tools: [
      {
        icon: FileText,
        title: "PDF a Word",
        description: "Convierte tus PDFs a documentos Word editables manteniendo el formato.",
        color: "oklch(0.45 0.18 145)",
        bg: "oklch(0.45 0.18 145 / 0.08)",
      },
      {
        icon: FileSpreadsheet,
        title: "PDF a Excel",
        description: "Extrae tablas y datos de PDFs a hojas de cálculo Excel.",
        color: "oklch(0.45 0.18 145)",
        bg: "oklch(0.45 0.18 145 / 0.08)",
      },
      {
        icon: Presentation,
        title: "PDF a PowerPoint",
        description: "Transforma presentaciones PDF en diapositivas PowerPoint editables.",
        color: "oklch(0.45 0.18 145)",
        bg: "oklch(0.45 0.18 145 / 0.08)",
      },
      {
        icon: FileImage,
        title: "PDF a JPG",
        description: "Convierte páginas de PDF a imágenes JPG de alta calidad.",
        color: "oklch(0.45 0.18 145)",
        bg: "oklch(0.45 0.18 145 / 0.08)",
      },
      {
        icon: FileImage,
        title: "PDF a PNG",
        description: "Exporta páginas de PDF como imágenes PNG con fondo transparente.",
        color: "oklch(0.45 0.18 145)",
        bg: "oklch(0.45 0.18 145 / 0.08)",
      },
      {
        icon: FileText,
        title: "PDF a HTML",
        description: "Convierte documentos PDF a formato HTML para publicación web.",
        color: "oklch(0.45 0.18 145)",
        bg: "oklch(0.45 0.18 145 / 0.08)",
      },
    ],
  },
  {
    category: "Convertir a PDF",
    tools: [
      {
        icon: FileText,
        title: "Word a PDF",
        description: "Convierte documentos Word (.doc, .docx) a PDF con formato perfecto.",
        color: "oklch(0.60 0.20 30)",
        bg: "oklch(0.60 0.20 30 / 0.08)",
      },
      {
        icon: FileSpreadsheet,
        title: "Excel a PDF",
        description: "Transforma hojas de cálculo Excel a PDF manteniendo tablas y datos.",
        color: "oklch(0.60 0.20 30)",
        bg: "oklch(0.60 0.20 30 / 0.08)",
      },
      {
        icon: Presentation,
        title: "PowerPoint a PDF",
        description: "Convierte presentaciones PowerPoint a PDF para compartir fácilmente.",
        color: "oklch(0.60 0.20 30)",
        bg: "oklch(0.60 0.20 30 / 0.08)",
      },
      {
        icon: FileImage,
        title: "JPG a PDF",
        description: "Convierte imágenes JPG a PDF de una o varias páginas.",
        color: "oklch(0.60 0.20 30)",
        bg: "oklch(0.60 0.20 30 / 0.08)",
      },
      {
        icon: FileImage,
        title: "PNG a PDF",
        description: "Transforma imágenes PNG a documentos PDF profesionales.",
        color: "oklch(0.60 0.20 30)",
        bg: "oklch(0.60 0.20 30 / 0.08)",
      },
      {
        icon: FileText,
        title: "HTML a PDF",
        description: "Convierte páginas web HTML a documentos PDF para archivar.",
        color: "oklch(0.60 0.20 30)",
        bg: "oklch(0.60 0.20 30 / 0.08)",
      },
    ],
  },
];

export default function Tools() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.98 0.005 250)" }}>
      <Navbar />

      {/* Hero */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1
              className="text-4xl md:text-5xl font-extrabold mb-4"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              Todas las herramientas PDF
            </h1>
            <p
              className="text-lg"
              style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Todo lo que necesitas para trabajar con PDFs en un solo lugar
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-16">
            <UploadZone compact />
          </div>

          {/* Tool groups */}
          <div className="space-y-16">
            {toolGroups.map((group, gi) => (
              <div key={gi}>
                <h2
                  className="text-2xl font-bold mb-6"
                  style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
                >
                  {group.category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {group.tools.map((tool, ti) => (
                    <button
                      key={ti}
                      className="flex items-start gap-4 p-5 rounded-xl text-left transition-all duration-200"
                      style={{
                        backgroundColor: "oklch(1 0 0)",
                        border: "1px solid oklch(0.90 0.01 250)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = tool.color + " / 0.4";
                        e.currentTarget.style.boxShadow = `0 8px 24px ${tool.color} / 0.10`;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "oklch(0.90 0.01 250)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                      onClick={() => toast.info("Sube un archivo para usar esta herramienta")}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: tool.bg }}
                      >
                        <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                      </div>
                      <div>
                        <h3
                          className="font-semibold text-sm mb-1"
                          style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
                        >
                          {tool.title}
                        </h3>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {tool.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
