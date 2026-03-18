/* =============================================================
   PdfFileContext — shares the uploaded PDF file between pages
   ============================================================= */
import { createContext, useContext, useState, ReactNode } from "react";

interface PdfFileContextValue {
  pendingFile: File | null;
  setPendingFile: (f: File | null) => void;
  pendingTool: string | null;
  setPendingTool: (t: string | null) => void;
}

const PdfFileContext = createContext<PdfFileContextValue>({
  pendingFile: null,
  setPendingFile: () => {},
  pendingTool: null,
  setPendingTool: () => {},
});

export function PdfFileProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  return (
    <PdfFileContext.Provider value={{ pendingFile, setPendingFile, pendingTool, setPendingTool }}>
      {children}
    </PdfFileContext.Provider>
  );
}

export function usePdfFile() {
  return useContext(PdfFileContext);
}
