const BRANDS: Record<string, { name: string; domain: string }> = {
  EditorPDF: { name: "EditorPDF", domain: "editorpdf.net" },
};

const key = process.env.BRAND_NAME || "EditorPDF";
const brand = BRANDS[key] ?? BRANDS.EditorPDF;

export const brandName = brand.name;
export const brandDomain = brand.domain;
