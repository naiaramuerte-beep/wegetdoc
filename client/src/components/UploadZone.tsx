/* =============================================================
   PDFUp UploadZone — Drag & Drop PDF upload area
   Deep Navy Pro design: dashed blue border, hover glow effect
   ============================================================= */

import { useState, useRef, useCallback } from "react";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface UploadZoneProps {
  onFileSelect?: (file: File) => void;
  compact?: boolean;
}

export default function UploadZone({ onFileSelect, compact = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const pdfFile = files.find((f) => f.type === "application/pdf");

      if (pdfFile) {
        toast.success(`Archivo "${pdfFile.name}" cargado correctamente`);
        onFileSelect?.(pdfFile);
      } else if (files.length > 0) {
        toast.error("Por favor, sube un archivo PDF válido");
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.type === "application/pdf") {
          toast.success(`Archivo "${file.name}" cargado correctamente`);
          onFileSelect?.(file);
        } else {
          toast.error("Por favor, sube un archivo PDF válido");
        }
      }
    },
    [onFileSelect]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`rounded-xl cursor-pointer transition-all duration-200 ${
        compact ? "p-6" : "p-10 md:p-16"
      }`}
      style={{
        border: `2px dashed ${isDragging ? "oklch(0.55 0.22 260)" : "oklch(0.55 0.22 260 / 0.4)"}`,
        backgroundColor: isDragging
          ? "oklch(0.55 0.22 260 / 0.06)"
          : "oklch(1 0 0)",
        boxShadow: isDragging
          ? "0 0 0 4px oklch(0.55 0.22 260 / 0.08)"
          : "none",
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "oklch(0.55 0.22 260 / 0.7)";
          e.currentTarget.style.backgroundColor = "oklch(0.55 0.22 260 / 0.03)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "oklch(0.55 0.22 260 / 0.4)";
          e.currentTarget.style.backgroundColor = "oklch(1 0 0)";
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        {/* PDF Icon */}
        <div
          className="relative"
          style={{
            width: compact ? "3rem" : "4.5rem",
            height: compact ? "3rem" : "4.5rem",
          }}
        >
          <div
            className="w-full h-full rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.1)" }}
          >
            <FileText
              style={{
                width: compact ? "1.5rem" : "2.25rem",
                height: compact ? "1.5rem" : "2.25rem",
                color: "oklch(0.55 0.22 260)",
              }}
            />
          </div>
        </div>

        {/* Text */}
        <div>
          <p
            className={`font-semibold ${compact ? "text-base" : "text-xl"}`}
            style={{
              color: isDragging ? "oklch(0.55 0.22 260)" : "oklch(0.55 0.22 260)",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {isDragging ? "Suelta tu archivo PDF aquí" : "Arrastra tu archivo PDF"}
          </p>
          <p
            className={`mt-1 ${compact ? "text-xs" : "text-sm"}`}
            style={{ color: "oklch(0.52 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            o
          </p>
        </div>

        {/* Upload Button */}
        <button
          className={`font-semibold rounded-lg text-white transition-all duration-200 ${
            compact ? "px-4 py-2 text-sm" : "px-6 py-3 text-sm"
          }`}
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
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Subir PDF para convertir
          </span>
        </button>

        {!compact && (
          <p
            className="text-xs"
            style={{ color: "oklch(0.60 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Hasta 100 MB
          </p>
        )}
      </div>
    </div>
  );
}
