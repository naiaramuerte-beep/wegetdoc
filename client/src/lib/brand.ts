interface BrandColors {
  primary: string;
  secondary: string;
  primaryHover: string;
  gradient: string;
  light: string;
  lightBg: string;
}

const COLORS_WEGETDOC: BrandColors = {
  primary: "#1B5E20",
  secondary: "#1B5E20",
  primaryHover: "#14532d",
  gradient: "linear-gradient(135deg, #1B5E20, #166534)",
  light: "#22c55e",
  lightBg: "rgba(27, 94, 32, 0.06)",
};

const BRANDS: Record<string, { name: string; domain: string; logoParts: [string, string]; brandKey: string; colors: BrandColors }> = {
  WeGetDoc: { name: "WeGetDoc", domain: "editorpdf.net", logoParts: ["WeGet", "Doc"], brandKey: "WeGetDoc", colors: COLORS_WEGETDOC },
};

const key = import.meta.env.VITE_BRAND_NAME || "WeGetDoc";
const brand = BRANDS[key] ?? BRANDS.WeGetDoc;

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
