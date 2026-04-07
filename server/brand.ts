const BRANDS: Record<string, { name: string; domain: string }> = {
  WeGetDoc: { name: "WeGetDoc", domain: "wegetdoc.com" },
};

const key = process.env.BRAND_NAME || "WeGetDoc";
const brand = BRANDS[key] ?? BRANDS.WeGetDoc;

export const brandName = brand.name;
export const brandDomain = brand.domain;
