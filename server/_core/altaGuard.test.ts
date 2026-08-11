import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetAltaLocks } from "./altaLock";

const findRecentAltaCharge = vi.fn();
const getIntroPriceCents = vi.fn();
const recordWebhookEvent = vi.fn();

vi.mock("../db", () => ({
  findRecentAltaCharge: (...a: any[]) => findRecentAltaCharge(...a),
  getIntroPriceCents: (...a: any[]) => getIntroPriceCents(...a),
  recordWebhookEvent: (...a: any[]) => recordWebhookEvent(...a),
}));

import { openAltaGuard, recordAltaBlocked, ALTA_DUPLICATE_WINDOW_MIN } from "./altaGuard";

const charge = (over: Partial<any> = {}) => ({
  id: 842,
  provider: "gpay",
  amountCents: 50,
  sipayTransactionId: "000315758546032212237",
  sipayOrder: "gpay-94494-1786000000000",
  sipayMaskedCard: "45**4444",
  createdAt: new Date("2026-08-05T14:55:45Z"),
  ...over,
});

describe("openAltaGuard — idempotencia y precio de servidor", () => {
  beforeEach(() => {
    __resetAltaLocks();
    vi.clearAllMocks();
    findRecentAltaCharge.mockResolvedValue(null);
    getIntroPriceCents.mockResolvedValue(50);
  });

  it("deja pasar un alta limpia y devuelve el precio DEL SERVIDOR", async () => {
    const g = await openAltaGuard(1);
    expect(g.ok).toBe(true);
    if (g.ok) {
      expect(g.amountCents).toBe(50);
      g.release();
    }
  });

  it("el importe sale de site_settings, no del cliente", async () => {
    getIntroPriceCents.mockResolvedValue(99);
    const g = await openAltaGuard(1);
    expect(g.ok && g.amountCents).toBe(99);
    if (g.ok) g.release();
  });

  it("bloquea si el usuario YA pagó dentro de la ventana y devuelve el cargo original", async () => {
    findRecentAltaCharge.mockResolvedValue(charge());
    const g = await openAltaGuard(94494);
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.reason).toBe("already_paid");
      expect(g.existing?.sipayTransactionId).toBe("000315758546032212237");
    }
  });

  it("consulta la ventana de 120 minutos", async () => {
    await openAltaGuard(7).then((g) => g.ok && g.release());
    expect(findRecentAltaCharge).toHaveBeenCalledWith(7, ALTA_DUPLICATE_WINDOW_MIN);
    expect(ALTA_DUPLICATE_WINDOW_MIN).toBe(120);
  });

  it("bloquea la segunda petición concurrente con reason=in_flight", async () => {
    // La primera no libera — simula que sigue autorizando en Sipay.
    const first = await openAltaGuard(5);
    expect(first.ok).toBe(true);
    const second = await openAltaGuard(5);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("in_flight");
    if (first.ok) first.release();
  });

  it("al bloquear por already_paid NO se queda el candado cogido", async () => {
    findRecentAltaCharge.mockResolvedValue(charge());
    const g1 = await openAltaGuard(9);
    expect(g1.ok).toBe(false);
    // Si el candado hubiera quedado retenido, este segundo intento diría
    // in_flight en vez de already_paid — y al caducar la ventana el usuario
    // seguiría bloqueado sin motivo.
    const g2 = await openAltaGuard(9);
    expect(g2.ok).toBe(false);
    if (!g2.ok) expect(g2.reason).toBe("already_paid");
  });

  it("si la BD falla, libera el candado y propaga el error", async () => {
    findRecentAltaCharge.mockRejectedValue(new Error("DB caída"));
    await expect(openAltaGuard(11)).rejects.toThrow("DB caída");
    // El usuario debe poder reintentar en cuanto la BD vuelva.
    findRecentAltaCharge.mockResolvedValue(null);
    const g = await openAltaGuard(11);
    expect(g.ok).toBe(true);
    if (g.ok) g.release();
  });

  it("una recompra legítima (fuera de ventana) pasa", async () => {
    // findRecentAltaCharge sólo mira dentro de la ventana; un cargo de hace
    // 3 días no aparece, así que el guard no lo ve y deja pagar. Es el caso
    // de u=60333 (+28 días) y u=85266 (+2,9 días): NO son duplicados.
    findRecentAltaCharge.mockResolvedValue(null);
    const g = await openAltaGuard(60333);
    expect(g.ok).toBe(true);
    if (g.ok) g.release();
  });

  it("tras completar un alta, el candado queda libre para el siguiente usuario", async () => {
    const g = await openAltaGuard(20);
    if (g.ok) g.release();
    const again = await openAltaGuard(20);
    expect(again.ok).toBe(true);
    if (again.ok) again.release();
  });
});

describe("recordAltaBlocked — telemetría", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escribe el evento alta_duplicate_blocked", async () => {
    await recordAltaBlocked({ userId: 42, method: "gpay", reason: "already_paid", existingChargeId: 842 });
    expect(recordWebhookEvent).toHaveBeenCalledTimes(1);
    const arg = recordWebhookEvent.mock.calls[0][0];
    expect(arg.eventType).toBe("alta_duplicate_blocked");
    expect(arg.payload.userId).toBe(42);
    expect(arg.payload.method).toBe("gpay");
    expect(arg.payload.reason).toBe("already_paid");
  });

  it("un fallo de telemetría NUNCA rompe el cobro", async () => {
    recordWebhookEvent.mockRejectedValue(new Error("webhook_events caída"));
    await expect(
      recordAltaBlocked({ userId: 42, method: "apay", reason: "in_flight" }),
    ).resolves.toBeUndefined();
  });
});
