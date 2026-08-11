import { describe, it, expect } from "vitest";
import { buildTermsBlock, WELCOME_LANGS } from "../email";

// El bloque de condiciones del email post-pago dice CUÁNDO vamos a cobrar y
// CÓMO evitarlo. Un placeholder sin rellenar, un enlace roto o un idioma que se
// quedó en "7 días" no se ven salvo que alguien reciba ese correo concreto —
// así que se comprueban los 12 aquí.
const VARS = {
  date: "13 de agosto de 2026, 17:47",
  price: "29,95€",
  intro: "0,50€",
  cancelUrl: "https://editorpdf.net/es/dashboard?tab=billing",
  termsUrl: "https://editorpdf.net/es/terms",
};

describe("buildTermsBlock — condiciones del email post-pago", () => {
  it("cubre los 12 idiomas", () => {
    expect(WELCOME_LANGS.sort()).toEqual(
      ["de", "en", "es", "fr", "it", "nl", "pl", "pt", "ro", "ru", "uk", "zh"]);
  });

  for (const lang of ["es", "en", "fr", "de", "pt", "it", "nl", "pl", "ru", "uk", "ro", "zh"]) {
    describe(lang, () => {
      const b = buildTermsBlock(lang, VARS);
      const texto = b.lines.join(" ");

      it("no deja ningún placeholder sin rellenar", () => {
        expect(texto).not.toMatch(/\{(date|price|intro|cancel|terms)\}/);
        expect(b.title).not.toMatch(/\{/);
      });
      it("dice la fecha y la hora exactas del primer cobro", () => {
        expect(texto).toContain(VARS.date);
      });
      it("dice el importe del primer cobro y el del alta", () => {
        expect(texto).toContain(VARS.price);
        expect(texto).toContain(VARS.intro);
      });
      it("enlaza la cancelación y los términos, con texto de enlace visible", () => {
        expect(texto).toContain(`href="${VARS.cancelUrl}"`);
        expect(texto).toContain(`href="${VARS.termsUrl}"`);
        // el ancla no puede quedarse vacía: <a ...></a> sería un enlace invisible
        for (const m of texto.matchAll(/<a [^>]*>([^<]*)<\/a>/g)) {
          expect(m[1].trim().length).toBeGreaterThan(2);
        }
      });
      it("tiene título y cuatro condiciones", () => {
        expect(b.title.length).toBeGreaterThan(5);
        expect(b.lines).toHaveLength(4);
      });
      it("no ha quedado ninguna mención al plazo viejo de 7 días", () => {
        expect(texto).not.toMatch(/7\s*(días|dias|days|jours|Tage|giorni|dagen|dni|дней|днів|zile|天)/i);
        expect(texto).not.toMatch(/7-(day|Tage|dnio|денн)/i);
      });
    });
  }

  it("cae al español ante un idioma desconocido, sin romperse", () => {
    const b = buildTermsBlock("xx", VARS);
    expect(b.lines).toHaveLength(4);
    expect(b.title).toBe(buildTermsBlock("es", VARS).title);
  });
});
