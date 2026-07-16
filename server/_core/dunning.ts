/**
 * Dunning clasificado por código de denegación de Redsys (vía Sipay).
 *
 * El código real llega en `data.payload.code` de la respuesta de Sipay (string),
 * p.ej. "116" (fondos insuficientes), "190" (denegación genérica), "174" (hard).
 * Este módulo es PURO (sin I/O) para poder testearlo: clasifica el código y
 * decide cuándo (o si) reintentar el cobro MIT.
 *
 * Reglas de negocio (ventana máxima 21 días, sin emails):
 *  - HARD  → cancelar de inmediato, 0 reintentos.
 *  - SOFT  → programar reintentos según el código.
 *  - Calendario base (offset desde el ancla = vencimiento): R1 +48h, R2 día 5,
 *    R3 día 10, R4 día 14. Mín 24h entre intentos, máx 1/día, todo en ≤30 días.
 *  - Fin de semana / lunes (Europe/Madrid) → mover a martes; ejecución por la
 *    mañana (el cron corre 08:00–10:00 Madrid; aquí fijamos ~07:00 UTC).
 */

export type DeclineCategory = "soft" | "hard" | "unknown";

export type DeclineKind =
  | "hard"
  | "insufficient_funds"
  | "daily_limit"
  | "generic"
  | "technical"
  | "unmapped";

export type DeclineInfo = {
  category: DeclineCategory;
  kind: DeclineKind;
  /** Nº máximo de reintentos permitidos para este código. */
  maxRetries: number;
};

// HARD → cancelar ya, sin reintentos.
const HARD_CODES = new Set([
  "101", "102", "104", "106", "118", "121", "125", "129",
  "172", "173", "174", "175", "180", "191", "202",
]);

const INSUFFICIENT_FUNDS = "116";           // calendario completo, máx 4
const DAILY_LIMIT_CODES = new Set(["181", "182"]); // +48h, máx 2
const GENERIC_DECLINE = "190";              // calendario, máx 3
// Errores técnicos / red / timeout. Las excepciones y timeouts del cliente
// (sin payload.code) se pasan como el código sintético "TECH".
const TECHNICAL_CODES = new Set(["912", "9912", "TECH", "TIMEOUT"]);

/** Clasifica el código Redsys en categoría + política de reintentos. */
export function classifyDecline(code: string | null | undefined): DeclineInfo {
  const c = String(code ?? "").trim();
  if (HARD_CODES.has(c)) return { category: "hard", kind: "hard", maxRetries: 0 };
  if (c === INSUFFICIENT_FUNDS) return { category: "soft", kind: "insufficient_funds", maxRetries: 4 };
  if (DAILY_LIMIT_CODES.has(c)) return { category: "soft", kind: "daily_limit", maxRetries: 2 };
  if (c === GENERIC_DECLINE) return { category: "soft", kind: "generic", maxRetries: 3 };
  // Técnico: 1 reintento a +24h; si vuelve a fallar se trata como 190 (máx 3).
  if (TECHNICAL_CODES.has(c)) return { category: "soft", kind: "technical", maxRetries: 3 };
  // No mapeado → soft conservador, máx 2 (y el caller registra el código).
  return { category: "unknown", kind: "unmapped", maxRetries: 2 };
}

export type RetryDecision =
  | { action: "cancel"; category: DeclineCategory; reason: string }
  | { action: "retry"; category: DeclineCategory; nextRetryAt: Date; retryNumber: number };

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function addHours(d: Date, h: number): Date { return new Date(d.getTime() + h * HOUR); }
function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * DAY); }

/** Día de la semana en Europe/Madrid: 0=Dom … 6=Sáb. */
function madridWeekday(d: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? d.getUTCDay();
}

/** 1º día del mes siguiente al ancla, a las 07:00 UTC (alineación con nóminas). */
function firstOfNextMonth(anchor: Date): Date {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 1, 7, 0, 0, 0));
}

/**
 * ¿Se mueve R3 al inicio del mes siguiente? (solo código 116). Cierto cuando el
 * 1º del mes siguiente cae dentro de la ventana de 21 días desde el ancla.
 */
function r3MovesToMonthStart(anchor: Date): boolean {
  return firstOfNextMonth(anchor).getTime() <= addDays(anchor, 21).getTime();
}

/** 07:00 UTC del día UTC de `d` (≈09:00 Madrid, mismo día en ambas zonas). */
function atMorningUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 7, 0, 0, 0));
}

/**
 * Devuelve la mañana (07:00 UTC) del primer día hábil >= max(día de `target`, `min`)
 * que NO sea sáb/dom/lun (Madrid); esos se mueven a martes.
 *
 * Clave anti-bug: se calcula el día de la semana SIEMPRE sobre las 07:00 UTC
 * (≈09:00 Madrid). Si se usara una hora UTC nocturna, el día en Madrid cruzaría
 * a medianoche y el weekday saldría desplazado (un domingo leído como sábado,
 * etc.), colando fechas en lunes.
 */
function toBusinessMorning(target: Date, min: Date): Date {
  const day07 = atMorningUtc(target);
  // No antes del día del calendario ni antes del mínimo de 24h.
  const floor = day07.getTime() >= min.getTime() ? day07 : min;
  let base = atMorningUtc(floor);
  if (base.getTime() < floor.getTime()) base = addDays(base, 1); // 07:00 ya pasó → mañana
  const wd = madridWeekday(base);
  const add = wd === 6 ? 3 : wd === 0 ? 2 : wd === 1 ? 1 : 0; // Sáb/Dom/Lun → Mar
  return addDays(base, add);
}

/** Fecha objetivo (antes de guardas y desplazamiento) para el reintento N. */
function targetForRetry(info: DeclineInfo, n: number, anchor: Date): Date {
  // Técnico: 1er reintento a +24h; a partir del 2º se comporta como 190.
  if (info.kind === "technical" && n === 1) return addHours(anchor, 24);
  // Límite diario (181/182): a +48h por intento.
  if (info.kind === "daily_limit") return addHours(anchor, 48 * n);

  // Calendario base por número de reintento (días desde el ancla).
  const baseDays: Record<number, number> = { 1: 2, 2: 5, 3: 10, 4: 14 };
  let target = addDays(anchor, baseDays[n] ?? 14 + (n - 4) * 7);

  // Excepción 116: R3 → día 1–3 del mes siguiente si cae en la ventana de 21d;
  // y si R3 se movió, R4 pasa a día 21.
  if (info.kind === "insufficient_funds") {
    if (n === 3 && r3MovesToMonthStart(anchor)) target = firstOfNextMonth(anchor);
    if (n === 4 && r3MovesToMonthStart(anchor)) target = addDays(anchor, 21);
  }
  return target;
}

/**
 * Decide el siguiente paso tras un fallo de cobro MIT.
 *  - `retryCount`: reintentos ya programados en este ciclo (0 = el fallo actual
 *     es del cobro original; el próximo sería R1).
 *  - `anchor`: vencimiento del ciclo (subscriptions.currentPeriodEnd) = día 0.
 *  - `lastAttemptAt`: instante del fallo actual (para la regla de mín 24h).
 */
export function decideNextRetry(opts: {
  code: string | null | undefined;
  retryCount: number;
  anchor: Date;
  lastAttemptAt: Date;
}): RetryDecision {
  const info = classifyDecline(opts.code);
  if (info.category === "hard") {
    return { action: "cancel", category: "hard", reason: `hard_code_${String(opts.code)}` };
  }

  const n = opts.retryCount + 1; // el reintento que programaríamos
  if (n > info.maxRetries) {
    return { action: "cancel", category: info.category, reason: `max_retries_${info.maxRetries}` };
  }

  const target = targetForRetry(info, n, opts.anchor);
  const min = addHours(opts.lastAttemptAt, 24);   // mín 24h entre intentos (máx 1/día)
  const next = toBusinessMorning(target, min);     // 07:00 UTC, no antes de min, sin finde/lunes

  // Ventana máxima de 30 días desde el ancla (sobre la fecha final ya desplazada).
  if (next.getTime() > addDays(opts.anchor, 30).getTime()) {
    return { action: "cancel", category: info.category, reason: "beyond_30d" };
  }
  return { action: "retry", category: info.category, nextRetryAt: next, retryNumber: n };
}
