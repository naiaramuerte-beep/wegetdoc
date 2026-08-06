import { describe, it, expect } from "vitest";
import { classifyDecline, decideNextRetry, canClaimDunning, isSubDueForRetry, DUNNING_LOCK_STALE_MS } from "./dunning";

const madridWd = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(d);

describe("classifyDecline", () => {
  it("HARD: cancela sin reintentos (muerte VERIFICABLE de la tarjeta)", () => {
    // 101 caducada · 129 CVV incorrecto · 202 fraude con retirada · 125 no
    // efectiva · 191 caducidad errónea. Ninguno es recuperable con un reintento.
    for (const c of ["101", "102", "104", "106", "118", "125", "129", "173", "175", "180", "191", "202"]) {
      const r = classifyDecline(c);
      expect(r.category, `código ${c} debe seguir en HARD`).toBe("hard");
      expect(r.maxRetries).toBe(0);
    }
  });
  it("121 YA NO es HARD → soft 'límite excedido', máx 2", () => {
    expect(classifyDecline("121")).toMatchObject({ category: "soft", kind: "limit_exceeded", maxRetries: 2 });
  });
  it("172/174 → blocked_provider (ni cancelar ni reintentar), 0 reintentos", () => {
    for (const c of ["172", "174"]) {
      expect(classifyDecline(c)).toMatchObject({ category: "blocked_provider", kind: "blocked_provider", maxRetries: 0 });
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
    const d = decideNextRetry({ code: "173", retryCount: 0, ...base });
    expect(d.action).toBe("cancel");
  });
  it("172/174 → block (ni cancel ni retry), sin importar retryCount", () => {
    for (const c of ["172", "174"]) {
      for (const rc of [0, 1, 5]) {
        const d = decideNextRetry({ code: c, retryCount: rc, ...base });
        expect(d.action).toBe("block");
        expect(d.category).toBe("blocked_provider");
      }
    }
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
  it("121 ya NO cancela al primer intento — reintenta", () => {
    const d = decideNextRetry({ code: "121", retryCount: 0, ...base });
    expect(d.action).toBe("retry");
  });
  it("121 agota a los 2 reintentos", () => {
    // Ancla a mitad de mes para que R2 quepa en la ventana de 30d (con ancla el
    // día 1 de un mes de 31, R2 se sale — ver el test del caso borde de abajo).
    const mid = { anchor: new Date(Date.UTC(2026, 3, 15, 17, 42)), lastAttemptAt: new Date(Date.UTC(2026, 3, 15, 17, 42)) };
    expect(decideNextRetry({ code: "121", retryCount: 2, ...mid }).action).toBe("cancel");
    expect(decideNextRetry({ code: "121", retryCount: 1, ...mid }).action).toBe("retry");
  });
});

describe("121 (límite excedido) — reintento alineado al inicio de mes", () => {
  const at = (d: Date) => d.toISOString();

  it("R1 cae el día 1 del mes siguiente, a la MISMA hora que la sub", () => {
    // ancla: miércoles 2026-04-15 a las 17:42 UTC → R1 = viernes 2026-05-01 17:42
    const anchor = new Date(Date.UTC(2026, 3, 15, 17, 42));
    const d = decideNextRetry({ code: "121", retryCount: 0, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action !== "retry") return;
    expect(at(d.nextRetryAt)).toBe(at(new Date(Date.UTC(2026, 4, 1, 17, 42))));
    expect(d.retryNumber).toBe(1);
  });

  it("si el día 1 cae en finde/lunes se mueve a martes (regla de siempre)", () => {
    // ancla 2026-02-10 → día 1 siguiente = domingo 2026-03-01 → martes 2026-03-03
    const anchor = new Date(Date.UTC(2026, 1, 10, 9, 0));
    const d = decideNextRetry({ code: "121", retryCount: 0, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action !== "retry") return;
    expect(madridWd(d.nextRetryAt)).toBe("Tue");
    expect(at(d.nextRetryAt)).toBe(at(new Date(Date.UTC(2026, 2, 3, 9, 0))));
  });

  it("R2 es la red de seguridad 5 días después de R1", () => {
    const anchor = new Date(Date.UTC(2026, 3, 15, 17, 42));
    const d = decideNextRetry({ code: "121", retryCount: 1, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action !== "retry") return;
    // R1 = 2026-05-01 (viernes); R2 = +5d = 2026-05-06 (miércoles), no se desplaza
    expect(at(d.nextRetryAt)).toBe(at(new Date(Date.UTC(2026, 4, 6, 17, 42))));
  });

  it("CASO BORDE: ancla el día 1 de un mes de 31 días NO se cancela por ventana", () => {
    // El día 1 del mes siguiente estaría a +31d → fuera de la ventana de 30d.
    // El tope de +27d debe evitar el cancel espurio.
    const anchor = new Date(Date.UTC(2026, 6, 1, 12, 0)); // jueves 2026-07-01
    const d = decideNextRetry({ code: "121", retryCount: 0, anchor, lastAttemptAt: anchor });
    expect(d.action, "no debe cancelar por beyond_30d").toBe("retry");
    if (d.action !== "retry") return;
    const dias = (d.nextRetryAt.getTime() - anchor.getTime()) / 864e5;
    expect(dias).toBeLessThanOrEqual(30);
    expect(dias).toBeGreaterThanOrEqual(27);
  });

  it("CASO BORDE: con ancla a principio de mes, R2 se sale de la ventana y cancela", () => {
    // Comportamiento ACEPTADO por diseño: R1 (el tiro principal) siempre se da;
    // R2 es solo red de seguridad y puede no caber. Lo importante es que R1 vaya.
    const anchor = new Date(Date.UTC(2026, 0, 1, 10)); // jueves 2026-01-01
    expect(decideNextRetry({ code: "121", retryCount: 0, anchor, lastAttemptAt: anchor }).action).toBe("retry");
    expect(decideNextRetry({ code: "121", retryCount: 1, anchor, lastAttemptAt: anchor }).action).toBe("cancel");
  });

  it("respeta el mínimo de 24h desde el último intento", () => {
    // ancla muy antigua: el día 1 ya pasó; el mínimo manda.
    const anchor = new Date(Date.UTC(2026, 3, 15, 10, 0));
    const lastAttemptAt = new Date(Date.UTC(2026, 4, 1, 10, 0)); // el mismo día 1
    const d = decideNextRetry({ code: "121", retryCount: 0, anchor, lastAttemptAt });
    if (d.action !== "retry") return;
    expect(d.nextRetryAt.getTime()).toBeGreaterThanOrEqual(lastAttemptAt.getTime() + 24 * 3600 * 1000);
  });

  it("nunca supera la ventana de 30 días desde el ancla", () => {
    for (let dia = 1; dia <= 28; dia++) {
      for (const mes of [0, 1, 3, 6, 10]) {
        const anchor = new Date(Date.UTC(2026, mes, dia, 11, 0));
        const d = decideNextRetry({ code: "121", retryCount: 0, anchor, lastAttemptAt: anchor });
        if (d.action !== "retry") continue;
        const dias = (d.nextRetryAt.getTime() - anchor.getTime()) / 864e5;
        expect(dias, `ancla ${anchor.toISOString()}`).toBeLessThanOrEqual(30);
      }
    }
  });

  it("R1 nunca se cancela por ventana, sea cual sea el día del ancla", () => {
    for (let dia = 1; dia <= 28; dia++) {
      for (const mes of [0, 1, 3, 6, 10]) {
        const anchor = new Date(Date.UTC(2026, mes, dia, 11, 0));
        const d = decideNextRetry({ code: "121", retryCount: 0, anchor, lastAttemptAt: anchor });
        expect(d.action, `ancla ${anchor.toISOString()} debería reintentar`).toBe("retry");
      }
    }
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

describe("decideNextRetry — anclaje a la HORA de la sub (no concentrar)", () => {
  it("conserva la hora exacta del ancla cuando no hay finde de por medio", () => {
    // miércoles 2026-01-07 14:37 UTC → R1 (+2d) = viernes 2026-01-09 14:37, hábil.
    const anchor = new Date(Date.UTC(2026, 0, 7, 14, 37));
    const d = decideNextRetry({ code: "190", retryCount: 0, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action === "retry") {
      expect(d.nextRetryAt.getUTCHours()).toBe(14);
      expect(d.nextRetryAt.getUTCMinutes()).toBe(37);
      expect(madridWd(d.nextRetryAt)).toBe("Fri");
    }
  });

  it("HORAS NOCTURNAS (23:00-01:00 UTC): weekday Madrid correcto y sin sáb/dom/lun", () => {
    // Barremos horas nocturnas donde Madrid cruza medianoche (el viejo bug).
    for (const [Y, M, D] of [[2026, 0, 5], [2026, 1, 27], [2026, 2, 28]] as const) {
      for (const [h, m] of [[23, 0], [23, 30], [0, 0], [0, 30], [1, 0]] as const) {
        const anchor = new Date(Date.UTC(Y, M, D, h, m));
        for (const code of ["190", "116", "912"]) {
          for (let rc = 0; rc < 4; rc++) {
            const d = decideNextRetry({ code, retryCount: rc, anchor, lastAttemptAt: anchor });
            if (d.action !== "retry") continue;
            expect(["Sat", "Sun", "Mon"]).not.toContain(madridWd(d.nextRetryAt));
            expect(d.nextRetryAt.getTime()).toBeGreaterThanOrEqual(anchor.getTime() + 24 * 3600 * 1000);
          }
        }
      }
    }
  });

  it("CAMBIO DE MES: R1 desde fin de mes cruza al mes siguiente sin romper reglas", () => {
    // sábado 2026-01-31 12:00 → R1 (+2d) = lunes 2026-02-02 → martes 2026-02-03.
    const anchor = new Date(Date.UTC(2026, 0, 31, 12, 0));
    const d = decideNextRetry({ code: "190", retryCount: 0, anchor, lastAttemptAt: anchor });
    expect(d.action).toBe("retry");
    if (d.action === "retry") {
      expect(d.nextRetryAt.getUTCMonth()).toBe(1); // febrero
      expect(madridWd(d.nextRetryAt)).toBe("Tue");
      expect(d.nextRetryAt.getUTCHours()).toBe(12); // hora preservada
    }
  });

  it("REGRESIÓN nocturna+DST: ninguna next_retry_at en sáb/dom/lun, corra cuando corra", () => {
    // Igual que el sweep de enero pero cruzando el cambio de hora de marzo (DST
    // Madrid: último domingo de marzo) y con horas nocturnas incluidas.
    const codes = ["116", "190", "181", "912", "999"];
    let checked = 0;
    for (let day = 0; day < 40; day++) {
      for (const [h, m] of [[0, 0], [1, 0], [12, 0], [22, 30], [23, 59]] as const) {
        const lastAttemptAt = new Date(Date.UTC(2026, 2, 1 + day, h, m)); // marzo→abril
        const anchor = new Date(lastAttemptAt.getTime() - 3 * 24 * 3600 * 1000);
        for (const code of codes) {
          for (let rc = 0; rc < 4; rc++) {
            const d = decideNextRetry({ code, retryCount: rc, anchor, lastAttemptAt });
            if (d.action !== "retry") continue;
            expect(["Sat", "Sun", "Mon"]).not.toContain(madridWd(d.nextRetryAt));
            expect(d.nextRetryAt.getTime()).toBeGreaterThanOrEqual(lastAttemptAt.getTime() + 24 * 3600 * 1000);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });
});

describe("idempotencia — anti-doble-cobro (cron cada 15 min)", () => {
  const now = new Date(Date.UTC(2026, 0, 15, 9, 0));
  it("canClaimDunning: null reclama; lock fresco NO; lock caducado (>45min) SÍ", () => {
    expect(canClaimDunning(null, now)).toBe(true);
    expect(canClaimDunning(new Date(now.getTime() - 10 * 60 * 1000), now)).toBe(false); // 10min < 45
    expect(canClaimDunning(new Date(now.getTime() - 44 * 60 * 1000), now)).toBe(false); // 44min < 45
    expect(canClaimDunning(new Date(now.getTime() - 46 * 60 * 1000), now)).toBe(true);  // 46min > 45
    expect(DUNNING_LOCK_STALE_MS).toBe(45 * 60 * 1000);
  });

  it("dos corridas solapadas: solo una puede reclamar (la 2ª ve lock fresco)", () => {
    const claimedAt = now;                       // corrida A reclama
    const runB = new Date(now.getTime() + 15 * 60 * 1000); // corrida B, 15 min después
    expect(canClaimDunning(claimedAt, runB)).toBe(false);  // B NO puede (lock de 15min < 45)
  });

  const dueBase = {
    sipayToken: "usr-1", cancelAtPeriodEnd: false, status: "past_due",
    currentPeriodEnd: new Date(now.getTime() - 60 * 1000), nextRetryAt: null,
    declineCategory: null as string | null, dunningLockedAt: null as Date | null,
  };
  it("isSubDueForRetry: sub vencida y libre → due", () => {
    expect(isSubDueForRetry(dueBase, now)).toBe(true);
  });
  it("NO re-cobra: currentPeriodEnd futuro (ya cobrada +30d)", () => {
    expect(isSubDueForRetry({ ...dueBase, currentPeriodEnd: new Date(now.getTime() + 30 * 864e5) }, now)).toBe(false);
  });
  it("NO re-cobra: nextRetryAt futuro (reintento programado)", () => {
    expect(isSubDueForRetry({ ...dueBase, nextRetryAt: new Date(now.getTime() + 864e5) }, now)).toBe(false);
  });
  it("NO re-cobra: bloqueada (blocked_provider) ni hard", () => {
    expect(isSubDueForRetry({ ...dueBase, declineCategory: "blocked_provider" }, now)).toBe(false);
    expect(isSubDueForRetry({ ...dueBase, declineCategory: "hard" }, now)).toBe(false);
  });
  it("NO re-cobra: sin token, cancelAtPeriodEnd, o lock fresco de otra corrida", () => {
    expect(isSubDueForRetry({ ...dueBase, sipayToken: null }, now)).toBe(false);
    expect(isSubDueForRetry({ ...dueBase, cancelAtPeriodEnd: true }, now)).toBe(false);
    expect(isSubDueForRetry({ ...dueBase, dunningLockedAt: new Date(now.getTime() - 5 * 60 * 1000) }, now)).toBe(false);
  });
});
