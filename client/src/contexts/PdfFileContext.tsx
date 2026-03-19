/* =============================================================
   PdfFileContext — shares the uploaded PDF file between pages
   Also persists PDF bytes in sessionStorage so the file survives
   an OAuth redirect (login flow) and is restored on return.

   IMPORTANT: Uses a module-level ref (pendingFileRef) in addition
   to React state so that EditorPage can read the file synchronously
   on mount, avoiding a race condition on mobile where the context
   state update hasn't flushed yet when the new route renders.
   ============================================================= */
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

const SESSION_KEY_PDF = "pdfpro_pending_pdf_b64";
const SESSION_KEY_NAME = "pdfpro_pending_pdf_name";
const SESSION_KEY_TOOL = "pdfpro_pending_tool";
const SESSION_KEY_PAYWALL = "pdfpro_open_paywall";

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
  /** Synchronous ref — always reflects the latest pendingFile value */
  pendingFileRef: React.MutableRefObject<File | null>;
  pendingToolRef: React.MutableRefObject<string | null>;
}

const PdfFileContext = createContext<PdfFileContextValue>({
  pendingFile: null,
  setPendingFile: () => {},
  pendingTool: null,
  setPendingTool: () => {},
  setPendingPaywall: () => {},
  pendingPaywall: false,
  savePdfToSession: async () => {},
  pendingFileRef: { current: null },
  pendingToolRef: { current: null },
});

export function PdfFileProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFileState] = useState<File | null>(null);
  const [pendingTool, setPendingToolState] = useState<string | null>(null);
  const [pendingPaywall, setPendingPaywallState] = useState(false);

  // Refs for synchronous access (avoids race condition on mobile)
  const pendingFileRef = useRef<File | null>(null);
  const pendingToolRef = useRef<string | null>(null);

  // On mount, try to restore PDF from sessionStorage (after OAuth redirect)
  useEffect(() => {
    const b64 = sessionStorage.getItem(SESSION_KEY_PDF);
    const name = sessionStorage.getItem(SESSION_KEY_NAME);
    const tool = sessionStorage.getItem(SESSION_KEY_TOOL);
    const paywall = sessionStorage.getItem(SESSION_KEY_PAYWALL);

    if (b64 && name) {
      try {
        const byteChars = atob(b64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: "application/pdf" });
        const file = new File([blob], name, { type: "application/pdf" });
        pendingFileRef.current = file;
        setPendingFileState(file);
        sessionStorage.removeItem(SESSION_KEY_PDF);
        sessionStorage.removeItem(SESSION_KEY_NAME);
      } catch (e) {
        console.error("Failed to restore PDF from session:", e);
        sessionStorage.removeItem(SESSION_KEY_PDF);
        sessionStorage.removeItem(SESSION_KEY_NAME);
      }
    }

    if (tool) {
      pendingToolRef.current = tool;
      setPendingToolState(tool);
      sessionStorage.removeItem(SESSION_KEY_TOOL);
    }

    if (paywall === "1") {
      setPendingPaywallState(true);
      sessionStorage.removeItem(SESSION_KEY_PAYWALL);
    }
  }, []);

  const setPendingFile = (f: File | null) => {
    pendingFileRef.current = f;
    setPendingFileState(f);
  };

  const setPendingTool = (t: string | null) => {
    pendingToolRef.current = t;
    setPendingToolState(t);
  };

  const setPendingPaywall = (open: boolean) => {
    setPendingPaywallState(open);
    if (open) sessionStorage.setItem(SESSION_KEY_PAYWALL, "1");
    else sessionStorage.removeItem(SESSION_KEY_PAYWALL);
  };

  const savePdfToSession = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (file.size > 4 * 1024 * 1024) { resolve(); return; } // >4MB: skip
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const b64 = (reader.result as string).split(",")[1];
          sessionStorage.setItem(SESSION_KEY_PDF, b64);
          sessionStorage.setItem(SESSION_KEY_NAME, file.name);
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
      pendingFileRef,
      pendingToolRef,
    }}>
      {children}
    </PdfFileContext.Provider>
  );
}

export function usePdfFile() {
  return useContext(PdfFileContext);
}
