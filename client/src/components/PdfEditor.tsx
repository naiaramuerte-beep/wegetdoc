/* =============================================================
   PDFPro PdfEditor — Professional layout matching pdfe.com
   Top toolbar | Left thumbnails | Center viewer | Right tool panel
   All tools functional: sign, text, highlight, compress, convert, protect
   ============================================================= */
import React, { useState, useRef, useCallback, useEffect } from "react";
import SignatureCanvas from "./SignatureCanvas";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Undo2, Redo2, PenTool, Type, Highlighter, Eraser, Brush,
  Image as ImageIcon, MousePointer, Shapes, Search, Shield,
  Minimize2, Move, StickyNote, FileText, Trash2, RotateCw,
  Plus, Scissors, Layers, X, Upload, Check, Eye, EyeOff,
  AlignLeft, Bold, Italic, Underline, ChevronDown, Lock, Unlock,
  Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PaywallModal from "./PaywallModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ── Font options ──────────────────────────────────────────────
const FONT_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Helvetica, sans-serif", label: "Helvetica" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
];

// ── Types ─────────────────────────────────────────────────────
type ToolName =
  | "pointer" | "sign" | "text" | "edit-text" | "highlight"
  | "eraser" | "brush" | "image" | "shapes" | "find"
  | "protect" | "compress" | "move" | "notes" | "none"
  | "convert-jpg" | "convert-png" | "convert-word" | "convert-excel" | "convert-ppt" | "convert-html"
  | "word-to-pdf" | "excel-to-pdf" | "ppt-to-pdf" | "jpg-to-pdf" | "png-to-pdf" | "merge";

interface NativeTextBlock {
  id: string;
  str: string;
  editedStr?: string; // if set, this replaces str on export
  // Canvas pixel coordinates (for overlay display)
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number; // font size in canvas pixels
  // PDF point coordinates (for export) — stored separately to avoid scale confusion
  pdfX: number;      // x in PDF points
  pdfY: number;      // y baseline in PDF points (from bottom of page)
  pdfWidth: number;  // width in PDF points
  pdfFontSize: number; // font size in PDF points
  pageHeight: number; // page height in PDF points
  page: number; // 1-indexed page number
  fontColor?: string; // hex color e.g. "#000000"
}

interface Annotation {
  id: string;
  type: "signature" | "text" | "highlight" | "note" | "shape" | "image" | "drawing" | "eraser" | "textEdit";
  dataUrl?: string;
  text?: string;
  x: number; y: number;
  width: number; height: number;
  page: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
  rotation?: number;
  points?: { x: number; y: number }[];
  strokeWidth?: number;
}

interface HistoryEntry {
  annotations: Annotation[];
  pages: number[];
}

// ── Toolbar button ─────────────────────────────────────────────
function ToolBtn({
  icon: Icon, label, active, onClick, disabled,
}: {
  icon: React.ElementType; label: string; active?: boolean;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded transition-all text-xs select-none"
      style={{
        color: active ? "oklch(0.55 0.22 260)" : "oklch(0.35 0.02 250)",
        backgroundColor: active ? "oklch(0.55 0.22 260 / 0.10)" : "transparent",
        opacity: disabled ? 0.4 : 1,
        minWidth: 48,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260 / 0.06)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <Icon className="w-4 h-4" />
      <span style={{ fontSize: 10 }}>{label}</span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function PdfEditor({ initialTool, initialFile, fullscreen, initialOpenPaywall, onPaywallOpened }: { initialTool?: string; initialFile?: File; fullscreen?: boolean; initialOpenPaywall?: boolean; onPaywallOpened?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null); // eslint-disable-line
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [activeTool, setActiveTool] = useState<ToolName>("pointer");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const paywallOpenedRef = useRef(false);
  const [pdfDataForPaywall, setPdfDataForPaywall] = useState<{ base64: string; name: string; size: number } | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const annotationsRef = useRef<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

  // Sign tool state
  // isSignDrawing is tracked ONLY via ref to avoid re-renders that would remount the canvas
  const isSignDrawingRef = useRef(false);
  const signLastPoint = useRef<{ x: number; y: number } | null>(null); // Track last point for smooth drawing
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [signTab, setSignTab] = useState<"draw" | "write" | "image">("draw"); // draw, write, or image
  const [signColor, setSignColor] = useState("#1a237e"); // draw tab color
  const [signStrokeWidth, setSignStrokeWidth] = useState(2.5); // draw tab stroke width
  const [signName, setSignName] = useState(""); // name for write tab
  const [signFont, setSignFont] = useState("'Dancing Script', cursive"); // font for write tab
  const [eSignName, setESignName] = useState(""); // full name for electronic signature
  const [eSignEmail, setESignEmail] = useState(""); // email for electronic signature

  // Text tool state
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#000000");
  const [textSize, setTextSize] = useState(14);
  const [textBold, setTextBold] = useState(false);
  const [textFont, setTextFont] = useState("Arial, sans-serif");
  const [clickToPlaceText, setClickToPlaceText] = useState(false);

  // Highlight state
  const [highlightColor, setHighlightColor] = useState("#FFFF00");
  const [brushColor, setBrushColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(30);

  // Drawing canvas state (brush, eraser, highlight)
  const [isCanvasDrawing, setIsCanvasDrawing] = useState(false);
  const [canvasDrawStart, setCanvasDrawStart] = useState({ x: 0, y: 0 });
  const [currentBrushPoints, setCurrentBrushPoints] = useState<{ x: number; y: number }[]>([]);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Protect state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Find state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ page: number; text: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mobile panel state
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Compress state
  const [compressQuality, setCompressQuality] = useState(70);

  // Shape state
  const [shapeType, setShapeType] = useState<"rect" | "circle" | "line">("rect");
  const [shapeColor, setShapeColor] = useState("#2563EB");
  const [shapeFilled, setShapeFilled] = useState(false); // false = only border, true = filled

  // Note state
  const [noteText, setNoteText] = useState("");

  // Edit-text tool state
  // allNativeTextBlocks: Map<pageNum, NativeTextBlock[]> — persists edits across page navigation
  const [allNativeTextBlocks, setAllNativeTextBlocks] = useState<Map<number, NativeTextBlock[]>>(new Map());
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockText, setEditingBlockText] = useState("");
  const [editTextColor, setEditTextColor] = useState("#000000");
  // Derived: blocks for the current page
  const nativeTextBlocks = allNativeTextBlocks.get(currentPage) ?? [];

  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Keep annotationsRef in sync with annotations state for use in event listeners
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  // ── Sync canvas internal size with its CSS display size ──────
  // Sync the canvas internal size to its CSS display size once when the sign/draw panel opens.
  // We do NOT use a ResizeObserver here because resizing the canvas clears its content.
  // A one-time sync on mount (+ 150ms delay for panel animation) is sufficient.
  useEffect(() => {
    if (activeTool !== 'sign' || signTab !== 'draw') return;
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        // Only update if the size actually changed to avoid clearing the canvas unnecessarily.
        const newW = Math.round(rect.width);
        const newH = Math.round(rect.height || 130);
        if (canvas.width !== newW || canvas.height !== newH) {
          canvas.width = newW;
          canvas.height = newH;
        }
      }
    };
    // Sync immediately, then once more after the panel slide-in animation completes.
    syncSize();
    const timer = setTimeout(syncSize, 150);
    return () => clearTimeout(timer);
  }, [activeTool, signTab]);

  // ── Global mouseup to stop signature drawing if mouse released outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSignDrawingRef.current) {
        isSignDrawingRef.current = false;
        signLastPoint.current = null;
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const { data: subData } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
  });
  const isPremium = subData?.isPremium ?? false;
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { saveEditedPdfToSession } = usePdfFile();
  const [, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  const uploadDocMutation = trpc.documents.upload.useMutation();

  // ── Save PDF to My Documents ──────────────────────────────
  const savePdf = async () => {
    if (!isAuthenticated) {
      toast.error("Inicia sesión para guardar documentos");
      return;
    }
    if (!pdfBytes) {
      toast.error("No hay PDF cargado");
      return;
    }
    setIsSaving(true);
    toast.loading(t.editor_saving ?? "Guardando documento...", { id: "save" });
    try {
      const out = await buildAnnotatedPdf();
      if (!out) throw new Error("No se pudo generar el PDF anotado");
      // Use REST multipart upload to avoid tRPC base64 size limits
      // Note: out is Uint8Array; out.buffer may be a shared ArrayBuffer with offset.
      // Use slice to get a clean copy of just the relevant bytes.
      const safeBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
      const blob = new Blob([safeBuffer], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, file?.name ?? "document.pdf");
      formData.append("name", file?.name ?? "document.pdf");
      const resp = await fetch("/api/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 401) {
          throw new Error("Debes iniciar sesi\u00f3n para guardar documentos");
        }
        throw new Error(errData.error ?? `Error del servidor (HTTP ${resp.status})`);
      }
      toast.success(t.editor_save_success ?? "Documento guardado en Mis Documentos!", { id: "save" });
    } catch (err) {
      console.error("[savePdf error]", err);
      const errMsg = err instanceof Error ? err.message : "Error al guardar el documento";
      toast.error(errMsg, { id: "save" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Load PDF ─────────────────────────────────────────────────
  const loadPdf = useCallback(async (f: File) => {
    // Use .slice() to ensure the stored bytes have their own independent ArrayBuffer.
    // f.arrayBuffer() may return a shared/transferable buffer that can be detached later.
    const bytes = new Uint8Array(await f.arrayBuffer()).slice();
    // Validate PDF header: search for %PDF in first 1024 bytes (some PDFs have BOM or whitespace before header)
    const headerSlice = bytes.slice(0, 1024);
    const headerStr = String.fromCharCode(...Array.from(headerSlice));
    if (!headerStr.includes("%PDF")) {
      toast.error("El archivo no es un PDF válido. Por favor, sube un archivo PDF.");
      return;
    }
    setPdfBytes(bytes);
    const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    setPdfDoc(doc);
    setTotalPages(doc.numPages);
    setCurrentPage(1);
    setAnnotations([]);
    setHistory([]);
    setHistoryIndex(-1);
    setActiveTool("pointer");
    // Generate thumbnails
    const thumbs: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 20); i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 0.4 });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      const ctx = c.getContext("2d")!;
      await page.render({ canvas: c, viewport: vp } as any).promise;
      thumbs.push(c.toDataURL());
    }
    setThumbnails(thumbs);
    // Auto-fit scale on mobile: fit PDF width to viewer container
    const firstPage = await doc.getPage(1);
    const naturalVp = firstPage.getViewport({ scale: 1 });
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Available width = screen width minus 2*12px padding
      const availableWidth = window.innerWidth - 24;
      const fitScale = availableWidth / naturalVp.width;
      setScale(Math.min(fitScale, 1.5)); // cap at 1.5 to avoid oversized on tablets
    } else {
      setScale(1.2);
    }
  }, []);

  // ── Render page ───────────────────────────────────────────────
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !mainCanvasRef.current) return;
    const page = await pdfDoc.getPage(pageNum);
    const vp = page.getViewport({ scale });
    const canvas = mainCanvasRef.current;
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvas, viewport: vp } as any).promise;
    // Sync drawing canvas size
    if (drawingCanvasRef.current) {
      drawingCanvasRef.current.width = vp.width;
      drawingCanvasRef.current.height = vp.height;
      redrawDrawingCanvas();
    }
  }, [pdfDoc, scale]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => { renderPage(currentPage); }, [renderPage, currentPage]);

  // Auto-load initialFile if provided─
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      loadPdf(initialFile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  // Open paywall automatically after login redirect (when initialOpenPaywall is true)
  useEffect(() => {
    if (initialOpenPaywall && pdfDoc && !paywallOpenedRef.current) {
      paywallOpenedRef.current = true;
      setShowPaywall(true);
      onPaywallOpened?.();
    }
  }, [initialOpenPaywall, pdfDoc, onPaywallOpened]);

  // ── Load native text blocks for Edit-Text tool ──────────────
  const loadNativeTextBlocks = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(pageNum);
    const vp = page.getViewport({ scale });
    const content = await page.getTextContent();
    const blocks: NativeTextBlock[] = [];
    for (const item of content.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      // item.transform = [a, b, c, d, e, f] where (e,f) is bottom-left in PDF points (from bottom)
      const [a, b, , , e, f] = item.transform as number[];
      const pdfFontSize = Math.sqrt(a * a + b * b); // font size in PDF points
      const pdfPageHeight = vp.height / scale; // page height in PDF points
      const pdfWidth = item.width ?? item.str.length * pdfFontSize * 0.6;
      // Canvas pixel coords (for overlay display)
      // PDF y is from bottom; canvas y is from top
      const canvasX = e * scale;
      const canvasY = (pdfPageHeight - f) * scale - pdfFontSize * scale;
      const canvasW = pdfWidth * scale;
      const canvasH = pdfFontSize * scale * 1.4;
      blocks.push({
        id: Math.random().toString(36).slice(2),
        str: item.str,
        // Canvas coords
        x: canvasX,
        y: canvasY,
        width: Math.max(canvasW, 20),
        height: Math.max(canvasH, 14),
        fontSize: pdfFontSize * scale,
        // PDF point coords (used directly at export — no scale conversion needed)
        pdfX: e,
        pdfY: f,           // baseline y from bottom of page (PDF coordinate system)
        pdfWidth: Math.max(pdfWidth, 10),
        pdfFontSize: Math.max(pdfFontSize, 6),
        pageHeight: pdfPageHeight,
        page: pageNum,
      });
    }
    // Only set blocks for this page if not already loaded (preserve existing edits)
    setAllNativeTextBlocks(prev => {
      const existing = prev.get(pageNum);
      if (existing && existing.length > 0) {
        // Merge: keep editedStr from existing blocks matched by str+position
        const merged = blocks.map(newBlock => {
          const match = existing.find(
            ex => ex.str === newBlock.str && Math.abs(ex.x - newBlock.x) < 2 && Math.abs(ex.y - newBlock.y) < 2
          );
          return match ? { ...newBlock, editedStr: match.editedStr, fontColor: match.fontColor } : newBlock;
        });
        const next = new Map(prev);
        next.set(pageNum, merged);
        return next;
      }
      const next = new Map(prev);
      next.set(pageNum, blocks);
      return next;
    });
  }, [pdfDoc, scale]);

  // Reload text blocks when page or scale changes while edit-text is active
  useEffect(() => {
    if (activeTool === "edit-text" && pdfDoc) {
      loadNativeTextBlocks(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, currentPage, scale, pdfDoc]);

  // Handle file drop / select
  const handleFile = useCallback((f: File) => {
    const isPdf = f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf";
    if (!isPdf) {
      // Non-PDF files: show a friendly message and don't try to load as PDF
      toast.error("Por favor sube un archivo PDF. Para convertir otros formatos, usa las herramientas de conversión.");
      return;
    }
    setFile(f);
    loadPdf(f);
    toast.success("PDF cargado correctamente");
  }, [loadPdf]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── History (undo/redo) ───────────────────────────────────────
  const pushHistory = useCallback((anns: Annotation[]) => {
    setHistory(prev => {
      const newHist = prev.slice(0, historyIndex + 1);
      newHist.push({ annotations: anns, pages: [] });
      setHistoryIndex(newHist.length - 1);
      return newHist;
    });
  }, [historyIndex]);

  // ── Drawing canvas helpers ────────────────────────────────────
  const getDrawCtx = useCallback(() => drawingCanvasRef.current?.getContext("2d") ?? null, []);

  const redrawDrawingCanvas = useCallback(() => {
    const dc = drawingCanvasRef.current;
    if (!dc) return;
    const ctx = dc.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dc.width, dc.height);
    const pageAnns = annotations.filter(a => a.page === currentPage);
    for (const ann of pageAnns) {
      if (ann.type === "drawing" && ann.points && ann.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = ann.color ?? "#FF0000";
        ctx.lineWidth = ann.strokeWidth ?? 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
        ctx.stroke();
      } else if (ann.type === "eraser") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }
    }
  }, [annotations, currentPage]);

  useEffect(() => { redrawDrawingCanvas(); }, [redrawDrawingCanvas]);

  // ── Get canvas-relative position ─────────────────────────────
  const getCanvasPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  // ── Canvas mouse handlers (brush, eraser, highlight) ─────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    if (activeTool === "brush") {
      setIsCanvasDrawing(true);
      setCurrentBrushPoints([pos]);
      const ctx = getDrawCtx();
      if (ctx) {
        ctx.beginPath();
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(pos.x, pos.y);
      }
    } else if (activeTool === "eraser" || activeTool === "highlight") {
      setIsCanvasDrawing(true);
      setCanvasDrawStart(pos);
      setDragPreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }
  }, [activeTool, brushColor, brushSize, getCanvasPos, getDrawCtx]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isCanvasDrawing) return;
    const pos = getCanvasPos(e);
    if (activeTool === "brush") {
      setCurrentBrushPoints(prev => [...prev, pos]);
      const ctx = getDrawCtx();
      if (ctx) { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
    } else if (activeTool === "eraser" || activeTool === "highlight") {
      const x = Math.min(pos.x, canvasDrawStart.x);
      const y = Math.min(pos.y, canvasDrawStart.y);
      const w = Math.abs(pos.x - canvasDrawStart.x);
      const h = Math.abs(pos.y - canvasDrawStart.y);
      setDragPreview({ x, y, w, h });
      // Live preview
      const dc = drawingCanvasRef.current;
      const ctx = getDrawCtx();
      if (ctx && dc) {
        redrawDrawingCanvas();
        if (activeTool === "eraser") {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#999";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = highlightColor + "55";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = highlightColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
        }
      }
    }
  }, [isCanvasDrawing, activeTool, getCanvasPos, getDrawCtx, canvasDrawStart, highlightColor, redrawDrawingCanvas]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isCanvasDrawing) return;
    setIsCanvasDrawing(false);
    const pos = getCanvasPos(e);
    if (activeTool === "brush" && currentBrushPoints.length > 1) {
      const newAnn: Omit<Annotation, "id"> = {
        type: "drawing", points: currentBrushPoints,
        x: 0, y: 0, width: 0, height: 0,
        page: currentPage, color: brushColor, strokeWidth: brushSize,
      };
      const id = Math.random().toString(36).slice(2);
      setAnnotations(prev => { const next = [...prev, { ...newAnn, id }]; pushHistory(next); return next; });
      setCurrentBrushPoints([]);
    } else if (activeTool === "eraser" && dragPreview && dragPreview.w > 5 && dragPreview.h > 5) {
      const newAnn: Omit<Annotation, "id"> = {
        type: "eraser", x: dragPreview.x, y: dragPreview.y,
        width: dragPreview.w, height: dragPreview.h, page: currentPage,
      };
      const id = Math.random().toString(36).slice(2);
      setAnnotations(prev => { const next = [...prev, { ...newAnn, id }]; pushHistory(next); return next; });
      setDragPreview(null);
    } else if (activeTool === "highlight" && dragPreview && dragPreview.w > 5 && dragPreview.h > 5) {
      const newAnn: Omit<Annotation, "id"> = {
        type: "highlight", x: dragPreview.x, y: dragPreview.y,
        width: dragPreview.w, height: dragPreview.h,
        page: currentPage, color: highlightColor,
      };
      const id = Math.random().toString(36).slice(2);
      setAnnotations(prev => { const next = [...prev, { ...newAnn, id }]; pushHistory(next); return next; });
      setDragPreview(null);
    }
  }, [isCanvasDrawing, activeTool, getCanvasPos, currentBrushPoints, dragPreview, currentPage, brushColor, brushSize, highlightColor, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) { setAnnotations([]); return; }
    const prev = history[historyIndex - 1];
    setAnnotations(prev.annotations);
    setHistoryIndex(i => i - 1);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setAnnotations(next.annotations);
    setHistoryIndex(i => i + 1);
  }, [history, historyIndex]);

  // ── Add annotation ────────────────────────────────────────────
  const addAnnotation = useCallback((ann: Omit<Annotation, "id">) => {
    const newAnn: Annotation = { ...ann, id: Math.random().toString(36).slice(2) };
    setAnnotations(prev => {
      const updated = [...prev, newAnn];
      pushHistory(updated);
      return updated;
    });
    setSelectedId(newAnn.id);
  }, [pushHistory]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setAnnotations(prev => {
      const updated = prev.filter(a => a.id !== selectedId);
      pushHistory(updated);
      return updated;
    });
    setSelectedId(null);
  }, [selectedId, pushHistory]);

  const deleteLastAnnotation = useCallback(() => {
    setAnnotations(prev => {
      if (prev.length === 0) return prev;
      const updated = prev.slice(0, -1);
      pushHistory(updated);
      return updated;
    });
    setSelectedId(null);
  }, [pushHistory]);

  const deleteAllPageAnnotations = useCallback(() => {
    setAnnotations(prev => {
      const updated = prev.filter(a => a.page !== currentPage);
      pushHistory(updated);
      return updated;
    });
    setSelectedId(null);
  }, [currentPage, pushHistory]);

  // ── Signature canvas ─────────────────────────────────────────────
  // Helper: get canvas coordinates accounting for CSS scaling
  const getSignCoords = (clientX: number, clientY: number) => {
    const c = signCanvasRef.current!;
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
  };
  const startSign = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getSignCoords(e.clientX, e.clientY);
    isSignDrawingRef.current = true;
    signLastPoint.current = { x, y };
    // Draw a dot at the click point so single clicks are visible
    const c = signCanvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(x, y, signStrokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = signColor;
    ctx.fill();
  };
  const drawSign = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSignDrawingRef.current || !signLastPoint.current) return;
    const c = signCanvasRef.current!;
    const ctx = c.getContext("2d")!;
    const { x, y } = getSignCoords(e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(signLastPoint.current.x, signLastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.lineWidth = signStrokeWidth;
    ctx.strokeStyle = signColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    signLastPoint.current = { x, y };
  };
  const endSign = () => { isSignDrawingRef.current = false; signLastPoint.current = null; };
  // Touch handlers for mobile signature drawing
  const startSignTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getSignCoords(touch.clientX, touch.clientY);
    isSignDrawingRef.current = true;
    signLastPoint.current = { x, y };
    const c = signCanvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(x, y, signStrokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = signColor;
    ctx.fill();
  };
  const drawSignTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isSignDrawingRef.current || !signLastPoint.current) return;
    const touch = e.touches[0];
    const c = signCanvasRef.current!;
    const ctx = c.getContext("2d")!;
    const { x, y } = getSignCoords(touch.clientX, touch.clientY);
    ctx.beginPath();
    ctx.moveTo(signLastPoint.current.x, signLastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.lineWidth = signStrokeWidth;
    ctx.strokeStyle = signColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    signLastPoint.current = { x, y };
  };
  const endSignTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isSignDrawingRef.current = false;
    signLastPoint.current = null;
  };
  const clearSign = () => {
    const c = signCanvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };
  const placeSignature = () => {
    const c = signCanvasRef.current!;
    const dataUrl = c.toDataURL();
    addAnnotation({ type: "signature", dataUrl, x: 100, y: 100, width: 200, height: 80, page: currentPage });
    toast.success("Signature added. Drag it to position.");
    // Keep sign tool active so user can add multiple signatures
  };
  // Generate a cursive-style signature from a typed name using canvas
  const placeNameSignature = () => {
    if (!signName.trim()) { toast.error("Type your name first"); return; }
    const c = document.createElement("canvas");
    const fontSize = 48;
    // Estimate width based on font
    c.width = Math.max(220, signName.length * 32);
    c.height = 90;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = `${fontSize}px ${signFont}`;
    ctx.fillStyle = signColor;
    ctx.textBaseline = "middle";
    // Draw a subtle underline
    ctx.beginPath();
    ctx.moveTo(4, 78);
    ctx.lineTo(c.width - 4, 78);
    ctx.strokeStyle = signColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillText(signName, 8, 46);
    const dataUrl = c.toDataURL();
    addAnnotation({ type: "signature", dataUrl, x: 100, y: 100, width: Math.max(220, signName.length * 32), height: 90, page: currentPage });
    toast.success("Signature added. Drag it to position.");
  };

  // Generate electronic signature block (name + date + legal text rendered to canvas)
  const placeESign = () => {
    if (!eSignName.trim()) { toast.error("Escribe tu nombre completo"); return; }
    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 110;
    const ctx = c.getContext("2d")!;
    // Background
    ctx.fillStyle = "#f0f4ff";
    ctx.roundRect(0, 0, c.width, c.height, 8);
    ctx.fill();
    // Border
    ctx.strokeStyle = "#3b5bdb";
    ctx.lineWidth = 1.5;
    ctx.roundRect(0, 0, c.width, c.height, 8);
    ctx.stroke();
    // Signature name in cursive
    ctx.font = "italic 30px 'Dancing Script', cursive";
    ctx.fillStyle = "#1a237e";
    ctx.fillText(eSignName, 12, 42);
    // Underline
    ctx.beginPath();
    ctx.moveTo(12, 50);
    ctx.lineTo(c.width - 12, 50);
    ctx.strokeStyle = "#1a237e";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Date and email
    ctx.font = "11px Arial, sans-serif";
    ctx.fillStyle = "#374151";
    ctx.fillText(`Firmado electrónicamente el ${dateStr} a las ${timeStr}`, 12, 68);
    if (eSignEmail.trim()) {
      ctx.fillText(`Email: ${eSignEmail}`, 12, 84);
    }
    // Legal note
    ctx.font = "9px Arial, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Firma electrónica válida bajo Reglamento eIDAS (UE 910/2014)", 12, 100);
    const dataUrl = c.toDataURL();
    addAnnotation({ type: "signature", dataUrl, x: 80, y: 100, width: 320, height: 110, page: currentPage });
    toast.success("✓ Firma electrónica insertada. Arrástrala a la posición deseada.");
  };

  // ── Add text ────────────────────────────────────────────
  const placeText = () => {
    if (!textInput.trim()) { toast.error("Escribe el texto primero"); return; }
    addAnnotation({
      type: "text", text: textInput, x: 80, y: 80,
      width: Math.max(100, textInput.length * (textSize * 0.6)),
      height: textSize + 8, page: currentPage,
      color: textColor, fontSize: textSize, fontFamily: textFont,
    });
    setTextInput("");
    toast.success("Texto añadido. Arrástralo a la posición deseada.");
    // Keep text tool active so user can add more text
  };

  const activateTextPlace = () => {
    if (!textInput.trim()) { toast.error("Escribe el texto primero"); return; }
    setClickToPlaceText(true);
    toast.info("Haz clic en el PDF donde quieres colocar el texto");
  };

  // ── Add note ──────────────────────────────────────────────────
  const placeNote = () => {
    if (!noteText.trim()) { toast.error("Escribe la nota primero"); return; }
    addAnnotation({
      type: "note", text: noteText, x: 80, y: 80,
      width: 200, height: 80, page: currentPage, color: "#FFF176",
    });
    setNoteText("");
    toast.success("Nota añadida.");
    // Keep notes tool active
  };

  // ── Add image ─────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      addAnnotation({
        type: "image", dataUrl: ev.target?.result as string,
        x: 80, y: 80, width: 200, height: 150, page: currentPage,
      });
      toast.success("Imagen añadida. Arrástrala a la posición deseada.");
    };
    reader.readAsDataURL(f);
    // Keep image tool active
  };
  // ── Add shapee ─────────────────────────────────────────────────
  const placeShape = () => {
    addAnnotation({
      type: "shape", x: 100, y: 100, width: 150, height: 80,
      page: currentPage, color: shapeColor,
      // Encode fill info in the text field: "rect", "circle", "line", "rect-filled", "circle-filled"
      text: shapeFilled ? `${shapeType}-filled` : shapeType,
    });
    toast.success("Forma añadida. Arrástrala a la posición deseada.");
    // Keep shapes tool active so user can add multiple shapes
  }  // ── Dragging annotations ──────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent, id: string) => {
    // Allow dragging with any tool except canvas-drawing tools
    // Only block drag on canvas-drawing tools — all other tools allow dragging annotations
    const nodrag = ["brush", "eraser", "highlight"];
    if (nodrag.includes(activeTool)) return;
    e.stopPropagation();const ann = annotations.find(a => a.id === id);
    if (!ann) return;
    setSelectedId(id);
    setIsDragging(true);
    const overlay = overlayRef.current!.getBoundingClientRect();
    setDragOffset({ x: e.clientX - overlay.left - ann.x, y: e.clientY - overlay.top - ann.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedId) return;
    const overlay = overlayRef.current!.getBoundingClientRect();
    const x = e.clientX - overlay.left - dragOffset.x;
    const y = e.clientY - overlay.top - dragOffset.y;
    setAnnotations(prev => prev.map(a => a.id === selectedId ? { ...a, x, y } : a));
  };

  const onMouseUp = () => {
    if (isDragging) {
      pushHistory(annotationsRef.current);
      setIsDragging(false);
    }
    // Note: resize is handled by window listeners, not here
  };

  // ── Click to place text on PDF ────────────────────────────────
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the overlay background (not on an annotation)
    if (activeTool === "pointer") {
      // e.target is the overlay div itself (not a child annotation)
      if (e.target === e.currentTarget) setSelectedId(null);
      return;
    }
    if (activeTool === "text" && clickToPlaceText && textInput.trim()) {
      const overlay = overlayRef.current!.getBoundingClientRect();
      const x = e.clientX - overlay.left;
      const y = e.clientY - overlay.top;
      addAnnotation({
        type: "text", text: textInput,
        x, y,
        width: Math.max(100, textInput.length * (textSize * 0.6)),
        height: textSize + 8, page: currentPage,
        color: textColor, fontSize: textSize, fontFamily: textFont,
      });
      setClickToPlaceText(false);
      setTextInput("");
      setActiveTool("pointer");
      toast.success("Texto colocado");
    }
  };

  // ── Compress ──────────────────────────────────────────────────
  const compressPdf = async () => {
    if (!pdfBytes) return;
    if (!isPremium) { setShowPaywall(true); return; }
    toast.loading("Comprimiendo PDF...", { id: "compress" });
    try {
      const doc = await PDFDocument.load(pdfBytes as Uint8Array);
      const compressed = await doc.save({ useObjectStreams: true });
      const blob = new Blob([Buffer.from(compressed)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `compressed_${file?.name ?? "document.pdf"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("PDF comprimido descargado", { id: "compress" });
    } catch {
      toast.error("Error al comprimir", { id: "compress" });
    }
  };

  // ── Protect with password ─────────────────────────────────────
  const protectPdf = async () => {
    if (!pdfBytes || !password) { toast.error("Introduce una contraseña"); return; }
    if (!isPremium) { setShowPaywall(true); return; }
    toast.loading("Protegiendo PDF...", { id: "protect" });
    try {
      const doc = await PDFDocument.load(pdfBytes as Uint8Array);
      // pdf-lib doesn't support encryption natively; inform user
      toast.info("La protección con contraseña requiere procesamiento en servidor. Próximamente disponible.", { id: "protect" });
    } catch {
      toast.error("Error al proteger", { id: "protect" });
    }
  };

  // ── Convert PDF to image ──────────────────────────────────────
  const convertToImage = async (format: "jpg" | "png") => {
    if (!pdfDoc) return;
    if (!isPremium) { setShowPaywall(true); return; }
    toast.loading(`Convirtiendo a ${format.toUpperCase()}...`, { id: "convert" });
    try {
      const page = await pdfDoc.getPage(currentPage);
      const vp = page.getViewport({ scale: 2 });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvas: c, viewport: vp } as any).promise;
      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      c.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `page${currentPage}.${format}`;
        a.click(); URL.revokeObjectURL(url);
        toast.success(`Página ${currentPage} exportada como ${format.toUpperCase()}`, { id: "convert" });
      }, mimeType, 0.92);
    } catch {
      toast.error("Error al convertir", { id: "convert" });
    }
  };

  // ── Convert all pages to images (ZIP) ────────────────────────
  const convertAllToImages = async (format: "jpg" | "png") => {
    if (!pdfDoc) return;
    if (!isPremium) { setShowPaywall(true); return; }
    toast.loading("Convirtiendo todas las páginas...", { id: "convertAll" });
    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const c = document.createElement("canvas");
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvas: c, viewport: vp } as any).promise;
        await new Promise<void>((res) => {
          c.toBlob((blob) => {
            if (!blob) { res(); return; }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url;
            a.download = `page${i}.${format}`;
            a.click(); URL.revokeObjectURL(url);
            setTimeout(res, 300);
          }, format === "jpg" ? "image/jpeg" : "image/png", 0.92);
        });
      }
      toast.success(`${totalPages} páginas exportadas`, { id: "convertAll" });
    } catch {
      toast.error("Error al convertir", { id: "convertAll" });
    }
  };

  // ── Convert image to PDF ──────────────────────────────────────
  const convertImageToPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    toast.loading("Convirtiendo imagen a PDF...", { id: "img2pdf" });
    try {
      const doc = await PDFDocument.create();
      const bytes = new Uint8Array(await f.arrayBuffer());
      let img;
      if (f.type === "image/png") img = await doc.embedPng(bytes);
      else img = await doc.embedJpg(bytes);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      const pdfOut = await doc.save();
      const blob = new Blob([Buffer.from(pdfOut)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = f.name.replace(/\.[^.]+$/, "") + ".pdf";
      a.click(); URL.revokeObjectURL(url);
      toast.success("PDF generado y descargado", { id: "img2pdf" });
    } catch {
      toast.error("Error al convertir imagen", { id: "img2pdf" });
    }
  };

  // ── Merge PDFs ────────────────────────────────────────────────
  const mergePdfs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !pdfBytes) return;
    if (!isPremium) { setShowPaywall(true); return; }
    toast.loading("Fusionando PDFs...", { id: "merge" });
    try {
      const merged = await PDFDocument.create();
      // Add current PDF pages
      const currentDoc = await PDFDocument.load(pdfBytes);
      const currentPages = await merged.copyPages(currentDoc, currentDoc.getPageIndices());
      currentPages.forEach(p => merged.addPage(p));
      // Add new PDFs
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const out = await merged.save();
      const blob = new Blob([Buffer.from(out)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = "merged.pdf"; a.click(); URL.revokeObjectURL(url);
      toast.success("PDFs fusionados y descargados", { id: "merge" });
    } catch {
      toast.error("Error al fusionar", { id: "merge" });
    }
  };

  // ── Split PDF ─────────────────────────────────────────────────
  const splitPdf = async (splitAt: number) => {
    if (!pdfBytes) return;
    if (!isPremium) { setShowPaywall(true); return; }
    toast.loading("Dividiendo PDF...", { id: "split" });
    try {
      const original = await PDFDocument.load(pdfBytes);
      const part1 = await PDFDocument.create();
      const part2 = await PDFDocument.create();
      const pages1 = await part1.copyPages(original, Array.from({ length: splitAt }, (_, i) => i));
      pages1.forEach(p => part1.addPage(p));
      const pages2 = await part2.copyPages(original, Array.from({ length: totalPages - splitAt }, (_, i) => i + splitAt));
      pages2.forEach(p => part2.addPage(p));
      for (const [i, doc] of [[1, part1], [2, part2]] as [number, PDFDocument][]) {
        const out = await doc.save();
        const blob = new Blob([Buffer.from(out)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `part${i}_${file?.name ?? "document.pdf"}`; a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("PDF dividido en 2 partes", { id: "split" });
    } catch {
      toast.error("Error al dividir", { id: "split" });
    }
  };

  // ── Rotate page ─────────────────────────────────────────────
  const rotatePage = async () => {
    if (!pdfBytes) return;
    toast.loading("Rotando página...", { id: "rotate" });
    try {
      const safeBytes = pdfBytes.slice();
      const doc = await PDFDocument.load(safeBytes);
      const page = doc.getPage(currentPage - 1);
      page.setRotation(degrees((page.getRotation().angle + 90) % 360));
      const out = await doc.save();
      const newBytes = new Uint8Array(out).slice();
      setPdfBytes(newBytes);
      // Use a fresh .slice() copy so pdf.js doesn't reuse cached document
      const newDoc = await pdfjsLib.getDocument({ data: newBytes.slice() }).promise;
      setPdfDoc(newDoc);
      // Update thumbnail for the rotated page
      const rotatedPage = await newDoc.getPage(currentPage);
      const vp = rotatedPage.getViewport({ scale: 0.4 });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      const ctx = c.getContext("2d")!;
      await rotatedPage.render({ canvas: c, viewport: vp } as any).promise;
      setThumbnails(prev => {
        const updated = [...prev];
        updated[currentPage - 1] = c.toDataURL();
        return updated;
      });
      toast.success("Página rotada", { id: "rotate" });
    } catch {
      toast.error("Error al rotar", { id: "rotate" });
    }
  };

  // ── Delete page ───────────────────────────────────────────────
  const deletePage = async () => {
    if (!pdfBytes || totalPages <= 1) { toast.error("No se puede eliminar la única página"); return; }
    toast.loading("Eliminando página...", { id: "delpage" });
    try {
      const safeBytes = pdfBytes.slice();
      const doc = await PDFDocument.load(safeBytes);
      doc.removePage(currentPage - 1);
      const out = await doc.save();
      const newBytes = new Uint8Array(out).slice(); // .slice() ensures independent ArrayBuffer
      setPdfBytes(newBytes);
      const newDoc = await pdfjsLib.getDocument({ data: newBytes.slice() }).promise;
      setPdfDoc(newDoc);
      setTotalPages(doc.getPageCount() - 1);
      if (currentPage > 1) setCurrentPage(p => p - 1);
      toast.success("Página eliminada", { id: "delpage" });
    } catch {
      toast.error("Error al eliminar página", { id: "delpage" });
    }
  };

  // ── Build annotated PDF as Uint8Array (shared by download and paywall) ──
  const buildAnnotatedPdf = async (): Promise<Uint8Array | null> => {
    if (!pdfBytes) return null;
    // Use .slice() to create a fully independent copy of the bytes.
    // new Uint8Array(pdfBytes) shares the underlying buffer which can be detached.
    // .slice() always returns a new Uint8Array with its own fresh ArrayBuffer.
    const safeBytes = pdfBytes.slice();
    // Validate PDF header: search for %PDF in first 1024 bytes
    const headerSlice = safeBytes.slice(0, 1024);
    const headerStr = String.fromCharCode(...Array.from(headerSlice));
    if (!headerStr.includes("%PDF")) {
      toast.error("Error: los bytes del PDF son inválidos. Por favor, recarga el archivo.");
      return null;
    }
    const doc = await PDFDocument.load(safeBytes, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (const ann of annotations) {
      const page = doc.getPage(ann.page - 1);
      const { height } = page.getSize();
      const pdfY = height - ann.y - ann.height;
      if (ann.type === "text" && ann.text) {
        page.drawText(ann.text, { x: ann.x, y: pdfY + ann.height / 2, size: ann.fontSize ?? 14, font, color: rgb(0, 0, 0) });
      } else if (ann.type === "signature" && ann.dataUrl) {
        const imgBytes = await fetch(ann.dataUrl).then(r => r.arrayBuffer());
        const img = await doc.embedPng(new Uint8Array(imgBytes));
        page.drawImage(img, { x: ann.x, y: pdfY, width: ann.width, height: ann.height });
      } else if (ann.type === "image" && ann.dataUrl) {
        const imgBytes = await fetch(ann.dataUrl).then(r => r.arrayBuffer());
        let img;
        try { img = await doc.embedPng(new Uint8Array(imgBytes)); }
        catch { img = await doc.embedJpg(new Uint8Array(imgBytes)); }
        page.drawImage(img, { x: ann.x, y: pdfY, width: ann.width, height: ann.height });
      } else if (ann.type === "highlight") {
        page.drawRectangle({ x: ann.x, y: pdfY, width: ann.width, height: ann.height, color: rgb(1, 1, 0), opacity: 0.4 });
      } else if (ann.type === "note" && ann.text) {
        page.drawRectangle({ x: ann.x, y: pdfY, width: ann.width, height: ann.height, color: rgb(1, 1, 0.6), opacity: 0.8 });
        page.drawText(ann.text, { x: ann.x + 6, y: pdfY + ann.height - 16, size: 10, font, color: rgb(0, 0, 0), maxWidth: ann.width - 12 });
      } else if (ann.type === "shape") {
        const c = ann.color ?? "#2563EB";
        const r2 = parseInt(c.slice(1, 3), 16) / 255;
        const g2 = parseInt(c.slice(3, 5), 16) / 255;
        const b2 = parseInt(c.slice(5, 7), 16) / 255;
        if (ann.text === "rect") {
          page.drawRectangle({ x: ann.x, y: pdfY, width: ann.width, height: ann.height, borderColor: rgb(r2, g2, b2), borderWidth: 2, color: rgb(r2, g2, b2), opacity: 0.15 });
        } else if (ann.text === "circle") {
          page.drawEllipse({ x: ann.x + ann.width / 2, y: pdfY + ann.height / 2, xScale: ann.width / 2, yScale: ann.height / 2, borderColor: rgb(r2, g2, b2), borderWidth: 2, color: rgb(r2, g2, b2), opacity: 0.15 });
        } else {
          page.drawLine({ start: { x: ann.x, y: pdfY }, end: { x: ann.x + ann.width, y: pdfY + ann.height }, thickness: 2, color: rgb(r2, g2, b2) });
        }
      } else if (ann.type === "eraser") {
        page.drawRectangle({ x: ann.x, y: pdfY, width: ann.width, height: ann.height, color: rgb(1, 1, 1), opacity: 1 });
      } else if (ann.type === "drawing" && ann.points && ann.points.length > 1) {
        const c = ann.color ?? "#FF0000";
        const r2 = parseInt(c.slice(1, 3), 16) / 255;
        const g2 = parseInt(c.slice(3, 5), 16) / 255;
        const b2 = parseInt(c.slice(5, 7), 16) / 255;
        const { height: ph } = page.getSize();
        for (let i = 1; i < ann.points.length; i++) {
          const p1 = ann.points[i - 1];
          const p2 = ann.points[i];
          page.drawLine({ start: { x: p1.x, y: ph - p1.y }, end: { x: p2.x, y: ph - p2.y }, thickness: ann.strokeWidth ?? 3, color: rgb(r2, g2, b2) });
        }
      }
    }
    // Apply native text edits: cover original text with white rect, draw new text
    // Collect edited blocks from ALL pages
    const editedBlocks: NativeTextBlock[] = [];
    allNativeTextBlocks.forEach(pageBlocks => {
      pageBlocks.filter(b => b.editedStr !== undefined).forEach(b => editedBlocks.push(b));
    });
    for (const block of editedBlocks) {
      const page = doc.getPage(block.page - 1);
      const { width: pageW } = page.getSize();
      // Use stored PDF point coordinates directly (no scale conversion needed)
      const pdfX = block.pdfX;
      const pdfY = block.pdfY;      // baseline y from bottom of page
      const fontSizePts = block.pdfFontSize;
      // Cover original text with a wide white rectangle that extends to the right edge of the page
      // This ensures the original text is fully hidden regardless of its actual width
      const coverWidth = pageW - pdfX + 10; // extend to right edge of page
      page.drawRectangle({
        x: pdfX - 4,
        y: pdfY - fontSizePts * 0.35,  // extra space below baseline for descenders
        width: coverWidth,
        height: fontSizePts * 1.6,      // extra height to cover ascenders and line spacing
        color: rgb(1, 1, 1),
        opacity: 1,
      });
      // Draw replacement text at the original baseline position
      const hexColor = block.fontColor ?? "#000000";
      const tr = parseInt(hexColor.slice(1, 3), 16) / 255;
      const tg = parseInt(hexColor.slice(3, 5), 16) / 255;
      const tb = parseInt(hexColor.slice(5, 7), 16) / 255;
      page.drawText(block.editedStr!, {
        x: pdfX,
        y: pdfY,
        size: fontSizePts,
        font,
        color: rgb(tr, tg, tb),
        maxWidth: coverWidth - 8,
      });
    }
    return doc.save();
  };

  // ── Search text in PDF ──────────────────────────────────────────────────────
  const searchInPdf = async () => {
    if (!pdfDoc || !searchQuery.trim()) {
      toast.error("Escribe algo para buscar");
      return;
    }
    setIsSearching(true);
    setSearchResults([]);
    const query = searchQuery.toLowerCase();
    const results: { page: number; text: string }[] = [];
    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str || "")
          .join(" ");
        if (pageText.toLowerCase().includes(query)) {
          // Extract a snippet around the match
          const idx = pageText.toLowerCase().indexOf(query);
          const start = Math.max(0, idx - 40);
          const end = Math.min(pageText.length, idx + query.length + 40);
          const snippet = (start > 0 ? "..." : "") + pageText.slice(start, end) + (end < pageText.length ? "..." : "");
          results.push({ page: i, text: snippet });
        }
      }
      setSearchResults(results);
      if (results.length === 0) {
        toast.info(`No se encontró "${searchQuery}" en el documento`);
      } else {
        toast.success(`${results.length} resultado${results.length > 1 ? "s" : ""} encontrado${results.length > 1 ? "s" : ""}`);
      }
    } catch {
      toast.error("Error al buscar en el PDF");
    } finally {
      setIsSearching(false);
    }
  };
  // ── Download with annotations ─────────────────────────────────────────────────────────────────────────────────
  const downloadPdf = async () => {
    if (!isPremium) {
      // Build PDF and pass to paywall so it can be uploaded to S3 before checkout
      if (pdfBytes) {
        toast.loading("Preparando documento...", { id: "dl" });
        try {
          const out = await buildAnnotatedPdf();
          if (out) {
            const base64 = Buffer.from(out).toString("base64");
            const docName = file?.name ?? "document.pdf";
            const docSize = out.byteLength;
            setPdfDataForPaywall({ base64, name: docName, size: docSize });
            // Also persist in sessionStorage so it survives login redirect
            saveEditedPdfToSession(base64, docName, docSize);

            // PDF data is passed to PaywallModal which uploads it AFTER payment succeeds
          }
          toast.dismiss("dl");
        } catch {
          toast.dismiss("dl");
        }
      }
      setShowPaywall(true);
      return;
    }
    if (!pdfBytes) return;
    toast.loading("Preparando descarga...", { id: "dl" });
    try {
      const out = await buildAnnotatedPdf();
      if (!out) throw new Error("Failed to build PDF");
      const blob = new Blob([Buffer.from(out)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = file?.name ?? "document.pdf";
      a.click(); URL.revokeObjectURL(url);
      toast.success("PDF descargado correctamente", { id: "dl" });
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el PDF", { id: "dl" });
    }
  };

  // ── Apply initialTool when PDF is loaded ──────────────────────
  useEffect(() => {
    if (!initialTool || !pdfDoc) return;
    const toolMap: Record<string, ToolName> = {
      "text": "text", "sign": "sign", "notes": "notes",
      "image": "image", "protect": "protect", "compress": "compress",
      "highlight": "highlight", "eraser": "eraser", "brush": "brush",
      "shapes": "shapes", "find": "find", "move": "move",
      // Conversion tools
      "convert-jpg": "convert-jpg", "convert-png": "convert-png",
      "convert-word": "convert-word", "convert-excel": "convert-excel",
      "convert-ppt": "convert-ppt", "convert-html": "convert-html",
      "word-to-pdf": "word-to-pdf", "excel-to-pdf": "excel-to-pdf",
      "ppt-to-pdf": "ppt-to-pdf", "jpg-to-pdf": "jpg-to-pdf",
      "png-to-pdf": "png-to-pdf", "merge": "merge",
    };
    const mapped = toolMap[initialTool];
    if (mapped) setActiveTool(mapped);
  }, [initialTool, pdfDoc]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          deleteSelected();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, deleteSelected, selectedId]);

  // ── Upload zone (no PDF loaded) ───────────────────────────────
  // File-free tools: show a special layout without PDF viewer
  const FILE_FREE_TOOLS_SET = new Set(["jpg-to-pdf", "png-to-pdf", "word-to-pdf", "excel-to-pdf", "ppt-to-pdf"]);
  const isFileFreeMode = initialTool && FILE_FREE_TOOLS_SET.has(initialTool) && !file;

  if (!file || !pdfDoc) {
    // Note: file-free mode is handled below after renderToolPanel is defined
    if (!isFileFreeMode) return (
      <div
        className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 px-8 text-center cursor-pointer transition-all"
        style={{ borderColor: "oklch(0.75 0.10 260)", backgroundColor: "oklch(0.98 0.005 250)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.10)" }}>
          <FileText className="w-8 h-8" style={{ color: "oklch(0.55 0.22 260)" }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: "oklch(0.55 0.22 260)" }}>Arrastra tu archivo PDF aquí</p>
        <p className="text-sm mb-4" style={{ color: "oklch(0.55 0.03 250)" }}>o</p>
        <button
          className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm"
          style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          <Upload className="w-4 h-4 inline mr-2" />Subir PDF para editar
        </button>
        <p className="text-xs mt-3" style={{ color: "oklch(0.60 0.02 250)" }}>Hasta 100 MB</p>
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    );
  }

  // ── Tool panel content ────────────────────────────────────────
  const renderToolPanel = () => {
    // Shared action bar shown at the top of every tool panel (except pointer/default)
    const showActionBar = activeTool !== "pointer" && activeTool !== "compress" && activeTool !== "protect" && activeTool !== "find";
    const pageAnnCount = annotations.filter(a => a.page === currentPage).length;
    const ActionBar = showActionBar ? (
      <div className="flex flex-wrap gap-1.5 p-3 border-b" style={{ borderColor: "oklch(0.90 0.01 250)", backgroundColor: "oklch(0.97 0.005 250)" }}>
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          title={t.editor_undo_tooltip}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.35 0.02 250)", backgroundColor: "#fff" }}
        >
          <Undo2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{t.editor_undo}</span>
        </button>
        <button
          onClick={deleteLastAnnotation}
          disabled={pageAnnCount === 0}
          title={t.editor_delete_last}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.35 0.02 250)", backgroundColor: "#fff" }}
        >
          <Trash2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{t.editor_delete_last}</span>
        </button>
        <button
          onClick={deleteAllPageAnnotations}
          disabled={pageAnnCount === 0}
          title={t.editor_delete_all}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.55 0.20 15)", backgroundColor: "#fff" }}
        >
          <Trash2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{t.editor_delete_all}</span>
        </button>
      </div>
    ) : null;

    switch (activeTool) {
      case "sign":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>{t.editor_sign}</h3>
            {/* Tabs: Draw / Write / Image */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "oklch(0.93 0.01 250)" }}>
              {(["draw", "write", "image"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSignTab(tab)}
                  className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    backgroundColor: signTab === tab ? "#fff" : "transparent",
                    color: signTab === tab ? "oklch(0.15 0.03 250)" : "oklch(0.50 0.02 250)",
                    boxShadow: signTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                  }}
                >{tab === "draw" ? t.editor_sign_draw_tab : tab === "write" ? t.editor_sign_write_tab : t.editor_sign_image_tab}</button>
              ))}
            </div>

            {/* ── Draw Tab ── */}
            {signTab === "draw" && (
              <>
                {/* Color + stroke width controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{t.editor_color_label ?? "Color"}</label>
                    <input type="color" value={signColor} onChange={e => setSignColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <label className="text-xs whitespace-nowrap" style={{ color: "oklch(0.50 0.02 250)" }}>{t.editor_width_label ?? "Grosor"}: {signStrokeWidth}px</label>
                    <input type="range" min={1} max={8} step={0.5} value={signStrokeWidth} onChange={e => setSignStrokeWidth(Number(e.target.value))} className="flex-1" />
                  </div>
                </div>
                <SignatureCanvas
                  color={signColor}
                  strokeWidth={signStrokeWidth}
                  onPlaceSignature={(dataUrl) => {
                    addAnnotation({ type: "signature", dataUrl, x: 100, y: 100, width: 200, height: 80, page: currentPage });
                    toast.success(t.editor_sign_added ?? "Firma añadida. Arrástrala para posicionarla.");
                  }}
                  clearLabel={t.editor_cancel_btn ?? "Limpiar"}
                  placeLabel={t.editor_sign_insert_btn ?? "Insertar firma"}
                />
              </>
            )}

            {/* ── Write Tab ── */}
            {signTab === "write" && (
              <>
                <input
                  type="text"
                  value={signName}
                  onChange={e => setSignName(e.target.value)}
                  placeholder={t.editor_sign_name_placeholder}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: "oklch(0.80 0.05 260)", fontFamily: signFont, fontSize: 20, color: signColor }}
                />
                {/* Font selector */}
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { label: "Dancing Script", value: "'Dancing Script', cursive" },
                    { label: "Alex Brush", value: "'Alex Brush', cursive" },
                    { label: "Great Vibes", value: "'Great Vibes', cursive" },
                    { label: "Pacifico", value: "'Pacifico', cursive" },
                    { label: "Sacramento", value: "'Sacramento', cursive" },
                  ].map(f => (
                    <button
                      key={f.value}
                      onClick={() => setSignFont(f.value)}
                      className="px-3 py-2 rounded border text-left transition-all"
                      style={{
                        borderColor: signFont === f.value ? "oklch(0.55 0.22 260)" : "oklch(0.88 0.02 250)",
                        backgroundColor: signFont === f.value ? "oklch(0.55 0.22 260 / 0.08)" : "#fff",
                        fontFamily: f.value,
                        fontSize: 20,
                        color: signColor,
                      }}
                    >{signName || f.label}</button>
                  ))}
                </div>
                {/* Color picker */}
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{t.editor_color_label ?? "Color"}</label>
                  <input type="color" value={signColor} onChange={e => setSignColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                </div>
                <button
                  onClick={placeNameSignature}
                  className="py-2 rounded text-white text-sm font-semibold"
                  style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
                >{t.editor_sign_insert_btn}</button>
              </>
            )}

            {/* ── Image Tab ── */}
            {signTab === "image" && (
              <>
                <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{t.editor_sign_image_hint ?? "Sube una imagen de tu firma (PNG con fondo transparente funciona mejor):"}</p>
                <label
                  className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed cursor-pointer transition-all"
                  style={{ borderColor: "oklch(0.80 0.05 260)", backgroundColor: "oklch(0.97 0.005 250)" }}
                >
                  <Upload className="w-8 h-8" style={{ color: "oklch(0.55 0.22 260)" }} />
                  <span className="text-sm font-medium" style={{ color: "oklch(0.35 0.02 250)" }}>{t.editor_sign_image_upload ?? "Haz clic para subir imagen"}</span>
                  <span className="text-xs" style={{ color: "oklch(0.55 0.02 250)" }}>{t.editor_sign_image_formats ?? "PNG, JPG, GIF"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const dataUrl = ev.target?.result as string;
                        const img = new Image();
                        img.onload = () => {
                          const aspect = img.width / img.height;
                          const w = Math.min(240, img.width);
                          const h = w / aspect;
                          addAnnotation({ type: "signature", dataUrl, x: 100, y: 100, width: w, height: h, page: currentPage });
                          toast.success(t.editor_sign_image_added ?? "Imagen de firma añadida. Arrástrala para posicionarla.");
                        };
                        img.src = dataUrl;
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </>
            )}
            </div>
          </div>
        );
      case "text":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Añadir texto</h3>
            <textarea
              value={textInput} onChange={e => setTextInput(e.target.value)}
              placeholder={t.editor_text_placeholder}
              rows={3}
              className="w-full rounded border p-2 text-sm resize-none"
              style={{ borderColor: "oklch(0.80 0.05 260)", fontFamily: textFont }}
            />
            {/* Font selector */}
            <div>
              <label className="text-xs block mb-1" style={{ color: "oklch(0.50 0.02 250)" }}>Fuente</label>
              <select
                value={textFont}
                onChange={e => setTextFont(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-xs"
                style={{ borderColor: "oklch(0.80 0.05 260)", fontFamily: textFont }}
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Color</label>
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <label className="text-xs ml-2" style={{ color: "oklch(0.50 0.02 250)" }}>Tamaño</label>
              <input type="number" value={textSize} onChange={e => setTextSize(Number(e.target.value))} min={8} max={72} className="w-14 border rounded px-1 py-0.5 text-xs" style={{ borderColor: "oklch(0.80 0.05 260)" }} />
            </div>
            {/* Preview */}
            {textInput && (
              <div className="p-2 rounded border text-sm" style={{ borderColor: "oklch(0.88 0.02 250)", fontFamily: textFont, fontSize: Math.min(textSize, 16), color: textColor }}>
                {textInput}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={activateTextPlace}
                className="flex-1 py-2 rounded text-white text-xs font-semibold"
                style={{ backgroundColor: clickToPlaceText ? "oklch(0.45 0.22 260)" : "oklch(0.55 0.22 260)" }}
              >
                {clickToPlaceText ? t.editor_text_click_active : t.editor_text_click_to_place}
              </button>
              <button onClick={placeText} className="flex-1 py-2 rounded text-xs border font-medium" style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.40 0.02 250)" }}>
                Centro
              </button>
            </div>
            </div>
          </div>
        );
      case "highlight":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Resaltador</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{t.editor_highlight_hint}</p>
            <div className="flex gap-2 flex-wrap">
              {["#FFFF00", "#00FF00", "#FF69B4", "#87CEEB", "#FFA500"].map(c => (
                <button key={c} onClick={() => setHighlightColor(c)} className="w-8 h-8 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: highlightColor === c ? "oklch(0.18 0.04 250)" : "transparent" }} />
              ))}
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: highlightColor + "33", color: "oklch(0.30 0.02 250)" }}>
              <strong>Cómo usar:</strong> Haz clic y arrastra sobre el PDF para crear un resaltado del tamaño que quieras.
            </div>
            </div>
          </div>
        );
      case "notes":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Añadir nota</h3>
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder={t.editor_note_placeholder}
              rows={4}
              className="w-full rounded border p-2 text-sm resize-none"
              style={{ borderColor: "oklch(0.80 0.05 260)" }}
            />
            <button onClick={placeNote} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>Insertar nota</button>
            </div>
          </div>
        );
      case "image":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Insertar imagen</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Sube una imagen JPG o PNG para insertarla en el PDF:</p>
            <label className="flex flex-col items-center gap-2 py-4 border-2 border-dashed rounded-lg cursor-pointer" style={{ borderColor: "oklch(0.75 0.10 260)" }}>
              <ImageIcon className="w-8 h-8" style={{ color: "oklch(0.55 0.22 260)" }} />
              <span className="text-xs font-medium" style={{ color: "oklch(0.55 0.22 260)" }}>Seleccionar imagen</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <div className="border-t pt-3 mt-1" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.35 0.02 250)" }}>Convertir imagen a PDF:</p>
              <label className="flex items-center gap-2 py-2 px-3 rounded border cursor-pointer text-xs" style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.40 0.02 250)" }}>
                <Upload className="w-3 h-3" />Subir imagen → PDF
                <input type="file" accept="image/*" className="hidden" onChange={convertImageToPdf} />
              </label>
            </div>
            </div>
          </div>
        );
      case "shapes":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Formas</h3>
            <div className="flex gap-2">
              {(["rect", "circle", "line"] as const).map(s => (
                <button key={s} onClick={() => setShapeType(s)} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: shapeType === s ? "oklch(0.55 0.22 260)" : "oklch(0.80 0.05 260)", backgroundColor: shapeType === s ? "oklch(0.55 0.22 260 / 0.10)" : "transparent", color: "oklch(0.35 0.02 250)" }}>
                  {s === "rect" ? t.editor_shape_rect : s === "circle" ? t.editor_shape_circle : t.editor_shape_line}
                </button>
              ))}
            </div>
            {/* Fill toggle */}
            {shapeType !== "line" && (
              <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "oklch(0.93 0.01 250)" }}>
                <button
                  onClick={() => setShapeFilled(false)}
                  className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                  style={{ backgroundColor: !shapeFilled ? "#fff" : "transparent", color: !shapeFilled ? "oklch(0.15 0.03 250)" : "oklch(0.50 0.02 250)", boxShadow: !shapeFilled ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                >{t.editor_shape_outline}</button>
                <button
                  onClick={() => setShapeFilled(true)}
                  className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                  style={{ backgroundColor: shapeFilled ? "#fff" : "transparent", color: shapeFilled ? "oklch(0.15 0.03 250)" : "oklch(0.50 0.02 250)", boxShadow: shapeFilled ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                >{t.editor_shape_fill}</button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Color</label>
              <input type="color" value={shapeColor} onChange={e => setShapeColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              {/* Preview */}
              <div style={{ width: 40, height: 28, border: `2px solid ${shapeColor}`, borderRadius: shapeType === "circle" ? "50%" : 3, backgroundColor: shapeFilled ? shapeColor : "transparent", flexShrink: 0 }} />
            </div>
            <button onClick={placeShape} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>Insertar forma</button>
            </div>
          </div>
        );
      case "protect":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Proteger PDF</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Establece una contraseña para proteger el acceso al documento:</p>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={t.editor_protect_placeholder}
                className="w-full border rounded px-3 py-2 text-sm pr-10"
                style={{ borderColor: "oklch(0.80 0.05 260)" }}
              />
              <button onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-2">
                {showPassword ? <EyeOff className="w-4 h-4" style={{ color: "oklch(0.55 0.02 250)" }} /> : <Eye className="w-4 h-4" style={{ color: "oklch(0.55 0.02 250)" }} />}
              </button>
            </div>
            <button onClick={protectPdf} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>
              <Lock className="w-4 h-4 inline mr-1" />Proteger PDF
            </button>
          </div>
        );
      case "compress":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Comprimir PDF</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Reduce el tamaño del archivo manteniendo la calidad:</p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs" style={{ color: "oklch(0.45 0.02 250)" }}>
                <span>{t.editor_compress_quality}</span><span>{compressQuality}%</span>
              </div>
              <input type="range" min={20} max={100} value={compressQuality} onChange={e => setCompressQuality(Number(e.target.value))} className="w-full" />
            </div>
            <button onClick={compressPdf} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>
              <Minimize2 className="w-4 h-4 inline mr-1" />Comprimir y descargar
            </button>
            <div className="border-t pt-3" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.35 0.02 250)" }}>Convertir a imagen:</p>
              <div className="flex gap-2">
                <button onClick={() => convertToImage("jpg")} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.40 0.02 250)" }}>JPG</button>
                <button onClick={() => convertToImage("png")} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.40 0.02 250)" }}>PNG</button>
                <button onClick={() => convertAllToImages("jpg")} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.40 0.02 250)" }}>Todas JPG</button>
              </div>
            </div>
            <div className="border-t pt-3" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.35 0.02 250)" }}>Fusionar con otro PDF:</p>
              <label className="flex items-center gap-2 py-2 px-3 rounded border cursor-pointer text-xs" style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.40 0.02 250)" }}>
                <Layers className="w-3 h-3" />Seleccionar PDFs
                <input type="file" accept=".pdf" multiple className="hidden" onChange={mergePdfs} />
              </label>
            </div>
            {totalPages > 1 && (
              <div className="border-t pt-3" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.35 0.02 250)" }}>Dividir PDF en página:</p>
                <div className="flex gap-2 items-center">
                  <input type="number" min={1} max={totalPages - 1} defaultValue={Math.floor(totalPages / 2)} id="splitAt" className="w-16 border rounded px-2 py-1 text-xs" style={{ borderColor: "oklch(0.80 0.05 260)" }} />
                  <button onClick={() => {
                    const v = Number((document.getElementById("splitAt") as HTMLInputElement).value);
                    splitPdf(v);
                  }} className="flex-1 py-1.5 rounded text-xs text-white" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>
                    <Scissors className="w-3 h-3 inline mr-1" />Dividir
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case "find":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Buscar texto</h3>
            <input
              type="text" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchResults([]); }}
              onKeyDown={e => e.key === "Enter" && searchInPdf()}
              placeholder={t.editor_search_placeholder}
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ borderColor: "oklch(0.80 0.05 260)" }}
            />
            <button
              onClick={searchInPdf}
              disabled={isSearching || !searchQuery.trim()}
              className="py-2 rounded text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
            >
              <Search className="w-4 h-4 inline mr-1" />
              {isSearching ? t.editor_searching : t.editor_search_btn}
            </button>
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium" style={{ color: "oklch(0.40 0.02 250)" }}>
                  {searchResults.length} resultado{searchResults.length > 1 ? "s" : ""} encontrado{searchResults.length > 1 ? "s" : ""}
                </p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(r.page)}
                      className="text-left p-2 rounded text-xs hover:bg-blue-50 transition-colors"
                      style={{ backgroundColor: "oklch(0.97 0.005 250)", color: "oklch(0.35 0.02 250)" }}
                    >
                      <span className="font-semibold" style={{ color: "oklch(0.55 0.22 260)" }}>Pág. {r.page}</span>
                      {" "}—{" "}
                      <span>{r.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "eraser":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Borrador</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{t.editor_eraser_hint}</p>
            <div>
              <label className="text-xs block mb-1" style={{ color: "oklch(0.50 0.02 250)" }}>Tamaño del borrador</label>
              <input type="range" min={10} max={100} value={eraserSize} onChange={e => setEraserSize(Number(e.target.value))} className="w-full" />
              <span className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{eraserSize}px</span>
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "oklch(0.95 0.01 250)", color: "oklch(0.30 0.02 250)" }}>
              <strong>Cómo usar:</strong> Haz clic y arrastra sobre el área que quieres borrar. Se creará un rectángulo blanco sobre ese contenido.
            </div>
            </div>
          </div>
        );
      case "brush":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Pincel</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>{t.editor_brush_hint}</p>
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Color</label>
              <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "oklch(0.50 0.02 250)" }}>Grosor: {brushSize}px</label>
              <input type="range" min={1} max={20} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full" />
            </div>
            <div className="p-2 rounded border" style={{ borderColor: "oklch(0.88 0.02 250)", backgroundColor: "#fff" }}>
              <div style={{ width: 40, height: brushSize, backgroundColor: brushColor, borderRadius: brushSize / 2 }} />
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "oklch(0.95 0.01 250)", color: "oklch(0.30 0.02 250)" }}>
              <strong>Cómo usar:</strong> Haz clic y arrastra sobre el PDF para dibujar a mano alzada.
            </div>
            </div>
          </div>
        );
      case "edit-text":
        return (
          <div className="flex flex-col">
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Editar texto nativo</h3>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.08)", color: "oklch(0.30 0.02 250)" }}>
              {t.editor_edittext_hint}
            </div>
            {/* Color picker for replacement text */}
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Color texto</label>
              <input type="color" value={editTextColor} onChange={e => setEditTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            </div>
            {/* Block count */}
            {nativeTextBlocks.length > 0 ? (
              <div className="text-xs p-2 rounded" style={{ backgroundColor: "oklch(0.96 0.005 250)", color: "oklch(0.40 0.02 250)" }}>
                {nativeTextBlocks.length} {t.editor_text_blocks_detected}
                {nativeTextBlocks.filter(b => b.editedStr !== undefined).length > 0 && (
                  <span className="ml-1 font-semibold" style={{ color: "oklch(0.45 0.20 150)" }}>
                    ({nativeTextBlocks.filter(b => b.editedStr !== undefined).length} editados)
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs p-2 rounded" style={{ backgroundColor: "oklch(0.96 0.005 250)", color: "oklch(0.55 0.02 250)" }}>
                {t.editor_loading_text_blocks}
              </div>
            )}
            {/* Instruction when a block is selected */}
            {editingBlockId && (
              <div className="p-2 rounded text-xs" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.1)", color: "oklch(0.30 0.02 250)" }}>
                Edita el texto directamente sobre el PDF. Pulsa Enter o el botón Guardar para confirmar.
              </div>
            )}
            </div>
          </div>
        );
      case "move":
        return (
          <div className="flex flex-col gap-0">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.45 0.02 250)" }}>Mover elementos</p>
              <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.06)", color: "oklch(0.35 0.02 250)" }}>
                <p className="font-medium mb-1" style={{ color: "oklch(0.25 0.03 250)" }}>Cómo usar:</p>
                <p>{t.editor_move_hint}</p>
              </div>
              <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "oklch(0.96 0.005 250)", color: "oklch(0.45 0.02 250)" }}>
                <p>💡 {t.editor_move_tip}</p>
              </div>
            </div>
          </div>
        );
      case "convert-jpg":
      case "convert-png": {
        const fmt = activeTool === "convert-jpg" ? "JPG" : "PNG";
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>PDF a {fmt}</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Convierte páginas del PDF a imágenes {fmt}:</p>
            <button onClick={() => convertToImage(fmt.toLowerCase() as "jpg" | "png")} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>
              <FileText className="w-4 h-4 inline mr-1" />Exportar página {currentPage} como {fmt}
            </button>
            <button onClick={() => convertAllToImages(fmt.toLowerCase() as "jpg" | "png")} className="py-2 rounded text-sm font-medium border" style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.35 0.02 250)" }}>
              Exportar todas las páginas ({totalPages})
            </button>
            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "oklch(0.95 0.01 250)", color: "oklch(0.45 0.02 250)" }}>
              💡 Cada página se descarga como un archivo {fmt} independiente.
            </div>
          </div>
        );
      }
      case "merge":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>Fusionar PDFs</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Combina este PDF con otros archivos PDF:</p>
            <label className="flex items-center gap-2 py-2.5 px-4 rounded text-white text-sm font-semibold cursor-pointer" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>
              <Layers className="w-4 h-4" />Seleccionar PDFs a fusionar
              <input type="file" accept=".pdf" multiple className="hidden" onChange={mergePdfs} />
            </label>
            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "oklch(0.95 0.01 250)", color: "oklch(0.45 0.02 250)" }}>
              💡 El PDF actual se combinará con los archivos seleccionados y se descargará el resultado.
            </div>
          </div>
        );
      case "jpg-to-pdf":
      case "png-to-pdf":
      case "word-to-pdf":
      case "excel-to-pdf":
      case "ppt-to-pdf": {
        const isImg = activeTool === "jpg-to-pdf" || activeTool === "png-to-pdf";
        const srcFmt = activeTool === "jpg-to-pdf" ? "JPG" : activeTool === "png-to-pdf" ? "PNG" : activeTool === "word-to-pdf" ? "Word" : activeTool === "excel-to-pdf" ? "Excel" : "PowerPoint";
        const accept = isImg ? "image/jpeg,image/png" : ".doc,.docx,.xls,.xlsx,.ppt,.pptx";
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>{srcFmt} a PDF</h3>
            {isImg ? (
              <>
                <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Selecciona una imagen para convertirla a PDF:</p>
                <label className="flex items-center gap-2 py-2.5 px-4 rounded text-white text-sm font-semibold cursor-pointer" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>
                  <Upload className="w-4 h-4" />Seleccionar imagen {srcFmt}
                  <input type="file" accept={accept} className="hidden" onChange={convertImageToPdf} />
                </label>
              </>
            ) : (
              <>
                <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Convierte archivos {srcFmt} a PDF:</p>
                <div className="rounded-xl p-4 border text-center" style={{ borderColor: "oklch(0.85 0.05 260 / 0.4)", backgroundColor: "oklch(0.55 0.22 260 / 0.04)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.25 0.03 250)" }}>Próximamente</p>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.02 250)" }}>La conversión de {srcFmt} a PDF estará disponible en breve con soporte completo de formato.</p>
                </div>
              </>
            )}
          </div>
        );
      }
      case "convert-word":
      case "convert-excel":
      case "convert-ppt":
      case "convert-html": {
        const targetFmt = activeTool === "convert-word" ? "Word (.docx)" : activeTool === "convert-excel" ? "Excel (.xlsx)" : activeTool === "convert-ppt" ? "PowerPoint (.pptx)" : "HTML";
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "oklch(0.15 0.03 250)" }}>PDF a {targetFmt}</h3>
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 250)" }}>Convierte este PDF al formato {targetFmt}:</p>
            <div className="rounded-xl p-4 border text-center" style={{ borderColor: "oklch(0.85 0.05 260 / 0.4)", backgroundColor: "oklch(0.55 0.22 260 / 0.04)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.10)" }}>
                <FileText className="w-5 h-5" style={{ color: "oklch(0.55 0.22 260)" }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.25 0.03 250)" }}>Próximamente</p>
              <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.02 250)" }}>La conversión de PDF a {targetFmt} estará disponible con suscripción activa. Preserva el formato, fuentes y diseño original.</p>
              <button onClick={() => setShowPaywall(true)} className="py-2 px-4 rounded text-white text-xs font-semibold" style={{ backgroundColor: "oklch(0.55 0.22 260)" }}>
                Ver planes
              </button>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.08)" }}>
              <MousePointer className="w-6 h-6" style={{ color: "oklch(0.55 0.22 260)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "oklch(0.45 0.02 250)" }}>{t.editor_select_tool}</p>
            <p className="text-xs" style={{ color: "oklch(0.65 0.02 250)" }}>{t.editor_toolbar_hint}</p>
          </div>
        );
    }
  };  // ── File-free mode (e.g. JPG/PNG/Word to PDF) ────────────────────────
  if (isFileFreeMode) {
    return (
      <div
        className={fullscreen ? "flex flex-col overflow-hidden" : "flex flex-col rounded-xl overflow-hidden shadow-xl border"}
        style={fullscreen
          ? { height: "100%", backgroundColor: "oklch(0.97 0.005 250)" }
          : { height: "85vh", borderColor: "oklch(0.88 0.02 250)", backgroundColor: "oklch(0.97 0.005 250)" }
        }
      >
        <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ backgroundColor: "oklch(1 0 0)", borderColor: "oklch(0.90 0.01 250)" }}>
          <span className="text-sm font-semibold" style={{ color: "oklch(0.15 0.03 250)" }}>Herramienta de conversión</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-sm w-full">
            {renderToolPanel()}
          </div>
        </div>
      </div>
    );
  }

  // ── Main editor layout ────────────────────────────────────────────
  const pageAnnotations = annotations.filter(a => a.page === currentPage);

  return (   <div
      className={fullscreen ? "flex flex-col overflow-hidden" : "flex flex-col rounded-xl overflow-hidden shadow-xl border"}
      style={fullscreen
        ? { height: "100%", backgroundColor: "oklch(0.97 0.005 250)" }
        : { height: "85vh", borderColor: "oklch(0.88 0.02 250)", backgroundColor: "oklch(0.97 0.005 250)" }
      }
    >
      {/* ── TOP TOOLBAR — desktop only ── */}
      <div className="hidden md:flex items-center gap-1 px-3 py-1.5 border-b min-w-0" style={{ backgroundColor: "oklch(1 0 0)", borderColor: "oklch(0.90 0.01 250)" }}>
        {/* Undo / Redo */}
        <button title={t.editor_undo + " (Ctrl+Z)"} onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors shrink-0">
          <Undo2 className="w-4 h-4" style={{ color: "oklch(0.35 0.02 250)" }} />
        </button>
        <button title={t.editor_redo + " (Ctrl+Y)"} onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors shrink-0">
          <Redo2 className="w-4 h-4" style={{ color: "oklch(0.35 0.02 250)" }} />
        </button>
        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: "oklch(0.88 0.02 250)" }} />
        {/* Tool buttons — scrollable */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {[
            { id: "sign" as ToolName, icon: PenTool, label: t.editor_sign },
            { id: "text" as ToolName, icon: Type, label: t.editor_add_text },
            { id: "edit-text" as ToolName, icon: Type, label: t.editor_edit_text },
            { id: "highlight" as ToolName, icon: Highlighter, label: t.editor_highlight },
            { id: "eraser" as ToolName, icon: Eraser, label: t.editor_eraser },
            { id: "brush" as ToolName, icon: Brush, label: t.editor_brush },
            { id: "image" as ToolName, icon: ImageIcon, label: t.editor_image },
            { id: "pointer" as ToolName, icon: MousePointer, label: t.editor_pointer },
            { id: "shapes" as ToolName, icon: Shapes, label: t.editor_shapes },
            { id: "find" as ToolName, icon: Search, label: t.editor_find },
            { id: "protect" as ToolName, icon: Shield, label: t.editor_protect },
            { id: "compress" as ToolName, icon: Minimize2, label: t.editor_compress },
            { id: "move" as ToolName, icon: Move, label: t.editor_move },
            { id: "notes" as ToolName, icon: StickyNote, label: t.editor_notes },
          ].map(({ id, icon, label }) => (
            <ToolBtn key={id} icon={icon} label={label} active={activeTool === id} onClick={() => { setActiveTool(id); setShowMobilePanel(true); }} />
          ))}
        </div>
        {/* Page actions */}
        <button title={t.editor_rotate} onClick={rotatePage} className="p-1.5 rounded hover:bg-gray-100 transition-colors shrink-0">
          <RotateCw className="w-4 h-4" style={{ color: "oklch(0.45 0.02 250)" }} />
        </button>
        <button title={t.editor_delete_page} onClick={deletePage} className="p-1.5 rounded hover:bg-gray-100 transition-colors shrink-0">
          <Trash2 className="w-4 h-4" style={{ color: "oklch(0.55 0.15 15)" }} />
        </button>
        {selectedId && (
          <button title="Delete selection" onClick={deleteSelected} className="p-1.5 rounded transition-colors shrink-0" style={{ backgroundColor: "oklch(0.95 0.05 15)" }}>
            <X className="w-4 h-4" style={{ color: "oklch(0.55 0.15 15)" }} />
          </button>
        )}
        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: "oklch(0.88 0.02 250)" }} />
        {/* Save */}
        <button
          onClick={savePdf}
          disabled={isSaving || !pdfBytes}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shrink-0 border"
          style={{ borderColor: "oklch(0.75 0.10 260)", color: "oklch(0.30 0.04 250)", backgroundColor: "white" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "oklch(0.96 0.01 250)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "white"; }}
        >
          <Save className="w-4 h-4" />{isSaving ? t.editor_saving : t.editor_save_btn}
        </button>
        {/* Download */}
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition-all shrink-0"
          style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)"}
        >
          <Download className="w-4 h-4" />{t.editor_download}
        </button>
      </div>
            {/* ── BODY: thumbnails + viewer + tool panel ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT: Page thumbnails — hidden on mobile */}
        <div className="hidden md:flex w-[150px] border-r overflow-y-auto flex-col gap-3 py-3 px-2" style={{ backgroundColor: "oklch(0.96 0.005 250)", borderColor: "oklch(0.90 0.01 250)" }}>
          {/* Page count */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold" style={{ color: "oklch(0.40 0.02 250)" }}>{totalPages}</span>
          </div>
          {thumbnails.map((thumb, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className="flex flex-col items-center gap-1.5 transition-all"
              style={{ outline: "none" }}
            >
              <div
                className="w-full rounded overflow-hidden"
                style={{
                  border: currentPage === i + 1 ? "2px solid oklch(0.55 0.22 260)" : "2px solid oklch(0.85 0.02 250)",
                  boxShadow: currentPage === i + 1 ? "0 0 0 1px oklch(0.55 0.22 260 / 0.3)" : "0 1px 3px oklch(0 0 0 / 0.12)",
                }}
              >
                <img src={thumb} alt={`Página ${i + 1}`} className="w-full block" />
              </div>
              <span className="text-xs" style={{ color: currentPage === i + 1 ? "oklch(0.55 0.22 260)" : "oklch(0.55 0.02 250)", fontSize: 11 }}>
                Page {i + 1}
              </span>
            </button>
          ))}
        </div>

        {/* CENTER: PDF viewer */}
        <div className="flex-1 overflow-auto flex flex-col" style={{ backgroundColor: "oklch(0.93 0.005 250)" }}>
          {/* Zoom + page nav bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{ backgroundColor: "oklch(0.97 0.005 250)", borderColor: "oklch(0.90 0.01 250)" }}>
            <div className="flex items-center gap-2">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 rounded hover:bg-gray-200 transition-colors">
                <ZoomOut className="w-4 h-4" style={{ color: "oklch(0.45 0.02 250)" }} />
              </button>
              <span className="text-xs font-medium w-12 text-center" style={{ color: "oklch(0.45 0.02 250)" }}>{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1 rounded hover:bg-gray-200 transition-colors">
                <ZoomIn className="w-4 h-4" style={{ color: "oklch(0.45 0.02 250)" }} />
              </button>
              <select
                value={scale}
                onChange={e => setScale(Number(e.target.value))}
                className="text-xs border rounded px-1 py-0.5 ml-1"
                style={{ borderColor: "oklch(0.80 0.05 260)", color: "oklch(0.45 0.02 250)" }}
              >
                <option value={0.75}>75%</option>
                <option value={1.0}>100%</option>
                <option value={1.2}>Auto Size</option>
                <option value={1.5}>150%</option>
                <option value={2.0}>200%</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" style={{ color: "oklch(0.45 0.02 250)" }} />
              </button>
              <span className="text-xs" style={{ color: "oklch(0.45 0.02 250)" }}>{currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" style={{ color: "oklch(0.45 0.02 250)" }} />
              </button>
            </div>
          </div>

          {/* PDF canvas + annotation overlay */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-3 md:p-6 pb-[140px] md:pb-6">
            <div
              className="relative shadow-xl"
              ref={viewerRef}
              style={{ display: "inline-block" }}
            >
              <canvas ref={mainCanvasRef} className="block" />
              {/* Drawing canvas for brush/eraser/highlight */}
              <canvas
                ref={drawingCanvasRef}
                className="absolute inset-0 block"
                style={{
                  cursor: activeTool === "brush" ? "crosshair"
                    : activeTool === "eraser" ? "cell"
                    : activeTool === "highlight" ? "text"
                    : "default",
                  pointerEvents: (activeTool === "brush" || activeTool === "eraser" || activeTool === "highlight") ? "auto" : "none",
                  zIndex: 10,
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              {/* Annotation overlay */}
              <div
                ref={overlayRef}
                className="absolute inset-0"
                style={{
                  cursor: activeTool === "pointer" ? "default"
                    : (activeTool === "text" && clickToPlaceText) ? "crosshair"
                    : activeTool === "text" ? "default"
                    : "default",
                  zIndex: 20,
                  pointerEvents: (activeTool === "brush" || activeTool === "eraser" || activeTool === "highlight") ? "none" : "auto",
                }}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onClick={handleOverlayClick}
                onTouchMove={(e) => {
                  if (!isDragging || !selectedId) return;
                  e.preventDefault();
                  const touch = e.touches[0];
                  const overlay = overlayRef.current!.getBoundingClientRect();
                  const x = touch.clientX - overlay.left - dragOffset.x;
                  const y = touch.clientY - overlay.top - dragOffset.y;
                  setAnnotations(prev => prev.map(a => a.id === selectedId ? { ...a, x, y } : a));
                }}
                onTouchEnd={() => {
                  if (isDragging) {
                    pushHistory(annotationsRef.current);
                    setIsDragging(false);
                  }
                }}
              >
                {pageAnnotations.filter(ann => ann.type !== "drawing" && ann.type !== "eraser").map(ann => (
                  <div
                    key={ann.id}
                    style={{
                      position: "absolute",
                      left: ann.x, top: ann.y,
                      width: ann.width, height: ann.height,
                      cursor: "move",
                      outline: selectedId === ann.id ? "2px solid oklch(0.55 0.22 260)" : "none",
                      outlineOffset: 2,
                      userSelect: "none",
                      touchAction: "none",
                    }}
                    onMouseDown={(e) => startDrag(e, ann.id)}
                    onTouchStart={(e) => {
                      // Select annotation on touch
                      e.stopPropagation();
                      setSelectedId(ann.id);
                      // Start drag
                      // Only block drag on canvas-drawing tools
                      const nodrag = ["brush", "eraser", "highlight"];
                      if (nodrag.includes(activeTool)) return;
                      const touch = e.touches[0];
                      const overlay = overlayRef.current!.getBoundingClientRect();
                      setIsDragging(true);
                      setDragOffset({ x: touch.clientX - overlay.left - ann.x, y: touch.clientY - overlay.top - ann.y });
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}
                  >
                    {/* Delete button — top-right corner when selected */}
                    {selectedId === ann.id && (
                      <button
                        title="Eliminar"
                        onClick={(e) => { e.stopPropagation(); setAnnotations(prev => prev.filter(a => a.id !== ann.id)); setSelectedId(null); pushHistory(annotationsRef.current.filter(a => a.id !== ann.id)); }}
                        style={{
                          position: "absolute", top: -10, right: -10,
                          width: 20, height: 20,
                          backgroundColor: "#ef4444",
                          border: "2px solid white",
                          borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 40,
                          padding: 0,
                          lineHeight: 1,
                          fontSize: 12,
                          color: "white",
                          fontWeight: "bold",
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        ×
                      </button>
                    )}
                    {ann.type === "signature" && ann.dataUrl && (
                      <img src={ann.dataUrl} alt="firma" style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />
                    )}
                    {ann.type === "image" && ann.dataUrl && (
                      <img src={ann.dataUrl} alt="img" style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />
                    )}
                    {ann.type === "text" && (
                      <span style={{ fontSize: ann.fontSize ?? 14, color: ann.color ?? "#000", fontFamily: ann.fontFamily ?? "Arial, sans-serif", whiteSpace: "pre-wrap", display: "block", lineHeight: 1.2 }}>
                        {ann.text}
                      </span>
                    )}
                    {ann.type === "highlight" && (
                      <div style={{ width: "100%", height: "100%", backgroundColor: ann.color ?? "#FFFF00", opacity: 0.4, borderRadius: 2 }} />
                    )}
                    {ann.type === "note" && (
                      <div style={{ width: "100%", height: "100%", backgroundColor: "#FFF176", border: "1px solid #F9A825", borderRadius: 4, padding: 4, fontSize: 11, overflow: "hidden" }}>
                        {ann.text}
                      </div>
                    )}
                    {ann.type === "shape" && (
                      <div style={{
                        width: "100%", height: "100%",
                        border: `2px solid ${ann.color ?? "#2563EB"}`,
                        backgroundColor: (ann.text === "rect-filled" || ann.text === "circle-filled")
                          ? `${ann.color ?? "#2563EB"}` 
                          : (ann.text === "line" ? "transparent" : `${ann.color ?? "#2563EB"}22`),
                        borderRadius: (ann.text === "circle" || ann.text === "circle-filled") ? "50%" : 0,
                        // Line: thin horizontal bar
                        ...(ann.text === "line" ? { height: 2, marginTop: "50%" } : {}),
                      }} />
                    )}
                    {/* Resize handle */}
                    {selectedId === ann.id && (
                      <div
                        title="Arrastrar para redimensionar"
                        style={{ position: "absolute", right: -8, bottom: -8, width: 20, height: 20, backgroundColor: "oklch(0.55 0.22 260)", borderRadius: 4, cursor: "se-resize", zIndex: 30, border: "2.5px solid white", touchAction: "none" }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsResizing(true);
                          const startX = e.clientX, startY = e.clientY;
                          const startW = ann.width, startH = ann.height;
                          const onMove = (ev: MouseEvent) => {
                            const dw = ev.clientX - startX, dh = ev.clientY - startY;
                            setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, width: Math.max(30, startW + dw), height: Math.max(20, startH + dh) } : a));
                          };
                          const onUp = () => {
                            setIsResizing(false);
                            pushHistory(annotationsRef.current);
                            window.removeEventListener("mousemove", onMove);
                            window.removeEventListener("mouseup", onUp);
                          };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsResizing(true);
                          const startTouch = e.touches[0];
                          const startX = startTouch.clientX, startY = startTouch.clientY;
                          const startW = ann.width, startH = ann.height;
                          const onMove = (ev: TouchEvent) => {
                            ev.preventDefault();
                            const t = ev.touches[0];
                            const dw = t.clientX - startX, dh = t.clientY - startY;
                            setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, width: Math.max(30, startW + dw), height: Math.max(20, startH + dh) } : a));
                          };
                          const onUp = () => {
                            setIsResizing(false);
                            pushHistory(annotationsRef.current);
                            window.removeEventListener("touchmove", onMove);
                            window.removeEventListener("touchend", onUp);
                          };
                          window.addEventListener("touchmove", onMove, { passive: false });
                          window.addEventListener("touchend", onUp);
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              {/* Native text blocks overlay — only visible when edit-text tool is active */}
              {activeTool === "edit-text" && nativeTextBlocks.map(block => (
                <div
                  key={block.id}
                  style={{
                    position: "absolute",
                    left: block.x,
                    top: block.y,
                    width: block.width,
                    height: block.height,
                    cursor: "text",
                    border: editingBlockId === block.id
                      ? "2px solid oklch(0.55 0.22 260)"
                      : block.editedStr !== undefined
                        ? "2px dashed oklch(0.45 0.20 150)"
                        : "1.5px dashed oklch(0.55 0.22 260 / 0.6)",
                    backgroundColor: editingBlockId === block.id
                      ? "rgba(255,255,255,0.95)"
                      : block.editedStr !== undefined
                        ? "rgba(255,255,255,0.95)"
                        : "transparent",
                    borderRadius: 2,
                    zIndex: 25,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editingBlockId !== block.id) {
                      setEditingBlockId(block.id);
                      setEditingBlockText(block.editedStr ?? block.str);
                      setShowMobilePanel(true);
                    }
                  }}
                  title={block.editedStr !== undefined ? `Editado: "${block.editedStr}"` : `Clic para editar: "${block.str}"`}
                >
                  {/* Inline editor: floating popup above the block */}
                  {editingBlockId === block.id ? (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: block.height + 4,
                        minWidth: Math.max(block.width, 200),
                        background: "white",
                        border: "2px solid oklch(0.55 0.22 260)",
                        borderRadius: 6,
                        padding: 8,
                        zIndex: 100,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editingBlockText}
                        onChange={e => setEditingBlockText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            setAllNativeTextBlocks(prev => {
                              const pageBlocks = prev.get(block.page) ?? [];
                              const updated = pageBlocks.map((b: NativeTextBlock) =>
                                b.id === block.id
                                  ? { ...b, editedStr: editingBlockText, fontColor: editTextColor }
                                  : b
                              );
                              const next = new Map(prev);
                              next.set(block.page, updated);
                              return next;
                            });
                            setEditingBlockId(null);
                            toast.success("Texto actualizado");
                          } else if (e.key === "Escape") {
                            setEditingBlockId(null);
                          }
                          e.stopPropagation();
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: "100%",
                          fontSize: 13,
                          color: editTextColor,
                          background: "#f8f9ff",
                          border: "1px solid oklch(0.80 0.05 260)",
                          borderRadius: 4,
                          outline: "none",
                          padding: "4px 6px",
                          fontFamily: "Helvetica, Arial, sans-serif",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onMouseDown={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAllNativeTextBlocks(prev => {
                              const pageBlocks = prev.get(block.page) ?? [];
                              const updated = pageBlocks.map((b: NativeTextBlock) =>
                                b.id === block.id
                                  ? { ...b, editedStr: editingBlockText, fontColor: editTextColor }
                                  : b
                              );
                              const next = new Map(prev);
                              next.set(block.page, updated);
                              return next;
                            });
                            setEditingBlockId(null);
                            toast.success("Texto actualizado");
                          }}
                          style={{
                            flex: 1, padding: "3px 0", borderRadius: 4,
                            background: "oklch(0.55 0.22 260)", color: "white",
                            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                          }}
                        >
                          {t.editor_save_btn}
                        </button>
                        <button
                          onMouseDown={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingBlockId(null);
                          }}
                          style={{
                            flex: 1, padding: "3px 0", borderRadius: 4,
                            background: "transparent", color: "oklch(0.40 0.02 250)",
                            border: "1px solid oklch(0.80 0.05 260)", cursor: "pointer", fontSize: 12,
                          }}
                        >
                          {t.editor_cancel_btn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Show edited text preview or original text */
                    <span style={{
                      fontSize: Math.min(block.fontSize, 12),
                      color: block.editedStr !== undefined ? (block.fontColor ?? editTextColor) : "transparent",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      padding: "0 2px",
                      fontWeight: 500,
                      width: "100%",
                    }}>
                      {block.editedStr ?? block.str}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Tool panel — bottom sheet on mobile, sidebar on desktop */}
        {/* Mobile overlay backdrop */}
        {showMobilePanel && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setShowMobilePanel(false)}
          />
        )}
        {/* Desktop sidebar */}
        <div
          className="hidden md:flex border-l overflow-y-auto flex-col md:w-[260px]"
          style={{ backgroundColor: "oklch(1 0 0)", borderColor: "oklch(0.90 0.01 250)" }}
        >
          {renderToolPanel()}
        </div>
        {/* Mobile bottom sheet */}
        <div
          className={[
            "fixed left-0 right-0 bottom-[130px] z-40 md:hidden transition-transform duration-300 rounded-t-2xl overflow-hidden",
            showMobilePanel ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
          style={{ backgroundColor: "oklch(1 0 0)", boxShadow: "0 -4px 24px oklch(0.18 0.04 250 / 0.18)", maxHeight: "60vh", overflowY: "auto" }}
        >
          {/* Sheet handle + close */}
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
            <div className="w-10 h-1 rounded-full mx-auto" style={{ backgroundColor: "oklch(0.80 0.02 250)" }} />
            <button
              onClick={() => setShowMobilePanel(false)}
              className="absolute right-3 top-2.5 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" style={{ color: "oklch(0.45 0.02 250)" }} />
            </button>
          </div>
          {renderToolPanel()}
        </div>
      </div>

      {/* ── MOBILE BOTTOM BAR ── fixed at bottom, always visible */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t" style={{ backgroundColor: "oklch(1 0 0)", borderColor: "oklch(0.90 0.01 250)", boxShadow: "0 -2px 12px oklch(0.18 0.04 250 / 0.12)" }}>
        {/* Tools row — horizontal scroll with fade indicator */}
        <div className="relative">
        <div className="flex items-center overflow-x-auto gap-0 px-1 py-1" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {[
            { id: "notes" as ToolName, icon: StickyNote, label: t.editor_notes },
            { id: "move" as ToolName, icon: Move, label: t.editor_move },
            { id: "sign" as ToolName, icon: PenTool, label: t.editor_sign },
            { id: "text" as ToolName, icon: Type, label: t.editor_add_text },
            { id: "edit-text" as ToolName, icon: Type, label: t.editor_edit_text },
            { id: "highlight" as ToolName, icon: Highlighter, label: t.editor_highlight },
            { id: "brush" as ToolName, icon: Brush, label: t.editor_brush },
            { id: "eraser" as ToolName, icon: Eraser, label: t.editor_eraser },
            { id: "image" as ToolName, icon: ImageIcon, label: t.editor_image },
            { id: "shapes" as ToolName, icon: Shapes, label: t.editor_shapes },
            { id: "find" as ToolName, icon: Search, label: t.editor_find },
            { id: "protect" as ToolName, icon: Shield, label: t.editor_protect },
            { id: "compress" as ToolName, icon: Minimize2, label: t.editor_compress },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => { setActiveTool(id); setShowMobilePanel(true); }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg shrink-0 transition-all"
              style={{
                color: activeTool === id ? "oklch(0.55 0.22 260)" : "oklch(0.35 0.02 250)",
                backgroundColor: activeTool === id ? "oklch(0.55 0.22 260 / 0.10)" : "transparent",
                minWidth: 56,
              }}
            >
              <Icon className="w-5 h-5" />
              <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{label}</span>
            </button>
          ))}
        </div>
        {/* Fade gradient on right to indicate more tools */}
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, white)" }} />
        </div>
        {/* Download row */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* Save button */}
          <button
            onClick={savePdf}
            disabled={isSaving || !pdfBytes}
            className="flex items-center justify-center gap-1.5 w-14 h-12 rounded-xl border shrink-0 transition-all text-xs font-semibold"
            style={{ borderColor: "oklch(0.75 0.10 260)", color: "oklch(0.30 0.04 250)", backgroundColor: "white" }}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "..." : t.editor_save_btn}
          </button>
          {/* Download button */}
          <button
            onClick={downloadPdf}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-white font-bold text-base transition-all"
            style={{ backgroundColor: "oklch(0.18 0.04 250)" }}
            onTouchStart={e => e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260)"}
            onTouchEnd={e => e.currentTarget.style.backgroundColor = "oklch(0.18 0.04 250)"}
          >
            <Download className="w-5 h-5" />
            {t.editor_download}
          </button>
        </div>
      </div>

      {/* Paywall modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        pdfData={pdfDataForPaywall}
        thumbnailUrl={thumbnails[0]}
        buildPdfForUpload={async () => {
          if (!pdfBytes) return null;
          try {
            const out = await buildAnnotatedPdf();
            if (!out) return null;
            return {
              base64: Buffer.from(out).toString("base64"),
              name: file?.name ?? "document.pdf",
              size: out.byteLength,
            };
          } catch {
            return null;
          }
        }}
        onPaymentSuccess={() => {
          // After successful payment, redirect to dashboard documents
          // The PDF was already uploaded to S3 during checkout
          setShowPaywall(false);
          toast.success("¡Pago completado! Tu documento está disponible en tu panel.");
          const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
          const lang = langMatch ? langMatch[1] : "es";
          navigate(`/${lang}/dashboard?tab=documents&payment=success`);
        }}
      />
    </div>
  );
}
