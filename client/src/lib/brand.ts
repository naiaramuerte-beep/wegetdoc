const BRANDS: Record<string, { name: string; domain: string }> = {
  FastDoc: { name: "FastDoc", domain: "fastdoc.app" },
  CloudPDF: { name: "CloudPDF", domain: "cloud-pdf.net" },
};

const key = import.meta.env.VITE_BRAND_NAME || "CloudPDF";
const brand = BRANDS[key] ?? BRANDS.CloudPDF;

export const brandName = brand.name;
export const brandDomain = brand.domain;
