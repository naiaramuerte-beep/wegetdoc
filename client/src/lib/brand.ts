interface BrandColors {
  primary: string;
  secondary: string;
  primaryHover: string;
  gradient: string;
  light: string;
  lightBg: string;
}

const COLORS_EDITORPDF: BrandColors = {
  primary: "#1565C0",
  secondary: "#1565C0",
  primaryHover: "#0D47A1",
  gradient: "linear-gradient(135deg, #1565C0, #1976D2)",
  light: "#42A5F5",
  lightBg: "rgba(21, 101, 192, 0.06)",
};

const BRANDS: Record<string, { name: string; domain: string; logoParts: [string, string]; brandKey: string; colors: BrandColors }> = {
  EditorPDF: { name: "EditorPDF", domain: "editorpdf.net", logoParts: ["Editor", "PDF"], brandKey: "EditorPDF", colors: COLORS_EDITORPDF },
};

const key = import.meta.env.VITE_BRAND_NAME || "EditorPDF";
const brand = BRANDS[key] ?? BRANDS.EditorPDF;

export const brandName = brand.name;
export const brandDomain = brand.domain;
export const logoParts = brand.logoParts;
export const brandKey = brand.brandKey;
export const colors = brand.colors;
export const isFastDoc = false;

// Set data-brand attribute on <html> so CSS can target it
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-brand", brand.brandKey);
}
