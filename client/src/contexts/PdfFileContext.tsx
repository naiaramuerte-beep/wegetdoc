/* =============================================================
   PdfFileContext — shares the uploaded PDF file between pages
   Also persists PDF bytes in sessionStorage so the file survives
   an OAuth redirect (login flow) and is restored on return.

   For the EDITED PDF (with annotations), we upload to S3 as a
   temp file BEFORE the OAuth redirect, then store only the small
   tempKey string in sessionStorage (avoids 5MB quota issues).
   ============================================================= */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
const SESSION_KEY_PDF = "pdfpro_pending_pdf_b64";
const SESSION_KEY_NAME = "pdfpro_pending_pdf_name";
const SESSION_KEY_TOOL = "pdfpro_pending_tool";
const SESSION_KEY_PAYWALL = "pdfpro_open_paywall";
// Keys for the EDITED PDF temp reference (S3 key, not base64)
const SESSION_KEY_TEMP_KEY = "pdfpro_edited_temp_key";
const SESSION_KEY_TEMP_NAME = "pdfpro_edited_temp_name";

interface PdfFileContextValue {
  pendingFile: File | null;
  setPendingFile: (f: File | null) => void;
  pendingTool: string | null;
  setPendingTool: (t: string | null) => void;
  /** Set to true before redirecting to OAuth so paywall opens on return */
  setPendingPaywall: (open: boolean) => void;
  pendingPaywall: boolean;
  /** Save PDF bytes to sessionStorage before OAuth redirect */
  savePdfToSession: (file: File) => Promise<void>;
  /** True while restoring PDF from sessionStorage (after OAuth redirect) */
  isRestoringFromSession: boolean;
  /** Upload the EDITED PDF to S3 as a temp file before login redirect.
   *  Stores only the small tempKey in sessionStorage (no quota issues). */
  saveEditedPdfToSession: (base64: string, name: string, size: number) => Promise<void>;
  /** The restored edited PDF data (after login redirect) — cleared after reading.
   *  Contains the tempKey for claiming the PDF from S3 after payment. */
  pendingEditedPdf: { tempKey: string; name: string } | null;
  clearPendingEditedPdf: () => void;
}

const PdfFileContext = createContext<PdfFileContextValue>({
  pendingFile: null,
  setPendingFile: () => {},
  pendingTool: null,
  setPendingTool: () => {},
  setPendingPaywall: () => {},
  pendingPaywall: false,
  savePdfToSession: async () => {},
  isRestoringFromSession: false,
  saveEditedPdfToSession: async () => {},
  pendingEditedPdf: null,
  clearPendingEditedPdf: () => {},
});

export function PdfFileProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFileState] = useState<File | null>(null);
  const [pendingTool, setPendingToolState] = useState<string | null>(null);
  const [pendingPaywall, setPendingPaywallState] = useState(false);
  const [pendingEditedPdf, setPendingEditedPdf] = useState<{ tempKey: string; name: string } | null>(null);

  // isRestoringFromSession: true while we're restoring from sessionStorage
  const [isRestoringFromSession, setIsRestoringFromSession] = useState(() => {
    try {
      return !!sessionStorage.getItem(SESSION_KEY_PDF);
    } catch {
      return false;
    }
  });

  // On mount, try to restore PDF from sessionStorage (after OAuth redirect)
  useEffect(() => {
    const b64 = sessionStorage.getItem(SESSION_KEY_PDF);
    const name = sessionStorage.getItem(SESSION_KEY_NAME);
    const tool = sessionStorage.getItem(SESSION_KEY_TOOL);
    const paywall = sessionStorage.getItem(SESSION_KEY_PAYWALL);

    // Restore original PDF file
    if (b64 && name) {
      try {
        const byteChars = atob(b64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: "application/pdf" });
        const file = new File([blob], name, { type: "application/pdf" });
        setPendingFileState(file);
        sessionStorage.removeItem(SESSION_KEY_PDF);
        sessionStorage.removeItem(SESSION_KEY_NAME);
      } catch (e) {
        console.error("Failed to restore PDF from session:", e);
        sessionStorage.removeItem(SESSION_KEY_PDF);
        sessionStorage.removeItem(SESSION_KEY_NAME);
      }
    }

    // Restore edited PDF temp key (S3 reference, not base64)
    const tempKey = sessionStorage.getItem(SESSION_KEY_TEMP_KEY);
    const tempName = sessionStorage.getItem(SESSION_KEY_TEMP_NAME);
    if (tempKey && tempName) {
      setPendingEditedPdf({ tempKey, name: tempName });
      sessionStorage.removeItem(SESSION_KEY_TEMP_KEY);
      sessionStorage.removeItem(SESSION_KEY_TEMP_NAME);
    }

    if (tool) {
      setPendingToolState(tool);
      sessionStorage.removeItem(SESSION_KEY_TOOL);
    }
    if (paywall === "1") {
      setPendingPaywallState(true);
      sessionStorage.removeItem(SESSION_KEY_PAYWALL);
    }
    setIsRestoringFromSession(false);
  }, []);

  const setPendingFile = (f: File | null) => setPendingFileState(f);
  const setPendingTool = (t: string | null) => setPendingToolState(t);
  const setPendingPaywall = (open: boolean) => {
    setPendingPaywallState(open);
    if (open) sessionStorage.setItem(SESSION_KEY_PAYWALL, "1");
    else sessionStorage.removeItem(SESSION_KEY_PAYWALL);
  };

  /** Upload edited PDF to S3 as temp file, then store only the small key in sessionStorage */
  const saveEditedPdfToSession = async (base64: string, name: string, _size: number): Promise<void> => {
    try {
      // Convert base64 to binary and upload to server temp endpoint
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, name);
      formData.append("name", name);
      const resp = await fetch("/api/documents/temp-upload", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error(`Temp upload failed: ${resp.status}`);
      const { tempKey } = await resp.json() as { tempKey: string };
      // Store only the small key string (not the full base64)
      sessionStorage.setItem(SESSION_KEY_TEMP_KEY, tempKey);
      sessionStorage.setItem(SESSION_KEY_TEMP_NAME, name);
    } catch (err) {
      console.error("[PdfFileContext] saveEditedPdfToSession failed:", err);
      // Fallback: try storing base64 in sessionStorage (may fail for large files)
      try {
        sessionStorage.setItem(SESSION_KEY_TEMP_KEY, `base64:${base64}`);
        sessionStorage.setItem(SESSION_KEY_TEMP_NAME, name);
      } catch {
        // Storage quota exceeded — PDF will need to be re-uploaded
      }
    }
  };

  const clearPendingEditedPdf = () => {
    setPendingEditedPdf(null);
    sessionStorage.removeItem(SESSION_KEY_TEMP_KEY);
    sessionStorage.removeItem(SESSION_KEY_TEMP_NAME);
  };

  const savePdfToSession = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (file.size > 20 * 1024 * 1024) { resolve(); return; } // >20MB: skip
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const b64 = (reader.result as string).split(",")[1];
          try {
            sessionStorage.setItem(SESSION_KEY_PDF, b64);
            sessionStorage.setItem(SESSION_KEY_NAME, file.name);
          } catch {
            // Storage quota exceeded - silently ignore
          }
          resolve();
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <PdfFileContext.Provider value={{
      pendingFile,
      setPendingFile,
      pendingTool,
      setPendingTool,
      pendingPaywall,
      setPendingPaywall,
      savePdfToSession,
      isRestoringFromSession,
      saveEditedPdfToSession,
      pendingEditedPdf,
      clearPendingEditedPdf,
    }}>
      {children}
    </PdfFileContext.Provider>
  );
}

export function usePdfFile() {
  return useContext(PdfFileContext);
}
