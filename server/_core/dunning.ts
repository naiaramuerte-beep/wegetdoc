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

export type DeclineCategory = "soft" | "hard" | "unknown" | "blocked_provider";

export type DeclineKind =
  | "hard"
  | "blocked_provider"
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
  "173", "175", "180", "191", "202",
]);

// ────────────────────────────────────────────────────────────────────────────
// BLOQUEO TEMPORAL DE PROVEEDOR (reversible — ÚNICO sitio para tocar esto).
//
// 172 y 174 se dispararon ×4 justo cuando Sipay desplegó su cambio del 19/07/2026
// (10 casos antes → 48 después; 0 en el hueco 17–18/07). Verificado en prod:
//  - El 100% de esas tarjetas cobró su alta de 0,50€ pocos días antes (mediana
//    4,5d) → estaban VIVAS; el fallo es del MIT, no de la tarjeta.
//  - Fuerte agrupación por BIN (4441 11** ×16, 5168 74** ×7…) → rechazo sistémico
//    a nivel emisor de la recurrencia, típico de exención MIT / autenticación.
//  - Sipay NO define el código: devuelve texto genérico "authorization_error".
//
// Por eso NO los cancelamos (mataríamos MRR sobre tarjetas vivas) y tampoco los
// reintentamos por MIT (si es autenticación, el MIT re-fallaría y solo sumaría
// otra denegación a nuestro ratio). La sub queda en past_due marcada como
// `blocked_provider` con `blockedAt`, sin acceso y sin reintento, a la espera de
// que Sipay confirme qué son 172/174 y su arreglo. Para revertir: vaciar este
// set (los códigos volverán a su clasificación normal) — no hay que tocar nada
// más. 173/175 se dejan en HARD (no han aparecido y no hay decisión sobre ellos).
const BLOCKED_PROVIDER_CODES = new Set(["172", "174"]);

const INSUFFICIENT_FUNDS = "116";           // calendario completo, máx 4
const DAILY_LIMIT_CODES = new Set(["181", "182"]); // +48h, máx 2
const GENERIC_DECLINE = "190";              // calendario, máx 3
// Errores técnicos / red / timeout. Las excepciones y timeouts del cliente
// (sin payload.code) se pasan como el código sintético "TECH".
const TECHNICAL_CODES = new Set(["912", "9912", "TECH", "TIMEOUT"]);

/** Clasifica el código Redsys en categoría + política de reintentos. */
export function classifyDecline(code: string | null | undefined): DeclineInfo {
  const c = String(code ?? "").trim();
  if (BLOCKED_PROVIDER_CODES.has(c)) return { category: "blocked_provider", kind: "blocked_provider", maxRetries: 0 };
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
  // block: ni cancelar ni reintentar. La sub queda en past_due marcada como
  // blocked_provider (ver BLOCKED_PROVIDER_CODES). No la coge más el cron.
  | { action: "block"; category: DeclineCategory; reason: string }
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

/** 1º día del mes siguiente al ancla, a la MISMA hora que el ancla (alineación con
 *  nóminas; se conserva la hora de la sub para no concentrar). */
function firstOfNextMonth(anchor: Date): Date {
  return new Date(Date.UTC(
    anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1,
    anchor.getUTCHours(), anchor.getUTCMinutes(), 0, 0,
  ));
}

/**
 * ¿Se mueve R3 al inicio del mes siguiente? (solo código 116). Cierto cuando el
 * 1º del mes siguiente cae dentro de la ventana de 21 días desde el ancla.
 */
function r3MovesToMonthStart(anchor: Date): boolean {
  return firstOfNextMonth(anchor).getTime() <= addDays(anchor, 21).getTime();
}

/**
 * Ancla el reintento a la HORA de `target` (= hora de vencimiento/alta de la sub)
 * para NO concentrar todos los cobros a la vez. Solo mueve el DÍA: nunca antes de
 * `min` (mínimo 24h desde el último intento) y evitando sáb/dom/lun (Madrid) → martes.
 *
 * El weekday se calcula sobre el instante REAL (con su hora exacta) vía
 * Intl(Europe/Madrid), que resuelve bien horas nocturnas y DST. Un desplazamiento
 * de días ENTEROS conserva la hora, así que el weekday de Madrid se mueve justo
 * esos días. (El diseño previo forzaba 07:00 UTC para esquivar el rollover de zona;
 * ahora se calcula la zona correctamente y se preserva la hora de la sub.)
 */
function toBusinessDay(target: Date, min: Date): Date {
  const next = target.getTime() >= min.getTime() ? target : min;
  const wd = madridWeekday(next);
  const add = wd === 6 ? 3 : wd === 0 ? 2 : wd === 1 ? 1 : 0; // Sáb/Dom/Lun → Mar
  return add ? addDays(next, add) : next;
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
  if (info.category === "blocked_provider") {
    // Ni cancelar ni reintentar por MIT — ver BLOCKED_PROVIDER_CODES.
    return { action: "block", category: "blocked_provider", reason: `blocked_provider_${String(opts.code)}` };
  }
  if (info.category === "hard") {
    return { action: "cancel", category: "hard", reason: `hard_code_${String(opts.code)}` };
  }

  const n = opts.retryCount + 1; // el reintento que programaríamos
  if (n > info.maxRetries) {
    return { action: "cancel", category: info.category, reason: `max_retries_${info.maxRetries}` };
  }

  const target = targetForRetry(info, n, opts.anchor);
  const min = addHours(opts.lastAttemptAt, 24);   // mín 24h entre intentos (máx 1/día)
  const next = toBusinessDay(target, min);         // hora de la sub, no antes de min, sin finde/lunes

  // Ventana máxima de 30 días desde el ancla (sobre la fecha final ya desplazada).
  if (next.getTime() > addDays(opts.anchor, 30).getTime()) {
    return { action: "cancel", category: info.category, reason: "beyond_30d" };
  }
  return { action: "retry", category: info.category, nextRetryAt: next, retryNumber: n };
}

// ────────────────────────────────────────────────────────────────────────────
// Idempotencia del cron (anti-doble-cobro al pasar de lote diario a cada 15 min).
//
// Con ejecuciones cada 15 min dos corridas pueden solaparse. La garantía es DOBLE:
//  1) `claimSubForDunning` (UPDATE atómico) — solo UNA corrida gana el claim.
//  2) El cambio de estado tras cobrar (currentPeriodEnd +30d en OK / nextRetryAt
//     futuro en fallo) — una vez procesada, la sub deja de estar "due".
// El lock debe caducar MUY por encima del intervalo (15 min) para que una corrida
// colgada no sea repescada por la siguiente: por eso 45 min.
export const DUNNING_LOCK_STALE_MS = 45 * 60 * 1000;

/**
 * ¿Puede esta corrida reclamar la sub? Refleja el WHERE de `claimSubForDunning`
 * y del lock en `getSubsDueForRetry` (server/db.ts). Puro, para testear la lógica.
 * Reclama si el lock es null o más viejo que `staleMs`.
 */
export function canClaimDunning(dunningLockedAt: Date | null | undefined, now: Date, staleMs: number = DUNNING_LOCK_STALE_MS): boolean {
  if (!dunningLockedAt) return true;
  return dunningLockedAt.getTime() < now.getTime() - staleMs;
}

export type DueSubState = {
  sipayToken?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  status?: string | null;
  currentPeriodEnd?: Date | null;
  nextRetryAt?: Date | null;
  declineCategory?: string | null;
  dunningLockedAt?: Date | null;
};

/**
 * Espejo EXACTO del WHERE de `getSubsDueForRetry` (server/db.ts). Puro, para
 * testear que una sub ya cobrada (currentPeriodEnd futuro) o con reintento futuro
 * o bloqueada/hard NO se re-selecciona → no se puede doble-cobrar.
 */
export function isSubDueForRetry(s: DueSubState, now: Date, staleMs: number = DUNNING_LOCK_STALE_MS): boolean {
  if (!s.sipayToken) return false;
  if (s.cancelAtPeriodEnd) return false;
  if (!["trialing", "active", "past_due"].includes(String(s.status))) return false;
  if (!s.currentPeriodEnd || s.currentPeriodEnd.getTime() > now.getTime()) return false; // aún no vence / ya cobrada (+30d)
  if (s.nextRetryAt && s.nextRetryAt.getTime() > now.getTime()) return false;             // reintento programado a futuro
  if (s.declineCategory === "hard" || s.declineCategory === "blocked_provider") return false;
  if (!canClaimDunning(s.dunningLockedAt, now, staleMs)) return false;                     // lock fresco de otra corrida
  return true;
}
