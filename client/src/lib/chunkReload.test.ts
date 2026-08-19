/**
 * Recuperación de chunks viejos tras un despliegue.
 *
 * El caso real (19-ago-2026, Sentry `a247de20`): un iPhone con iOS 16.7 entra en
 * `/de/editor` con un chunk que ya no existe. Safari NO dice "Failed to fetch
 * dynamically imported module" como Chrome; dice un escueto `TypeError: Load
 * failed`. El filtro por mensaje no lo reconocía, no se recargaba, y el usuario
 * se quedaba con el editor roto.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { isChunkErrorMessage, lazySafe } from "./chunkReload";

const recargar = vi.fn();
beforeEach(() => {
  recargar.mockClear();
  const almacen = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => { almacen.set(k, v); },
  });
  vi.stubGlobal("window", { location: { reload: recargar } });
});

describe("isChunkErrorMessage", () => {
  it("reconoce los mensajes de Chrome y Firefox", () => {
    for (const m of [
      "Failed to fetch dynamically imported module: https://x/assets/a.js",
      "Importing a module script failed",
      "error loading dynamically imported module",
      "Loading chunk 42 failed",
      "Loading CSS chunk 7 failed",
    ]) expect(isChunkErrorMessage(m)).toBe(true);
  });

  it("NO trata 'Load failed' como error de chunk por el mensaje", () => {
    // A propósito: en Safari CUALQUIER fetch fallido dice eso. Meterlo en la
    // lista recargaría la página al perder cobertura a mitad de una subida.
    expect(isChunkErrorMessage("TypeError: Load failed")).toBe(false);
    expect(isChunkErrorMessage("Load failed")).toBe(false);
  });

  it("ignora vacíos y errores normales", () => {
    expect(isChunkErrorMessage("")).toBe(false);
    expect(isChunkErrorMessage(null)).toBe(false);
    expect(isChunkErrorMessage("Cannot read properties of undefined")).toBe(false);
  });
});

describe("lazySafe", () => {
  it("no toca nada cuando el chunk carga bien", async () => {
    const mod = { default: "página" };
    const out = await lazySafe(async () => mod)();
    expect(out).toBe(mod);
    expect(recargar).not.toHaveBeenCalled();
  });

  it("REGRESIÓN: recarga con el 'Load failed' de Safari, que no lleva mensaje reconocible", async () => {
    const fallo = lazySafe(async () => { throw new TypeError("Load failed"); });
    await expect(fallo()).rejects.toThrow("Load failed");
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it("recarga ante cualquier fallo de carga del chunk, diga lo que diga", async () => {
    const fallo = lazySafe(async () => { throw new Error("cualquier cosa"); });
    await expect(fallo()).rejects.toThrow();
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it("relanza el error para que React no se quede colgado", async () => {
    const err = new Error("boom");
    await expect(lazySafe(async () => { throw err; })()).rejects.toBe(err);
  });

  it("no entra en bucle: una sola recarga en 30 s", async () => {
    const fallo = lazySafe(async () => { throw new TypeError("Load failed"); });
    await expect(fallo()).rejects.toThrow();
    await expect(fallo()).rejects.toThrow();
    await expect(fallo()).rejects.toThrow();
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
