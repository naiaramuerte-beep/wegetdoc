/* =============================================================
   EditorPDF UploadZone — Drag & Drop PDF upload area
   Verdant Gold design: dashed green border, hover glow effect
   Fully i18n-ready via useLanguage()
   ============================================================= */

import { useState, useRef, useCallback } from "react";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface UploadZoneProps {
  onFileSelect?: (file: File) => void;
  compact?: boolean;
}

/* ── Translations for UploadZone ───────────────────────────── */
const uploadZoneI18n: Record<string, {
  drag: string;
  drop: string;
  or: string;
  btn: string;
  maxSize: string;
  successMsg: (name: string) => string;
  errorMsg: string;
}> = {
  es: {
    drag: "Arrastra tu archivo PDF",
    drop: "Suelta tu archivo PDF aquí",
    or: "o",
    btn: "Subir PDF para convertir",
    maxSize: "Hasta 100 MB",
    successMsg: (name) => `Archivo "${name}" cargado correctamente`,
    errorMsg: "Por favor, sube un archivo PDF válido",
  },
  en: {
    drag: "Drag your PDF file here",
    drop: "Drop your PDF file here",
    or: "or",
    btn: "Upload PDF to convert",
    maxSize: "Up to 100 MB",
    successMsg: (name) => `File "${name}" uploaded successfully`,
    errorMsg: "Please upload a valid PDF file",
  },
  fr: {
    drag: "Glissez votre fichier PDF ici",
    drop: "Déposez votre fichier PDF ici",
    or: "ou",
    btn: "Télécharger le PDF à convertir",
    maxSize: "Jusqu'à 100 Mo",
    successMsg: (name) => `Fichier "${name}" chargé avec succès`,
    errorMsg: "Veuillez télécharger un fichier PDF valide",
  },
  de: {
    drag: "PDF-Datei hierher ziehen",
    drop: "PDF-Datei hier ablegen",
    or: "oder",
    btn: "PDF zum Konvertieren hochladen",
    maxSize: "Bis zu 100 MB",
    successMsg: (name) => `Datei "${name}" erfolgreich hochgeladen`,
    errorMsg: "Bitte laden Sie eine gültige PDF-Datei hoch",
  },
  pt: {
    drag: "Arraste seu arquivo PDF aqui",
    drop: "Solte seu arquivo PDF aqui",
    or: "ou",
    btn: "Enviar PDF para converter",
    maxSize: "Até 100 MB",
    successMsg: (name) => `Arquivo "${name}" carregado com sucesso`,
    errorMsg: "Por favor, envie um arquivo PDF válido",
  },
  it: {
    drag: "Trascina il tuo file PDF qui",
    drop: "Rilascia il tuo file PDF qui",
    or: "o",
    btn: "Carica PDF da convertire",
    maxSize: "Fino a 100 MB",
    successMsg: (name) => `File "${name}" caricato con successo`,
    errorMsg: "Per favore, carica un file PDF valido",
  },
  nl: {
    drag: "Sleep je PDF-bestand hierheen",
    drop: "Laat je PDF-bestand hier los",
    or: "of",
    btn: "Upload PDF om te converteren",
    maxSize: "Tot 100 MB",
    successMsg: (name) => `Bestand "${name}" succesvol geüpload`,
    errorMsg: "Upload een geldig PDF-bestand",
  },
  pl: {
    drag: "Przeciągnij plik PDF tutaj",
    drop: "Upuść plik PDF tutaj",
    or: "lub",
    btn: "Prześlij PDF do konwersji",
    maxSize: "Do 100 MB",
    successMsg: (name) => `Plik "${name}" przesłany pomyślnie`,
    errorMsg: "Prześlij prawidłowy plik PDF",
  },
  ru: {
    drag: "Перетащите PDF-файл сюда",
    drop: "Отпустите PDF-файл здесь",
    or: "или",
    btn: "Загрузить PDF для конвертации",
    maxSize: "До 100 МБ",
    successMsg: (name) => `Файл "${name}" успешно загружен`,
    errorMsg: "Пожалуйста, загрузите действительный PDF-файл",
  },
  zh: {
    drag: "将PDF文件拖到此处",
    drop: "将PDF文件放在此处",
    or: "或",
    btn: "上传PDF进行转换",
    maxSize: "最大100 MB",
    successMsg: (name) => `文件"${name}"上传成功`,
    errorMsg: "请上传有效的PDF文件",
  },
};

export default function UploadZone({ onFileSelect, compact = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang } = useLanguage();
  const txt = uploadZoneI18n[lang] || uploadZoneI18n.en;

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
        toast.success(txt.successMsg(pdfFile.name));
        onFileSelect?.(pdfFile);
      } else if (files.length > 0) {
        toast.error(txt.errorMsg);
      }
    },
    [onFileSelect, txt]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.type === "application/pdf") {
          toast.success(txt.successMsg(file.name));
          onFileSelect?.(file);
        } else {
          toast.error(txt.errorMsg);
        }
      }
    },
    [onFileSelect, txt]
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
        border: `2px dashed ${isDragging ? "#1565C0" : "rgba(27, 94, 32, 0.4)"}`,
        backgroundColor: isDragging
          ? "rgba(27, 94, 32, 0.06)"
          : "#FFFFFF",
        boxShadow: isDragging
          ? "0 0 0 4px rgba(27, 94, 32, 0.08)"
          : "none",
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "rgba(27, 94, 32, 0.7)";
          e.currentTarget.style.backgroundColor = "rgba(27, 94, 32, 0.03)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "rgba(27, 94, 32, 0.4)";
          e.currentTarget.style.backgroundColor = "#FFFFFF";
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
            style={{ backgroundColor: "rgba(27, 94, 32, 0.1)" }}
          >
            <FileText
              style={{
                width: compact ? "1.5rem" : "2.25rem",
                height: compact ? "1.5rem" : "2.25rem",
                color: "#1565C0",
              }}
            />
          </div>
        </div>

        {/* Text */}
        <div>
          <p
            className={`font-semibold ${compact ? "text-base" : "text-xl"}`}
            style={{
              color: "#1565C0",
            }}
          >
            {isDragging ? txt.drop : txt.drag}
          </p>
          <p
            className={`mt-1 ${compact ? "text-xs" : "text-sm"}`}
            style={{ color: "#64748b" }}
          >
            {txt.or}
          </p>
        </div>

        {/* Upload Button */}
        <button
          className={`font-semibold rounded-lg text-white transition-all duration-200 ${
            compact ? "px-4 py-2 text-sm" : "px-6 py-3 text-sm"
          }`}
          style={{
            backgroundColor: "#0D47A1",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#1565C0")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#0D47A1")
          }
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {txt.btn}
          </span>
        </button>

        {!compact && (
          <p
            className="text-xs"
            style={{ color: "#6B8E6B" }}
          >
            {txt.maxSize}
          </p>
        )}
      </div>
    </div>
  );
}
