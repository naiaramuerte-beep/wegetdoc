/* =============================================================
   EditorPDF PdfEditor — Professional PDF editor layout
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
  Save, CheckCircle, Info, RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
// MuPDF text extraction now handled by backend endpoint /api/pdf/blocks
import PaywallModal from "./PaywallModal";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors } from "@/lib/brand";
// Polyfill Uint8Array.prototype.toHex (TC39 proposal) — needed by pdfjs-dist v5+
// Some browsers (Chromium < 140, Firefox, Safari) don't support it yet.
if (typeof (Uint8Array.prototype as any)["toHex"] !== "function") {
  (Uint8Array.prototype as any)["toHex"] = function () {
    return Array.from(this as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  };
}
if (typeof (Uint8Array.prototype as any)["setFromHex"] !== "function") {
  (Uint8Array.prototype as any)["setFromHex"] = function (hexString: string) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    this.set(bytes);
    return { read: hexString.length, written: bytes.length };
  };
}
if (typeof (Uint8Array as any)["fromHex"] !== "function") {
  (Uint8Array as any)["fromHex"] = function (hexString: string) {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
  };
}
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, PDFDict, PDFName, PDFRef, PDFStream, rgb, StandardFonts, degrees } from "pdf-lib";

// Browser-safe base64 encoder for Uint8Array (replaces Node.js Buffer.from().toString('base64'))
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Configure PDF.js worker — use local worker served by Vite to avoid CDN version mismatches
// The worker file is copied to public/ by vite.config.ts so it's available at /pdf.worker.min.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).href;

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
  | "word-to-pdf" | "excel-to-pdf" | "ppt-to-pdf" | "jpg-to-pdf" | "png-to-pdf" | "merge" | "split" | "convert";

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
  fontColor?: string; // hex color set by user when editing
  originalColor?: string; // original text color from PDF
  fontFamily?: string; // CSS generic family fallback (serif, sans-serif)
  fontWeight?: string; // "bold" or "normal"
  fontStyle?: string; // "italic" or "normal"
  lineHeight?: number; // line height in canvas pixels (extracted from PDF)
  pdfFontName?: string; // pdf.js loaded font name (e.g. "g_d0_f1") — matches @font-face
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
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
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
        color: active ? "#1565C0" : "#1A3A5C",
        backgroundColor: active ? "rgba(27, 94, 32, 0.10)" : "transparent",
        opacity: disabled ? 0.4 : 1,
        minWidth: 48,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          e.currentTarget.style.backgroundColor = "rgba(27, 94, 32, 0.06)";
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
export default function PdfEditor({ initialTool, initialFile, fullscreen, initialOpenPaywall, onPaywallOpened, onFileNameChange, displayName }: { initialTool?: string; initialFile?: File; fullscreen?: boolean; initialOpenPaywall?: boolean; onPaywallOpened?: () => void; onFileNameChange?: (name: string) => void; displayName?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null); // eslint-disable-line
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [activeTool, setActiveTool] = useState<ToolName>("edit-text");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const paywallOpenedRef = useRef(false);
  const [pdfDataForPaywall, setPdfDataForPaywall] = useState<{ base64: string; name: string; size: number } | undefined>(undefined);
  const [paywallThumbnail, setPaywallThumbnail] = useState<string | undefined>(undefined);
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
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textStrikethrough, setTextStrikethrough] = useState(false);
  const [textFont, setTextFont] = useState("Arial, sans-serif");
  const [clickToPlaceText, setClickToPlaceText] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null); // inline text editing

  // Highlight state
  const [highlightColor, setHighlightColor] = useState("#FFFF00");
  const [brushColor, setBrushColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(30);

  // Drawing canvas state (brush, eraser, highlight)
  // isCanvasDrawing MUST be a ref (not state) to avoid stale closures in useCallback handlers
  const isCanvasDrawingRef = useRef(false);
  const setIsCanvasDrawing = useCallback((v: boolean) => { isCanvasDrawingRef.current = v; }, []);
  const [canvasDrawStart, setCanvasDrawStart] = useState({ x: 0, y: 0 });
  const [currentBrushPoints, setCurrentBrushPoints] = useState<{ x: number; y: number }[]>([]);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Protect state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [encryptionAlgo, setEncryptionAlgo] = useState<"128-AES" | "256-AES" | "128-ARC4">("128-AES");
  const [isProtecting, setIsProtecting] = useState(false);
  const [protectProgress, setProtectProgress] = useState(0);
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // PDF loading state (for native PDFs)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfLoadProgress, setPdfLoadProgress] = useState(0);

  // File conversion loading state
  const [isConvertingFile, setIsConvertingFile] = useState(false);
  const [convertFileProgress, setConvertFileProgress] = useState(0);
  const [convertedFromFile, setConvertedFromFile] = useState<{ name: string; type: string } | null>(null);
  const [showConvertedBanner, setShowConvertedBanner] = useState(false);

  // Find state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ page: number; text: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mobile panel state
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Compress state
  const [compressQuality, setCompressQuality] = useState(70);
  const [compressResult, setCompressResult] = useState<{ originalSize: number; compressedSize: number; blob: Blob; name: string } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  // Protect result state
  const [protectResult, setProtectResult] = useState<{ blob: Blob; name: string } | null>(null);

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
  const editContentRef = useRef<HTMLDivElement | null>(null);

  // Apply a CSS style to the active contentEditable div in real-time
  const applyEditStyle = useCallback((prop: string, value: string) => {
    const el = editContentRef.current;
    if (!el) return;
    (el.style as any)[prop] = value;
    // Also update the block in state for export
    if (editingBlockId) {
      setAllNativeTextBlocks(prev => {
        const pageBlocks = prev.get(currentPage) ?? [];
        const propMap: Record<string, string> = {
          fontWeight: "fontWeight", fontStyle: "fontStyle",
          color: "originalColor", fontSize: "fontSize",
          textAlign: "textAlign",
        };
        const blockProp = propMap[prop];
        if (!blockProp) return prev;
        const updated = pageBlocks.map((b: NativeTextBlock) =>
          b.id === editingBlockId ? { ...b, [blockProp]: prop === "fontSize" ? parseFloat(value) : value } : b
        );
        const next = new Map(prev);
        next.set(currentPage, updated);
        return next;
      });
    }
  }, [editingBlockId, currentPage]);
  // Derived: blocks for the current page
  const nativeTextBlocks = allNativeTextBlocks.get(currentPage) ?? [];

  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  // Callback ref to detect when canvas mounts and trigger initial render
  const mainCanvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    mainCanvasRef.current = node;
    if (node) {
      // Trigger render on next frame to ensure layout is complete
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('pdf-canvas-mounted'));
      });
    }
  }, []);
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
  const { isAuthenticated, refresh: refreshAuth } = useAuth();
  const { saveEditedPdfToSession, savePdfToSession, setPendingPaywall, setPendingFile, pendingFile, pendingEditedPdf, clearPendingEditedPdf, pendingPaywall: ctxPendingPaywall } = usePdfFile();
  // Track the saved document ID so we don't re-save on every download click
  const [savedDocId, setSavedDocId] = useState<number | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  const uploadDocMutation = trpc.documents.upload.useMutation();

  // ── Save PDF to My Documents ──────────────────────────────
  const savePdf = async () => {
    if (!isAuthenticated) {
      toast.error(t.editor_toast_login_required ?? "Sign in to save documents");
      return;
    }
    if (!pdfBytes) {
      toast.error(t.editor_toast_no_pdf ?? "No PDF loaded");
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
      const saveName = displayName || file?.name || "document.pdf";
      formData.append("file", blob, saveName);
      formData.append("name", saveName);
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

  // ── localStorage persistence for unregistered users ──────────
  const LS_KEY = "pdfpro_editor_draft";
  const saveDraftToLocalStorage = useCallback(() => {
    if (isAuthenticated) return; // only for unregistered users
    if (!pdfBytes || !file) return;
    try {
      // Save annotations and native text edits
      const textEdits: Record<string, { editedStr: string; fontColor?: string }> = {};
      allNativeTextBlocks.forEach((blocks, page) => {
        blocks.forEach(b => {
          if (b.editedStr !== undefined) {
            textEdits[`${page}_${b.pdfX.toFixed(1)}_${b.pdfY.toFixed(1)}_${b.str}`] = {
              editedStr: b.editedStr,
              fontColor: b.fontColor,
            };
          }
        });
      });
      const draft = {
        v: 1,
        ts: Date.now(),
        fileName: file.name,
        fileSize: file.size,
        annotations: annotations.filter(a => a.type !== "drawing" || (a.points && a.points.length > 1)),
        textEdits,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(draft));
      // Save PDF bytes separately (can be large)
      let b64 = "";
      const chunkSize = 8192;
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        b64 += String.fromCharCode.apply(null, Array.from(pdfBytes.slice(i, i + chunkSize)));
      }
      b64 = btoa(b64);
      localStorage.setItem(LS_KEY + "_pdf", b64);
    } catch {
      // Quota exceeded — silently ignore
    }
  }, [isAuthenticated, pdfBytes, file, annotations, allNativeTextBlocks]);

  const loadDraftFromLocalStorage = useCallback((): {
    pdfFile: File;
    annotations: Annotation[];
    textEdits: Record<string, { editedStr: string; fontColor?: string }>;
  } | null => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const pdfB64 = localStorage.getItem(LS_KEY + "_pdf");
      if (!raw || !pdfB64) return null;
      const draft = JSON.parse(raw);
      // Expire drafts older than 24h
      if (Date.now() - draft.ts > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(LS_KEY + "_pdf");
        return null;
      }
      // Reconstruct PDF file from base64
      const bytes = Uint8Array.from(atob(pdfB64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const pdfFile = new File([blob], draft.fileName || "document.pdf", { type: "application/pdf" });
      return {
        pdfFile,
        annotations: draft.annotations ?? [],
        textEdits: draft.textEdits ?? {},
      };
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_KEY + "_pdf");
  }, []);

  // ── Load PDF ─────────────────────────────────────────────────
  const loadPdf = useCallback(async (f: File) => {
    setIsLoadingPdf(true);
    setPdfLoadProgress(5);
    try {
      // Use .slice() to ensure the stored bytes have their own independent ArrayBuffer.
      // f.arrayBuffer() may return a shared/transferable buffer that can be detached later.
      const bytes = new Uint8Array(await f.arrayBuffer()).slice();
      setPdfLoadProgress(15);
      // Validate PDF header: search for %PDF in first 1024 bytes (some PDFs have BOM or whitespace before header)
      const headerSlice = bytes.slice(0, 1024);
      const headerStr = String.fromCharCode(...Array.from(headerSlice));
      if (!headerStr.includes("%PDF")) {
        toast.error(t.editor_toast_invalid_pdf ?? "The file is not a valid PDF. Please upload a PDF file.");
        setIsLoadingPdf(false);
        return;
      }
      setPdfBytes(bytes);
      setPdfLoadProgress(30);
      const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      setPdfLoadProgress(50);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setAnnotations([]);
      setHistory([]);
      setHistoryIndex(-1);
      setActiveTool("edit-text");
      // Generate thumbnails
      setPdfLoadProgress(60);
      const thumbs: string[] = [];
      const thumbCount = doc.numPages;
      for (let i = 1; i <= thumbCount; i++) {
        try {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 0.4 });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          const ctx = c.getContext("2d")!;
          await page.render({ canvas: c, viewport: vp } as any).promise;
          thumbs.push(c.toDataURL());
        } catch (err) {
          console.warn(`[Thumbnail] Failed to render page ${i}:`, err);
          thumbs.push(""); // fallback — will show placeholder icon
        }
        setPdfLoadProgress(60 + Math.round((i / thumbCount) * 30));
      }
      setThumbnails(thumbs);
      setPdfLoadProgress(95);
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
      setPdfLoadProgress(100);
    } catch (err) {
      console.error("[loadPdf] Error:", err);
      toast.error("Error loading PDF");
    } finally {
      // Small delay to show 100% before hiding
      setTimeout(() => {
        setIsLoadingPdf(false);
        setPdfLoadProgress(0);
      }, 300);
    }
  }, []);

  // ── Render page ───────────────────────────────────────────────
  // Keep a ref to allNativeTextBlocks so renderPage can read it without re-creating
  const allNativeTextBlocksRef = useRef(allNativeTextBlocks);
  allNativeTextBlocksRef.current = allNativeTextBlocks;

  // Apply text edits to the PDF bytes and reload — this modifies the actual PDF
  // so pdf.js renders the changes natively with correct positioning
  const bakeTextEditsIntoPdf = useCallback(async () => {
    if (!pdfBytes) return;
    const editedBlocks: NativeTextBlock[] = [];
    allNativeTextBlocksRef.current.forEach(pageBlocks => {
      pageBlocks.filter(b => b.editedStr !== undefined).forEach(b => editedBlocks.push(b));
    });
    if (editedBlocks.length === 0) return;

    try {
      const safeBytes = pdfBytes.slice();
      const doc = await PDFDocument.load(safeBytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
      const fontBoldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

      for (const block of editedBlocks) {
        try {
          const page = doc.getPage(block.page - 1);
          const { width: pageW, height: pageH } = page.getSize();
          const fontSizePts = block.pdfFontSize;

          // Cover original text with white rectangle
          const coverTop = pageH - (block.y / scale);
          const coverBottom = pageH - ((block.y + block.height) / scale);
          page.drawRectangle({
            x: block.pdfX - 2,
            y: coverBottom - fontSizePts * 0.3,
            width: pageW - block.pdfX + 4,
            height: (coverTop - coverBottom) + fontSizePts * 0.6,
            color: rgb(1, 1, 1),
            opacity: 1,
          });

          // Choose font
          const isBold = block.fontWeight === "bold";
          const isItalic = block.fontStyle === "italic";
          const useFont = isBold && isItalic ? fontBoldItalic : isBold ? fontBold : isItalic ? fontItalic : font;

          // Parse color
          const hex = block.originalColor && block.originalColor.length === 7 ? block.originalColor : "#000000";
          const cr = parseInt(hex.slice(1, 3), 16) / 255;
          const cg = parseInt(hex.slice(3, 5), 16) / 255;
          const cb = parseInt(hex.slice(5, 7), 16) / 255;
          const textColor = rgb(isNaN(cr) ? 0 : cr, isNaN(cg) ? 0 : cg, isNaN(cb) ? 0 : cb);

          // Draw edited text line by line
          const lineH = block.lineHeight ? block.lineHeight / scale : fontSizePts * 1.4;
          const editedLines = block.editedStr!.split("\n");
          const startY = coverTop - fontSizePts;
          for (let i = 0; i < editedLines.length; i++) {
            const safeText = editedLines[i].replace(/[^\x00-\xFF]/g, "?");
            if (!safeText.trim()) continue;
            page.drawText(safeText, {
              x: block.pdfX,
              y: startY - i * lineH,
              size: fontSizePts,
              font: useFont,
              color: textColor,
            });
          }
        } catch (err) {
          console.error("[bakeTextEdits] Error on block:", err);
        }
      }

      // Save and reload
      const newBytes = await doc.save();
      const newUint8 = new Uint8Array(newBytes);
      setPdfBytes(newUint8);
      const newDoc = await pdfjsLib.getDocument({ data: newUint8.slice() }).promise;
      if (pdfDoc) { try { pdfDoc.destroy(); } catch {} }
      setPdfDoc(newDoc);
      setAllNativeTextBlocks(new Map());
      // renderPage will be triggered by the pdfDoc state change
    } catch (err) {
      console.error("[bakeTextEdits] Error:", err);
      toast.error("Error applying text edits");
    }
  }, [pdfBytes, scale, pdfDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderTaskRef = useRef<any>(null);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !mainCanvasRef.current) return;
    // Cancel any pending render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }
    const page = await pdfDoc.getPage(pageNum);
    const dpr = window.devicePixelRatio || 1;
    const vp = page.getViewport({ scale: scale * dpr });
    const canvas = mainCanvasRef.current;
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.width = `${vp.width / dpr}px`;
    canvas.style.height = `${vp.height / dpr}px`;
    const ctx = canvas.getContext("2d")!;
    const task = page.render({ canvas, viewport: vp } as any);
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch (e: any) {
      if (e?.name === "RenderingCancelledException") return;
      throw e;
    }
    renderTaskRef.current = null;

    // Sync drawing canvas size
    if (drawingCanvasRef.current) {
      drawingCanvasRef.current.width = vp.width;
      drawingCanvasRef.current.height = vp.height;
      drawingCanvasRef.current.style.width = `${vp.width / dpr}px`;
      drawingCanvasRef.current.style.height = `${vp.height / dpr}px`;
      redrawDrawingCanvas();
    }
  }, [pdfDoc, scale]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => { renderPage(currentPage); }, [renderPage, currentPage]);

  // Force render when pdfDoc first becomes available OR when canvas mounts
  useEffect(() => {
    if (pdfDoc && mainCanvasRef.current) {
      renderPage(currentPage);
    }
    // Listen for canvas mount event (canvas may mount AFTER pdfDoc is set)
    const handleCanvasMounted = () => {
      if (pdfDoc && mainCanvasRef.current) {
        renderPage(currentPage);
      }
    };
    window.addEventListener('pdf-canvas-mounted', handleCanvasMounted);
    return () => window.removeEventListener('pdf-canvas-mounted', handleCanvasMounted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, renderPage, currentPage]);

  // Auto-load initialFile if provided — converts non-PDF files first
  useEffect(() => {
    if (!initialFile) return;
    const isPdf = initialFile.name.toLowerCase().endsWith(".pdf") || initialFile.type === "application/pdf";
    if (isPdf) {
      setFile(initialFile);
      onFileNameChange?.(initialFile.name);
      loadPdf(initialFile);
      return;
    }
    // Non-PDF: convert on server first — show full-screen loading overlay
    setIsConvertingFile(true);
    setConvertFileProgress(0);
    // Simulate progress while waiting for server response
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 8 + 2; // random increments
      if (progress > 85) progress = 85; // cap at 85% until real completion
      setConvertFileProgress(Math.round(progress));
    }, 400);
    (async () => {
      try {
        const formData = new FormData();
        formData.append("file", initialFile);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        const resp = await fetch("/api/documents/convert-upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || "Conversion failed");
        }
        setConvertFileProgress(90);
        const pdfBlob = await resp.blob();
        const nameHeader = resp.headers.get("X-Converted-Name");
        const name = nameHeader ? decodeURIComponent(nameHeader) : initialFile.name.replace(/\.[^.]+$/, ".pdf");
        const pdfFile = new File([pdfBlob], name, { type: "application/pdf" });
        setConvertFileProgress(95);
        setFile(pdfFile);
        onFileNameChange?.(pdfFile.name);
        // CRITICAL: Update the context pendingFile with the converted PDF
        // so that savePdfToSession() saves the real PDF bytes (not the original image)
        // This prevents "not a valid PDF" error after OAuth redirect
        setPendingFile(pdfFile);
        await loadPdf(pdfFile);
        setConvertFileProgress(100);
        // Save original file info for the "converted" banner
        setConvertedFromFile({ name: initialFile.name, type: initialFile.type });
        setTimeout(() => {
          setIsConvertingFile(false);
          setShowConvertedBanner(true);
          setTimeout(() => setShowConvertedBanner(false), 12000);
        }, 500);
      } catch (err: any) {
        clearInterval(progressInterval);
        setIsConvertingFile(false);
        if (err?.name === "AbortError") {
          toast.error(t.editor_toast_convert_error ?? "Conversion timed out. Please try a smaller file.");
        } else {
          toast.error(t.editor_toast_convert_error ?? "Could not convert file.");
        }
        console.error("[InitialFile Convert]", err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  // ── Post-login auto-continuation ──────────────────────────────────────────
  // After OAuth redirect, if user had a pending download intent:
  // 1. Auto-save the document to user panel (using pendingEditedPdf from session)
  // 2. If premium → trigger download immediately
  // 3. If not premium → open paywall
  //
  // APPROACH: On mount, check sessionStorage for "cloudpdf_pending_action". If found,
  // start a polling interval that waits for isAuthenticated to become true.
  // This avoids the React useEffect dependency race condition entirely.
  const autoResumeTriggeredRef = useRef(false);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const pdfDocRef = useRef(pdfDoc);
  const pendingEditedPdfRef = useRef(pendingEditedPdf);
  const isPremiumRef = useRef(isPremium);
  const pdfBytesRef = useRef(pdfBytes);
  // Keep refs in sync
  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);
  useEffect(() => { pdfDocRef.current = pdfDoc; }, [pdfDoc]);
  useEffect(() => { pendingEditedPdfRef.current = pendingEditedPdf; }, [pendingEditedPdf]);
  useEffect(() => { isPremiumRef.current = isPremium; }, [isPremium]);
  useEffect(() => { pdfBytesRef.current = pdfBytes; }, [pdfBytes]);

  useEffect(() => {
    // Only run once on mount
    const pendingAction = sessionStorage.getItem("cloudpdf_pending_action");
    const hasPendingPaywall = initialOpenPaywall || pendingAction === "download";
    if (!hasPendingPaywall || autoResumeTriggeredRef.current) return;

    console.log("[autoResume] Detected pending action, starting poll...");

    // Poll every 300ms until isAuthenticated is true
    // (auth.me query takes ~100-300ms to resolve after page load)
    let attempts = 0;
    const maxAttempts = 50; // 15 seconds max
    const interval = setInterval(async () => {
      attempts++;
      const authed = isAuthenticatedRef.current;
      const hasPdf = pdfDocRef.current || pendingEditedPdfRef.current;

      console.log(`[autoResume] Poll #${attempts}: authed=${authed}, hasPdf=${!!hasPdf}`);

      if (attempts >= maxAttempts) {
        console.log("[autoResume] Timed out waiting for auth/pdf");
        clearInterval(interval);
        sessionStorage.removeItem("cloudpdf_pending_action");
        return;
      }

      // Need auth. PDF is optional (we can open paywall without it if we have pendingEditedPdf)
      if (!authed) {
        // Retry auth query every ~1.5s in case session cookie wasn't ready
        if (attempts % 5 === 0) refreshAuth();
        return;
      }
      // Need either a loaded PDF or a pendingEditedPdf from S3
      if (!hasPdf) {
        // If we've waited 3+ seconds and still no PDF, open paywall anyway
        if (attempts < 10) return;
      }

      // All conditions met — trigger!
      clearInterval(interval);
      if (autoResumeTriggeredRef.current) return;
      autoResumeTriggeredRef.current = true;
      sessionStorage.removeItem("cloudpdf_pending_action");
      onPaywallOpened?.();

      console.log("[autoResume] Triggering auto-resume download flow");

      const currentIsPremium = isPremiumRef.current;

      // If premium → download immediately
      if (currentIsPremium) {
        toast.loading("Preparando descarga...", { id: "dl" });
        try {
          const out = await buildAnnotatedPdf();
          if (out) {
            triggerDownload(out);
            toast.success("PDF descargado correctamente", { id: "dl" });
          }
        } catch {
          toast.error("Error al descargar", { id: "dl" });
        }
        return;
      }

      // Not premium → open paywall immediately, auto-save in background
      const currentPendingEdited = pendingEditedPdfRef.current;
      const currentPdfBytes = pdfBytesRef.current;

      // Build paywall data and open it right away
      if (currentPdfBytes) {
        try {
          const out = await buildAnnotatedPdf();
          if (out) {
            setPdfDataForPaywall({
              base64: uint8ToBase64(out),
              name: file?.name ?? "document.pdf",
              size: out.byteLength,
            });
            generateAnnotatedThumbnail(out).then(t => { if (t) setPaywallThumbnail(t); });
          }
        } catch {}
      } else if (currentPendingEdited) {
        // No PDF loaded in editor but we have an edited PDF in temp storage
        // Fetch it to generate thumbnail for the paywall
        try {
          const tempKey = currentPendingEdited.tempKey;
          let pdfBytes: Uint8Array | null = null;
          if (tempKey.startsWith("base64:")) {
            const b64 = tempKey.slice(7);
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            pdfBytes = arr;
          } else {
            const resp = await fetch(`/api/documents/temp-download/${encodeURIComponent(tempKey)}`);
            if (resp.ok) pdfBytes = new Uint8Array(await resp.arrayBuffer());
          }
          if (pdfBytes) {
            setPdfDataForPaywall({
              base64: uint8ToBase64(pdfBytes),
              name: currentPendingEdited.name,
              size: pdfBytes.byteLength,
            });
            generateAnnotatedThumbnail(pdfBytes).then(t => { if (t) setPaywallThumbnail(t); });
          }
        } catch {}
      }
      setShowPaywall(true);

      // Auto-save document in background (so it's in the user's account even if they don't pay)
      if (currentPendingEdited) {
        fetch("/api/documents/claim-temp", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tempKey: currentPendingEdited.tempKey, name: currentPendingEdited.name, paymentStatus: "pending" }),
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (data?.doc?.id) setSavedDocId(data.doc.id);
        }).catch(() => {});
        clearPendingEditedPdf();
      } else if (currentPdfBytes) {
        buildAnnotatedPdf().then(out => {
          if (out) autoSaveDocument(out).then(r => { if (r?.docId) setSavedDocId(r.docId); });
        }).catch(() => {});
      }
    }, 300);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONLY on mount

  // ── Load native text blocks for Edit-Text tool ──────────────
  const loadNativeTextBlocks = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(pageNum);
    const vp = page.getViewport({ scale });
    const content = await page.getTextContent({ disableCombineTextItems: false } as any);
    const styles = (content as any).styles ?? {};
    const pdfPageHeight = vp.height / scale;

    // Group text items into paragraphs using empty items as separators
    const allItems = content.items as any[];
    const paragraphs: Array<any[]> = [];
    let currentPara: any[] = [];

    for (const item of allItems) {
      if (!item.str || !item.str.trim()) {
        if (currentPara.length > 0) {
          paragraphs.push(currentPara);
          currentPara = [];
        }
        continue;
      }
      // Break on font size change or large position shift
      if (currentPara.length > 0) {
        const prev = currentPara[currentPara.length - 1];
        const [,,,, pe, pf] = prev.transform as number[];
        const [a2, b2,,, e2, f2] = item.transform as number[];
        const prevSize = Math.sqrt(prev.transform[0] ** 2 + prev.transform[1] ** 2);
        const curSize = Math.sqrt(a2 ** 2 + b2 ** 2);
        const prevY = (pdfPageHeight - pf) * scale;
        const curY = (pdfPageHeight - f2) * scale;
        const prevX = pe * scale;
        const curX = e2 * scale;
        if (Math.abs(curSize - prevSize) > 2 || Math.abs(curX - prevX) > prev.width * scale * 0.8 && Math.abs(curX - currentPara[0].transform[4] * scale) > 40 || curY - prevY > prevSize * scale * 2.5) {
          paragraphs.push(currentPara);
          currentPara = [];
        }
      }
      currentPara.push(item);
    }
    if (currentPara.length > 0) paragraphs.push(currentPara);

    // Build NativeTextBlock per paragraph
    const blocks: NativeTextBlock[] = [];
    for (const para of paragraphs) {
      // Join items on same line with space, different lines with newline
      let combinedStr = "";
      for (let i = 0; i < para.length; i++) {
        if (i === 0) { combinedStr = para[i].str; continue; }
        const [,,,, , pf] = para[i - 1].transform;
        const [,,,, , cf] = para[i].transform;
        const prevSize = Math.sqrt(para[i-1].transform[0] ** 2 + para[i-1].transform[1] ** 2);
        const isNewLine = Math.abs(pf - cf) > prevSize * 0.3;
        combinedStr += isNewLine ? "\n" + para[i].str : " " + para[i].str;
      }

      const first = para[0];
      const last = para[para.length - 1];
      const [a, b,,, e, f] = first.transform;
      const fontSize = Math.sqrt(a * a + b * b);
      const pdfWidth = first.width ?? first.str.length * fontSize * 0.6;
      const fontFamily = styles[first.fontName]?.fontFamily || "sans-serif";
      const pdfFontName = first.fontName || "";
      const searchStr = (pdfFontName + " " + fontFamily).toLowerCase();

      // Calculate bounding box from all items
      const positions = para.map((item: any) => {
        const [ia, ib,,, ie, iff] = item.transform;
        const iSize = Math.sqrt(ia * ia + ib * ib);
        const iWidth = item.width ?? item.str.length * iSize * 0.6;
        return {
          x: ie * scale,
          y: (pdfPageHeight - iff) * scale - iSize * scale,
          w: iWidth * scale,
          h: iSize * scale * 1.4,
        };
      });
      const minX = Math.min(...positions.map((p: any) => p.x));
      const minY = Math.min(...positions.map((p: any) => p.y));
      const maxR = Math.max(...positions.map((p: any) => p.x + p.w));
      const maxB = Math.max(...positions.map((p: any) => p.y + p.h));

      // Line height from consecutive items
      let lineH = fontSize * scale * 1.5;
      if (para.length >= 2) {
        let total = 0;
        for (let i = 1; i < para.length; i++) {
          total += Math.abs(positions[i].y - positions[i-1].y);
        }
        lineH = total / (para.length - 1) || lineH;
      }

      blocks.push({
        id: Math.random().toString(36).slice(2),
        str: combinedStr,
        x: minX, y: minY,
        width: Math.max(maxR - minX, 20),
        height: Math.max(maxB - minY, 14),
        fontSize: fontSize * scale,
        pdfX: e, pdfY: last.transform[5],
        pdfWidth: Math.max(pdfWidth, 10),
        pdfFontSize: Math.max(fontSize, 6),
        pageHeight: pdfPageHeight,
        page: pageNum,
        fontFamily,
        fontWeight: searchStr.includes("bold") || searchStr.includes("black") ? "bold" : "normal",
        fontStyle: searchStr.includes("italic") || searchStr.includes("oblique") ? "italic" : "normal",
        originalColor: "#000000",
        lineHeight: lineH,
        pdfFontName,
      });
    }

    // Merge with existing to preserve edits
    setAllNativeTextBlocks(prev => {
      const existing = prev.get(pageNum);
      if (existing && existing.length > 0) {
        const merged = blocks.map(newBlock => {
          const match = existing.find(
            ex => ex.str === newBlock.str && Math.abs(ex.x - newBlock.x) < 5 && Math.abs(ex.y - newBlock.y) < 5
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

  // Auto-save edited text when switching away from edit-text tool or changing page
  const editingBlockIdRef = useRef(editingBlockId);
  const editingBlockTextRef = useRef(editingBlockText);
  editingBlockIdRef.current = editingBlockId;
  editingBlockTextRef.current = editingBlockText;

  useEffect(() => {
    // When activeTool changes away from edit-text, save any pending edit
    if (activeTool !== "edit-text" && editingBlockIdRef.current) {
      const blockId = editingBlockIdRef.current;
      const text = editingBlockTextRef.current;
      setAllNativeTextBlocks(prev => {
        const entries = Array.from(prev.entries());
        for (const [page, blocks] of entries) {
          const idx = blocks.findIndex((b: NativeTextBlock) => b.id === blockId);
          if (idx !== -1) {
            const updated = blocks.map((b: NativeTextBlock) =>
              b.id === blockId ? { ...b, editedStr: text } : b
            );
            const next = new Map(prev);
            next.set(page, updated);
            return next;
          }
        }
        return prev;
      });
      setEditingBlockId(null);
    }
  }, [activeTool, editTextColor]);

  // Reload text blocks when page or scale changes while edit-text is active
  useEffect(() => {
    if (activeTool === "edit-text" && pdfDoc) {
      loadNativeTextBlocks(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, currentPage, scale, pdfDoc]);

  // Handle file drop / select — auto-converts non-PDF files to PDF via server
  const handleFile = useCallback(async (f: File) => {
    const isPdf = f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf";
    if (isPdf) {
      setFile(f);
      onFileNameChange?.(f.name);
      loadPdf(f);
      toast.success(t.editor_toast_pdf_loaded ?? "PDF loaded successfully");
      return;
    }
    // Non-PDF: show full-screen loading overlay with progress bar
    setIsConvertingFile(true);
    setConvertFileProgress(0);
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress > 85) progress = 85;
      setConvertFileProgress(Math.round(progress));
    }, 400);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const resp = await fetch("/api/documents/convert-upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Conversion failed");
      }
      setConvertFileProgress(90);
      const pdfBlob = await resp.blob();
      const nameHeader = resp.headers.get("X-Converted-Name");
      const name = nameHeader ? decodeURIComponent(nameHeader) : f.name.replace(/\.[^.]+$/, ".pdf");
      const pdfFile = new File([pdfBlob], name, { type: "application/pdf" });
      setConvertFileProgress(95);
      setFile(pdfFile);
      onFileNameChange?.(pdfFile.name);
      await loadPdf(pdfFile);
      setConvertFileProgress(100);
      // Save original file info for the "converted" banner
      setConvertedFromFile({ name: f.name, type: f.type });
      setTimeout(() => {
        setIsConvertingFile(false);
        setShowConvertedBanner(true);
        // Auto-hide banner after 12 seconds
        setTimeout(() => setShowConvertedBanner(false), 12000);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsConvertingFile(false);
      if (err?.name === "AbortError") {
        toast.error(t.editor_toast_convert_error ?? "Conversion timed out. Please try a smaller file.");
      } else {
        toast.error(t.editor_toast_convert_error ?? "Could not convert file. Please try a PDF file.");
      }
      console.error("[ConvertUpload]", err);
    }
  }, [loadPdf, t]);

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

  // Touch equivalent for brush/eraser/highlight on mobile
  const getCanvasPosFromTouch = useCallback((touch: React.Touch): { x: number; y: number } => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent) => {
    if (activeTool !== "brush" && activeTool !== "eraser" && activeTool !== "highlight") return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getCanvasPosFromTouch(touch);
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
    } else {
      setIsCanvasDrawing(true);
      setCanvasDrawStart(pos);
      setDragPreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }
  }, [activeTool, brushColor, brushSize, getCanvasPosFromTouch, getDrawCtx]);

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isCanvasDrawingRef.current) return;
    if (activeTool !== "brush" && activeTool !== "eraser" && activeTool !== "highlight") return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getCanvasPosFromTouch(touch);
    if (activeTool === "brush") {
      setCurrentBrushPoints(prev => [...prev, pos]);
      const ctx = getDrawCtx();
      if (ctx) { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
    } else {
      const x = Math.min(pos.x, canvasDrawStart.x);
      const y = Math.min(pos.y, canvasDrawStart.y);
      const w = Math.abs(pos.x - canvasDrawStart.x);
      const h = Math.abs(pos.y - canvasDrawStart.y);
      setDragPreview({ x, y, w, h });
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
  }, [activeTool, getCanvasPosFromTouch, getDrawCtx, canvasDrawStart, highlightColor, redrawDrawingCanvas]);

  const handleCanvasTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isCanvasDrawingRef.current) return;
    if (activeTool !== "brush" && activeTool !== "eraser" && activeTool !== "highlight") return;
    e.preventDefault();
    setIsCanvasDrawing(false);
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
  }, [activeTool, currentBrushPoints, dragPreview, currentPage, brushColor, brushSize, highlightColor, pushHistory]);

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
    if (!isCanvasDrawingRef.current) return;
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
  }, [activeTool, getCanvasPos, getDrawCtx, canvasDrawStart, highlightColor, redrawDrawingCanvas]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isCanvasDrawingRef.current) return;
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
  }, [activeTool, getCanvasPos, currentBrushPoints, dragPreview, currentPage, brushColor, brushSize, highlightColor, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndex < 0) return;
    if (historyIndex === 0) { setAnnotations([]); setHistoryIndex(-1); return; }
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
    toast.success(t.editor_sign_added ?? "Signature added. Drag it to position.");
    // Keep sign tool active so user can add multiple signatures
  };
  // Generate a cursive-style signature from a typed name using canvas
  const placeNameSignature = () => {
    if (!signName.trim()) { toast.error(t.editor_toast_sign_name_required ?? "Type your name first"); return; }
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
    toast.success(t.editor_sign_added ?? "Signature added. Drag it to position.");
  };

  // Generate electronic signature block (name + date + legal text rendered to canvas)
  const placeESign = () => {
    if (!eSignName.trim()) { toast.error(t.editor_toast_sign_name_required ?? "Type your full name"); return; }
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
    toast.success(t.editor_toast_esign_added ?? "✓ Electronic signature inserted. Drag it to the desired position.");
  };

  // ── Add text ────────────────────────────────────────────
  const placeText = () => {
    if (!textInput.trim()) { toast.error(t.editor_toast_text_required ?? "Type the text first"); return; }
    addAnnotation({
      type: "text", text: textInput, x: 80, y: 80,
      width: Math.max(100, textInput.length * (textSize * 0.6)),
      height: textSize + 8, page: currentPage,
      color: textColor, fontSize: textSize, fontFamily: textFont,
      fontWeight: textBold ? "bold" : "normal",
      fontStyle: textItalic ? "italic" : "normal",
      textDecoration: [textUnderline ? "underline" : "", textStrikethrough ? "line-through" : ""].filter(Boolean).join(" ") || "none",
    });
    setTextInput("");
    toast.success(t.editor_toast_image_added ?? "Text added. Drag it to position.");
    // Keep text tool active so user can add more text
  };

  const activateTextPlace = () => {
    if (!textInput.trim()) { toast.error(t.editor_toast_text_required ?? "Type the text first"); return; }
    setClickToPlaceText(true);
    toast.info("Haz clic en el PDF donde quieres colocar el texto");
  };

  // ── Add note ──────────────────────────────────────────────────
  const placeNote = () => {
    if (!noteText.trim()) { toast.error(t.editor_toast_note_required ?? "Write the note first"); return; }
    addAnnotation({
      type: "note", text: noteText, x: 80, y: 80,
      width: 200, height: 80, page: currentPage, color: "#FFF176",
    });
    setNoteText("");
    toast.success(t.editor_toast_note_added ?? "Note added.");
    // Keep notes tool active
  };

  // ── Add image ─────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Read file as data URL first, then load into Image, then convert to PNG
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // Convert to PNG via canvas so pdf-lib can always embed it
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const dataUrl = c.toDataURL("image/png");
        const aspect = img.naturalWidth / img.naturalHeight;
        const w = 200;
        const h = Math.round(w / aspect);
        addAnnotation({
          type: "image", dataUrl,
          x: 80, y: 80, width: w, height: h, page: currentPage, rotation: 0,
        });
        toast.success(t.editor_toast_image_added ?? "Image added. Drag it to position.");
      };
      img.onerror = () => toast.error("Error loading image");
      img.src = rawDataUrl;
    };
    reader.onerror = () => toast.error("Error reading file");
    reader.readAsDataURL(f);
  };
  // ── Add shapee ─────────────────────────────────────────────────
  const placeShape = () => {
    addAnnotation({
      type: "shape", x: 100, y: 100, width: 150, height: 80,
      page: currentPage, color: shapeColor,
      // Encode fill info in the text field: "rect", "circle", "line", "rect-filled", "circle-filled"
      text: shapeFilled ? `${shapeType}-filled` : shapeType,
    });
    toast.success(t.editor_toast_shape_added ?? "Shape added. Drag it to position.");
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
    // Deselect annotation when clicking directly on the overlay background (not on a child annotation)
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
    if (activeTool === "pointer" || activeTool === "move") {
      return;
    }
    if (activeTool === "text") {
      // Click on PDF to place a new text annotation and start inline editing
      const overlay = overlayRef.current!.getBoundingClientRect();
      const x = e.clientX - overlay.left;
      const y = e.clientY - overlay.top;
      const initialText = textInput.trim() || "";
      const newId = Math.random().toString(36).slice(2);
      const newAnn: Annotation = {
        id: newId,
        type: "text", text: initialText,
        x, y,
        width: Math.max(150, initialText.length * (textSize * 0.6)),
        height: textSize + 16, page: currentPage,
        color: textColor, fontSize: textSize, fontFamily: textFont,
      };
      setAnnotations(prev => { const next = [...prev, newAnn]; pushHistory(next); return next; });
      setSelectedId(newId);
      setEditingTextId(newId);
      setTextInput("");
      setClickToPlaceText(false);
    }
  };

  // ── Compress ──────────────────────────────────────────────────────
  // Renders each page via pdfjs to canvas, re-encodes as JPEG at the chosen quality,
  // and builds a new PDF from those JPEG pages. This guarantees real compression.
  const compressPdf = async () => {
    if (!pdfBytes || !pdfDoc) return;
    setIsCompressing(true);
    setCompressResult(null);
    toast.loading(t.editor_toast_compressing ?? "Compressing PDF...", { id: "compress" });
    try {
      const originalSize = (pdfBytes as Uint8Array).byteLength;
      const quality = compressQuality / 100; // 0.2 to 1.0

      // Determine render scale: lower quality → lower resolution → smaller file
      // quality 1.0 → scale 1.5, quality 0.5 → scale 1.0, quality 0.2 → scale 0.7
      const renderScale = quality < 0.4 ? 0.7 : quality < 0.6 ? 1.0 : quality < 0.8 ? 1.2 : 1.5;

      // Create new PDF document from JPEG renderings of each page
      const newDoc = await PDFDocument.create();
      const numPages = pdfDoc.numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: renderScale });

        // Render page to offscreen canvas
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) continue;

        await page.render({ canvasContext: ctx2d, viewport } as any).promise;

        // Convert canvas to JPEG blob at the specified quality
        const jpegBlob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(resolve, "image/jpeg", quality)
        );
        if (!jpegBlob) continue;

        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        const jpegImage = await newDoc.embedJpg(jpegBytes);

        // Get original page dimensions (in PDF points) to preserve layout
        const origViewport = page.getViewport({ scale: 1.0 });
        const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });
      }

      const compressed = await newDoc.save({ useObjectStreams: true });
      const blob = new Blob([compressed.buffer as ArrayBuffer], { type: "application/pdf" });
      const downloadName = `compressed_${file?.name ?? "document.pdf"}`;
      const compressedSize = compressed.byteLength;
      setCompressResult({ originalSize, compressedSize, blob, name: downloadName });
      toast.success(t.editor_toast_compressed ?? "PDF compressed", { id: "compress" });
    } catch (err) {
      console.error("Compress error:", err);
      toast.error(t.editor_toast_compress_error ?? "Error compressing", { id: "compress" });
    } finally {
      setIsCompressing(false);
    }
  };

  // ── Download compressed PDF (goes through paywall) ──
  const downloadCompressedPdf = async () => {
    if (!compressResult) return;
    await guardedDownload(compressResult.blob, compressResult.name, "compress");
  };

  // ── Protect with password ─────────────────────────────────────
  const protectPdf = async () => {
    if (!pdfBytes || !password) { toast.error(t.editor_toast_password_required ?? "Enter a password"); return; }
    if (password !== confirmPassword) { toast.error(t.editor_protect_passwords_mismatch ?? "Passwords do not match"); return; }
    setIsProtecting(true);
    setProtectProgress(5);
    const progressInterval = setInterval(() => {
      setProtectProgress(prev => prev < 40 ? prev + 2 : prev < 85 ? prev + 0.8 : prev);
    }, 80);
    try {
      // 1. Get final PDF bytes (with all annotations/edits applied)
      const finalBytes = await buildAnnotatedPdf();
      if (!finalBytes) {
        clearInterval(progressInterval);
        setIsProtecting(false); setProtectProgress(0);
        toast.error(t.editor_toast_protect_error ?? "Error protecting");
        return;
      }
      setProtectProgress(45);
      // 2. Encrypt client-side using pdf-encrypt-lite (RC4 128-bit)
      const ownerPw = password + "_owner";
      const encryptedBytes = await encryptPDF(finalBytes, password, ownerPw);
      setProtectProgress(90);
      // 3. Store the protected PDF result (paywall only on download)
      const filename = file?.name ?? "document.pdf";
      const protectedBlob = new Blob([encryptedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const downloadName = filename.replace(/\.pdf$/i, "") + "_protected.pdf";
      clearInterval(progressInterval);
      setProtectProgress(100);
      setProtectResult({ blob: protectedBlob, name: downloadName });
      toast.success(t.editor_toast_protected ?? "PDF protected!", { id: "protect" });
      setTimeout(() => { setIsProtecting(false); setProtectProgress(0); }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setIsProtecting(false); setProtectProgress(0);
      toast.error(t.editor_toast_protect_error ?? "Error protecting PDF");
    } finally {
      clearInterval(progressInterval);
    }
  };
  // ── Download protected PDF (goes through paywall) ──
  const downloadProtectedPdf = async () => {
    if (!protectResult) return;
    await guardedDownload(protectResult.blob, protectResult.name, "protect");
  };

  // ── Export PDF to Word/Excel/PPT ──────────────────────────────
  const exportPdf = async (format: "docx" | "xlsx" | "pptx") => {
    if (!pdfBytes) { toast.error("No PDF loaded"); return; }
    setIsExporting(true);
    setExportProgress(5);
    const progressInterval = setInterval(() => {
      setExportProgress(prev => prev < 30 ? prev + 3 : prev < 80 ? prev + 0.8 : prev);
    }, 100);
    try {
      const finalBytes = await buildAnnotatedPdf();
      if (!finalBytes) throw new Error("Failed to build PDF");
      setExportProgress(35);
      const formData = new FormData();
      const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const filename = file?.name ?? "document.pdf";
      formData.append("file", blob, filename);
      formData.append("format", format);
      formData.append("filename", filename);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      let resp: Response;
      try {
        resp = await fetch("/api/documents/export", {
          method: "POST",
          body: formData,
          credentials: "include",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Server error");
      }
      setExportProgress(90);
      const exportedBlob = await resp.blob();
      const downloadName = filename.replace(/\.pdf$/i, "") + "." + format;
      setExportProgress(100);
      setTimeout(() => { setIsExporting(false); setExportProgress(0); }, 1500);
      await guardedDownload(exportedBlob, downloadName, "export");
    } catch (err) {
      clearInterval(progressInterval);
      setIsExporting(false); setExportProgress(0);
      const msg = err instanceof Error && err.name === "AbortError"
        ? "Export timed out (the file may be too large)"
        : `Error exporting: ${err instanceof Error ? err.message : "Unknown error"}`;
      toast.error(msg);
    } finally {
      clearInterval(progressInterval);
    }
  };

  // ── Convert PDF to image ──────────────────────────────────────
  const convertToImage = async (format: "jpg" | "png") => {
    if (!pdfDoc) return;
    toast.loading(t.editor_toast_converting ?? `Converting to ${format.toUpperCase()}...`, { id: "convert" });
    try {
      const page = await pdfDoc.getPage(currentPage);
      const vp = page.getViewport({ scale: 2 });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvas: c, viewport: vp } as any).promise;
      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      c.toBlob(async (blob) => {
        if (!blob) return;
        const downloadName = `page${currentPage}.${format}`;
        await guardedDownload(blob, downloadName, "convert");
      }, mimeType, 0.92);
    } catch {
      toast.error(t.editor_toast_convert_error ?? "Error converting", { id: "convert" });
    }
  };

  // ── Convert all pages to images (ZIP) ────────────────────────
  const convertAllToImages = async (format: "jpg" | "png") => {
    if (!pdfDoc) return;
    toast.loading(t.editor_toast_converting ?? "Converting all pages...", { id: "convertAll" });
    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const c = document.createElement("canvas");
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvas: c, viewport: vp } as any).promise;
        await new Promise<void>((res) => {
          c.toBlob(async (blob) => {
            if (!blob) { res(); return; }
            const downloadName = `page${i}.${format}`;
            await guardedDownload(blob, downloadName, "convertAll");
            setTimeout(res, 300);
          }, format === "jpg" ? "image/jpeg" : "image/png", 0.92);
        });
        // If paywall was shown (not premium), stop after first page
        if (!isPremium) break;
      }
      if (isPremium) toast.success(t.editor_toast_converted ?? `${totalPages} pages exported`, { id: "convertAll" });
    } catch {
      toast.error(t.editor_toast_convert_error ?? "Error converting", { id: "convertAll" });
    }
  };

  // ── Convert image to PDF ──────────────────────────────────────
  const convertImageToPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    toast.loading(t.editor_toast_converting ?? "Converting image to PDF...", { id: "img2pdf" });
    try {
      const doc = await PDFDocument.create();
      const bytes = new Uint8Array(await f.arrayBuffer());
      let img;
      if (f.type === "image/png") img = await doc.embedPng(bytes);
      else img = await doc.embedJpg(bytes);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      const pdfOut = await doc.save();
      const blob = new Blob([pdfOut.buffer as ArrayBuffer], { type: "application/pdf" });
      const downloadName = f.name.replace(/\.[^.]+$/, "") + ".pdf";
      await guardedDownload(blob, downloadName, "img2pdf");
    } catch {
      toast.error(t.editor_toast_convert_error ?? "Error converting image", { id: "img2pdf" });
    }
  };

  // ── Merge PDFs ────────────────────────────────────────────────
  const mergePdfs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !pdfBytes) return;
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
      // Reload the merged PDF into the editor instead of downloading
      const mergedBytes = new Uint8Array(out);
      const mergedBlob = new Blob([mergedBytes], { type: "application/pdf" });
      const mergedFile = new File([mergedBlob], "merged.pdf", { type: "application/pdf" });
      await loadPdf(mergedFile);
      setAnnotations([]);
      setAllNativeTextBlocks(new Map());
      toast.success("PDFs fusionados correctamente", { id: "merge" });
    } catch {
      toast.error("Error al fusionar", { id: "merge" });
    }
  };

  // ── Split PDF ─────────────────────────────────────────────────
  const splitPdf = async (splitAt: number) => {
    if (!pdfBytes) return;
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
        const blob = new Blob([out.buffer as ArrayBuffer], { type: "application/pdf" });
        const downloadName = `part${i}_${file?.name ?? "document.pdf"}`;
        await guardedDownload(blob, downloadName, "split");
        // If paywall was shown (not premium), stop after first part
        if (!isPremium) break;
      }
    } catch {
      toast.error("Error al dividir", { id: "split" });
    }
  };

  // ── Rotate page ─────────────────────────────────────────────
  const rotatePage = async () => {
    if (!pdfBytes) return;
    toast.loading(t.editor_toast_rotating ?? "Rotating page...", { id: "rotate" });
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
      toast.success(t.editor_toast_rotated ?? "Page rotated", { id: "rotate" });
    } catch {
      toast.error(t.editor_toast_rotate_error ?? "Error rotating", { id: "rotate" });
    }
  };

    // ── Add blank page after current ────────────────────────────
  const addBlankPage = async () => {
    if (!pdfBytes) return;
    try {
      const doc = await PDFDocument.load(pdfBytes.slice());
      const lastPage = doc.getPage(currentPage - 1);
      const { width, height } = lastPage.getSize();
      doc.insertPage(currentPage, [width, height]);
      const out = await doc.save();
      const newBytes = new Uint8Array(out).slice();
      setPdfBytes(newBytes);
      const newDoc = await pdfjsLib.getDocument({ data: newBytes.slice() }).promise;
      setPdfDoc(newDoc);
      setTotalPages(doc.getPageCount());
      const newPageNum = currentPage + 1;
      setCurrentPage(newPageNum);
      // Generate thumbnail for the new blank page
      const newPage = await newDoc.getPage(newPageNum);
      const vp = newPage.getViewport({ scale: 0.4 });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, vp.width, vp.height);
      await newPage.render({ canvas: c, viewport: vp } as any).promise;
      setThumbnails(prev => {
        const updated = [...prev];
        updated.splice(currentPage, 0, c.toDataURL());
        return updated;
      });
      toast.success((t as any).editor_toast_page_added ??"Page added");
    } catch {
      toast.error("Error adding page");
    }
  };

    // ── Delete page ─────────────────────────────────────────────
  const deletePage = async () => {
    if (!pdfBytes || totalPages <= 1) { toast.error(t.editor_toast_only_page ?? "Cannot delete the only page"); return; }
    toast.loading(t.editor_toast_deleting_page ?? "Deleting page...", { id: "delpage" });
    try {
      const safeBytes = pdfBytes.slice();
      const doc = await PDFDocument.load(safeBytes);
      doc.removePage(currentPage - 1);
      const out = await doc.save();
      const newBytes = new Uint8Array(out).slice();
      setPdfBytes(newBytes);
      const newDoc = await pdfjsLib.getDocument({ data: newBytes.slice() }).promise;
      setPdfDoc(newDoc);
      const newPageCount = doc.getPageCount(); // already removed, so this is the new count
      setTotalPages(newPageCount);
      const newCurrentPage = currentPage > newPageCount ? newPageCount : currentPage;
      setCurrentPage(newCurrentPage);
      // Rebuild thumbnails without the deleted page
      setThumbnails(prev => prev.filter((_, i) => i !== currentPage - 1));
      // Also remove annotations for the deleted page and shift others
      setAnnotations(prev => prev
        .filter(a => a.page !== currentPage)
        .map(a => a.page > currentPage ? { ...a, page: a.page - 1 } : a)
      );
      toast.success(t.editor_toast_page_deleted ?? "Page deleted", { id: "delpage" });
    } catch {
      toast.error(t.editor_toast_page_delete_error ?? "Error deleting page", { id: "delpage" });
    }
  };

  // ── Build annotated PDF as Uint8Array (shared by download and paywall) ──
  // Generate a thumbnail of the annotated PDF (first page)
  const generateAnnotatedThumbnail = async (pdfData: Uint8Array): Promise<string | undefined> => {
    try {
      const doc = await pdfjsLib.getDocument({ data: pdfData.slice() }).promise;
      const page = await doc.getPage(1);
      const vp = page.getViewport({ scale: 0.5 });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvas: c, viewport: vp } as any).promise;
      const thumb = c.toDataURL();
      doc.destroy();
      return thumb;
    } catch { return undefined; }
  };

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
      try {
      const page = doc.getPage(ann.page - 1);
      const { height } = page.getSize();
      const pdfY = height - ann.y - ann.height;
      if (ann.type === "text" && ann.text) {
        page.drawText(ann.text, { x: ann.x, y: pdfY + ann.height / 2, size: ann.fontSize ?? 14, font, color: rgb(0, 0, 0) });
      } else if ((ann.type === "signature" || ann.type === "image") && ann.dataUrl) {
        try {
          // If rotated, pre-rotate the image via canvas before embedding
          let finalDataUrl = ann.dataUrl;
          let drawW = ann.width, drawH = ann.height;
          if (ann.rotation && ann.rotation % 360 !== 0) {
            const tmpImg = await new Promise<HTMLImageElement>((resolve, reject) => {
              const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = ann.dataUrl!;
            });
            const rad = (ann.rotation * Math.PI) / 180;
            const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
            const cw = Math.ceil(tmpImg.width * cos + tmpImg.height * sin);
            const ch = Math.ceil(tmpImg.width * sin + tmpImg.height * cos);
            const c = document.createElement("canvas"); c.width = cw; c.height = ch;
            const ctx = c.getContext("2d")!;
            ctx.translate(cw / 2, ch / 2);
            ctx.rotate(rad);
            ctx.drawImage(tmpImg, -tmpImg.width / 2, -tmpImg.height / 2);
            finalDataUrl = c.toDataURL("image/png");
            if (ann.rotation % 180 !== 0) { drawW = ann.height; drawH = ann.width; }
          }
          const imgBytes = await fetch(finalDataUrl).then(r => r.arrayBuffer());
          const uint8 = new Uint8Array(imgBytes);
          let img;
          if (uint8[0] === 0x89 && uint8[1] === 0x50) {
            img = await doc.embedPng(uint8);
          } else {
            try { img = await doc.embedJpg(uint8); }
            catch { img = await doc.embedPng(uint8); }
          }
          const finalPdfY = height - ann.y - drawH;
          page.drawImage(img, { x: ann.x, y: finalPdfY, width: drawW, height: drawH });
        } catch (imgErr) {
          console.error("[buildAnnotatedPdf] Error embedding image/signature:", imgErr, ann);
        }
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
          page.drawRectangle({ x: ann.x, y: pdfY, width: ann.width, height: ann.height, borderColor: rgb(r2, g2, b2), borderWidth: 2 });
        } else if (ann.text === "rect-filled") {
          page.drawRectangle({ x: ann.x, y: pdfY, width: ann.width, height: ann.height, borderColor: rgb(r2, g2, b2), borderWidth: 2, color: rgb(r2, g2, b2), opacity: 1 });
        } else if (ann.text === "circle") {
          page.drawEllipse({ x: ann.x + ann.width / 2, y: pdfY + ann.height / 2, xScale: ann.width / 2, yScale: ann.height / 2, borderColor: rgb(r2, g2, b2), borderWidth: 2 });
        } else if (ann.text === "circle-filled") {
          page.drawEllipse({ x: ann.x + ann.width / 2, y: pdfY + ann.height / 2, xScale: ann.width / 2, yScale: ann.height / 2, borderColor: rgb(r2, g2, b2), borderWidth: 2, color: rgb(r2, g2, b2), opacity: 1 });
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
      } catch (annErr) {
        console.error("[buildAnnotatedPdf] Error processing annotation:", annErr, ann.type, ann);
      }
    }
    // Apply native text edits: cover original text with white rect, draw new text
    // Collect edited blocks from ALL pages
    const editedBlocks: NativeTextBlock[] = [];
    allNativeTextBlocks.forEach(pageBlocks => {
      pageBlocks.filter(b => b.editedStr !== undefined).forEach(b => editedBlocks.push(b));
    });
    for (const block of editedBlocks) {
      try {
        const page = doc.getPage(block.page - 1);
        const { width: pageW, height: pageH } = page.getSize();
        const fontSizePts = block.pdfFontSize;
        const lineHeight = fontSizePts * 1.4;

        // Cover original paragraph area with white rectangle
        // block.y is canvas top, block.height is canvas height — convert to PDF coords
        const coverTop = pageH - (block.y / scale);
        const coverBottom = pageH - ((block.y + block.height) / scale);
        const coverWidth = pageW - block.pdfX + 10;
        page.drawRectangle({
          x: block.pdfX - 4,
          y: coverBottom - fontSizePts * 0.3,
          width: coverWidth,
          height: (coverTop - coverBottom) + fontSizePts * 0.6,
          color: rgb(1, 1, 1),
          opacity: 1,
        });

        // Draw replacement text line by line
        const hexColor = block.fontColor && block.fontColor.length === 7 ? block.fontColor : "#000000";
        const tr = parseInt(hexColor.slice(1, 3), 16) / 255;
        const tg = parseInt(hexColor.slice(3, 5), 16) / 255;
        const tb = parseInt(hexColor.slice(5, 7), 16) / 255;
        const textColor = rgb(isNaN(tr) ? 0 : tr, isNaN(tg) ? 0 : tg, isNaN(tb) ? 0 : tb);
        const editedLines = block.editedStr!.split("\n");
        // Start from the top of the paragraph
        const startY = coverTop - fontSizePts;
        for (let i = 0; i < editedLines.length; i++) {
          const safeText = editedLines[i].replace(/[^\x00-\xFF]/g, "?");
          if (!safeText.trim()) continue;
          page.drawText(safeText, {
            x: block.pdfX,
            y: startY - i * lineHeight,
            size: fontSizePts,
            font,
            color: textColor,
          });
        }
      } catch (err) {
        console.error("[buildAnnotatedPdf] Error applying text edit:", err, block);
      }
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
        toast.info(`"${searchQuery}" ${t.editor_toast_not_found}`);
      } else {
        toast.success(`${results.length} ${t.editor_toast_search_results}`);
      }
    } catch {
      toast.error("Error al buscar en el PDF");
    } finally {
      setIsSearching(false);
    }
  };
  // ── Helper: auto-save document to user panel ──────────────────────────────
  const autoSaveDocument = async (pdfOut: Uint8Array): Promise<{ docId: number; isPremium: boolean } | null> => {
    try {
      const safeBuffer = pdfOut.buffer.slice(pdfOut.byteOffset, pdfOut.byteOffset + pdfOut.byteLength) as ArrayBuffer;
      const blob = new Blob([safeBuffer], { type: "application/pdf" });
      const formData = new FormData();
      const autoSaveName = displayName || file?.name || "document.pdf";
      formData.append("file", blob, autoSaveName);
      formData.append("name", autoSaveName);
      const resp = await fetch("/api/documents/auto-save", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return { docId: data.doc?.id, isPremium: data.isPremium };
    } catch (err) {
      console.error("[autoSaveDocument]", err);
      return null;
    }
  };

  // ── Helper: trigger browser download ──────────────────────────────
  const triggerDownload = (pdfOut: Uint8Array, downloadName?: string) => {
    const blob = new Blob([pdfOut.buffer.slice(pdfOut.byteOffset, pdfOut.byteOffset + pdfOut.byteLength) as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = downloadName ?? displayName ?? file?.name ?? "document.pdf";
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Helper: trigger browser download for any blob ──────────────────────────────
  const triggerBlobDownload = (blob: Blob, downloadName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = downloadName;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Ref to store pending tool download (blob + filename) for post-payment ──
  const pendingToolDownloadRef = useRef<{ blob: Blob; name: string } | null>(null);

  // ── Guarded download: checks auth + premium, opens paywall if needed ──
  const guardedDownload = async (blob: Blob, downloadName: string, toastId: string) => {
    // If premium → download immediately
    if (isPremium) {
      triggerBlobDownload(blob, downloadName);
      toast.success("Descarga completada", { id: toastId });
      return;
    }

    // Store the pending download for after payment
    pendingToolDownloadRef.current = { blob, name: downloadName };

    // Build paywall data from current PDF
    const pdfOut = await buildAnnotatedPdf();
    if (pdfOut) {
      const base64 = uint8ToBase64(pdfOut);
      const docName = displayName || file?.name || "document.pdf";
      setPdfDataForPaywall({ base64, name: docName, size: pdfOut.byteLength });
      generateAnnotatedThumbnail(pdfOut).then(t => { if (t) setPaywallThumbnail(t); });
    }

    if (!isAuthenticated) {
      sessionStorage.setItem("cloudpdf_pending_action", "download");
      if (file) { try { await savePdfToSession(file); } catch {} }
    }

    toast.dismiss(toastId);
    setShowPaywall(true);
  };

  // ── Download with annotations (SMART BUTTON) ─────────────────────────────────
  const downloadPdf = async () => {
    if (!pdfBytes) return;
    toast.loading("Preparando documento...", { id: "dl" });

    // Step 1: Build the annotated PDF
    let pdfOut: Uint8Array | null = null;
    try {
      pdfOut = await buildAnnotatedPdf();
      if (!pdfOut) throw new Error("Failed to build PDF");
    } catch (err) {
      console.error("[downloadPdf] buildAnnotatedPdf failed:", err);
      toast.error("Error al generar el PDF", { id: "dl" });
      return;
    }

    const base64 = uint8ToBase64(pdfOut);
    const docName = displayName || file?.name || "document.pdf";
    const docSize = pdfOut.byteLength;

    // Step 2: If NOT authenticated → show paywall modal (auth-choice step)
    if (!isAuthenticated) {
      setPdfDataForPaywall({ base64, name: docName, size: docSize });
      generateAnnotatedThumbnail(pdfOut).then(t => { if (t) setPaywallThumbnail(t); });
      sessionStorage.setItem("cloudpdf_pending_action", "download");
      if (file) { try { await savePdfToSession(file); } catch {} }
      toast.dismiss("dl");
      setShowPaywall(true);
      return;
    }

    // Step 3: User IS authenticated
    setIsAutoSaving(true);
    try {
      // Auto-save document to user panel
      const result = await autoSaveDocument(pdfOut);
      if (result?.docId) {
        setSavedDocId(result.docId);
      }

      // Step 4: If premium → download immediately
      if (isPremium || result?.isPremium) {
        triggerDownload(pdfOut);
        toast.success("PDF descargado correctamente", { id: "dl" });
        setIsAutoSaving(false);
        return;
      }

      // Step 5: Not premium → show paywall with PDF data
      setPdfDataForPaywall({ base64, name: docName, size: docSize });
      generateAnnotatedThumbnail(pdfOut).then(t => { if (t) setPaywallThumbnail(t); });
      toast.dismiss("dl");
      setShowPaywall(true);
    } catch (err) {
      console.error("[downloadPdf]", err);
      toast.error("Error al preparar la descarga", { id: "dl" });
    } finally {
      setIsAutoSaving(false);
    }
  };

  // ── Apply initialTool when PDF is loaded (default to "edit-text") ──
  useEffect(() => {
    if (!pdfDoc) return;
    if (!initialTool) { setActiveTool("edit-text"); return; }
    const toolMap: Record<string, ToolName> = {
      "text": "text", "sign": "sign", "notes": "notes",
      "image": "image", "protect": "protect", "compress": "compress",
      "highlight": "highlight", "eraser": "eraser", "brush": "brush",
      "shapes": "shapes", "find": "find", "move": "move",
      // Conversion tools
      "convert-jpg": "convert-jpg", "convert-png": "convert-png",
      "convert-word": "convert-word", "convert-excel": "convert-excel",
      "convert-ppt": "convert-ppt", "convert-html": "convert-html",
      "jpg-to-pdf": "jpg-to-pdf", "png-to-pdf": "png-to-pdf",
      "merge": "merge",
    };
    const mapped = toolMap[initialTool];
    setActiveTool(mapped ?? "edit-text");
  }, [initialTool, pdfDoc]);

  // ── Auto-save draft to localStorage (unregistered users) ─────
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isAuthenticated || !pdfBytes) return;
    // Debounce: save 2s after last change
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(saveDraftToLocalStorage, 2000);
    return () => { if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current); };
  }, [annotations, allNativeTextBlocks, saveDraftToLocalStorage, isAuthenticated, pdfBytes]);

  // ── Restore draft on mount (unregistered users) ─────────────
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current || initialFile || file) return;
    const draft = loadDraftFromLocalStorage();
    if (!draft) return;
    draftRestoredRef.current = true;
    // Load the saved PDF
    loadPdf(draft.pdfFile).then(() => {
      // Restore annotations
      if (draft.annotations.length > 0) {
        setAnnotations(draft.annotations);
      }
      // Restore native text edits — apply after text blocks are loaded
      if (Object.keys(draft.textEdits).length > 0) {
        setTimeout(() => {
          setAllNativeTextBlocks(prev => {
            const next = new Map(prev);
            for (const [page, blocks] of Array.from(next.entries())) {
              const updated = blocks.map((b: NativeTextBlock) => {
                const key = `${page}_${b.pdfX.toFixed(1)}_${b.pdfY.toFixed(1)}_${b.str}`;
                const edit = draft.textEdits[key];
                return edit ? { ...b, editedStr: edit.editedStr, fontColor: edit.fontColor } : b;
              });
              next.set(page, updated);
            }
            return next;
          });
        }, 500);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear draft when user registers/logs in
  useEffect(() => {
    if (isAuthenticated) clearDraft();
  }, [isAuthenticated, clearDraft]);

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

  // Full-screen PDF loading overlay (for native PDFs)
  if (isLoadingPdf) {
    return (
      <div className="w-full rounded-2xl flex flex-col items-center justify-center py-20 px-8 text-center" style={{ backgroundColor: "#f8fafc", border: "2px solid #e2e8f0" }}>
        {/* Animated PDF icon */}
        <div className="relative mb-6 w-20 h-20 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
            <FileText className="w-9 h-9" style={{ color: "#1565C0" }} />
          </div>
          {/* Spinning ring — circular */}
          <div className="absolute inset-[-4px] rounded-full animate-spin" style={{ border: "3px solid #e2e8f0", borderTopColor: "#1565C0", animationDuration: "1.2s" }} />
        </div>
        {/* Title */}
        <p className="text-xl font-bold mb-2" style={{ color: "#0D47A1" }}>
          {t.editor_loading_pdf}
        </p>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          {initialFile?.name ?? ""}
        </p>
        {/* Progress bar */}
        <div className="w-full max-w-xs mb-3">
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${pdfLoadProgress}%`,
                backgroundColor: pdfLoadProgress === 100 ? "#42A5F5" : "#1565C0",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-medium" style={{ color: "#64748b" }}>
              {pdfLoadProgress < 20 ? t.editor_loading_pdf_reading : pdfLoadProgress < 55 ? t.editor_loading_pdf_parsing : pdfLoadProgress < 95 ? t.editor_loading_pdf_thumbnails : t.editor_loading_pdf_ready}
            </span>
            <span className="text-xs font-semibold" style={{ color: "#1565C0" }}>{pdfLoadProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Full-screen conversion loading overlay
  if (isConvertingFile) {
    return (
      <div className="w-full rounded-2xl flex flex-col items-center justify-center py-20 px-8 text-center" style={{ backgroundColor: "#f8fafc", border: "2px solid #e2e8f0" }}>
        {/* Animated file icon */}
        <div className="relative mb-6 w-20 h-20 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
            <FileText className="w-9 h-9" style={{ color: "#1565C0" }} />
          </div>
          {/* Spinning ring — circular */}
          <div className="absolute inset-[-4px] rounded-full animate-spin" style={{ border: "3px solid #e2e8f0", borderTopColor: "#1565C0", animationDuration: "1.2s" }} />
        </div>
        {/* Title */}
        <p className="text-xl font-bold mb-2" style={{ color: "#0D47A1" }}>
          {t.editor_toast_converting}
        </p>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          {initialFile?.name ?? ""}
        </p>
        {/* Progress bar */}
        <div className="w-full max-w-xs mb-3">
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${convertFileProgress}%`,
                backgroundColor: convertFileProgress === 100 ? "#42A5F5" : "#1565C0",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-medium" style={{ color: "#64748b" }}>
              {convertFileProgress < 30 ? t.editor_converting_uploading : convertFileProgress < 85 ? t.editor_converting_processing : convertFileProgress < 100 ? t.editor_converting_finishing : t.editor_toast_converted}
            </span>
            <span className="text-xs font-semibold" style={{ color: "#1565C0" }}>{convertFileProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  if (!file || !pdfDoc) {
    // Note: file-free mode is handled below after renderToolPanel is defined
    if (!isFileFreeMode) return (
      <div
        className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 px-8 text-center cursor-pointer transition-all"
        style={{ borderColor: "#94a3b8", backgroundColor: "#f8fafc" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(27, 94, 32, 0.10)" }}>
          <FileText className="w-8 h-8" style={{ color: "#1565C0" }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: "#1565C0" }}>{t.hero_drag_here}</p>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>{t.editor_or}</p>
        <button
          className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm"
          style={{ backgroundColor: "#0D47A1" }}
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          <Upload className="w-4 h-4 inline mr-2" />{t.hero_upload_btn}
        </button>
        <p className="text-xs mt-3" style={{ color: "#94a3b8" }}>{t.hero_max_size}</p>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.html,.txt,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    );
  }

  // ── Tool panel content ────────────────────────────────────────
  const renderToolPanel = () => {
    // Shared action bar shown at the top of every tool panel (except pointer/default)
    const showActionBar = activeTool !== "pointer" && activeTool !== "compress" && activeTool !== "protect" && activeTool !== "find";
    const pageAnnCount = annotations.filter(a => a.page === currentPage).length;
    const ActionBar = showActionBar ? (
      <div className="flex flex-wrap gap-1.5 p-3 border-b" style={{ borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }}>
        <button
          onClick={undo}
          disabled={historyIndex < 0}
          title={t.editor_undo_tooltip}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: "#cbd5e1", color: "#1A3A5C", backgroundColor: "#fff" }}
        >
          <Undo2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{t.editor_undo}</span>
        </button>
        <button
          onClick={deleteLastAnnotation}
          disabled={pageAnnCount === 0}
          title={t.editor_delete_last}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: "#cbd5e1", color: "#1A3A5C", backgroundColor: "#fff" }}
        >
          <Trash2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{t.editor_delete_last}</span>
        </button>
        <button
          onClick={deleteAllPageAnnotations}
          disabled={pageAnnCount === 0}
          title={t.editor_delete_all}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: "#cbd5e1", color: "#1565C0", backgroundColor: "#fff" }}
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
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_sign}</h3>
            {/* Tabs: Draw / Write / Image */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
              {(["draw", "write", "image"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSignTab(tab)}
                  className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    backgroundColor: signTab === tab ? "#fff" : "transparent",
                    color: signTab === tab ? "#0f172a" : "#64748b",
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
                    <label className="text-xs" style={{ color: "#64748b" }}>{t.editor_color_label ?? "Color"}</label>
                    <input type="color" value={signColor} onChange={e => setSignColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <label className="text-xs whitespace-nowrap" style={{ color: "#64748b" }}>{t.editor_width_label ?? "Grosor"}: {signStrokeWidth}px</label>
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
                  style={{ borderColor: "#cbd5e1", fontFamily: signFont, fontSize: 20, color: signColor }}
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
                        borderColor: signFont === f.value ? "#1565C0" : "#f1f5f9",
                        backgroundColor: signFont === f.value ? "rgba(27, 94, 32, 0.08)" : "#fff",
                        fontFamily: f.value,
                        fontSize: 20,
                        color: signColor,
                      }}
                    >{signName || f.label}</button>
                  ))}
                </div>
                {/* Color picker */}
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: "#64748b" }}>{t.editor_color_label ?? "Color"}</label>
                  <input type="color" value={signColor} onChange={e => setSignColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                </div>
                <button
                  onClick={placeNameSignature}
                  className="py-2 rounded text-white text-sm font-semibold"
                  style={{ backgroundColor: "#1565C0" }}
                >{t.editor_sign_insert_btn}</button>
              </>
            )}

            {/* ── Image Tab ── */}
            {signTab === "image" && (
              <>
                <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_sign_image_hint}</p>
                <label
                  className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed cursor-pointer transition-all"
                  style={{ borderColor: "#cbd5e1", backgroundColor: "#f8fafc" }}
                >
                  <Upload className="w-8 h-8" style={{ color: "#1565C0" }} />
                  <span className="text-sm font-medium" style={{ color: "#1A3A5C" }}>{t.editor_sign_image_upload ?? "Haz clic para subir imagen"}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{t.editor_sign_image_formats ?? "PNG, JPG, GIF"}</span>
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
      case "text": {
        // Find the selected text annotation (if any)
        const selectedTextAnn = selectedId ? annotations.find(a => a.id === selectedId && a.type === "text") : null;
        const isEditingExisting = !!selectedTextAnn;

        // Sync panel changes to the selected annotation in real-time
        const updateSelectedTextProp = (prop: Partial<Annotation>) => {
          if (!selectedTextAnn) return;
          setAnnotations(prev => prev.map(a => a.id === selectedTextAnn.id ? { ...a, ...prop } : a));
        };

        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>
              {isEditingExisting ? t.editor_panel_edit_text : t.editor_panel_add_text}
            </h3>

            {/* Instruction when no text is selected */}
            {!isEditingExisting && (
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "rgba(27, 94, 32, 0.06)", color: "#1A3A5C" }}>
                <strong>{t.editor_panel_how_to_use}</strong> {t.editor_panel_text_hint}
              </div>
            )}

            {/* Text content — editable for selected annotation */}
            {isEditingExisting && (
              <div>
                <label className="text-xs block mb-1" style={{ color: "#64748b" }}>{t.editor_panel_content}</label>
                <textarea
                  value={selectedTextAnn.text ?? ""}
                  onChange={e => {
                    const val = e.target.value;
                    updateSelectedTextProp({ text: val, width: Math.max(150, val.length * ((selectedTextAnn.fontSize ?? 14) * 0.6)), height: Math.max((selectedTextAnn.fontSize ?? 14) + 16, val.split("\n").length * ((selectedTextAnn.fontSize ?? 14) * 1.3) + 16) });
                  }}
                  onBlur={() => pushHistory(annotationsRef.current)}
                  placeholder={t.editor_text_placeholder}
                  rows={3}
                  className="w-full rounded border p-2 text-sm resize-none"
                  style={{ borderColor: "#cbd5e1", fontFamily: selectedTextAnn.fontFamily ?? textFont, color: selectedTextAnn.color ?? textColor }}
                />
              </div>
            )}

            {/* Font selector */}
            <div>
              <label className="text-xs block mb-1" style={{ color: "#64748b" }}>Fuente</label>
              <select
                value={isEditingExisting ? (selectedTextAnn.fontFamily ?? textFont) : textFont}
                onChange={e => {
                  const val = e.target.value;
                  setTextFont(val);
                  if (isEditingExisting) updateSelectedTextProp({ fontFamily: val });
                }}
                className="w-full border rounded px-2 py-1.5 text-xs"
                style={{ borderColor: "#cbd5e1", fontFamily: isEditingExisting ? (selectedTextAnn.fontFamily ?? textFont) : textFont }}
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                ))}
              </select>
            </div>
            {/* Bold / Italic / Underline / Strikethrough */}
            <div className="flex gap-1">
              {[
                { key: "bold", label: "B", state: isEditingExisting ? selectedTextAnn.fontWeight === "bold" : textBold, btnStyle: { fontWeight: "bold" } as React.CSSProperties,
                  toggle: () => { const v = !textBold; setTextBold(v); if (isEditingExisting) updateSelectedTextProp({ fontWeight: v ? "bold" : "normal" }); } },
                { key: "italic", label: "I", state: isEditingExisting ? selectedTextAnn.fontStyle === "italic" : textItalic, btnStyle: { fontStyle: "italic" } as React.CSSProperties,
                  toggle: () => { const v = !textItalic; setTextItalic(v); if (isEditingExisting) updateSelectedTextProp({ fontStyle: v ? "italic" : "normal" }); } },
                { key: "underline", label: "U", state: isEditingExisting ? selectedTextAnn.textDecoration?.includes("underline") : textUnderline, btnStyle: { textDecoration: "underline" } as React.CSSProperties,
                  toggle: () => { const v = !textUnderline; setTextUnderline(v); if (isEditingExisting) updateSelectedTextProp({ textDecoration: v ? "underline" : "none" }); } },
                { key: "strike", label: "S", state: isEditingExisting ? selectedTextAnn.textDecoration?.includes("line-through") : textStrikethrough, btnStyle: { textDecoration: "line-through" } as React.CSSProperties,
                  toggle: () => { const v = !textStrikethrough; setTextStrikethrough(v); if (isEditingExisting) updateSelectedTextProp({ textDecoration: v ? "line-through" : "none" }); } },
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={btn.toggle}
                  className="w-8 h-8 rounded border flex items-center justify-center text-sm transition-colors"
                  style={{
                    borderColor: btn.state ? "#1565C0" : "#cbd5e1",
                    backgroundColor: btn.state ? "#f0f7ff" : "white",
                    color: btn.state ? "#1565C0" : "#64748b",
                    ...btn.btnStyle,
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: "#64748b" }}>Color</label>
              <input
                type="color"
                value={isEditingExisting ? (selectedTextAnn.color ?? textColor) : textColor}
                onChange={e => {
                  const val = e.target.value;
                  setTextColor(val);
                  if (isEditingExisting) updateSelectedTextProp({ color: val });
                }}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <label className="text-xs ml-2" style={{ color: "#64748b" }}>Tamaño</label>
              <input
                type="number"
                value={isEditingExisting ? (selectedTextAnn.fontSize ?? textSize) : textSize}
                onChange={e => {
                  const val = Number(e.target.value);
                  setTextSize(val);
                  if (isEditingExisting) updateSelectedTextProp({ fontSize: val, height: Math.max(val + 16, (selectedTextAnn.text ?? "").split("\n").length * (val * 1.3) + 16) });
                }}
                min={8} max={120}
                className="w-14 border rounded px-1 py-0.5 text-xs"
                style={{ borderColor: "#cbd5e1" }}
              />
            </div>

            {/* Actions */}
            {isEditingExisting ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingTextId(selectedTextAnn.id); }}
                  className="flex-1 py-2 rounded text-white text-xs font-semibold"
                  style={{ backgroundColor: "#1565C0" }}
                >
                  Editar en el PDF
                </button>
                <button
                  onClick={() => { setSelectedId(null); setEditingTextId(null); }}
                  className="flex-1 py-2 rounded text-xs border font-medium"
                  style={{ borderColor: "#cbd5e1", color: "#64748b" }}
                >
                  Deseleccionar
                </button>
              </div>
            ) : (
              <div className="p-2 rounded text-center text-xs" style={{ backgroundColor: "rgba(27, 94, 32, 0.08)", color: "#1565C0" }}>
                Haz clic en el PDF para colocar texto
              </div>
            )}
            </div>
          </div>
        );
      }
      case "highlight":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_highlighter}</h3>
            <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_highlight_hint}</p>
            <div className="flex gap-2 flex-wrap">
              {["#FFFF00", "#00FF00", "#FF69B4", "#87CEEB", "#FFA500"].map(c => (
                <button key={c} onClick={() => setHighlightColor(c)} className="w-8 h-8 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: highlightColor === c ? "#0D47A1" : "transparent" }} />
              ))}
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: highlightColor + "33", color: "#0f172a" }}>
              <strong>{t.editor_panel_how_to_use}</strong> {t.editor_panel_highlight_hint}
            </div>
            </div>
          </div>
        );
      case "notes":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_add_note}</h3>
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder={t.editor_note_placeholder}
              rows={4}
              className="w-full rounded border p-2 text-sm resize-none"
              style={{ borderColor: "#cbd5e1" }}
            />
            <button onClick={placeNote} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "#1565C0" }}>{t.editor_panel_insert_note}</button>
            </div>
          </div>
        );
      case "image":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_insert_image}</h3>
            <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_panel_upload_image_hint}</p>
            <label className="flex flex-col items-center gap-2 py-4 border-2 border-dashed rounded-lg cursor-pointer" style={{ borderColor: "#94a3b8" }}>
              <ImageIcon className="w-8 h-8" style={{ color: "#1565C0" }} />
              <span className="text-xs font-medium" style={{ color: "#1565C0" }}>{t.editor_panel_select_image_label}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <div className="border-t pt-3 mt-1" style={{ borderColor: "#f1f5f9" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#1A3A5C" }}>{t.editor_panel_convert_image_to_pdf}</p>
              <label className="flex items-center gap-2 py-2 px-3 rounded border cursor-pointer text-xs" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>
                <Upload className="w-3 h-3" />{t.editor_panel_select_image_label} → PDF
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
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_shapes}</h3>
            <div className="flex gap-2">
              {(["rect", "circle", "line"] as const).map(s => (
                <button key={s} onClick={() => setShapeType(s)} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: shapeType === s ? "#1565C0" : "#cbd5e1", backgroundColor: shapeType === s ? "rgba(27, 94, 32, 0.10)" : "transparent", color: "#1A3A5C" }}>
                  {s === "rect" ? t.editor_shape_rect : s === "circle" ? t.editor_shape_circle : t.editor_shape_line}
                </button>
              ))}
            </div>
            {/* Fill toggle */}
            {shapeType !== "line" && (
              <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
                <button
                  onClick={() => setShapeFilled(false)}
                  className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                  style={{ backgroundColor: !shapeFilled ? "#fff" : "transparent", color: !shapeFilled ? "#0f172a" : "#64748b", boxShadow: !shapeFilled ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                >{t.editor_shape_outline}</button>
                <button
                  onClick={() => setShapeFilled(true)}
                  className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                  style={{ backgroundColor: shapeFilled ? "#fff" : "transparent", color: shapeFilled ? "#0f172a" : "#64748b", boxShadow: shapeFilled ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}
                >{t.editor_shape_fill}</button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: "#64748b" }}>Color</label>
              <input type="color" value={shapeColor} onChange={e => setShapeColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              {/* Preview */}
              <div style={{ width: 40, height: 28, border: `2px solid ${shapeColor}`, borderRadius: shapeType === "circle" ? "50%" : 3, backgroundColor: shapeFilled ? shapeColor : "transparent", flexShrink: 0 }} />
            </div>
            <button onClick={placeShape} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "#1565C0" }}>{t.editor_panel_insert_shape}</button>
            </div>
          </div>
        );
      case "protect":
        return (
          <div className="p-4 flex flex-col gap-3">
            {protectResult ? (
              /* ── Protect Result View ── */
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#90CAF9" }}>
                    <svg className="w-5 h-5" style={{ color: "#1E88E5" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_protect_result_title}</h3>
                </div>
                <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_protect_result_desc}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setProtectResult(null); setPassword(""); setConfirmPassword(""); }} className="flex-1 py-2 rounded text-sm font-medium border" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>
                    {t.editor_protect_return}
                  </button>
                  <button onClick={downloadProtectedPdf} className="flex-1 py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "#1e293b" }}>
                    <Download className="w-4 h-4 inline mr-1" />{t.editor_protect_download}
                  </button>
                </div>
              </>
            ) : (
              /* ── Protect Controls ── */
              <>
                <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_protect_title}</h3>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
                  <div className="px-3 py-2" style={{ backgroundColor: "#f8fafc" }}>
                    <p className="text-xs font-medium" style={{ color: "#1A3A5C" }}>{t.editor_protect_desc}</p>
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder={t.editor_protect_placeholder}
                        className="w-full border rounded px-3 py-2 text-sm pr-10"
                        style={{ borderColor: "#cbd5e1" }}
                      />
                      <button onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-2.5">
                        {showPassword ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} /> : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t.editor_protect_confirm_placeholder}
                        className="w-full border rounded px-3 py-2 text-sm pr-10"
                        style={{ borderColor: confirmPassword && password !== confirmPassword ? "#C62828" : "#cbd5e1" }}
                      />
                      <button onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-2 top-2.5">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} /> : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs" style={{ color: "#C62828" }}>{t.editor_protect_passwords_mismatch}</p>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
                  <div className="px-3 py-2" style={{ backgroundColor: "#f8fafc" }}>
                    <p className="text-xs font-medium" style={{ color: "#1A3A5C" }}>{t.editor_protect_algo_label}</p>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
                      <span className="text-xs" style={{ color: "#1A3A5C" }}>128-bit RC4</span>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                {isProtecting && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs" style={{ color: "#64748b" }}>
                      <span>{protectProgress < 100 ? (t.editor_toast_protecting ?? "Protecting PDF...") : (t.editor_toast_protected ?? "Protected!")}</span>
                      <span>{Math.round(protectProgress)}%</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "#f1f5f9" }}>
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${protectProgress}%`, backgroundColor: protectProgress === 100 ? "#42A5F5" : "#1565C0" }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPassword(""); setConfirmPassword(""); }}
                    disabled={isProtecting}
                    className="flex-1 py-2 rounded text-sm border font-medium disabled:opacity-40"
                    style={{ borderColor: "#cbd5e1", color: "#64748b" }}
                  >
                    {t.editor_cancel_btn}
                  </button>
                  <button
                    onClick={protectPdf}
                    disabled={!password || password !== confirmPassword || isProtecting}
                    className="flex-1 py-2 rounded text-white text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: "#1e293b" }}
                  >
                    {isProtecting ? `${Math.round(protectProgress)}%` : t.editor_protect_btn}
                  </button>
                </div>
              </>
            )}
          </div>
        );
      case "compress":
        return (
          <div className="p-4 flex flex-col gap-3">
            {compressResult ? (
              /* ── Compress Result View ── */
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#90CAF9" }}>
                    <svg className="w-5 h-5" style={{ color: "#1E88E5" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_compress_result_title}</h3>
                </div>
                <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_compress_result_desc}</p>
                <div className="rounded-lg p-3 flex flex-col gap-2" style={{ backgroundColor: "#f8fafc" }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#64748b" }}>{t.editor_compress_original}</span>
                    <span className="font-medium" style={{ color: "#0f172a" }}>{(compressResult.originalSize / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#64748b" }}>{t.editor_compress_compressed}</span>
                    <span className="font-medium" style={{ color: "#0f172a" }}>{compressResult.compressedSize < 1024 * 1024 ? (compressResult.compressedSize / 1024).toFixed(1) + " KB" : (compressResult.compressedSize / 1024 / 1024).toFixed(1) + " MB"}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-xs" style={{ borderColor: "#f1f5f9" }}>
                    <span style={{ color: "#1E88E5" }}>{t.editor_compress_saved}</span>
                    <span className="font-semibold" style={{ color: "#1E88E5" }}>{Math.max(0, Math.round((1 - compressResult.compressedSize / compressResult.originalSize) * 100))}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCompressResult(null)} className="flex-1 py-2 rounded text-sm font-medium border" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>
                    {t.editor_compress_return}
                  </button>
                  <button onClick={downloadCompressedPdf} className="flex-1 py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "#334155" }}>
                    <Download className="w-4 h-4 inline mr-1" />{t.editor_compress_download}
                  </button>
                </div>
              </>
            ) : (
              /* ── Compress Controls ── */
              <>
                <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_compress_pdf}</h3>
                <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_panel_compress_desc}</p>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs" style={{ color: "#64748b" }}>
                    <span>{t.editor_compress_quality}</span><span>{compressQuality}%</span>
                  </div>
                  <input type="range" min={20} max={100} value={compressQuality} onChange={e => setCompressQuality(Number(e.target.value))} className="w-full" />
                </div>
                <button onClick={compressPdf} disabled={isCompressing} className="py-2 rounded text-white text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: "#1565C0" }}>
                  {isCompressing ? (
                    <><svg className="w-4 h-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{t.editor_toast_compressing}</>
                  ) : (
                    <><Minimize2 className="w-4 h-4 inline mr-1" />{t.editor_compress_btn_only}</>
                  )}
                </button>
              </>  
            )}
            <div className="border-t pt-3" style={{ borderColor: "#f1f5f9" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#1A3A5C" }}>{t.editor_panel_convert_to_image}</p>
              <div className="flex gap-2">
                <button onClick={() => convertToImage("jpg")} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>JPG</button>
                <button onClick={() => convertToImage("png")} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>PNG</button>
                <button onClick={() => convertAllToImages("jpg")} className="flex-1 py-1.5 rounded text-xs border" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>{t.editor_panel_export_all} JPG</button>
              </div>
            </div>
          </div>
        );
      case "merge":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_merge_with_pdf}</h3>
            <label className="flex items-center gap-2 py-2 px-3 rounded border cursor-pointer text-xs" style={{ borderColor: "#cbd5e1", color: "#64748b" }}>
              <Layers className="w-3 h-3" />{t.editor_panel_select_pdfs}
              <input type="file" accept=".pdf" multiple className="hidden" onChange={mergePdfs} />
            </label>
          </div>
        );
      case "split":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_split_at_page}</h3>
            {totalPages > 1 ? (
              <div className="flex gap-2 items-center">
                <input type="number" min={1} max={totalPages - 1} defaultValue={Math.floor(totalPages / 2)} id="splitAt" className="w-16 border rounded px-2 py-1 text-xs" style={{ borderColor: "#cbd5e1" }} />
                <button onClick={() => {
                  const v = Number((document.getElementById("splitAt") as HTMLInputElement).value);
                  splitPdf(v);
                }} className="flex-1 py-1.5 rounded text-xs text-white" style={{ backgroundColor: "#1565C0" }}>
                  <Scissors className="w-3 h-3 inline mr-1" />{t.editor_panel_split_btn}
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "#64748b" }}>{(t as any).editor_panel_split_need_pages ?? "The PDF needs at least 2 pages to split."}</p>
            )}
          </div>
        );
      case "find":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_find_text}</h3>
            <input
              type="text" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchResults([]); }}
              onKeyDown={e => e.key === "Enter" && searchInPdf()}
              placeholder={t.editor_search_placeholder}
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ borderColor: "#cbd5e1" }}
            />
            <button
              onClick={searchInPdf}
              disabled={isSearching || !searchQuery.trim()}
              className="py-2 rounded text-white text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "#1565C0" }}
            >
              <Search className="w-4 h-4 inline mr-1" />
              {isSearching ? t.editor_searching : t.editor_search_btn}
            </button>
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium" style={{ color: "#64748b" }}>
                  {searchResults.length} {t.editor_toast_search_results}
                </p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(r.page)}
                      className="text-left p-2 rounded text-xs hover:bg-blue-50 transition-colors"
                      style={{ backgroundColor: "#f8fafc", color: "#1A3A5C" }}
                    >
                      <span className="font-semibold" style={{ color: "#1565C0" }}>{t.editor_panel_page_short} {r.page}</span>
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
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_eraser}</h3>
            <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_eraser_hint}</p>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#64748b" }}>{t.editor_panel_eraser_size}</label>
              <input type="range" min={10} max={100} value={eraserSize} onChange={e => setEraserSize(Number(e.target.value))} className="w-full" />
              <span className="text-xs" style={{ color: "#64748b" }}>{eraserSize}px</span>
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>
              <strong>{t.editor_panel_how_to_use}</strong> {t.editor_panel_eraser_hint}
            </div>
            </div>
          </div>
        );
      case "brush":
        return (
          <div className="flex flex-col">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_brush}</h3>
            <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_brush_hint}</p>
            <div className="flex gap-2 items-center">
              <label className="text-xs" style={{ color: "#64748b" }}>Color</label>
              <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "#64748b" }}>{t.editor_panel_brush_thickness}: {brushSize}px</label>
              <input type="range" min={1} max={20} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full" />
            </div>
            <div className="p-2 rounded border" style={{ borderColor: "#f1f5f9", backgroundColor: "#fff" }}>
              <div style={{ width: 40, height: brushSize, backgroundColor: brushColor, borderRadius: brushSize / 2 }} />
            </div>
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "#ffffff", color: "#0f172a" }}>
              <strong>{t.editor_panel_how_to_use}</strong> {t.editor_panel_brush_hint}
            </div>
            </div>
          </div>
        );
      case "edit-text": {
        const editBlock = editingBlockId ? nativeTextBlocks.find(b => b.id === editingBlockId) : null;
        return (
          <div className="flex flex-col">
            <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_edit_native_text}</h3>

            {!editBlock && (
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "rgba(21, 101, 192, 0.06)", color: "#0f172a" }}>
                {t.editor_edittext_hint ?? "Click on any text block in the PDF to edit it in-place."}
              </div>
            )}

            {/* Interactive properties panel — shown when a block is selected */}
            {editBlock && (
              <>
                <div className="text-xs font-medium mb-1" style={{ color: "#1565C0" }}>
                  {(t as any).editor_block_properties ?? "Block properties"}
                </div>

                {/* Font family selector */}
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: "#94a3b8" }}>Font</label>
                  <select
                    value={editBlock.fontFamily || "sans-serif"}
                    onChange={(e) => applyEditStyle("fontFamily", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs"
                    style={{ borderColor: "#e2e8f0" }}
                  >
                    <option value="sans-serif">Sans-serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </div>

                {/* Font size + Color row */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] block mb-0.5" style={{ color: "#94a3b8" }}>Size (pt)</label>
                    <input
                      type="number"
                      value={Math.round(editBlock.pdfFontSize)}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        if (newSize > 0 && newSize <= 200) {
                          const canvasSize = newSize * scale;
                          applyEditStyle("fontSize", `${canvasSize}px`);
                          // Update pdfFontSize in the block
                          setAllNativeTextBlocks(prev => {
                            const pageBlocks = prev.get(currentPage) ?? [];
                            const updated = pageBlocks.map((b: NativeTextBlock) =>
                              b.id === editingBlockId ? { ...b, pdfFontSize: newSize, fontSize: canvasSize } : b
                            );
                            const next = new Map(prev);
                            next.set(currentPage, updated);
                            return next;
                          });
                        }
                      }}
                      min={4} max={200}
                      className="w-full border rounded px-2 py-1 text-xs"
                      style={{ borderColor: "#e2e8f0" }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-0.5" style={{ color: "#94a3b8" }}>Color</label>
                    <input
                      type="color"
                      value={editBlock.originalColor || "#000000"}
                      onChange={(e) => applyEditStyle("color", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                  </div>
                </div>

                {/* Bold / Italic / Underline toggles */}
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "#94a3b8" }}>Style</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const newVal = editBlock.fontWeight === "bold" ? "normal" : "bold";
                        applyEditStyle("fontWeight", newVal);
                      }}
                      className="w-8 h-8 rounded border flex items-center justify-center text-sm font-bold transition-colors"
                      style={{
                        borderColor: editBlock.fontWeight === "bold" ? "#1565C0" : "#e2e8f0",
                        backgroundColor: editBlock.fontWeight === "bold" ? "#f0f7ff" : "white",
                        color: editBlock.fontWeight === "bold" ? "#1565C0" : "#94a3b8",
                      }}
                    >B</button>
                    <button
                      onClick={() => {
                        const newVal = editBlock.fontStyle === "italic" ? "normal" : "italic";
                        applyEditStyle("fontStyle", newVal);
                      }}
                      className="w-8 h-8 rounded border flex items-center justify-center text-sm italic transition-colors"
                      style={{
                        borderColor: editBlock.fontStyle === "italic" ? "#1565C0" : "#e2e8f0",
                        backgroundColor: editBlock.fontStyle === "italic" ? "#f0f7ff" : "white",
                        color: editBlock.fontStyle === "italic" ? "#1565C0" : "#94a3b8",
                      }}
                    >I</button>
                    <button
                      onClick={() => {
                        const el = editContentRef.current;
                        if (el) {
                          const current = el.style.textDecoration;
                          el.style.textDecoration = current === "underline" ? "none" : "underline";
                        }
                      }}
                      className="w-8 h-8 rounded border flex items-center justify-center text-sm underline transition-colors"
                      style={{ borderColor: "#e2e8f0", color: "#94a3b8" }}
                    >U</button>
                  </div>
                </div>

                {/* Alignment */}
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "#94a3b8" }}>Align</label>
                  <div className="flex gap-1">
                    {(["left", "center", "right", "justify"] as const).map(align => (
                      <button
                        key={align}
                        onClick={() => applyEditStyle("textAlign", align)}
                        className="flex-1 h-7 rounded border flex items-center justify-center text-[10px] transition-colors"
                        style={{ borderColor: "#e2e8f0", color: "#64748b" }}
                        title={align}
                      >
                        {align === "left" ? "⫷" : align === "center" ? "≡" : align === "right" ? "⫸" : "⊞"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-2 text-[10px]" style={{ borderColor: "#f1f5f9", color: "#94a3b8" }}>
                  {(t as any).editor_edit_inline_tip ?? "Edit text in the blue box. Click outside to save."}
                </div>
              </>
            )}

            {/* Block count */}
            {nativeTextBlocks.length > 0 ? (
              <div className="text-xs p-2 rounded" style={{ backgroundColor: "#f8fafc", color: "#64748b" }}>
                {nativeTextBlocks.length} {t.editor_text_blocks_detected ?? "text blocks"}
                {nativeTextBlocks.filter(b => b.editedStr !== undefined).length > 0 && (
                  <span className="ml-1 font-semibold" style={{ color: "#1565C0" }}>
                    ({nativeTextBlocks.filter(b => b.editedStr !== undefined).length} {t.editor_edited_label ?? "edited"})
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: "#FFF3E0", color: "#E65100" }}>
                <p className="font-semibold mb-1">{(t as any).editor_image_no_text_title ?? "No editable text"}</p>
                <p>{(t as any).editor_image_no_text_desc ?? "This page may be a scanned image."}</p>
              </div>
            )}
            </div>
          </div>
        );
      }
      case "move": {
        const movePageAnns = annotations.filter(a => a.page === currentPage && a.type !== "drawing" && a.type !== "eraser");
        const selectedAnn = selectedId ? movePageAnns.find(a => a.id === selectedId) : null;
        const annTypeLabel = (type: string) => {
          switch (type) {
            case "text": return t.editor_add_text || "Text";
            case "signature": return t.editor_sign || "Signature";
            case "image": return t.editor_image || "Image";
            case "note": return t.editor_notes || "Note";
            case "shape": return t.editor_shapes || "Shape";
            case "highlight": return t.editor_highlight || "Highlight";
            default: return type;
          }
        };
        return (
          <div className="flex flex-col gap-0">
            {ActionBar}
            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>{t.editor_panel_move_elements}</p>
              <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "rgba(27, 94, 32, 0.06)", color: "#1A3A5C" }}>
                <p className="font-medium mb-1" style={{ color: "#1e293b" }}>{t.editor_panel_move_how_to}</p>
                <p>{t.editor_move_hint}</p>
              </div>
              <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#ffffff", color: "#64748b" }}>
                <p>💡 {t.editor_move_tip}</p>
              </div>

              {/* Selected annotation info */}
              {selectedAnn && (
                <div className="rounded-lg p-3 text-xs border" style={{ borderColor: "rgba(27, 94, 32, 0.4)", backgroundColor: "rgba(27, 94, 32, 0.04)" }}>
                  <p className="font-semibold mb-1" style={{ color: "#1565C0" }}>
                    ✔ {annTypeLabel(selectedAnn.type)}
                  </p>
                  <p style={{ color: "#64748b" }}>
                    X: {Math.round(selectedAnn.x)}px &middot; Y: {Math.round(selectedAnn.y)}px
                  </p>
                  {selectedAnn.text && selectedAnn.type === "text" && (
                    <p className="mt-1 truncate" style={{ color: "#64748b" }}>
                      “{selectedAnn.text.slice(0, 40)}{selectedAnn.text.length > 40 ? "…" : ""}”
                    </p>
                  )}
                </div>
              )}

              {/* Annotation list for current page */}
              <div className="mt-1">
                <p className="text-xs font-medium mb-2" style={{ color: "#1A3A5C" }}>
                  {movePageAnns.length > 0
                    ? `${movePageAnns.length} ${movePageAnns.length === 1 ? "elemento" : "elementos"} (pág. ${currentPage})`
                    : "Sin elementos en esta página"}
                </p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {movePageAnns.map((ann, idx) => (
                    <button
                      key={ann.id}
                      onClick={() => setSelectedId(ann.id)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors"
                      style={{
                        backgroundColor: selectedId === ann.id ? "rgba(27, 94, 32, 0.12)" : "transparent",
                        color: selectedId === ann.id ? "#1565C0" : "#64748b",
                        border: selectedId === ann.id ? "1px solid rgba(27, 94, 32, 0.3)" : "1px solid transparent",
                      }}
                    >
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "rgba(27, 94, 32, 0.1)", color: "#1565C0" }}>{idx + 1}</span>
                      <span className="font-medium">{annTypeLabel(ann.type)}</span>
                      {ann.type === "text" && ann.text && (
                        <span className="truncate opacity-60" style={{ maxWidth: 80 }}>— {ann.text.slice(0, 20)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }
      case "convert-jpg":
      case "convert-png": {
        const fmt = activeTool === "convert-jpg" ? "JPG" : "PNG";
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_pdf_to} {fmt}</h3>
            <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_panel_convert_pages} {fmt}:</p>
            <button onClick={() => convertToImage(fmt.toLowerCase() as "jpg" | "png")} className="py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: "#1565C0" }}>
              <FileText className="w-4 h-4 inline mr-1" />{t.editor_panel_export_page} {currentPage} ({fmt})
            </button>
            <button onClick={() => convertAllToImages(fmt.toLowerCase() as "jpg" | "png")} className="py-2 rounded text-sm font-medium border" style={{ borderColor: "#cbd5e1", color: "#1A3A5C" }}>
              {t.editor_panel_export_all} ({totalPages})
            </button>
            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#ffffff", color: "#64748b" }}>
              💡 {t.editor_panel_each_page_file}
            </div>
          </div>
        );
      }
      case "convert": {
        const convertOptions = [
          { label: "Word (.docx)", fmt: "docx" as const, icon: FileText, desc: t.editor_panel_convert_desc_word ?? "Convert PDF to editable Word document" },
          { label: "Excel (.xlsx)", fmt: "xlsx" as const, icon: FileText, desc: t.editor_panel_convert_desc_excel ?? "Extract tables to Excel spreadsheet" },
          { label: "PowerPoint (.pptx)", fmt: "pptx" as const, icon: FileText, desc: t.editor_panel_convert_desc_ppt ?? "Convert PDF slides to PowerPoint" },
          { label: "JPG", fmt: "jpg" as const, icon: ImageIcon, desc: (t as any).editor_panel_convert_desc_jpg ?? "Export pages as JPG images" },
          { label: "PNG", fmt: "png" as const, icon: ImageIcon, desc: (t as any).editor_panel_convert_desc_png ?? "Export pages as PNG images" },
        ];
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{(t as any).editor_convert ?? "Convert PDF"}</h3>
            <p className="text-xs" style={{ color: "#64748b" }}>{(t as any).editor_convert_desc ?? "Choose the format to convert your PDF to:"}</p>
            {isExporting && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs" style={{ color: "#64748b" }}>
                  <span>{exportProgress < 100 ? (t.editor_panel_exporting ?? "Converting...") : "Done!"}</span>
                  <span>{Math.round(exportProgress)}%</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "#f1f5f9" }}>
                  <div className="h-full rounded-full transition-all duration-200" style={{ width: `${exportProgress}%`, backgroundColor: exportProgress === 100 ? "#42A5F5" : "#1565C0" }} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {convertOptions.map(opt => (
                <button
                  key={opt.fmt}
                  onClick={() => {
                    if (opt.fmt === "jpg" || opt.fmt === "png") {
                      convertAllToImages(opt.fmt);
                    } else {
                      exportPdf(opt.fmt);
                    }
                  }}
                  disabled={!pdfBytes || isExporting}
                  className="flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:shadow-sm disabled:opacity-50"
                  style={{ borderColor: "#e2e8f0" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#f0f7ff" }}>
                    <opt.icon className="w-4 h-4" style={{ color: "#1565C0" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>PDF → {opt.label}</p>
                    <p className="text-[11px] truncate" style={{ color: "#94a3b8" }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      }
      case "merge":
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_merge_with_pdf}</h3>
            <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_panel_select_merge}</p>
            <label className="flex items-center gap-2 py-2.5 px-4 rounded text-white text-sm font-semibold cursor-pointer" style={{ backgroundColor: "#1565C0" }}>
              <Layers className="w-4 h-4" />{t.editor_panel_select_merge}
              <input type="file" accept=".pdf" multiple className="hidden" onChange={mergePdfs} />
            </label>
            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#ffffff", color: "#64748b" }}>
              💡 {t.editor_panel_each_page_file}
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
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{srcFmt} {t.editor_panel_convert_to_pdf}</h3>
            {isImg ? (
              <>
                <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_panel_insert_image} ({srcFmt}):</p>
                <label className="flex items-center gap-2 py-2.5 px-4 rounded text-white text-sm font-semibold cursor-pointer" style={{ backgroundColor: "#1565C0" }}>
                  <Upload className="w-4 h-4" />{t.editor_panel_insert_image} {srcFmt}
                  <input type="file" accept={accept} className="hidden" onChange={convertImageToPdf} />
                </label>
              </>
            ) : (
              <>
                <p className="text-xs" style={{ color: "#64748b" }}>{t.editor_panel_convert_files_to_pdf}</p>
                <div className="rounded-xl p-4 border text-center" style={{ borderColor: "rgba(76, 175, 80, 0.4)", backgroundColor: "rgba(27, 94, 32, 0.04)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#1e293b" }}>{t.editor_panel_coming_soon}</p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{t.editor_panel_conversion_coming}</p>
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
        const isHtml = activeTool === "convert-html";
        const exportFmt = activeTool === "convert-word" ? "docx" : activeTool === "convert-excel" ? "xlsx" : activeTool === "convert-ppt" ? "pptx" : "html";
        const targetFmt = activeTool === "convert-word" ? "Word (.docx)" : activeTool === "convert-excel" ? "Excel (.xlsx)" : activeTool === "convert-ppt" ? "PowerPoint (.pptx)" : "HTML";
        return (
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-sm" style={{ color: "#0f172a" }}>{t.editor_panel_pdf_to} {targetFmt}</h3>
            {isHtml ? (
              <div className="rounded-xl p-4 border text-center" style={{ borderColor: "rgba(76, 175, 80, 0.4)", backgroundColor: "rgba(27, 94, 32, 0.04)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "#1e293b" }}>{t.editor_panel_coming_soon}</p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>{t.editor_panel_conversion_coming}</p>
              </div>
            ) : (
              <>
                <p className="text-xs" style={{ color: "#64748b" }}>
                  {activeTool === "convert-word" ? t.editor_panel_convert_desc_word : activeTool === "convert-excel" ? t.editor_panel_convert_desc_excel : t.editor_panel_convert_desc_ppt}
                </p>
                {/* Progress bar */}
                {isExporting && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs" style={{ color: "#64748b" }}>
                      <span>{exportProgress < 100 ? `Exportando a ${targetFmt}...` : "¡Exportado!"}</span>
                      <span>{Math.round(exportProgress)}%</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "#f1f5f9" }}>
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${exportProgress}%`, backgroundColor: exportProgress === 100 ? "#42A5F5" : "#1565C0" }}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => exportPdf(exportFmt as "docx" | "xlsx" | "pptx")}
                  disabled={!pdfBytes || isExporting}
                  className="py-2.5 px-4 rounded text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "#1565C0" }}
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? `${t.editor_panel_exporting} ${Math.round(exportProgress)}%` : `${t.editor_panel_convert_to_btn} ${targetFmt}`}
                </button>
                <p className="text-xs" style={{ color: "#94a3b8" }}>
                  {t.editor_panel_conversion_wait}
                </p>
              </>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(27, 94, 32, 0.08)" }}>
              <MousePointer className="w-6 h-6" style={{ color: "#1565C0" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "#64748b" }}>{t.editor_select_tool}</p>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{t.editor_toolbar_hint}</p>
          </div>
        );
    }
  };  // ── File-free mode (e.g. JPG/PNG/Word to PDF) ────────────────────────
  if (isFileFreeMode) {
    return (
      <div
        className={fullscreen ? "flex flex-col overflow-hidden" : "flex flex-col rounded-xl overflow-hidden shadow-xl border"}
        style={fullscreen
          ? { height: "100%", backgroundColor: "#f8fafc" }
          : { height: "85vh", borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }
        }
      >
        <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ backgroundColor: "#FFFFFF", borderColor: "#f1f5f9" }}>
          <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>Herramienta de conversión</span>
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
        ? { height: "100%", backgroundColor: "#f8fafc" }
        : { height: "85vh", borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }
      }
    >
      {/* ── Banner: archivo convertido a PDF automáticamente ── */}
      {showConvertedBanner && convertedFromFile && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b"
          style={{
            backgroundColor: "rgba(76, 175, 80, 0.35)",
            borderColor: "rgba(46, 125, 50, 0.4)",
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#1E88E5" }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "#1565C0" }}>
                {convertedFromFile.type.startsWith("image/")
                  ? (t.editor_image_converted_title ?? "Tu imagen ya es un PDF")
                  : (t.editor_file_converted_title ?? "Tu archivo ya es un PDF")}
              </p>
              <p className="text-xs truncate" style={{ color: "#1E88E5" }}>
                {convertedFromFile.type.startsWith("image/")
                  ? ((t as any).editor_image_converted_desc_v2 ?? `"${convertedFromFile.name}" se ha convertido a PDF. Puedes añadir texto, firmas e imágenes encima, pero no editar el texto original de la imagen.`)
                  : (t.editor_file_converted_desc ?? `"${convertedFromFile.name}" se ha convertido a PDF automáticamente. Ya puedes editarlo y descargarlo.`)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConvertedBanner(false)}
            className="p-1 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
            title="Cerrar"
          >
            <X className="w-4 h-4" style={{ color: "#1E88E5" }} />
          </button>
        </div>
      )}

      {/* ── TOP TOOLBAR — desktop only ── */}
      <div className="hidden md:flex items-center gap-1 px-3 py-1.5 border-b min-w-0" style={{ backgroundColor: "#FFFFFF", borderColor: "#f1f5f9" }}>
        {/* Undo / Redo */}
        <button title={t.editor_undo + " (Ctrl+Z)"} onClick={undo} disabled={historyIndex < 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors shrink-0">
          <Undo2 className="w-4 h-4" style={{ color: "#1A3A5C" }} />
        </button>
        <button title={t.editor_redo + " (Ctrl+Y)"} onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors shrink-0">
          <Redo2 className="w-4 h-4" style={{ color: "#1A3A5C" }} />
        </button>
        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: "#f1f5f9" }} />
        {/* Tool buttons — centered */}
        <div className="flex items-center gap-0.5 flex-1 justify-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
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
            { id: "convert" as ToolName, icon: RefreshCw, label: (t as any).editor_convert ?? "Convert" },
            { id: "merge" as ToolName, icon: Layers, label: (t as any).editor_merge ?? "Merge" },
            { id: "split" as ToolName, icon: Scissors, label: (t as any).editor_split ?? "Split" },
            { id: "move" as ToolName, icon: Move, label: t.editor_move },
            { id: "notes" as ToolName, icon: StickyNote, label: t.editor_notes },
          ].map(({ id, icon, label }) => (
            <ToolBtn key={id} icon={icon} label={label} active={activeTool === id} onClick={() => { setActiveTool(id); setSelectedId(null); setShowMobilePanel(true); }} />
          ))}
        </div>
        {/* Page actions */}
        <button title={t.editor_rotate} onClick={rotatePage} className="p-1.5 rounded hover:bg-gray-100 transition-colors shrink-0">
          <RotateCw className="w-4 h-4" style={{ color: "#64748b" }} />
        </button>
        <button title={t.editor_delete_page} onClick={deletePage} className="p-1.5 rounded hover:bg-gray-100 transition-colors shrink-0">
          <Trash2 className="w-4 h-4" style={{ color: "#1565C0" }} />
        </button>
        {selectedId && (
          <button title="Delete selection" onClick={deleteSelected} className="p-1.5 rounded transition-colors shrink-0" style={{ backgroundColor: "#FFF8E1" }}>
            <X className="w-4 h-4" style={{ color: "#1565C0" }} />
          </button>
        )}
        <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: "#f1f5f9" }} />
        {/* Save */}
        <button
          onClick={savePdf}
          disabled={isSaving || !pdfBytes}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shrink-0 border"
          style={{ borderColor: "#94a3b8", color: "#1A3A5C", backgroundColor: "white" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "white"; }}
        >
          <Save className="w-4 h-4" />{isSaving ? t.editor_saving : t.editor_save_btn}
        </button>
        {/* Download */}
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition-all shrink-0"
          style={{ backgroundColor: "#0D47A1" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1565C0"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "#0D47A1"}
        >
          <Download className="w-4 h-4" />{t.editor_download}
        </button>
      </div>
            {/* ── BODY: thumbnails + viewer + tool panel ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT: Page thumbnails — hidden on mobile */}
        <div className="hidden md:flex w-[150px] border-r overflow-y-auto flex-col gap-2 py-3 px-2" style={{ backgroundColor: "#ffffff", borderColor: "#f1f5f9" }}>
          {/* Page count */}
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-semibold" style={{ color: "#64748b" }}>{totalPages} {totalPages === 1 ? "page" : "pages"}</span>
          </div>
          {(thumbnails.length > 0 ? thumbnails : Array.from({ length: totalPages }, () => "")).map((thumb, i) => {
            const isActive = currentPage === i + 1;
            return (
            <div key={i} className="relative group">
              <button
                onClick={() => setCurrentPage(i + 1)}
                className="w-full flex flex-col items-center gap-1 transition-all"
                style={{ outline: "none" }}
              >
                <div
                  className="w-full rounded overflow-hidden transition-all"
                  style={{
                    border: isActive ? `2.5px solid ${colors.primary}` : "2px solid #e2e8f0",
                    boxShadow: isActive ? `0 0 0 2px ${colors.lightBg}` : "0 1px 3px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {thumb ? (
                    <img src={thumb} alt={`${i + 1}`} className="w-full block" draggable={false} />
                  ) : (
                    <div className="w-full bg-white flex items-center justify-center" style={{ aspectRatio: "210/297" }}>
                      <FileText className="w-6 h-6" style={{ color: "#e2e8f0" }} />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium" style={{ color: isActive ? colors.primary : "#64748b" }}>
                  {i + 1}
                </span>
              </button>
              {/* Action buttons — visible on selected page */}
              {isActive && (
                <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); addBlankPage(); }}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.85)", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)" }}
                    title={(t as any).editor_toast_page_added ??"Add page"}
                  >
                    <Plus className="w-3 h-3" style={{ color: "#1A3A5C" }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); rotatePage(); }}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.85)", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)" }}
                    title={t.editor_rotate ?? "Rotate"}
                  >
                    <RotateCw className="w-3 h-3" style={{ color: "#1A3A5C" }} />
                  </button>
                  {totalPages > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePage(); }}
                      className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.85)", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)" }}
                      title={t.editor_delete_page ?? "Delete page"}
                    >
                      <Trash2 className="w-3 h-3" style={{ color: "#1565C0" }} />
                    </button>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* CENTER: PDF viewer */}
        <div className="flex-1 overflow-auto flex flex-col" style={{ backgroundColor: "#f8fafc" }}>
          {/* Zoom + page nav bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{ backgroundColor: "#f8fafc", borderColor: "#f1f5f9" }}>
            <div className="flex items-center gap-2">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 rounded hover:bg-gray-200 transition-colors">
                <ZoomOut className="w-4 h-4" style={{ color: "#64748b" }} />
              </button>
              <span className="text-xs font-medium w-12 text-center" style={{ color: "#64748b" }}>{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1 rounded hover:bg-gray-200 transition-colors">
                <ZoomIn className="w-4 h-4" style={{ color: "#64748b" }} />
              </button>
              <select
                value={scale}
                onChange={e => setScale(Number(e.target.value))}
                className="text-xs border rounded px-1 py-0.5 ml-1"
                style={{ borderColor: "#cbd5e1", color: "#64748b" }}
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
                <ChevronLeft className="w-4 h-4" style={{ color: "#64748b" }} />
              </button>
              <span className="text-xs" style={{ color: "#64748b" }}>{currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" style={{ color: "#64748b" }} />
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
              <canvas ref={mainCanvasCallbackRef} className="block" />
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
                  touchAction: "none",
                  zIndex: 10,
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
                onTouchCancel={handleCanvasTouchEnd}
              />
              {/* Annotation overlay */}
              <div
                ref={overlayRef}
                className="absolute inset-0"
                style={{
                  cursor: activeTool === "pointer" ? "default"
                    : activeTool === "text" ? "text"
                    : activeTool === "move" ? (isDragging ? "grabbing" : "grab")
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
                      width: ann.type === "text" && editingTextId === ann.id ? Math.max(ann.width, 200) : ann.width,
                      height: ann.type === "text" && editingTextId === ann.id ? "auto" : ann.height,
                      minHeight: ann.height,
                      cursor: activeTool === "move" ? (isDragging && selectedId === ann.id ? "grabbing" : "grab") : "move",
                      outline: selectedId === ann.id ? "2px solid #1565C0" : "none",
                      outlineOffset: 2,
                      userSelect: "none",
                      touchAction: "none",
                      zIndex: editingTextId === ann.id ? 30 : (selectedId === ann.id && activeTool === "move" ? 28 : undefined),
                      transition: activeTool === "move" && !isDragging ? "box-shadow 0.15s ease" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (activeTool === "move" && !isDragging) {
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(27, 94, 32, 0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(ann.id);
                      // When clicking a text annotation, switch to text tool and load its properties
                      // But NOT when the move tool is active — keep move tool active for repositioning
                      if (ann.type === "text" && activeTool !== "move") {
                        setActiveTool("text");
                        setTextColor(ann.color ?? "#000000");
                        setTextSize(ann.fontSize ?? 14);
                        setTextFont(ann.fontFamily ?? "Arial, sans-serif");
                        setTextInput(ann.text ?? "");
                      }
                    }}
                  >
                    {/* Delete button — top-right corner when selected */}
                    {selectedId === ann.id && (
                      <button
                        title={t.editor_delete_annotation}
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
                      <img src={ann.dataUrl} alt="firma" style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "move", transform: ann.rotation ? `rotate(${ann.rotation}deg)` : undefined }} draggable={false} />
                    )}
                    {ann.type === "image" && ann.dataUrl && (
                      <img src={ann.dataUrl} alt="img" style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "move", transform: ann.rotation ? `rotate(${ann.rotation}deg)` : undefined }} draggable={false} />
                    )}
                    {ann.type === "text" && (
                      editingTextId === ann.id ? (
                        <textarea
                          autoFocus
                          value={ann.text ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, text: val, width: Math.max(150, val.length * ((ann.fontSize ?? 14) * 0.6)), height: Math.max((ann.fontSize ?? 14) + 16, val.split("\n").length * ((ann.fontSize ?? 14) * 1.3) + 16) } : a));
                          }}
                          onBlur={() => {
                            // Remove empty text annotations on blur
                            const current = annotations.find(a => a.id === ann.id);
                            if (current && !current.text?.trim()) {
                              setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                              setSelectedId(null);
                            } else {
                              pushHistory(annotationsRef.current);
                            }
                            setEditingTextId(null);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") {
                              setEditingTextId(null);
                              const current = annotations.find(a => a.id === ann.id);
                              if (current && !current.text?.trim()) {
                                setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                                setSelectedId(null);
                              }
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: ann.fontSize ?? 14,
                            color: ann.color ?? "#000",
                            fontFamily: ann.fontFamily ?? "Arial, sans-serif",
                            fontWeight: ann.fontWeight ?? "normal",
                            fontStyle: ann.fontStyle ?? "normal",
                            textDecoration: ann.textDecoration ?? "none",
                            whiteSpace: "pre-wrap",
                            display: "block",
                            lineHeight: 1.3,
                            width: "100%",
                            minHeight: Math.max((ann.fontSize ?? 14) + 16, 30),
                            border: "none",
                            outline: "none",
                            background: "rgba(255,255,255,0.85)",
                            resize: "both",
                            padding: 4,
                            margin: 0,
                            boxSizing: "border-box",
                            overflow: "auto",
                          }}
                          placeholder={t.editor_panel_type_here}
                        />
                      ) : (
                        <span
                          style={{ fontSize: ann.fontSize ?? 14, color: ann.color ?? "#000", fontFamily: ann.fontFamily ?? "Arial, sans-serif", fontWeight: ann.fontWeight ?? "normal", fontStyle: ann.fontStyle ?? "normal", textDecoration: ann.textDecoration ?? "none", whiteSpace: "pre-wrap", display: "block", lineHeight: 1.2, cursor: "move", minHeight: "1em" }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingTextId(ann.id);
                            setActiveTool("text");
                            setTextColor(ann.color ?? "#000000");
                            setTextSize(ann.fontSize ?? 14);
                            setTextFont(ann.fontFamily ?? "Arial, sans-serif");
                            setTextInput(ann.text ?? "");
                          }}
                        >
                          {ann.text || t.editor_panel_type_here}
                        </span>
                      )
                    )}
                    {ann.type === "highlight" && (
                      <div style={{ width: "100%", height: "100%", backgroundColor: ann.color ?? "#FFFF00", opacity: 0.4, borderRadius: 2, cursor: "move" }} />
                    )}
                    {ann.type === "note" && (
                      <div style={{ width: "100%", height: "100%", backgroundColor: "#FFF176", border: "1px solid #F9A825", borderRadius: 4, padding: 4, fontSize: 11, overflow: "hidden", cursor: "move" }}>
                        {ann.text}
                      </div>
                    )}
                    {ann.type === "shape" && (
                      <div style={{
                        width: "100%", height: "100%",
                        border: `2px solid ${ann.color ?? "#2563EB"}`,
                        backgroundColor: (ann.text === "rect-filled" || ann.text === "circle-filled")
                          ? `${ann.color ?? "#2563EB"}`
                          : "transparent",
                        borderRadius: (ann.text === "circle" || ann.text === "circle-filled") ? "50%" : 0,
                        // Line: thin horizontal bar
                        ...(ann.text === "line" ? { height: 2, marginTop: "50%" } : {}),
                      }} />
                    )}
                    {/* Rotate button for images and signatures */}
                    {selectedId === ann.id && (ann.type === "image" || ann.type === "signature") && (
                      <button
                        title="Rotate 90°"
                        style={{ position: "absolute", left: -10, top: -10, width: 22, height: 22, backgroundColor: "#1565C0", borderRadius: "50%", cursor: "pointer", zIndex: 31, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, rotation: ((a.rotation ?? 0) + 90) % 360 } : a));
                          pushHistory(annotationsRef.current);
                        }}
                      >
                        <RotateCw size={11} color="white" />
                      </button>
                    )}
                    {/* Resize handle */}
                    {selectedId === ann.id && (
                      <div
                        title={t.editor_resize_handle}
                        style={{ position: "absolute", right: -8, bottom: -8, width: 20, height: 20, backgroundColor: "#1565C0", borderRadius: 4, cursor: "se-resize", zIndex: 30, border: "2.5px solid white", touchAction: "none" }}
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
              {/* No overlay needed — edited text is rendered directly on the canvas */}
              {/* Native text blocks overlay — edit-text tool active */}
              {activeTool === "edit-text" && nativeTextBlocks.map(block => {
                const isEditing = editingBlockId === block.id;
                return isEditing ? (
                  /* WYSIWYG contentEditable overlay — positioned exactly over the text */
                  <div
                    key={block.id}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    style={{
                      position: "absolute",
                      left: block.x,
                      top: block.y,
                      width: block.width,
                      maxWidth: block.width,
                      minHeight: block.height,
                      cursor: "text",
                      border: "2px solid #1565C0",
                      backgroundColor: "rgba(255,255,255,0.97)",
                      borderRadius: 2,
                      zIndex: 30,
                      boxSizing: "border-box",
                      padding: "1px 2px",
                      fontSize: block.fontSize,
                      fontFamily: `"${block.pdfFontName}", ${block.fontFamily || "sans-serif"}`,
                      fontWeight: block.fontWeight || "normal",
                      fontStyle: block.fontStyle || "normal",
                      color: block.originalColor || "#000",
                      lineHeight: block.lineHeight ? `${block.lineHeight}px` : "1.4",
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      outline: "none",
                      boxShadow: "0 2px 12px rgba(21,101,192,0.15)",
                    }}
                    onBlur={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const newText = el.innerText;
                      const savedOriginal = el.dataset.originalText ?? "";
                      // Only save if text actually changed from what was loaded
                      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
                      if (normalize(newText) !== normalize(savedOriginal)) {
                        setAllNativeTextBlocks(prev => {
                          const pageBlocks = prev.get(block.page) ?? [];
                          const updated = pageBlocks.map((b: NativeTextBlock) =>
                            b.id === block.id ? { ...b, editedStr: newText } : b
                          );
                          const next = new Map(prev);
                          next.set(block.page, updated);
                          return next;
                        });
                        toast.success((t as any).editor_text_saved ?? "Text saved");
                        setTimeout(() => bakeTextEditsIntoPdf(), 100);
                      }
                      setEditingBlockId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    ref={(el) => {
                      editContentRef.current = el;
                      if (el && !el.dataset.init) {
                        el.dataset.init = "1";
                        const textContent = block.editedStr ?? block.str;
                        el.innerText = textContent;
                        // Store the original text for comparison on blur
                        el.dataset.originalText = textContent;
                        el.focus();
                        const range = document.createRange();
                        range.selectNodeContents(el);
                        range.collapse(false);
                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                      }
                    }}
                  />
                ) : (
                  /* Not editing: transparent border overlay, canvas text visible underneath */
                  <div
                    key={block.id}
                    style={{
                      position: "absolute",
                      left: block.x,
                      top: block.y,
                      width: block.width,
                      height: block.height,
                      cursor: "text",
                      border: "1.5px dashed rgba(21, 101, 192, 0.35)",
                      backgroundColor: "transparent",
                      borderRadius: 2,
                      zIndex: 25,
                      boxSizing: "border-box",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBlockId(block.id);
                      setEditingBlockText(block.editedStr ?? block.str);
                      setShowMobilePanel(true);
                    }}
                  />
                );
              })}
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
          style={{ backgroundColor: "#FFFFFF", borderColor: "#f1f5f9" }}
        >
          {renderToolPanel()}
        </div>
        {/* Mobile bottom sheet */}
        <div
          className={[
            "fixed left-0 right-0 bottom-[130px] z-40 md:hidden transition-transform duration-300 rounded-t-2xl overflow-hidden",
            showMobilePanel ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
          style={{ backgroundColor: "#FFFFFF", boxShadow: "0 -4px 24px rgba(13, 51, 17, 0.18)", maxHeight: "60vh", overflowY: "auto" }}
        >
          {/* Sheet handle + close */}
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10" style={{ borderColor: "#f1f5f9" }}>
            <div className="w-10 h-1 rounded-full mx-auto" style={{ backgroundColor: "#e2e8f0" }} />
            <button
              onClick={() => setShowMobilePanel(false)}
              className="absolute right-3 top-2.5 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" style={{ color: "#64748b" }} />
            </button>
          </div>
          {renderToolPanel()}
        </div>
      </div>

      {/* ── MOBILE BOTTOM BAR ── fixed at bottom, always visible */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t" style={{ backgroundColor: "#FFFFFF", borderColor: "#f1f5f9", boxShadow: "0 -2px 12px rgba(13, 51, 17, 0.12)" }}>
        {/* Tools row — horizontal scroll with fade indicator */}
        <div className="relative">
        <div className="flex items-center overflow-x-auto gap-0 px-1 py-1" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {/* Rotate page button — first position on mobile */}
          <button
            onClick={rotatePage}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg shrink-0 transition-all"
            style={{ color: "#1A3A5C", minWidth: 56 }}
          >
            <RotateCw className="w-5 h-5" />
            <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{t.editor_rotate}</span>
          </button>
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
            { id: "convert" as ToolName, icon: RefreshCw, label: (t as any).editor_convert ?? "Convert" },
            { id: "merge" as ToolName, icon: Layers, label: (t as any).editor_merge ?? "Merge" },
            { id: "split" as ToolName, icon: Scissors, label: (t as any).editor_split ?? "Split" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => { setActiveTool(id); setSelectedId(null); setShowMobilePanel(true); }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg shrink-0 transition-all"
              style={{
                color: activeTool === id ? "#1565C0" : "#1A3A5C",
                backgroundColor: activeTool === id ? "rgba(27, 94, 32, 0.10)" : "transparent",
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
            style={{ borderColor: "#94a3b8", color: "#1A3A5C", backgroundColor: "white" }}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "..." : t.editor_save_btn}
          </button>
          {/* Download button */}
          <button
            onClick={downloadPdf}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-white font-bold text-base transition-all"
            style={{ backgroundColor: "#0D47A1" }}
            onTouchStart={e => e.currentTarget.style.backgroundColor = "#1565C0"}
            onTouchEnd={e => e.currentTarget.style.backgroundColor = "#0D47A1"}
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
        thumbnailUrl={paywallThumbnail ?? thumbnails[0]}
        buildPdfForUpload={async () => {
          if (!pdfBytes) return null;
          try {
            const out = await buildAnnotatedPdf();
            if (!out) return null;
            return {
              base64: uint8ToBase64(out),
              name: file?.name ?? "document.pdf",
              size: out.byteLength,
            };
          } catch {
            return null;
          }
        }}
        onPaymentSuccess={async (transactionId?: string) => {
          // After successful payment: auto-download the PDF, then navigate to success page
          setShowPaywall(false);
          toast.loading("Preparando descarga...", { id: "post-pay-dl" });
          const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
          const lang = langMatch ? langMatch[1] : "es";
          const txnParam = transactionId ? `?txn=${encodeURIComponent(transactionId)}` : `?txn=pmt_${Date.now()}`;
          try {
            // Check if there's a pending tool download (compress, protect, convert, etc.)
            if (pendingToolDownloadRef.current) {
              const { blob, name } = pendingToolDownloadRef.current;
              triggerBlobDownload(blob, name);
              pendingToolDownloadRef.current = null;
              toast.success("¡Pago completado! Archivo descargado correctamente.", { id: "post-pay-dl" });
              // Navigate to success page for conversion tracking
              navigate(`/${lang}/payment/success${txnParam}`);
              return;
            }
            // Otherwise, download the annotated PDF
            const out = await buildAnnotatedPdf();
            if (out) {
              triggerDownload(out);
              toast.success("¡Pago completado! PDF descargado correctamente.", { id: "post-pay-dl" });
            } else {
              toast.success("¡Pago completado! Tu documento está en tu panel.", { id: "post-pay-dl" });
            }
          } catch {
            toast.success("¡Pago completado! Tu documento está en tu panel.", { id: "post-pay-dl" });
          }
          // Always navigate to success page for Google Ads / Analytics conversion tracking
          navigate(`/${lang}/payment/success${txnParam}`);
        }}
      />
    </div>
  );
}
