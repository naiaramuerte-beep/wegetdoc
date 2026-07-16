import { describe, it, expect } from "vitest";
import { classifyDecline, decideNextRetry } from "./dunning";

describe("classifyDecline", () => {
  it("HARD: cancela sin reintentos", () => {
    for (const c of ["101", "121", "174", "191", "202"]) {
      const r = classifyDecline(c);
      expect(r.category).toBe("hard");
      expect(r.maxRetries).toBe(0);
    }
  });
  it("116 fondos insuficientes → soft, máx 4", () => {
    expect(classifyDecline("116")).toMatchObject({ category: "soft", kind: "insufficient_funds", maxRetries: 4 });
  });
  it("181/182 límite diario → soft, máx 2", () => {
    expect(classifyDecline("181")).toMatchObject({ category: "soft", kind: "daily_limit", maxRetries: 2 });
    expect(classifyDecline("182").maxRetries).toBe(2);
  });
  it("190 denegación genérica → soft, máx 3", () => {
    expect(classifyDecline("190")).toMatchObject({ category: "soft", kind: "generic", maxRetries: 3 });
  });
  it("técnicos (912/9912/TECH) → soft técnico, máx 3", () => {
    for (const c of ["912", "9912", "TECH", "TIMEOUT"]) {
      expect(classifyDecline(c)).toMatchObject({ kind: "technical", maxRetries: 3 });
    }
  });
  it("no mapeado → unknown conservador, máx 2", () => {
    expect(classifyDecline("999")).toMatchObject({ category: "unknown", kind: "unmapped", maxRetries: 2 });
  });
});

describe("decideNextRetry — cancelaciones", () => {
  const base = { anchor: new Date(Date.UTC(2026, 0, 1, 10)), lastAttemptAt: new Date(Date.UTC(2026, 0, 1, 10)) };
  it("código HARD → cancela de inmediato", () => {
    const d = decideNextRetry({ code: "174", retryCount: 0, ...base });
    expect(d.action).toBe("cancel");
  });
  it("190 agota a los 3 reintentos", () => {
    expect(decideNextRetry({ code: "190", retryCount: 3, ...base }).action).toBe("cancel");
    expect(decideNextRetry({ code: "190", retryCount: 2, ...base }).action).toBe("retry");
  });
  it("181/182 agota a los 2", () => {
    expect(decideNextRetry({ code: "181", retryCount: 2, ...base }).action).toBe("cancel");
    expect(decideNextRetry({ code: "181", retryCount: 1, ...base }).action).toBe("retry");
  });
  it("116 agota a los 4", () => {
    expect(decideNextRetry({ code: "116", retryCount: 4, ...base }).action).toBe("cancel");
    expect(decideNextRetry({ code: "116", retryCount: 3, ...base }).action).toBe("retry");
  });
  it("no mapeado agota a los 2", () => {
    expect(decideNextRetry({ code: "999", retryCount: 2, ...base }).action).toBe("cancel");
    expect(decideNextRetry({ code: "999", retryCount: 0, ...base }).action).toBe("retry");
  });
});

describe("decideNextRetry — calendario y reglas de fecha", () => {
  it("regla fin de semana: R1 que cae en sábado se mueve a martes", () => {
    // anchor jueves 2026-01-01 → R1 = +48h = sábado 2026-01-03 → martes 2026-01-06
    const anchor = new Date(Date.UTC(2026, 0, 1, 10));
    const d = decideNextRetry({ code: "190", retryCount: 0, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action === "retry") {
      expect(d.nextRetryAt.getUTCDay()).toBe(2); // martes
      expect(d.nextRetryAt.getUTCDate()).toBe(6);
    }
  });

  it("116 R3 se alinea al inicio del mes siguiente dentro de la ventana de 21 días", () => {
    // anchor 2026-03-15; R3 base (día 10) = 25-mar, pero 1-abr (miércoles) cae
    // dentro de +21d (5-abr) → R3 se mueve a primeros de abril.
    const anchor = new Date(Date.UTC(2026, 2, 15, 10));
    const d = decideNextRetry({ code: "116", retryCount: 2, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action === "retry") {
      expect(d.nextRetryAt.getUTCMonth()).toBe(3); // abril
      expect(d.nextRetryAt.getUTCDate()).toBeLessThanOrEqual(3); // día 1–3
    }
  });

  it("técnico: primer reintento a +24h", () => {
    // anchor miércoles 2026-01-07 00:00 → +24h = jueves 2026-01-08 07:00 (día hábil).
    const anchor = new Date(Date.UTC(2026, 0, 7, 0));
    const d = decideNextRetry({ code: "912", retryCount: 0, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action === "retry") {
      expect(d.nextRetryAt.getUTCDate()).toBe(8);
      expect(d.nextRetryAt.getTime()).toBeGreaterThanOrEqual(anchor.getTime() + 24 * 3600 * 1000);
    }
  });

  it("REGRESIÓN: ninguna next_retry_at cae en sáb/dom/lun, corra CUANDO corra", () => {
    // Barrido exhaustivo: día de ancla × HORA de ejecución (incl. noche UTC, que
    // es lo que disparaba el bug de rollover de zona horaria) × código × retryCount.
    const madridWd = (d: Date) =>
      new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(d);
    const codes = ["116", "190", "181", "912", "999"];
    let checked = 0;
    for (let day = 0; day < 40; day++) {
      // Horas UTC clave: 06/12/18 y sobre todo 22/23/23:59 (Madrid = día siguiente).
      for (const [h, m] of [[6, 0], [12, 0], [18, 0], [22, 0], [23, 0], [23, 59]] as const) {
        const lastAttemptAt = new Date(Date.UTC(2026, 0, 1 + day, h, m));
        const anchor = new Date(lastAttemptAt.getTime() - 3 * 24 * 3600 * 1000);
        for (const code of codes) {
          for (let rc = 0; rc < 4; rc++) {
            const d = decideNextRetry({ code, retryCount: rc, anchor, lastAttemptAt });
            if (d.action === "retry") {
              expect(["Sat", "Sun", "Mon"]).not.toContain(madridWd(d.nextRetryAt));
              // y siempre respeta el mínimo de 24h
              expect(d.nextRetryAt.getTime()).toBeGreaterThanOrEqual(lastAttemptAt.getTime() + 24 * 3600 * 1000);
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500); // el barrido realmente evaluó reintentos
  });

  it("técnico repetido se comporta como 190 (calendario) desde el 2º intento", () => {
    const anchor = new Date(Date.UTC(2026, 0, 1, 10));
    const d = decideNextRetry({ code: "912", retryCount: 1, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry"); // N=2 ≤ 3
  });

  it("respeta el mínimo de 24h entre intentos", () => {
    const anchor = new Date(Date.UTC(2026, 0, 1, 10));
    const lastAttemptAt = new Date(Date.UTC(2026, 0, 1, 23)); // fallo tardío
    const d = decideNextRetry({ code: "190", retryCount: 0, anchor, lastAttemptAt });
    expect(d.action).toBe("retry");
    if (d.action === "retry") {
      expect(d.nextRetryAt.getTime()).toBeGreaterThanOrEqual(lastAttemptAt.getTime() + 24 * 3600 * 1000);
    }
  });

  it("cancela si el reintento se saldría de la ventana de 30 días", () => {
    // Forzamos retryCount alto con un código de calendario largo: día > 30.
    const anchor = new Date(Date.UTC(2026, 0, 1, 10));
    const d = decideNextRetry({ code: "116", retryCount: 20, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("cancel"); // supera maxRetries → cancel
  });
});
