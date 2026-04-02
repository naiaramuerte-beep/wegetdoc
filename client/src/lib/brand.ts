const BRANDS: Record<string, { name: string; domain: string; logoParts: [string, string] }> = {
  FastDoc: { name: "FastDoc", domain: "fastdoc.app", logoParts: ["Fast", "Doc"] },
  CloudPDF: { name: "CloudPDF", domain: "cloud-pdf.net", logoParts: ["Cloud", "PDF"] },
};

const key = import.meta.env.VITE_BRAND_NAME || "CloudPDF";
const brand = BRANDS[key] ?? BRANDS.CloudPDF;

export const brandName = brand.name;
export const brandDomain = brand.domain;
export const logoParts = brand.logoParts;
