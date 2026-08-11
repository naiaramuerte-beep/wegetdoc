import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { acquireAltaLock, inFlightCount, __resetAltaLocks } from "./altaLock";

describe("altaLock — candado en vuelo del alta", () => {
  beforeEach(() => {
    __resetAltaLocks();
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("el primer solicitante obtiene el candado", () => {
    expect(acquireAltaLock(1)).not.toBeNull();
  });

  it("el segundo solicitante del MISMO usuario es rechazado", () => {
    const a = acquireAltaLock(1);
    const b = acquireAltaLock(1);
    expect(a).not.toBeNull();
    expect(b).toBeNull();
  });

  it("usuarios distintos no se bloquean entre sí", () => {
    expect(acquireAltaLock(1)).not.toBeNull();
    expect(acquireAltaLock(2)).not.toBeNull();
    expect(acquireAltaLock(3)).not.toBeNull();
    expect(inFlightCount()).toBe(3);
  });

  it("tras release, el mismo usuario puede volver a cobrar", () => {
    const a = acquireAltaLock(1);
    expect(acquireAltaLock(1)).toBeNull();
    a!.release();
    expect(acquireAltaLock(1)).not.toBeNull();
  });

  it("release es idempotente y no libera un candado ajeno posterior", () => {
    const a = acquireAltaLock(1)!;
    a.release();
    const b = acquireAltaLock(1)!;   // segunda petición legítima
    a.release();                      // release tardío/duplicado del primero
    // El candado de `b` debe seguir en pie: si el release duplicado lo hubiera
    // soltado, esta tercera petición pasaría y podríamos cobrar dos veces.
    expect(acquireAltaLock(1)).toBeNull();
    b.release();
  });

  it("un candado caducado (>90 s) no deja al usuario sin poder pagar nunca", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T10:00:00Z"));
    acquireAltaLock(1);                       // se toma y NUNCA se libera
    expect(acquireAltaLock(1)).toBeNull();

    vi.setSystemTime(new Date("2026-08-08T10:01:00Z")); // +60 s → sigue vivo
    expect(acquireAltaLock(1)).toBeNull();

    vi.setSystemTime(new Date("2026-08-08T10:01:31Z")); // +91 s → caducado
    expect(acquireAltaLock(1)).not.toBeNull();
  });

  it("inFlightCount no cuenta los candados caducados", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T10:00:00Z"));
    acquireAltaLock(1);
    acquireAltaLock(2);
    expect(inFlightCount()).toBe(2);
    vi.setSystemTime(new Date("2026-08-08T10:02:00Z"));
    expect(inFlightCount()).toBe(0);
  });

  it("simula el caso real: dos taps del mismo usuario, un solo cobro", () => {
    // u=94494 el 5-ago: dos altas de 0,50 € separadas 90 s. Con el candado,
    // solo la primera llega a autorizar.
    const cobros: number[] = [];
    for (let intento = 0; intento < 2; intento++) {
      const lock = acquireAltaLock(94494);
      if (!lock) continue;          // segunda petición: rechazada
      cobros.push(intento);
      // ojo: NO liberamos entre intentos — simula que la primera sigue en Sipay
    }
    expect(cobros).toEqual([0]);
  });
});
