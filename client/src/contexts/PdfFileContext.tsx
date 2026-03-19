/* =============================================================
   PdfFileContext — shares the uploaded PDF file between pages
   Also persists PDF bytes in sessionStorage so the file survives
   an OAuth redirect (login flow) and is restored on return.
   ============================================================= */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
const SESSION_KEY_PDF = "pdfpro_pending_pdf_b64";
const SESSION_KEY_NAME = "pdfpro_pending_pdf_name";
const SESSION_KEY_TOOL = "pdfpro_pending_tool";
const SESSION_KEY_PAYWALL = "pdfpro_open_paywall";
// Keys for the EDITED PDF (with annotations) — persisted before login redirect
const SESSION_KEY_EDITED_PDF = "pdfpro_edited_pdf_b64";
const SESSION_KEY_EDITED_NAME = "pdfpro_edited_pdf_name";
const SESSION_KEY_EDITED_SIZE = "pdfpro_edited_pdf_size";

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
  /** Save the EDITED PDF (with annotations) to sessionStorage before login redirect */
  saveEditedPdfToSession: (base64: string, name: string, size: number) => void;
  /** The restored edited PDF data (after login redirect) — cleared after reading */
  pendingEditedPdf: { base64: string; name: string; size: number } | null;
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
  saveEditedPdfToSession: () => {},
  pendingEditedPdf: null,
  clearPendingEditedPdf: () => {},
});

export function PdfFileProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFileState] = useState<File | null>(null);
  const [pendingTool, setPendingToolState] = useState<string | null>(null);
  const [pendingPaywall, setPendingPaywallState] = useState(false);
  const [pendingEditedPdf, setPendingEditedPdf] = useState<{ base64: string; name: string; size: number } | null>(null);

  // isRestoringFromSession: true while we're restoring from sessionStorage
  // Starts as true if there's a saved PDF in sessionStorage, false otherwise
  const [isRestoringFromSession, setIsRestoringFromSession] = useState(() => {
    // Check synchronously if there's a saved PDF in sessionStorage
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

    // Restore edited PDF (with annotations) for paywall upload
    const editedB64 = sessionStorage.getItem(SESSION_KEY_EDITED_PDF);
    const editedName = sessionStorage.getItem(SESSION_KEY_EDITED_NAME);
    const editedSizeStr = sessionStorage.getItem(SESSION_KEY_EDITED_SIZE);
    if (editedB64 && editedName) {
      setPendingEditedPdf({
        base64: editedB64,
        name: editedName,
        size: editedSizeStr ? parseInt(editedSizeStr, 10) : 0,
      });
      sessionStorage.removeItem(SESSION_KEY_EDITED_PDF);
      sessionStorage.removeItem(SESSION_KEY_EDITED_NAME);
      sessionStorage.removeItem(SESSION_KEY_EDITED_SIZE);
    }

    if (tool) {
      setPendingToolState(tool);
      sessionStorage.removeItem(SESSION_KEY_TOOL);
    }
    if (paywall === "1") {
      setPendingPaywallState(true);
      sessionStorage.removeItem(SESSION_KEY_PAYWALL);
    }
    // Done restoring — allow EditorPage to redirect if still no file
    setIsRestoringFromSession(false);
  }, []);

  const setPendingFile = (f: File | null) => setPendingFileState(f);
  const setPendingTool = (t: string | null) => setPendingToolState(t);
  const setPendingPaywall = (open: boolean) => {
    setPendingPaywallState(open);
    if (open) sessionStorage.setItem(SESSION_KEY_PAYWALL, "1");
    else sessionStorage.removeItem(SESSION_KEY_PAYWALL);
  };

  const saveEditedPdfToSession = (base64: string, name: string, size: number) => {
    try {
      sessionStorage.setItem(SESSION_KEY_EDITED_PDF, base64);
      sessionStorage.setItem(SESSION_KEY_EDITED_NAME, name);
      sessionStorage.setItem(SESSION_KEY_EDITED_SIZE, String(size));
    } catch {
      // Storage quota exceeded - silently ignore
    }
  };

  const clearPendingEditedPdf = () => {
    setPendingEditedPdf(null);
    sessionStorage.removeItem(SESSION_KEY_EDITED_PDF);
    sessionStorage.removeItem(SESSION_KEY_EDITED_NAME);
    sessionStorage.removeItem(SESSION_KEY_EDITED_SIZE);
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
            // Storage quota exceeded - silently ignore, user will need to re-upload
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
