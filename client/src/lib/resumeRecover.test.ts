/**
 * Recuperación del PDF editado al volver del registro con Google (móvil).
 *
 * El caso real que motiva estos tests (17-ago-2026): el servidor registró
 * `[temp-io] DOWNLOAD status=200` y después NADA — ni pago abierto ni documento
 * guardado. Con un solo intento, un cuerpo cortado a mitad de descarga hacía
 * saltar la BARRIER #2 y el usuario acababa en la pantalla de subir el PDF otra
 * vez, sin rastro en el servidor de por qué.
 */
import { describe, it, expect, vi } from "vitest";
import { recoverEditedPdf } from "./resumeTicket";

const noSleep = async () => {};
const bytes = (n: number) => new Uint8Array(n).fill(7);
const okResp = (n: number) => ({ ok: true, status: 200, arrayBuffer: async () => bytes(n).buffer });
const cutResp = () => ({ ok: true, status: 200, arrayBuffer: async () => { throw new Error("network error"); } });

describe("recoverEditedPdf", () => {
  it("devuelve los bytes al primer intento", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResp(1234));
    const out = await recoverEditedPdf({ tempKey: "temp/abc-doc.pdf", fetchImpl, sleep: noSleep });
    expect(out?.byteLength).toBe(1234);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("pide la clave por URL escapada", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResp(10));
    await recoverEditedPdf({ tempKey: "temp/a b/c.pdf", fetchImpl, sleep: noSleep });
    expect(fetchImpl).toHaveBeenCalledWith("/api/documents/temp-download/temp%2Fa%20b%2Fc.pdf");
  });

  it("REGRESIÓN: un cuerpo cortado se reintenta y la segunda vez entra", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(cutResp())
      .mockResolvedValueOnce(okResp(500));
    const trace: string[] = [];
    const out = await recoverEditedPdf({
      tempKey: "temp/abc-doc.pdf", fetchImpl, sleep: noSleep,
      trace: (s, d) => trace.push(`${s}:${d ?? ""}`),
    });
    expect(out?.byteLength).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(trace[0]).toContain("download_error");
  });

  it("un cuerpo VACÍO cuenta como fallo y se reintenta", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(okResp(0))
      .mockResolvedValueOnce(okResp(42));
    const out = await recoverEditedPdf({ tempKey: "temp/x.pdf", fetchImpl, sleep: noSleep });
    expect(out?.byteLength).toBe(42);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("un 404 se da por definitivo: no reintenta (el objeto no está en R2)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) });
    const trace: string[] = [];
    const out = await recoverEditedPdf({
      tempKey: "temp/x.pdf", fetchImpl, sleep: noSleep, trace: (s) => trace.push(s),
    });
    expect(out).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(trace).toContain("download_404");
  });

  it("un 500 sí se reintenta hasta agotar los intentos y avisa de cada uno", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) });
    const trace: string[] = [];
    const out = await recoverEditedPdf({
      tempKey: "temp/x.pdf", fetchImpl, sleep: noSleep, attempts: 3, trace: (s) => trace.push(s),
    });
    expect(out).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(trace.filter(s => s === "download_http")).toHaveLength(3);
  });

  it("espera entre intentos, con espera creciente", async () => {
    const waits: number[] = [];
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) });
    await recoverEditedPdf({
      tempKey: "temp/x.pdf", fetchImpl, attempts: 3,
      sleep: async (ms) => { waits.push(ms); },
    });
    expect(waits).toEqual([500, 1000]); // tras el último intento no espera
  });

  it("la clave base64 se decodifica sin tocar la red", async () => {
    const fetchImpl = vi.fn();
    const out = await recoverEditedPdf({
      tempKey: "base64:QUJD",
      fetchImpl,
      decodeBase64: (b64) => new Uint8Array(Buffer.from(b64, "base64")),
    });
    expect(Array.from(out!)).toEqual([65, 66, 67]); // "ABC"
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("una base64 corrupta devuelve null y deja rastro", async () => {
    const trace: string[] = [];
    const out = await recoverEditedPdf({
      tempKey: "base64:!!!",
      fetchImpl: vi.fn(),
      decodeBase64: () => { throw new Error("bad base64"); },
      trace: (s) => trace.push(s),
    });
    expect(out).toBeNull();
    expect(trace).toContain("download_b64_error");
  });
});
