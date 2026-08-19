/**
 * Filtro del ruido de terceros en Sentry.
 *
 * Caso real (19-ago-2026, issue `38a57ab4`): `RangeError: Maximum call stack
 * size exceeded` en `/es/dashboard?tab=billing` desde Chrome iOS, con todos los
 * marcos apuntando al documento y ninguno a `/assets/`. Es un script inyectado
 * en la página (Hotjar recorre el DOM recursivamente), no código nuestro.
 *
 * Lo que estos tests protegen: que el filtro sea ESTRECHO. Si algún día nos
 * desbordamos la pila de verdad, tiene que seguir llegando.
 */
import { describe, it, expect } from "vitest";
import { esDesbordamientoDeTerceros } from "./sentry";

const evento = (valor: string, ficheros: string[]) => ({
  exception: { values: [{ value: valor, stacktrace: { frames: ficheros.map((f) => ({ filename: f })) } }] },
});

describe("esDesbordamientoDeTerceros", () => {
  it("REGRESIÓN: descarta el desbordamiento sin un solo marco propio", () => {
    expect(esDesbordamientoDeTerceros(evento(
      "Maximum call stack size exceeded.",
      ["https://www.editorpdf.net/es/dashboard", "https://www.editorpdf.net/es/dashboard"],
    ))).toBe(true);
  });

  it("NO descarta si algún marco es nuestro: ése sí es un fallo que arreglar", () => {
    expect(esDesbordamientoDeTerceros(evento(
      "Maximum call stack size exceeded.",
      ["https://www.editorpdf.net/es/dashboard", "https://www.editorpdf.net/assets/Dashboard-a1b2.js"],
    ))).toBe(false);
  });

  it("solo aplica a desbordamientos, no a cualquier error de terceros", () => {
    expect(esDesbordamientoDeTerceros(evento(
      "TypeError: undefined is not an object",
      ["https://www.editorpdf.net/es/dashboard"],
    ))).toBe(false);
  });

  it("reconoce también la forma de Firefox", () => {
    expect(esDesbordamientoDeTerceros(evento("too much recursion", ["https://www.editorpdf.net/es/"]))).toBe(true);
  });

  it("sin pila no afirma nada: se reporta", () => {
    expect(esDesbordamientoDeTerceros({ exception: { values: [{ value: "Maximum call stack size exceeded." }] } })).toBe(false);
    expect(esDesbordamientoDeTerceros({})).toBe(false);
  });

  it("una extensión del navegador también cuenta como ajeno", () => {
    expect(esDesbordamientoDeTerceros(evento(
      "Maximum call stack size exceeded.",
      ["chrome-extension://abcdef/content.js"],
    ))).toBe(true);
  });
});
