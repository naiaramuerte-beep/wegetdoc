/* =============================================================
   ConverterHubPage (/{lang}/convert)
   Unified converter: upload any file → we auto-detect the type and
   suggest the valid targets, OR click a conversion tile directly.
   Then: convert → paywall (0,50€) → download. Reuses the existing
   backends (/api/convert/pdf-to/:format for PDF→X, /api/documents/
   convert-upload for X→PDF) + client-side canvas for JPG↔PNG.
   ============================================================= */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { checkUploadSize } from "@/lib/uploadLimit";
import { useLandingEntitlement } from "@/lib/useLandingEntitlement";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePdfFile } from "@/contexts/PdfFileContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { hubT } from "./hubStrings";
import { pdfjsCompatOpts } from "@/lib/pdfjs-safe";

// Configure pdfjs worker once per module (guards re-init on hot-reload).
let pdfjsReady: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;
function loadPdfjs() {
  if (!pdfjsReady) {
    pdfjsReady = import("pdfjs-dist/legacy/build/pdf.mjs").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).href;
      return mod;
    });
  }
  return pdfjsReady;
}

// Render page 1 of a PDF to a small preview JPEG (data URL).
async function renderPdfThumbnail(file: File, maxWidth = 240): Promise<string | null> {
  try {
    const pdfjsLib = await loadPdfjs();
    const arr = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arr), ...pdfjsCompatOpts() }).promise;
    const page = await doc.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport } as any).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch (err) {
    console.warn("[ConverterHub] PDF preview failed:", err);
    return null;
  }
}
import { FileText, Image as ImageIcon, FileSpreadsheet, Presentation, UploadCloud, ArrowRight, Star, Check, ShieldCheck, Smartphone, MousePointerClick, Download } from "lucide-react";
import { toast } from "sonner";

const ACCENT = "#E63946";

type Backend = "pdf-to" | "to-pdf" | "image" | "image-server";
interface Conv {
  id: string;
  label: string;        // "PDF → Word"
  fromExts: string[];   // extensions this conversion accepts (no dot)
  toExt: string;        // output extension
  backend: Backend;
  pdfToFormat?: "docx" | "xlsx" | "pptx" | "jpg" | "png"; // for backend "pdf-to"
  imageTo?: "png" | "jpg";                        // for backend "image" (client canvas)
  imgServerTo?: "png" | "jpg" | "pdf";            // for backend "image-server" (CloudConvert)
  icon: any;
  tint: string;
  landing?: string;     // dedicated SEO landing slug (e.g. "heic-to-pdf"), if any
}

// V1 conversions — every one here has a working backend today.
const CONVERSIONS: Conv[] = [
  { id: "pdf-word",  label: "PDF → Word",       fromExts: ["pdf"],          toExt: "docx", backend: "pdf-to", pdfToFormat: "docx", icon: FileText,     tint: "#2B5BEA" },
  { id: "pdf-excel", label: "PDF → Excel",      fromExts: ["pdf"],          toExt: "xlsx", backend: "pdf-to", pdfToFormat: "xlsx", icon: FileSpreadsheet, tint: "#1E9E63" },
  { id: "pdf-ppt",   label: "PDF → PowerPoint", fromExts: ["pdf"],          toExt: "pptx", backend: "pdf-to", pdfToFormat: "pptx", icon: Presentation, tint: "#E8710A" },
  { id: "pdf-jpg",   label: "PDF → JPG",        fromExts: ["pdf"],          toExt: "jpg",  backend: "pdf-to", pdfToFormat: "jpg",  icon: ImageIcon,    tint: "#8E24AA" },
  { id: "word-pdf",  label: "Word → PDF",       fromExts: ["doc", "docx"],  toExt: "pdf",  backend: "to-pdf", icon: FileText,     tint: "#2B5BEA" },
  { id: "excel-pdf", label: "Excel → PDF",      fromExts: ["xls", "xlsx"],  toExt: "pdf",  backend: "to-pdf", icon: FileSpreadsheet, tint: "#1E9E63" },
  { id: "ppt-pdf",   label: "PowerPoint → PDF", fromExts: ["ppt", "pptx"],  toExt: "pdf",  backend: "to-pdf", icon: Presentation, tint: "#E8710A" },
  { id: "jpg-pdf",   label: "JPG → PDF",        fromExts: ["jpg", "jpeg"],  toExt: "pdf",  backend: "to-pdf", icon: FileText,     tint: "#E63946" },
  { id: "png-pdf",   label: "PNG → PDF",        fromExts: ["png"],          toExt: "pdf",  backend: "to-pdf", icon: FileText,     tint: "#E63946" },
  { id: "jpg-png",   label: "JPG → PNG",        fromExts: ["jpg", "jpeg"],  toExt: "png",  backend: "image", imageTo: "png",      icon: ImageIcon,    tint: "#00838F" },
  { id: "png-jpg",   label: "PNG → JPG",        fromExts: ["png"],          toExt: "jpg",  backend: "image", imageTo: "jpg",      icon: ImageIcon,    tint: "#00838F" },
  { id: "pdf-png",   label: "PDF → PNG",        fromExts: ["pdf"],          toExt: "png",  backend: "pdf-to", pdfToFormat: "png",  icon: ImageIcon,    tint: "#8E24AA" },
  { id: "heic-jpg",  label: "HEIC → JPG",       fromExts: ["heic", "heif"], toExt: "jpg",  backend: "image-server", imgServerTo: "jpg", icon: ImageIcon, tint: "#0EA5E9" },
  { id: "heic-pdf",  label: "HEIC → PDF",       fromExts: ["heic", "heif"], toExt: "pdf",  backend: "image-server", imgServerTo: "pdf", icon: FileText, tint: "#E63946", landing: "heic-to-pdf" },
  { id: "webp-jpg",  label: "WEBP → JPG",       fromExts: ["webp"],         toExt: "jpg",  backend: "image-server", imgServerTo: "jpg", icon: ImageIcon, tint: "#0EA5E9" },
  { id: "html-pdf",  label: "HTML → PDF",       fromExts: ["html", "htm"],  toExt: "pdf",  backend: "to-pdf", icon: FileText,     tint: "#F59E0B" },
  { id: "csv-pdf",   label: "CSV → PDF",        fromExts: ["csv"],          toExt: "pdf",  backend: "to-pdf", icon: FileSpreadsheet, tint: "#1E9E63" },
];

const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();
const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`);

function triggerBlobDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Client-side JPG<->PNG via canvas (instant, no server cost).
async function imageConvert(file: File, toExt: "png" | "jpg"): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (toExt === "jpg") {
      ctx.fillStyle = "#ffffff"; // JPG has no alpha — flatten onto white
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const mime = toExt === "jpg" ? "image/jpeg" : "image/png";
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), mime, 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function runConversion(conv: Conv, file: File): Promise<{ blob: Blob; name: string }> {
  const base = file.name.replace(/\.[^.]+$/, "");
  if (conv.backend === "pdf-to") {
    const fd = new FormData();
    fd.append("file", file, file.name);
    const resp = await fetch(`/api/convert/pdf-to/${conv.pdfToFormat}`, { method: "POST", body: fd, credentials: "include" });
    if (!resp.ok) throw new Error(`Error de conversión (${resp.status})`);
    const blob = await resp.blob();
    const hn = resp.headers.get("X-Converted-Name");
    return { blob, name: hn ? decodeURIComponent(hn) : `${base}.${conv.toExt}` };
  }
  if (conv.backend === "to-pdf") {
    const fd = new FormData();
    fd.append("file", file, file.name);
    const resp = await fetch(`/api/documents/convert-upload`, { method: "POST", body: fd, credentials: "include" });
    if (!resp.ok) throw new Error(`Error de conversión (${resp.status})`);
    return { blob: await resp.blob(), name: `${base}.pdf` };
  }
  if (conv.backend === "image-server") {
    const fd = new FormData();
    fd.append("file", file, file.name);
    const resp = await fetch(`/api/convert/image-to/${conv.imgServerTo}`, { method: "POST", body: fd, credentials: "include" });
    if (!resp.ok) throw new Error(`Error de conversión (${resp.status})`);
    const blob = await resp.blob();
    const hn = resp.headers.get("X-Converted-Name");
    return { blob, name: hn ? decodeURIComponent(hn) : `${base}.${conv.toExt}` };
  }
  // image (client-side canvas)
  const blob = await imageConvert(file, conv.imageTo!);
  return { blob, name: `${base}.${conv.toExt}` };
}

export default function ConverterHubPage({ preselectId, seoH1, seoSub }: { preselectId?: string; seoH1?: string; seoSub?: string } = {}) {
  const { lang, t } = useLanguage();
  const s = hubT(lang);
  // Dedicated landings (e.g. /heic-to-pdf) reuse this hub pre-focused on one
  // conversion with their own SEO copy; the generic /convert passes nothing.
  const h1 = seoH1 ?? s.h1;
  const sub = seoSub ?? s.sub;
  useEffect(() => {
    document.title = `${h1} · EditorPDF`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", sub);
    window.scrollTo(0, 0);
  }, [lang, h1, sub]); // eslint-disable-line react-hooks/exhaustive-deps
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Conv | null>(null);
  const [phase, setPhase] = useState<"idle" | "converting" | "ready">("idle");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [busy, setBusy] = useState(false);
  const { isTrulyPremium } = useLandingEntitlement();
  const { isAuthenticated } = useAuth();
  const { saveEditedPdfToSession } = usePdfFile();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resumeTriedRef = useRef(false);

  // Pre-select a conversion on dedicated landings so the user lands ready to
  // upload for that specific target (e.g. HEIC → PDF).
  useEffect(() => {
    if (preselectId) {
      const c = CONVERSIONS.find((x) => x.id === preselectId);
      if (c) setSelected(c);
    }
  }, [preselectId]);

  // Resume after the Google-OAuth full-page redirect (mobile). The modal appends
  // `resume=download` to the return URL, and handleDownloadClick stashed the
  // file's S3 key (rk), name (rn) and conversion id (cf) in the URL before the
  // redirect. On return — once auth resolves — pull the file back from S3,
  // restore the target, and reopen the paywall so the user can finish paying.
  // WITHOUT this, registering with Google on /convert dropped the user back on
  // an empty page (file lost, modal never reopened) — the reported bug.
  useEffect(() => {
    if (resumeTriedRef.current) return;
    const p = new URLSearchParams(window.location.search);
    const rk = p.get("rk"), rn = p.get("rn"), cf = p.get("cf");
    if (p.get("resume") !== "download" || !rk || !rn) return;
    if (!isAuthenticated) return; // wait until auth.me resolves after the redirect
    resumeTriedRef.current = true;
    (async () => {
      try {
        let buf: ArrayBuffer | null = null;
        if (rk.startsWith("base64:")) {
          const bin = atob(rk.slice(7));
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          buf = arr.buffer as ArrayBuffer;
        } else {
          const resp = await fetch(`/api/documents/temp-download/${encodeURIComponent(rk)}`);
          if (resp.ok) buf = await resp.arrayBuffer();
        }
        if (buf) {
          setFile(new File([buf], rn));
          const c = CONVERSIONS.find((x) => x.id === cf);
          if (c) setSelected(c);
          setPhase("ready");
          setShowPaywall(true);
        }
      } catch { /* ignore — user can re-upload */ }
      finally {
        const q = new URLSearchParams(window.location.search);
        ["rk", "rn", "cf", "resume", "tk", "tn"].forEach((k) => q.delete(k));
        const qs = q.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      }
    })();
  }, [isAuthenticated]);

  // When a file is uploaded, the valid conversions are those whose fromExts
  // include the file's extension. This drives the "convert to…" suggestions.
  const suggestions = useMemo(() => {
    if (!file) return [] as Conv[];
    const e = extOf(file.name);
    return CONVERSIONS.filter((c) => c.fromExts.includes(e));
  }, [file]);

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!checkUploadSize(f, t.upload_too_large)) return;
    setFile(f);
    setPhase("idle");
    setProgress(0);
    if (selected && !selected.fromExts.includes(extOf(f.name))) setSelected(null);
    setPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      // HEIC/HEIF can't be rendered by non-Safari browsers — skip the preview
      // (it'd show a broken image); the conversion still runs server-side.
      const ext = extOf(f.name);
      const previewable = f.type.startsWith("image/") && ext !== "heic" && ext !== "heif";
      return previewable ? URL.createObjectURL(f) : null;
    });
    // PDFs: render page 1 as a real thumbnail (async, replaces the icon).
    if (extOf(f.name) === "pdf") {
      renderPdfThumbnail(f).then((url) => { if (url) setPreviewUrl(url); });
    }
  };

  const pickFormat = (c: Conv) => { setSelected(c); setPhase("idle"); setProgress(0); };

  const canConvert = !!file && !!selected && selected.fromExts.includes(extOf(file.name));

  // Step 3: "Convertir" runs a short progress animation, then shows the preview
  // + Download. The REAL conversion only happens after payment (handlePaymentSuccess).
  const handleConvert = () => {
    if (!canConvert) return;
    setPhase("converting");
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 14 + 8;
      if (p >= 100) { p = 100; clearInterval(iv); setProgress(100); setTimeout(() => setPhase("ready"), 350); }
      else setProgress(Math.round(p));
    }, 220);
  };

  // Download button: premium users convert + download for free; everyone else
  // hits the paywall. (Trial users still pay per conversion on this funnel.)
  const handleDownloadClick = async () => {
    if (isTrulyPremium) { await handlePaymentSuccess(); return; }
    // Fire-and-forget: persist the file to S3 and stash its key + name + target
    // in the URL so the flow SURVIVES the Google-OAuth full-page redirect (mobile).
    // The modal reads the current URL as its OAuth returnPath, so by the time the
    // user taps "Google" (a few seconds of reading later) the params are in place.
    // Don't block the modal opening on the upload — matches the editor's pre-upload.
    if (file && selected) {
      (async () => {
        try {
          const base64 = await fileToBase64(file);
          const tk = await saveEditedPdfToSession(base64, file.name, file.size);
          if (tk) {
            const p = new URLSearchParams(window.location.search);
            p.set("rk", tk); p.set("rn", file.name); p.set("cf", selected.id);
            window.history.replaceState({}, "", window.location.pathname + `?${p.toString()}`);
          }
        } catch { /* best-effort; desktop popup flow keeps state without this */ }
      })();
    }
    setShowPaywall(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaywall(false);
    if (!file || !selected) return;
    setBusy(true);
    toast.loading(s.toastConverting, { id: "conv" });
    try {
      const { blob, name } = await runConversion(selected, file);
      triggerBlobDownload(blob, name);
      toast.success(s.toastDone, { id: "conv" });
    } catch (err) {
      toast.error((err as Error).message || s.toastError, { id: "conv" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <Navbar />
      <style>{`
        @keyframes convPop { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes convPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,.35); } 50% { box-shadow: 0 0 0 8px rgba(22,163,74,0); } }
      `}</style>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <p style={{ color: ACCENT, fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>{s.eyebrow}</p>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#0A0A0B", margin: "6px 0" }}>{h1}</h1>
          <p style={{ color: "#64748b" }}>{sub}</p>
        </div>

        {/* Always-mounted file input */}
        <input ref={inputRef} type="file" hidden onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />

        {/* Upload zone OR uploaded state */}
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); onPickFile(e.dataTransfer.files?.[0] ?? null); }}
            style={{
              border: `2px dashed ${isDragging ? ACCENT : "#e5e7eb"}`,
              background: isDragging ? "#FEF2F3" : "#F8FAFC",
              borderRadius: 18, padding: "44px 20px", textAlign: "center", marginTop: 24, transition: "all .15s",
            }}
          >
            <UploadCloud style={{ width: 46, height: 46, color: ACCENT, margin: "0 auto" }} />
            <p style={{ fontWeight: 800, color: "#0A0A0B", marginTop: 12, fontSize: 17 }}>{s.drag}</p>
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                marginTop: 14, padding: "12px 26px", borderRadius: 12, border: "none",
                background: ACCENT, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 8px 20px -8px rgba(230,57,70,.6)",
              }}
            >
              <UploadCloud style={{ width: 18, height: 18 }} /> {s.selectBtn}
            </button>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 14 }}>{s.anyFormat}</p>
          </div>
        ) : (
          <div style={{
            marginTop: 24, borderRadius: 18, padding: "18px 20px",
            border: "2px solid #16a34a", background: "#F0FDF4",
            display: "flex", alignItems: "center", gap: 14, animation: "convPop .35s ease",
          }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "convPulse 1.8s ease-out infinite" }}>
              <Check style={{ width: 26, height: 26, color: "#fff" }} strokeWidth={3} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, color: "#0A0A0B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</p>
              <p style={{ color: "#16a34a", fontSize: 13, fontWeight: 700, marginTop: 2 }}>✓ {s.uploaded} · {fmtSize(file.size)}</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              {s.change}
            </button>
          </div>
        )}

        {/* Suggestions after upload (only while choosing) */}
        {file && phase === "idle" && (
          <div style={{ marginTop: 24 }}>
            {suggestions.length > 0 ? (
              <>
                <p style={{ fontWeight: 800, color: "#0A0A0B", marginBottom: 12, fontSize: 15 }}>{s.whichFormat}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {suggestions.map((c) => {
                    const Icon = c.icon;
                    const active = selected?.id === c.id;
                    const target = c.label.split("→")[1]?.trim() || c.label;
                    return (
                      <button
                        key={c.id}
                        onClick={() => pickFormat(c)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, cursor: "pointer",
                          border: `2px solid ${active ? ACCENT : "#e5e7eb"}`,
                          background: active ? "#FEF2F3" : "#fff", textAlign: "left",
                          boxShadow: active ? "0 6px 16px -8px rgba(230,57,70,.5)" : "none", transition: "all .12s",
                        }}
                      >
                        <span style={{ width: 34, height: 34, borderRadius: 9, background: c.tint + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon style={{ width: 17, height: 17, color: c.tint }} />
                        </span>
                        <span style={{ fontWeight: 800, color: "#0A0A0B", fontSize: 14, flex: 1 }}>{target}</span>
                        {active && <Check style={{ width: 16, height: 16, color: ACCENT }} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ padding: 16, borderRadius: 14, background: "#FEF2F3", border: "1px solid #F2C1C6", color: "#C72738", fontWeight: 600, textAlign: "center" }}>
                {s.unsupported}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Convert (no price shown here) */}
        {canConvert && phase === "idle" && (
          <button
            onClick={handleConvert}
            style={{
              marginTop: 24, width: "100%", padding: "16px", borderRadius: 14, border: "none",
              background: ACCENT, color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 10px 24px -10px rgba(230,57,70,.6)",
            }}
          >
            {s.convertTo.replace("{f}", selected!.label.split("→")[1]?.trim() || "")} <ArrowRight style={{ width: 18, height: 18 }} />
          </button>
        )}

        {/* Converting progress */}
        {phase === "converting" && (
          <div style={{ marginTop: 24, padding: "28px 24px", borderRadius: 18, border: "1px solid #eef2f7", background: "#F8FAFC", textAlign: "center" }}>
            <p style={{ fontWeight: 800, color: "#0A0A0B", fontSize: 16 }}>{s.converting}</p>
            <div style={{ marginTop: 16, height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: ACCENT, borderRadius: 999, transition: "width .2s ease" }} />
            </div>
            <p style={{ marginTop: 8, color: "#64748b", fontWeight: 700, fontSize: 14 }}>{progress}%</p>
          </div>
        )}

        {/* Ready: preview + download */}
        {phase === "ready" && selected && (
          <div style={{ marginTop: 24, padding: "28px 24px", borderRadius: 18, border: "2px solid #16a34a", background: "#F0FDF4", textAlign: "center", animation: "convPop .35s ease" }}>
            <div style={{ margin: "0 auto", width: 120, height: 150, borderRadius: 12, overflow: "hidden", border: "1px solid #d1fae5", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewUrl ? (
                <img src={previewUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              ) : (
                (() => { const Ic = selected.icon; return <Ic style={{ width: 48, height: 48, color: selected.tint }} />; })()
              )}
            </div>
            <p style={{ fontWeight: 800, color: "#0A0A0B", fontSize: 18, marginTop: 16 }}>{s.ready}</p>
            <p style={{ color: "#16a34a", fontWeight: 700, fontSize: 14, marginTop: 2 }}>{selected.label}</p>
            <button
              onClick={handleDownloadClick}
              disabled={busy}
              style={{
                marginTop: 18, width: "100%", maxWidth: 320, padding: "15px", borderRadius: 14, border: "none",
                background: ACCENT, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.6 : 1,
                boxShadow: "0 10px 24px -10px rgba(230,57,70,.6)",
              }}
            >
              {busy ? s.preparing : <>{s.download} <Download style={{ width: 18, height: 18 }} /></>}
            </button>
            <div>
              <button onClick={() => { setPhase("idle"); setSelected(null); }} style={{ marginTop: 12, background: "none", border: "none", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
                {s.convertAnother}
              </button>
            </div>
          </div>
        )}

        {/* Full grid */}
        <div style={{ marginTop: 48 }}>
          <p style={{ color: ACCENT, fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase", textAlign: "center" }}>{s.allConversions}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            {CONVERSIONS.map((c) => {
              const Icon = c.icon;
              const active = selected?.id === c.id;
              const tileStyle = {
                display: "flex", alignItems: "center", gap: 10, padding: "14px", borderRadius: 14, textAlign: "left" as const,
                border: `2px solid ${active ? ACCENT : "#eef2f7"}`, background: "#fff", cursor: "pointer",
              };
              const inner = (
                <>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: c.tint + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 18, height: 18, color: c.tint }} />
                  </span>
                  <span style={{ fontWeight: 700, color: "#0A0A0B", fontSize: 14 }}>{c.label}</span>
                </>
              );
              // Conversions with a dedicated SEO landing render as a crawlable
              // <a> so search engines follow the internal link; the landing is
              // this same hub pre-focused on that conversion, so UX is identical.
              if (c.landing) {
                return (
                  <Link key={c.id} href={`/${lang}/${c.landing}`} style={{ ...tileStyle, textDecoration: "none" }}>
                    {inner}
                  </Link>
                );
              }
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    pickFormat(c);
                    if (!file || !c.fromExts.includes(extOf(file.name))) { setFile(null); setPreviewUrl(null); inputRef.current?.click(); }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={tileStyle}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust strip */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 24, marginTop: 36, color: "#64748b", fontSize: 14 }}>
          {([[ShieldCheck, s.trustPrivate], [Smartphone, s.trustDevice], [Check, s.trustNoInstall]] as const).map(([Ic, txt], i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Ic style={{ width: 16, height: 16, color: "#16a34a" }} /> {txt}
            </span>
          ))}
        </div>

        {/* How it works */}
        <div style={{ marginTop: 64 }}>
          <p style={{ color: ACCENT, fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase", textAlign: "center" }}>{s.howKicker}</p>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0A0A0B", textAlign: "center", margin: "8px 0 28px" }}>{s.howTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {([
              { icon: UploadCloud, title: s.step1Title, desc: s.step1Desc },
              { icon: MousePointerClick, title: s.step2Title, desc: s.step2Desc },
              { icon: Download, title: s.step3Title, desc: s.step3Desc },
            ] as const).map((step, i) => {
              const Ic = step.icon;
              return (
                <div key={i} style={{ padding: 20, borderRadius: 16, border: "1px solid #eef2f7", background: "#fff" }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: "#FEE7EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ic style={{ width: 22, height: 22, color: ACCENT }} />
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0A0A0B", margin: "12px 0 6px" }}>{step.title}</h3>
                  <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews */}
        <div style={{ marginTop: 64 }}>
          <p style={{ color: ACCENT, fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase", textAlign: "center" }}>{s.reviewsKicker}</p>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0A0A0B", textAlign: "center", margin: "8px 0 28px" }}>{s.reviewsTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {([
              { name: "María G.", text: s.review1 },
              { name: "Andrei P.", text: s.review2 },
              { name: "Thomas K.", text: s.review3 },
            ] as const).map((r, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 16, border: "1px solid #eef2f7", background: "#fff" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
                  {[0, 1, 2, 3, 4].map((n) => <Star key={n} style={{ width: 16, height: 16, color: "#F5B301", fill: "#F5B301" }} />)}
                </div>
                <p style={{ color: "#334155", fontSize: 14, lineHeight: 1.6 }}>"{r.text}"</p>
                <p style={{ fontWeight: 700, color: "#0A0A0B", fontSize: 13, marginTop: 10 }}>{r.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 64 }}>
          <p style={{ color: ACCENT, fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase", textAlign: "center" }}>{s.faqKicker}</p>
          <div style={{ maxWidth: 640, margin: "24px auto 0" }}>
            {([
              { q: s.faq1Q, a: s.faq1A },
              { q: s.faq2Q, a: s.faq2A },
              { q: s.faq3Q, a: s.faq3A },
              { q: s.faq4Q, a: s.faq4A },
            ] as const).map((f, i) => (
              <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid #eef2f7" }}>
                <p style={{ fontWeight: 700, color: "#0A0A0B", fontSize: 15 }}>{f.q}</p>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        buildPdfForUpload={async () => {
          if (!file) return null;
          try { return { base64: await fileToBase64(file), name: file.name, size: file.size }; } catch { return null; }
        }}
        converter={{ label: selected?.label ?? "archivo", price: "0,50€" }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
