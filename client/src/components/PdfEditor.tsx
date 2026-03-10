/* =============================================================
   PDFPro PdfEditor — Full functional PDF editor component
   Tools: view, text, sign, annotate, rotate, delete, split,
          merge, compress, convert to JPG
   ============================================================= */

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  PenTool,
  MessageSquare,
  RotateCcw,
  Trash2,
  Scissors,
  Layers,
  Minimize2,
  FileImage,
  X,
  Check,
  Upload,
  FileText,
  Lock,
} from "lucide-react";
import PdfViewer from "./PdfViewer";
import { usePdfEditor, PdfTool } from "@/hooks/usePdfEditor";
import { trpc } from "@/lib/trpc";
import PaywallModal from "./PaywallModal";

// ── Signature canvas component ────────────────────────────────
function SignatureCanvas({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current!;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0 0 0 / 0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: "oklch(1 0 0)", boxShadow: "0 24px 64px oklch(0.10 0.04 250 / 0.4)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}>
            Dibuja tu firma
          </h3>
          <button onClick={onCancel} style={{ color: "oklch(0.50 0.02 250)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full rounded-lg border-2 border-dashed cursor-crosshair touch-none"
          style={{ borderColor: "oklch(0.55 0.22 260 / 0.4)", backgroundColor: "oklch(0.99 0.003 250)" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <p className="text-xs mt-2 mb-4" style={{ color: "oklch(0.55 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
          Dibuja tu firma con el ratón o con el dedo en pantalla táctil
        </p>
        <div className="flex gap-3">
          <button
            onClick={clearCanvas}
            className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: "oklch(0.88 0.01 250)", color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Limpiar
          </button>
          <button
            onClick={saveSignature}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Insertar firma
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Text input overlay ────────────────────────────────────────
function TextInput({ onAdd, onCancel }: { onAdd: (text: string, size: number, color: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [size, setSize] = useState(16);
  const [color, setColor] = useState("#1e293b");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0 0 0 / 0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: "oklch(1 0 0)", boxShadow: "0 24px 64px oklch(0.10 0.04 250 / 0.4)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}>
            Añadir texto
          </h3>
          <button onClick={onCancel} style={{ color: "oklch(0.50 0.02 250)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.25 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}>
              Texto
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe el texto aquí..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ border: "1px solid oklch(0.88 0.01 250)", fontFamily: "'DM Sans', sans-serif", color: "oklch(0.15 0.03 250)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.55 0.22 260)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "oklch(0.88 0.01 250)")}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.25 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}>
                Tamaño: {size}px
              </label>
              <input
                type="range"
                min={8}
                max={72}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.25 0.03 250)", fontFamily: "'DM Sans', sans-serif" }}>
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border"
                style={{ borderColor: "oklch(0.88 0.01 250)" }}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: "oklch(0.88 0.01 250)", color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => text.trim() && onAdd(text.trim(), size, color)}
            disabled={!text.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Añadir al PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Merge tool ────────────────────────────────────────────────
function MergeTool({ onMerge, onCancel }: { onMerge: (files: File[]) => void; onCancel: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const pdfs = Array.from(newFiles).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0 0 0 / 0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: "oklch(1 0 0)", boxShadow: "0 24px 64px oklch(0.10 0.04 250 / 0.4)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}>
            Fusionar PDFs
          </h3>
          <button onClick={onCancel} style={{ color: "oklch(0.50 0.02 250)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
          Selecciona los PDFs que quieres combinar (el PDF actual se incluirá primero):
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-3 rounded-lg border-2 border-dashed text-sm font-medium mb-4 transition-colors"
          style={{ borderColor: "oklch(0.55 0.22 260 / 0.4)", color: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}
        >
          + Añadir más PDFs
        </button>
        {files.length > 0 && (
          <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
                style={{ backgroundColor: "oklch(0.97 0.006 250)", fontFamily: "'DM Sans', sans-serif", color: "oklch(0.25 0.03 250)" }}>
                <span className="truncate">{f.name}</span>
                <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  style={{ color: "oklch(0.55 0.02 250)" }}>
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: "oklch(0.88 0.01 250)", color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
            Cancelar
          </button>
          <button
            onClick={() => files.length > 0 && onMerge(files)}
            disabled={files.length === 0}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}>
            Fusionar ({files.length + 1} PDFs)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Split tool ────────────────────────────────────────────────
function SplitTool({ pageCount, onSplit, onCancel }: { pageCount: number; onSplit: (at: number) => void; onCancel: () => void }) {
  const [splitAt, setSplitAt] = useState(Math.floor(pageCount / 2));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "oklch(0 0 0 / 0.5)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ backgroundColor: "oklch(1 0 0)", boxShadow: "0 24px 64px oklch(0.10 0.04 250 / 0.4)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}>
            Dividir PDF
          </h3>
          <button onClick={onCancel} style={{ color: "oklch(0.50 0.02 250)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
          El PDF tiene <strong>{pageCount}</strong> páginas. Divide después de la página:
        </p>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="number"
            min={1}
            max={pageCount - 1}
            value={splitAt}
            onChange={(e) => setSplitAt(Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg text-sm outline-none text-center"
            style={{ border: "1px solid oklch(0.88 0.01 250)", fontFamily: "'DM Sans', sans-serif", color: "oklch(0.15 0.03 250)" }}
          />
          <span className="text-sm" style={{ color: "oklch(0.50 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
            de {pageCount}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={pageCount - 1}
          value={splitAt}
          onChange={(e) => setSplitAt(Number(e.target.value))}
          className="w-full mb-4"
        />
        <p className="text-xs mb-6" style={{ color: "oklch(0.55 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
          Parte 1: páginas 1–{splitAt} | Parte 2: páginas {splitAt + 1}–{pageCount}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: "oklch(0.88 0.01 250)", color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
            Cancelar
          </button>
          <button
            onClick={() => onSplit(splitAt)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}>
            Dividir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main PdfEditor component ──────────────────────────────────
export default function PdfEditor() {
  const editor = usePdfEditor();
  const { state, loadFile, setTool, setPage, addText, rotatePage, deletePage, splitPdf, mergePdfs, compressPdf, downloadBytes, downloadCurrent } = editor;

  const [scale, setScale] = useState(1.4);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallAction, setPaywallAction] = useState("descargar");
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // Subscription status
  const { data: subData } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    // Don't throw on unauthenticated
    onError: () => {},
  } as any);
  const isPremium = subData?.isPremium ?? false;

  const requirePremium = (action: string, fn: () => void) => {
    if (isPremium) {
      fn();
    } else {
      setPaywallAction(action);
      setShowPaywall(true);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      await loadFile(file);
      toast.success(`"${file.name}" cargado — ${0} páginas`);
    } catch {
      toast.error("Error al cargar el PDF. Verifica que el archivo no esté dañado.");
    }
  }, [loadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find((f) => f.type === "application/pdf");
    if (file) handleFileSelect(file);
    else toast.error("Por favor, sube un archivo PDF válido");
  }, [handleFileSelect]);

  const handleAddText = useCallback(async (text: string, size: number, color: string) => {
    setShowTextInput(false);
    try {
      const bytes = await addText(text, 72, 72, size, color);
      if (bytes) toast.success("Texto añadido al PDF");
    } catch {
      toast.error("Error al añadir texto");
    }
  }, [addText]);

  const handleRotate = useCallback(async () => {
    try {
      const bytes = await rotatePage(state.currentPage - 1, 90);
      if (bytes) toast.success("Página rotada 90°");
    } catch {
      toast.error("Error al rotar la página");
    }
  }, [rotatePage, state.currentPage]);

  const handleDeletePage = useCallback(async () => {
    if (state.pageCount <= 1) {
      toast.error("No puedes eliminar la única página del documento");
      return;
    }
    try {
      const bytes = await deletePage(state.currentPage - 1);
      if (bytes) toast.success(`Página ${state.currentPage} eliminada`);
    } catch {
      toast.error("Error al eliminar la página");
    }
  }, [deletePage, state.currentPage, state.pageCount]);

  const handleSplit = useCallback(async (splitAt: number) => {
    setShowSplit(false);
    try {
      const result = await splitPdf(splitAt);
      if (result) {
        const [part1, part2] = result;
        const baseName = state.fileName.replace(".pdf", "");
        downloadBytes(part1, `${baseName}_parte1.pdf`);
        setTimeout(() => downloadBytes(part2, `${baseName}_parte2.pdf`), 500);
        toast.success("PDF dividido en 2 partes — descargando...");
      }
    } catch {
      toast.error("Error al dividir el PDF");
    }
  }, [splitPdf, downloadBytes, state.fileName]);

  const handleMerge = useCallback(async (files: File[]) => {
    setShowMerge(false);
    toast.info("Fusionando PDFs...");
    try {
      const allFiles = [state.file!, ...files];
      const result = await mergePdfs(allFiles);
      if (result) {
        downloadBytes(result, "documentos_fusionados.pdf");
        toast.success("PDFs fusionados — descargando...");
      }
    } catch {
      toast.error("Error al fusionar los PDFs");
    }
  }, [mergePdfs, downloadBytes, state.file]);

  const handleCompress = useCallback(async () => {
    toast.info("Comprimiendo PDF...");
    try {
      const result = await compressPdf();
      if (result) {
        const originalSize = state.pdfBytes?.length ?? 0;
        const newSize = result.length;
        const saved = Math.round((1 - newSize / originalSize) * 100);
        downloadBytes(result, state.fileName.replace(".pdf", "_comprimido.pdf"));
        toast.success(`PDF comprimido — ${saved > 0 ? `${saved}% más pequeño` : "optimizado"} — descargando...`);
      }
    } catch {
      toast.error("Error al comprimir el PDF");
    }
  }, [compressPdf, downloadBytes, state.pdfBytes, state.fileName]);

  const handleConvertToJpg = useCallback(async () => {
    if (!state.pdfBytes) return;
    toast.info("Convirtiendo a imagen...");
    try {
      const { getDocument } = await import("pdfjs-dist");
      const pdf = await getDocument({ data: state.pdfBytes.slice() }).promise;
      const page = await pdf.getPage(state.currentPage);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${state.fileName.replace(".pdf", "")}_pagina${state.currentPage}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Página convertida a JPG — descargando...");
      }, "image/jpeg", 0.92);
    } catch {
      toast.error("Error al convertir a imagen");
    }
  }, [state.pdfBytes, state.currentPage, state.fileName]);

  const tools: { id: PdfTool; icon: React.ElementType; label: string; action?: () => void }[] = [
    { id: "text", icon: Type, label: "Texto", action: () => setShowTextInput(true) },
    { id: "sign", icon: PenTool, label: "Firma", action: () => setShowSignature(true) },
    { id: "annotate", icon: MessageSquare, label: "Anotar", action: () => toast.info("Haz clic en el PDF para añadir una nota") },
    { id: "rotate", icon: RotateCcw, label: "Rotar", action: handleRotate },
    { id: "delete-page", icon: Trash2, label: "Eliminar pág.", action: handleDeletePage },
    { id: "split", icon: Scissors, label: "Dividir", action: () => setShowSplit(true) },
    { id: "merge", icon: Layers, label: "Fusionar", action: () => setShowMerge(true) },
    { id: "compress", icon: Minimize2, label: "Comprimir", action: handleCompress },
    { id: "convert-jpg", icon: FileImage, label: "A JPG", action: handleConvertToJpg },
  ];

  // ── Upload screen ─────────────────────────────────────────────
  if (!state.file) {
    return (
      <div
        className="rounded-xl p-10 md:p-16 cursor-pointer transition-all duration-200 border-2 border-dashed"
        style={{ borderColor: "oklch(0.55 0.22 260 / 0.4)", backgroundColor: "oklch(1 0 0)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById("pdf-file-input")?.click()}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.55 0.22 260 / 0.7)"; e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260 / 0.03)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.55 0.22 260 / 0.4)"; e.currentTarget.style.backgroundColor = "oklch(1 0 0)"; }}
      >
        <input
          id="pdf-file-input"
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.1)" }}>
            <FileText className="w-8 h-8" style={{ color: "oklch(0.55 0.22 260)" }} />
          </div>
          <div>
            <p className="font-semibold text-xl" style={{ color: "oklch(0.55 0.22 260)", fontFamily: "'Sora', sans-serif" }}>
              Arrastra tu archivo PDF aquí
            </p>
            <p className="text-sm mt-1" style={{ color: "oklch(0.52 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>o</p>
          </div>
          <button
            className="font-semibold rounded-lg text-white px-6 py-3 text-sm transition-all duration-200"
            style={{ backgroundColor: "oklch(0.18 0.04 250)", fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)")}
            onClick={(e) => { e.stopPropagation(); document.getElementById("pdf-file-input")?.click(); }}
          >
            <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Subir PDF para editar</span>
          </button>
          <p className="text-xs" style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>Hasta 100 MB</p>
        </div>
      </div>
    );
  }

  // ── Editor screen ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div
        className="rounded-xl p-3 flex flex-wrap items-center gap-2"
        style={{ backgroundColor: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.01 250)", boxShadow: "0 2px 8px oklch(0.18 0.04 250 / 0.06)" }}
      >
        {/* File info */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.1)" }}>
            <FileText className="w-4 h-4" style={{ color: "oklch(0.55 0.22 260)" }} />
          </div>
          <div>
            <p className="text-xs font-semibold truncate max-w-[120px]" style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}>
              {state.fileName}
            </p>
            <p className="text-xs" style={{ color: "oklch(0.55 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
              {state.pageCount} páginas
            </p>
          </div>
        </div>

        <div className="w-px h-8 mx-1" style={{ backgroundColor: "oklch(0.88 0.01 250)" }} />

        {/* Tools */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { setTool(tool.id); tool.action?.(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: state.activeTool === tool.id ? "oklch(0.18 0.04 250)" : "oklch(0.97 0.006 250)",
              color: state.activeTool === tool.id ? "white" : "oklch(0.35 0.02 250)",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              if (state.activeTool !== tool.id) {
                e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260 / 0.1)";
                e.currentTarget.style.color = "oklch(0.55 0.22 260)";
              }
            }}
            onMouseLeave={(e) => {
              if (state.activeTool !== tool.id) {
                e.currentTarget.style.backgroundColor = "oklch(0.97 0.006 250)";
                e.currentTarget.style.color = "oklch(0.35 0.02 250)";
              }
            }}
          >
            <tool.icon className="w-3.5 h-3.5" />
            {tool.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "oklch(0.97 0.006 250)", color: "oklch(0.35 0.02 250)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260 / 0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.97 0.006 250)")}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs w-10 text-center" style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "oklch(0.97 0.006 250)", color: "oklch(0.35 0.02 250)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260 / 0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.97 0.006 250)")}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-8 mx-1" style={{ backgroundColor: "oklch(0.88 0.01 250)" }} />

        {/* Download — requires premium */}
        <button
          onClick={() => requirePremium("descargar el PDF", downloadCurrent)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{ backgroundColor: "oklch(0.55 0.22 260)", fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.48 0.22 260)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)")}
        >
          <Download className="w-3.5 h-3.5" />
          Descargar
          {!isPremium && <Lock className="w-3 h-3 ml-0.5 opacity-70" />}
        </button>

        {/* New file */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: "oklch(0.97 0.006 250)", color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.90 0.01 250)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "oklch(0.97 0.006 250)")}
        >
          <Upload className="w-3.5 h-3.5" />
          Nuevo PDF
        </button>
      </div>

      {/* PDF Viewer */}
      <div
        className="rounded-xl overflow-auto p-4"
        style={{
          backgroundColor: "oklch(0.93 0.01 250)",
          minHeight: "500px",
          maxHeight: "70vh",
        }}
      >
        {state.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "oklch(0.55 0.22 260)", borderTopColor: "transparent" }} />
              <span className="text-sm" style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
                Cargando PDF...
              </span>
            </div>
          </div>
        ) : (
          <PdfViewer
            pdfBytes={state.pdfBytes}
            currentPage={state.currentPage}
            scale={scale}
            onPageCount={(count) => {
              if (count !== state.pageCount) {
                // Update page count after render
              }
            }}
          />
        )}
      </div>

      {/* Page navigation */}
      {state.pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(state.currentPage - 1)}
            disabled={state.currentPage <= 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ backgroundColor: "oklch(1 0 0)", border: "1px solid oklch(0.88 0.01 250)", color: "oklch(0.35 0.02 250)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm" style={{ color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
            Página <strong>{state.currentPage}</strong> de <strong>{state.pageCount}</strong>
          </span>
          <button
            onClick={() => setPage(state.currentPage + 1)}
            disabled={state.currentPage >= state.pageCount}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ backgroundColor: "oklch(1 0 0)", border: "1px solid oklch(0.88 0.01 250)", color: "oklch(0.35 0.02 250)" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      {showTextInput && (
        <TextInput
          onAdd={handleAddText}
          onCancel={() => setShowTextInput(false)}
        />
      )}
      {showSignature && (
        <SignatureCanvas
          onSave={async (dataUrl) => {
            setShowSignature(false);
            toast.success("Firma añadida al PDF");
            // For signature: we add it as an image via pdf-lib
            try {
              const { PDFDocument: PD } = await import("pdf-lib");
              if (!editor.pdfDocRef.current) return;
              const pdfDoc = editor.pdfDocRef.current;
              const imgBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
              const img = await pdfDoc.embedPng(imgBytes);
              const pages = pdfDoc.getPages();
              const page = pages[state.currentPage - 1];
              const { width, height } = page.getSize();
              page.drawImage(img, {
                x: width / 2 - 100,
                y: 60,
                width: 200,
                height: 60,
              });
              const newBytes = await pdfDoc.save();
              editor.state.pdfBytes = newBytes;
              // Force re-render by updating state
              await loadFile(new File([newBytes], state.fileName, { type: "application/pdf" }));
              toast.success("Firma insertada en el PDF");
            } catch (err) {
              console.error(err);
              toast.error("Error al insertar la firma");
            }
          }}
          onCancel={() => setShowSignature(false)}
        />
      )}
      {showSplit && (
        <SplitTool
          pageCount={state.pageCount}
          onSplit={handleSplit}
          onCancel={() => setShowSplit(false)}
        />
      )}
      {showMerge && (
        <MergeTool
          onMerge={handleMerge}
          onCancel={() => setShowMerge(false)}
        />
      )}

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        action={paywallAction}
      />
    </div>
  );
}
