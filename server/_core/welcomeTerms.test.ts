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

      const todo = [b.title, b.chargeLabel, b.chargeAmount, b.chargeWhen, b.chargeAfter, texto].join(" ");

      it("no deja ningún placeholder sin rellenar", () => {
        expect(todo).not.toMatch(/\{(date|price|intro|cancel|terms)\}/);
      });
      it("saca el importe del primer cobro a su propio campo, no a una viñeta", () => {
        // El recuadro destacado del email se pinta con estos tres campos: si
        // alguno llega vacío, el cliente ve el correo sin la cifra que va a
        // pagar — que es justo lo que el bloque existe para evitar.
        expect(b.chargeAmount).toBe(VARS.price);
        expect(b.chargeWhen).toBe(VARS.date);
        expect(b.chargeLabel.trim().length).toBeGreaterThan(3);
      });
      it("dice qué pasa después del primer cobro, con el importe mensual", () => {
        expect(b.chargeAfter).toContain(VARS.price);
        expect(b.chargeAfter.length).toBeGreaterThan(10);
      });
      it("dice el importe ya pagado por la prueba", () => {
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
      it("tiene título y tres condiciones bajo el recuadro", () => {
        expect(b.title.length).toBeGreaterThan(5);
        expect(b.lines).toHaveLength(3);
      });
      it("no ha quedado ninguna mención al plazo viejo de 7 días", () => {
        expect(todo).not.toMatch(/7\s*(días|dias|days|jours|Tage|giorni|dagen|dni|дней|днів|zile|天)/i);
        expect(todo).not.toMatch(/7-(day|Tage|dnio|денн)/i);
      });
    });
  }

  it("cae al español ante un idioma desconocido, sin romperse", () => {
    const b = buildTermsBlock("xx", VARS);
    expect(b.lines).toHaveLength(3);
    expect(b.title).toBe(buildTermsBlock("es", VARS).title);
  });
});
