/* =============================================================
   PDFPro Home Page — Deep Navy Pro design
   Hero integrates the real PdfEditor component
   ============================================================= */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  FileText,
  PenTool,
  Share2,
  MessageSquare,
  Type,
  Image,
  Lock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Upload,
  Download,
  Edit3,
  Scissors,
  Layers,
  Minimize2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Tool definitions ─────────────────────────────────────────
const editAndSignTools = [
  { icon: Type, label: "Editar texto", tool: "text" },
  { icon: PenTool, label: "Añadir firma", tool: "sign" },
  { icon: MessageSquare, label: "Anotar y comentar", tool: "notes" },
  { icon: Image, label: "Modificar imágenes", tool: "image" },
  { icon: Lock, label: "Proteger con contraseña", tool: "protect" },
  { icon: Share2, label: "Compartir documentos", tool: "share" },
];

const convertFromPdfTools = [
  { icon: FileText, label: "PDF a Word", tool: "convert-word" },
  { icon: FileText, label: "PDF a Excel", tool: "convert-excel" },
  { icon: FileText, label: "PDF a PowerPoint", tool: "convert-ppt" },
  { icon: Image, label: "PDF a JPG", tool: "convert-jpg" },
  { icon: Image, label: "PDF a PNG", tool: "convert-png" },
  { icon: FileText, label: "PDF a HTML", tool: "convert-html" },
];

const convertToPdfTools = [
  { icon: FileText, label: "Word a PDF", tool: "word-to-pdf" },
  { icon: FileText, label: "Excel a PDF", tool: "excel-to-pdf" },
  { icon: FileText, label: "PowerPoint a PDF", tool: "ppt-to-pdf" },
  { icon: Image, label: "JPG a PDF", tool: "jpg-to-pdf" },
  { icon: Image, label: "PNG a PDF", tool: "png-to-pdf" },
  { icon: Layers, label: "Fusionar PDFs", tool: "merge" },
];

const allToolsCategories = [
  { id: "editAndSign", label: "Editar y firmar", tools: editAndSignTools },
  { id: "convertFromPdf", label: "Convertir desde PDF", tools: convertFromPdfTools },
  { id: "convertToPdf", label: "Convertir a PDF", tools: convertToPdfTools },
];

// ─── FAQ data ─────────────────────────────────────────────────
const faqs = [
  {
    question: "¿Qué herramientas puedo usar para editar un PDF online gratis?",
    answer:
      "Con editPDF puedes editar texto, añadir imágenes, insertar firmas digitales, anotar documentos, reorganizar páginas, proteger con contraseña y mucho más. Todo desde tu navegador, sin instalar ningún software.",
  },
  {
    question: "¿Cómo puedo compartir un PDF una vez editado?",
    answer:
      "Después de editar tu PDF, puedes descargarlo directamente o compartirlo mediante un enlace o por correo electrónico. También puedes invitar a colaboradores para que revisen y editen el documento.",
  },
  {
    question: "¿Cómo editar un PDF online sin instalar ningún software?",
    answer:
      "Simplemente sube tu archivo PDF a editPDF desde tu navegador. No necesitas instalar ninguna aplicación. Nuestro editor funciona directamente en Chrome, Firefox, Safari y Edge.",
  },
  {
    question: "¿Puedo editar un PDF usando Google Chrome?",
    answer:
      "Sí, editPDF funciona perfectamente en Google Chrome y en cualquier navegador moderno. Solo tienes que acceder a nuestra web, subir tu PDF y empezar a editarlo.",
  },
  {
    question: "¿Cómo hacer que un archivo PDF sea editable?",
    answer:
      "Sube tu PDF a editPDF y utiliza nuestras herramientas de edición de texto para modificar el contenido directamente. Puedes reemplazar, añadir o eliminar texto con total libertad.",
  },
  {
    question: "¿Cómo editar un PDF gratis online?",
    answer:
      "Accede a editPDF, arrastra tu archivo PDF al área de carga o haz clic en 'Subir PDF'. Luego usa las herramientas disponibles para editar tu documento y descárgalo cuando termines.",
  },
];

// ─── Features data ─────────────────────────────────────────────
const features = [
  {
    title: "Convierte archivos sin complicaciones",
    subtitle: "Cambia entre Word, Excel, PowerPoint, imágenes y PDF fácilmente.",
    description:
      "Mantén el formato y la calidad en cada conversión, asegurando que tus archivos se vean exactamente como necesitas. Convierte PDF a Word, transforma presentaciones de PowerPoint a PDF o exporta hojas de cálculo de Excel sin perder el diseño original. También puedes convertir imágenes JPG a PDF y consolidar todo en un único archivo profesional.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-convert-Y6dwg9Ks6AU4LrQ4QETGwk.webp",
  },
  {
    title: "Edita texto con facilidad",
    subtitle: "Reemplaza o añade texto con fuentes y estilos totalmente personalizables.",
    description:
      "Ajusta la alineación, el tamaño y el color para que coincida perfectamente con el diseño de tu documento. Edita texto en archivos PDF directamente desde tu navegador, sin necesidad de descargar ningún software. Nuestro editor de PDF online te permite personalizar contenido, corregir errores o actualizar datos en segundos.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-edit-XgUdhi72HBbaZEcMtbCduV.webp",
  },
  {
    title: "Firma documentos de forma segura",
    subtitle: "Firma un PDF online con tu cursor, escribiendo tu nombre o subiendo una imagen.",
    description:
      "Añadir una firma electrónica a un archivo PDF sin imprimir ni escanear nunca ha sido tan fácil. Con nuestro editor, puedes firmar y compartir documentos digitalmente desde cualquier dispositivo. Ya sean contratos, acuerdos, formularios o cualquier otro archivo PDF, puedes firmarlos online en segundos.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-sign-mNewCdtWeXAwH4MKY3HS7g.webp",
  },
  {
    title: "Colabora en documentos",
    subtitle: "Permite que otros usuarios revisen y editen PDFs compartidos sin instalar software.",
    description:
      "Puedes compartir un PDF online por correo electrónico o enlace, añadir comentarios y notas a tus PDFs, y permitir que otros editen el archivo cuando lo necesiten. Colabora en PDFs desde cualquier dispositivo, accede al contenido actualizado y edita documentos online sin perder el formato original.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421653173/HUwJ6fxw58gKVZz5QkmFWk/feature-collaborate-Xc5uwDNsachsgLjEBvw7Qp.webp",
  },
];

// ─── Component ─────────────────────────────────────────────────
export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("editAndSign");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPendingFile, setPendingTool } = usePdfFile();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const activeCategory = allToolsCategories.find((c) => c.id === activeTab)!;

  const openEditor = useCallback((file: File, tool?: string) => {
    // Accept any file — PDF is loaded directly, others will be converted in the editor
    setPendingFile(file);
    if (tool) setPendingTool(tool);
    navigate(`/${lang}/editor`);
  }, [setPendingFile, setPendingTool, navigate, lang]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) openEditor(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer.files[0];
    if (f) openEditor(f);
  };

  // Tools that don't require a pre-existing PDF file
  const FILE_FREE_TOOLS = ["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"];

  const scrollToEditor = (tool?: string) => {
    if (tool) {
      setPendingTool(tool);
      if (FILE_FREE_TOOLS.includes(tool)) {
        // Navigate directly to editor without needing a PDF file
        navigate(`/${lang}/editor`);
      } else {
        // Open file picker with tool pre-selected
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.98 0.005 250)" }}>
      <Navbar />

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.55 0.22 260 / 0.10) 0%, transparent 65%)",
          }}
        />

        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              Editor de PDF Online{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.22 260), oklch(0.62 0.18 280))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Gratuito
              </span>
            </h1>
            <p
              className="text-lg md:text-xl"
              style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Sube tu PDF y edítalo ahora mismo — sin instalar nada
            </p>
          </div>

          {/* ── DROP ZONE ── */}
          <div id="editor-section" className="max-w-2xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-4 py-12 px-8"
              style={{
                borderColor: isDraggingOver ? "oklch(0.55 0.22 260)" : "oklch(0.75 0.06 250)",
                backgroundColor: isDraggingOver ? "oklch(0.55 0.22 260 / 0.06)" : "white",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.10)" }}
              >
                <FileText className="w-8 h-8" style={{ color: "oklch(0.55 0.22 260)" }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg" style={{ color: "oklch(0.55 0.22 260)" }}>
                  Arrastra cualquier archivo aquí
                </p>
                <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.05 250)" }}>o</p>
              </div>
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all"
                style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.25 0.04 250)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")}
              >
                <Upload className="w-4 h-4" />
                Subir archivo
              </button>
              {/* Mensaje de conversión */}
              <div
                className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm max-w-sm text-center"
                style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.07)", color: "oklch(0.40 0.10 260)" }}
              >
                <span>
                  ✨ <strong>Word, Excel, JPG, PNG, HTML…</strong> cualquier archivo se convierte automáticamente a PDF al cargarlo.
                </span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.6 0.02 250)" }}>Hasta 100 MB · PDF, Word, Excel, PowerPoint, JPG, PNG y más</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOLS SECTION ──────────────────────────────────── */}
      <section id="tools" className="py-16" style={{ backgroundColor: "oklch(0.97 0.006 250)" }}>
        <div className="container">
          <div className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              Todas las herramientas que necesitas para editar PDFs
            </h2>
            <p
              className="text-base"
              style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Desde convertir archivos hasta firmar y proteger tus PDFs, todo está aquí:
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div
              className="flex rounded-xl p-1 gap-1"
              style={{ backgroundColor: "oklch(0.92 0.01 250)" }}
            >
              {allToolsCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    backgroundColor:
                      activeTab === cat.id ? "oklch(0.18 0.04 250)" : "transparent",
                    color:
                      activeTab === cat.id
                        ? "white"
                        : "oklch(0.45 0.02 250)",
                    boxShadow:
                      activeTab === cat.id
                        ? "0 2px 8px oklch(0.18 0.04 250 / 0.3)"
                        : "none",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tool Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
            {activeCategory.tools.map((tool, i) => (
              <button
                key={i}
                className="flex flex-col items-center gap-3 p-4 rounded-xl text-center transition-all duration-200"
                style={{
                  backgroundColor: "oklch(1 0 0)",
                  border: "1px solid oklch(0.90 0.01 250)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.55 0.22 260 / 0.4)";
                  e.currentTarget.style.boxShadow = "0 8px 24px oklch(0.55 0.22 260 / 0.10)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.90 0.01 250)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onClick={() => scrollToEditor((tool as { tool: string }).tool)}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.08)" }}
                >
                  <tool.icon
                    className="w-5 h-5"
                    style={{ color: "oklch(0.55 0.22 260)" }}
                  />
                </div>
                <span
                  className="text-xs font-medium leading-tight"
                  style={{ color: "oklch(0.25 0.03 250)" }}
                >
                  {tool.label}
                </span>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
              style={{
                backgroundColor: "oklch(0.18 0.04 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")
              }
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              Subir PDF para editar
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              Cómo editar PDFs online en 3 sencillos pasos
            </h2>
            <p
              className="text-base"
              style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Sigue estos pasos rápidos para editar tus archivos PDF:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: "1",
                icon: Upload,
                title: "Sube tu archivo",
                desc: "Arrastra y suelta tu PDF o selecciónalo desde tu dispositivo.",
              },
              {
                step: "2",
                icon: Edit3,
                title: "Realiza ediciones",
                desc: "Edita el texto, añade tu firma o convierte tu PDF a un formato diferente.",
              },
              {
                step: "3",
                icon: Download,
                title: "Descarga tu PDF",
                desc: "Obtén tu archivo actualizado al instante, listo para imprimir o compartir.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-6 rounded-2xl"
                style={{
                  backgroundColor: "oklch(1 0 0)",
                  border: "1px solid oklch(0.90 0.01 250)",
                  boxShadow: "0 2px 12px oklch(0.18 0.04 250 / 0.04)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{
                      backgroundColor: "oklch(0.18 0.04 250)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {item.step}
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.08)" }}
                  >
                    <item.icon
                      className="w-5 h-5"
                      style={{ color: "oklch(0.55 0.22 260)" }}
                    />
                  </div>
                </div>
                <div>
                  <h3
                    className="font-bold text-lg mb-2"
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      color: "oklch(0.15 0.03 250)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: "oklch(0.50 0.02 250)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
              style={{
                backgroundColor: "oklch(0.18 0.04 250)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")
              }
              onClick={() => scrollToEditor()}
            >
              <Upload className="w-4 h-4" />
              Subir PDF para editar
            </button>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ──────────────────────────────────── */}
      <section
        className="py-16 md:py-24"
        style={{ backgroundColor: "oklch(0.97 0.006 250)" }}
      >
        <div className="container">
          <div className="mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              ¿Por qué elegir nuestro Editor de PDF?
            </h2>
            <p
              className="text-base"
              style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Descubre por qué somos la mejor opción para editar PDFs:
            </p>
          </div>

          <div className="space-y-0">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 items-center py-10 border-b`}
                style={{ borderColor: "oklch(0.88 0.01 250)" }}
              >
                <div className="flex-1">
                  <h3
                    className="text-xl font-bold mb-2"
                    style={{
                      color: "oklch(0.55 0.22 260)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="font-semibold text-lg mb-3"
                    style={{
                      color: "oklch(0.15 0.03 250)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {feature.subtitle}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: "oklch(0.45 0.02 250)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {feature.description}
                  </p>
                </div>

                <div
                  className="flex-shrink-0 w-full md:w-64 h-48 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "oklch(0.22 0.04 250)",
                    boxShadow: "0 8px 32px oklch(0.18 0.04 250 / 0.12)",
                  }}
                >
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
            >
              ¿Tienes preguntas?{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.22 260), oklch(0.62 0.18 280))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Tenemos respuestas
              </span>
            </h2>
            <p
              className="text-base"
              style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
            >
              Aprende más sobre cómo editar PDFs y usar nuestras funciones de forma efectiva
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  border: `1px solid ${openFaq === i ? "oklch(0.55 0.22 260 / 0.3)" : "oklch(0.88 0.01 250)"}`,
                  backgroundColor: "oklch(1 0 0)",
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span
                    className="font-semibold text-sm pr-4"
                    style={{
                      color: "oklch(0.15 0.03 250)",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {faq.question}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "oklch(0.55 0.22 260)" }}
                    />
                  ) : (
                    <ChevronDown
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "oklch(0.50 0.02 250)" }}
                    />
                  )}
                </button>
                {openFaq === i && (
                  <div
                    className="px-6 pb-4"
                    style={{
                      color: "oklch(0.45 0.02 250)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.875rem",
                      lineHeight: "1.6",
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <section
        className="py-16 md:py-20"
        style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
      >
        <div className="container text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Empieza a editar tus PDFs ahora
          </h2>
          <p
            className="text-base mb-8 max-w-xl mx-auto"
            style={{ color: "oklch(0.70 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Únete a millones de usuarios que confían en editPDF para gestionar sus documentos.
          </p>
          <button
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
            style={{
              backgroundColor: "oklch(0.55 0.22 260)",
              color: "white",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "oklch(0.48 0.22 260)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")
            }
            onClick={() => scrollToEditor()}
          >
            <Upload className="w-4 h-4" />
            Subir PDF para editar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
