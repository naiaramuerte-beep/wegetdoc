/* =============================================================
   PdfFileContext — shares the uploaded PDF file between pages

   KEY DESIGN: Uses a module-level singleton store in addition to
   React state. This guarantees the file is readable synchronously
   when EditorPage mounts, even before React re-renders the context.

   Mobile race condition fix: setPendingFile() writes to BOTH the
   module-level store AND React state. EditorPage reads from the
   module store first, so it never sees a stale null on first render.
   ============================================================= */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const SESSION_KEY_PDF = "pdfpro_pending_pdf_b64";
const SESSION_KEY_NAME = "pdfpro_pending_pdf_name";
const SESSION_KEY_TOOL = "pdfpro_pending_tool";
const SESSION_KEY_PAYWALL = "pdfpro_open_paywall";

// ─── Module-level singleton store (synchronous, survives re-renders) ──────────
const _store = {
  file: null as File | null,
  tool: null as string | null,
  paywall: false,
};

/** Read the pending file synchronously — safe to call during render */
export function getPendingFileSync(): File | null { return _store.file; }
/** Read the pending tool synchronously — safe to call during render */
export function getPendingToolSync(): string | null { return _store.tool; }
/** Read the pending paywall flag synchronously */
export function getPendingPaywallSync(): boolean { return _store.paywall; }

// ─── Context (for reactive updates in components that need them) ───────────────
interface PdfFileContextValue {
  pendingFile: File | null;
  setPendingFile: (f: File | null) => void;
  pendingTool: string | null;
  setPendingTool: (t: string | null) => void;
  setPendingPaywall: (open: boolean) => void;
  pendingPaywall: boolean;
  savePdfToSession: (file: File) => Promise<void>;
}

const PdfFileContext = createContext<PdfFileContextValue>({
  pendingFile: null,
  setPendingFile: () => {},
  pendingTool: null,
  setPendingTool: () => {},
  setPendingPaywall: () => {},
  pendingPaywall: false,
  savePdfToSession: async () => {},
});

export function PdfFileProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFileState] = useState<File | null>(null);
  const [pendingTool, setPendingToolState] = useState<string | null>(null);
  const [pendingPaywall, setPendingPaywallState] = useState(false);

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
        _store.file = file;
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
      _store.tool = tool;
      setPendingToolState(tool);
      sessionStorage.removeItem(SESSION_KEY_TOOL);
    }

    if (paywall === "1") {
      _store.paywall = true;
      setPendingPaywallState(true);
      sessionStorage.removeItem(SESSION_KEY_PAYWALL);
    }
  }, []);

  const setPendingFile = (f: File | null) => {
    _store.file = f;           // synchronous — available immediately
    setPendingFileState(f);    // reactive — triggers re-renders
  };

  const setPendingTool = (t: string | null) => {
    _store.tool = t;
    setPendingToolState(t);
  };

  const setPendingPaywall = (open: boolean) => {
    _store.paywall = open;
    setPendingPaywallState(open);
    if (open) sessionStorage.setItem(SESSION_KEY_PAYWALL, "1");
    else sessionStorage.removeItem(SESSION_KEY_PAYWALL);
  };

  const savePdfToSession = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (file.size > 4 * 1024 * 1024) { resolve(); return; }
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
    }}>
      {children}
    </PdfFileContext.Provider>
  );
}

export function usePdfFile() {
  return useContext(PdfFileContext);
}
