import { describe, it, expect } from "vitest";
import { etiquetaReintento } from "./saleRetryLabel";

describe("etiquetaReintento", () => {
  it("marca el cobro recurrente limpio", () => {
    expect(etiquetaReintento({ provider: "mit", fallosPrevios: 0 })).toBe("✅ a la primera");
  });

  it("dice en qué reintento entró", () => {
    expect(etiquetaReintento({ provider: "mit", fallosPrevios: 1 })).toBe("🔁 rescatado en el 1.er reintento");
    expect(etiquetaReintento({ provider: "mit", fallosPrevios: 2 })).toBe("🔁 rescatado en el 2.º reintento");
    expect(etiquetaReintento({ provider: "mit", fallosPrevios: 3 })).toBe("🔁 rescatado en el 3.º reintento");
  });

  it("no etiqueta las altas ni los wallets: ahí no hay reintento que contar", () => {
    for (const p of ["fastpay", "gpay", "apay"]) {
      expect(etiquetaReintento({ provider: p, fallosPrevios: 0 })).toBe("");
      expect(etiquetaReintento({ provider: p, fallosPrevios: 5 })).toBe("");
    }
  });

  it("aguanta datos raros sin romper el aviso", () => {
    expect(etiquetaReintento({ provider: "mit", fallosPrevios: -3 })).toBe("✅ a la primera");
    expect(etiquetaReintento({ provider: "mit", fallosPrevios: NaN })).toBe("✅ a la primera");
    expect(etiquetaReintento({ provider: "mit", fallosPrevios: 2.7 })).toBe("🔁 rescatado en el 2.º reintento");
  });
});
