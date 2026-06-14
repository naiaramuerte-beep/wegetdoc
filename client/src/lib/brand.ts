interface BrandColors {
  primary: string;
  secondary: string;
  primaryHover: string;
  gradient: string;
  light: string;
  lightBg: string;
}

const COLORS_EDITORPDF: BrandColors = {
  primary: "#E63946",
  secondary: "#0A0A0B",
  primaryHover: "#C82F3B",
  gradient: "linear-gradient(135deg, #E63946, #C82F3B)",
  light: "#FF6B7A",
  lightBg: "rgba(230, 57, 70, 0.06)",
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
