/* =============================================================
   ConverterHubPage (/{lang}/convert)
   Unified converter: upload any file → we auto-detect the type and
   suggest the valid targets, OR click a conversion tile directly.
   Then: convert → paywall (0,50€) → download. Reuses the existing
   backends (/api/convert/pdf-to/:format for PDF→X, /api/documents/
   convert-upload for X→PDF) + client-side canvas for JPG↔PNG.
   ============================================================= */
import { useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import PaywallModal from "@/components/PaywallModal";
import { FileText, Image as ImageIcon, FileSpreadsheet, Presentation, UploadCloud, ArrowRight } from "lucide-react";
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
  imgServerTo?: "png" | "jpg";                    // for backend "image-server" (CloudConvert)
  icon: any;
  tint: string;
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
  { id: "webp-jpg",  label: "WEBP → JPG",       fromExts: ["webp"],         toExt: "jpg",  backend: "image-server", imgServerTo: "jpg", icon: ImageIcon, tint: "#0EA5E9" },
  { id: "html-pdf",  label: "HTML → PDF",       fromExts: ["html", "htm"],  toExt: "pdf",  backend: "to-pdf", icon: FileText,     tint: "#F59E0B" },
];

const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();

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

export default function ConverterHubPage() {
  useLanguage(); // keeps the page reactive to language (copy is minimal here)
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Conv | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // When a file is uploaded, the valid conversions are those whose fromExts
  // include the file's extension. This drives the "convert to…" suggestions.
  const suggestions = useMemo(() => {
    if (!file) return [] as Conv[];
    const e = extOf(file.name);
    return CONVERSIONS.filter((c) => c.fromExts.includes(e));
  }, [file]);

  const onPickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    // If a tile was already selected and the file doesn't match it, clear it.
    if (selected && !selected.fromExts.includes(extOf(f.name))) setSelected(null);
  };

  const canConvert = !!file && !!selected && selected.fromExts.includes(extOf(file.name));

  const handlePaymentSuccess = async () => {
    setShowPaywall(false);
    if (!file || !selected) return;
    setBusy(true);
    toast.loading("Convirtiendo…", { id: "conv" });
    try {
      const { blob, name } = await runConversion(selected, file);
      triggerBlobDownload(blob, name);
      toast.success("¡Listo! Descarga iniciada.", { id: "conv" });
    } catch (err) {
      toast.error((err as Error).message || "No se pudo convertir el archivo.", { id: "conv" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <p style={{ color: ACCENT, fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>Conversor de archivos</p>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#0A0A0B", margin: "6px 0" }}>Convierte cualquier archivo</h1>
          <p style={{ color: "#64748b" }}>Sube tu archivo y te decimos a qué puedes convertirlo. O elige abajo.</p>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); onPickFile(e.dataTransfer.files?.[0] ?? null); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? ACCENT : "#e5e7eb"}`,
            background: isDragging ? "#FEF2F3" : "#F8FAFC",
            borderRadius: 18, padding: "40px 20px", textAlign: "center", cursor: "pointer", marginTop: 24,
          }}
        >
          <input ref={inputRef} type="file" hidden onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
          <UploadCloud style={{ width: 40, height: 40, color: ACCENT, margin: "0 auto" }} />
          <p style={{ fontWeight: 700, color: "#0A0A0B", marginTop: 10 }}>
            {file ? file.name : "Arrastra tu archivo o haz clic para subir"}
          </p>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Archivos de hasta 100 MB</p>
        </div>

        {/* Suggestions after upload */}
        {file && (
          <div style={{ marginTop: 20 }}>
            {suggestions.length > 0 ? (
              <>
                <p style={{ fontWeight: 700, color: "#0A0A0B", marginBottom: 10 }}>Convertir a:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      style={{
                        padding: "10px 16px", borderRadius: 12, fontWeight: 700, cursor: "pointer",
                        border: `2px solid ${selected?.id === c.id ? ACCENT : "#e5e7eb"}`,
                        background: selected?.id === c.id ? "#FEF2F3" : "#fff", color: "#0A0A0B",
                      }}
                    >
                      {c.label.split("→")[1]?.trim() || c.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "#E63946", fontWeight: 600 }}>No podemos convertir este tipo de archivo todavía.</p>
            )}
          </div>
        )}

        {/* Convert CTA */}
        {canConvert && (
          <button
            onClick={() => setShowPaywall(true)}
            disabled={busy}
            style={{
              marginTop: 22, width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: ACCENT, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Convirtiendo…" : <>Convertir y descargar por 0,50 € <ArrowRight style={{ width: 18, height: 18 }} /></>}
          </button>
        )}

        {/* Full grid */}
        <div style={{ marginTop: 48 }}>
          <p style={{ color: ACCENT, fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase", textAlign: "center" }}>Todas las conversiones</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            {CONVERSIONS.map((c) => {
              const Icon = c.icon;
              const active = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c); if (file && !c.fromExts.includes(extOf(file.name))) setFile(null); inputRef.current?.click(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "14px", borderRadius: 14, textAlign: "left",
                    border: `2px solid ${active ? ACCENT : "#eef2f7"}`, background: "#fff", cursor: "pointer",
                  }}
                >
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: c.tint + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 18, height: 18, color: c.tint }} />
                  </span>
                  <span style={{ fontWeight: 700, color: "#0A0A0B", fontSize: 14 }}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
