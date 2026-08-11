// Cálculos PUROS (sin I/O) del bloque "Conversión de trial a suscripción" del admin.
// Testeados en trialConversion.test.ts. La query (server/db.ts) trae las filas con
// conexión UTC (timezone 'Z') y las claves de agrupación en Europe/Madrid vía
// CONVERT_TZ; aquí solo se agrega. n<20 → muestra insuficiente (lo marca la UI).

export const MIN_SAMPLE = 20;
const DAY = 24 * 3600 * 1000;
const RETRY_GAP_DAYS = 25; // un cargo sin otro cargo MIT del mismo user en 25d = 1er intento de ciclo

/** Cuentas de prueba internas — se excluyen en los tres bloques. */
export function isTestEmail(email: string | null | undefined): boolean {
  return !!email && /test|prueba|sergisd39|sanchezdemiguel|example\./i.test(email);
}

// ── Tipos de entrada (filas crudas que provee la query) ──────────────────────
export type ChargeRow = {
  userId: number;
  amountCents: number;
  ok: boolean;
  createdAtMs: number;
  isUpgrade: boolean; // order mit-upgrade-… (no cuenta como renovación)
};
export type SubRow = {
  userId: number;
  email: string | null;
  trialDays: number | null;  // LEGACY: null|2 = cohorte 48h; 7 = cohorte 7d
  trialHours: number | null; // 24 = cohorte 24h (altas desde el 11-ago-2026)
  cancelAtPeriodEnd: boolean;
  status: string;
  declineCategory: string | null;
  altaWeek: string; // lunes de la semana de alta, en Madrid ('YYYY-MM-DD') — SQL
  createdAtMs: number;
  periodEndMs: number | null;
  mitOk: number; // nº de cobros MIT OK del usuario (>0 = convirtió a pago)
};

/** Etiqueta de cohorte de una sub.
 *
 *  `trialHours` manda cuando está: es lo que escriben las altas desde que la
 *  prueba se mide en horas (24h). Solo si viene vacío se cae a `trialDays`, que
 *  es lo único que tienen las subs antiguas — y ahí null significa 48h, porque
 *  esa cohorte se creó antes de que existiera la columna. Mezclar los dos
 *  campos en el orden contrario metería todas las altas nuevas en "48h".
 */
export const cohortOf = (
  trialDays: number | null,
  trialHours: number | null = null,
): "24h" | "48h" | "7d" | "otro" => {
  if (trialHours != null) {
    if (trialHours === 24) return "24h";
    if (trialHours === 48) return "48h";
    if (trialHours === 168) return "7d";
    return "otro";
  }
  return trialDays == null || trialDays === 2 ? "48h" : trialDays === 7 ? "7d" : "otro";
};

// ── Ciclos de renovación a partir de los cargos MIT ──────────────────────────
export type Cycle = { userId: number; amountCents: number; firstAtMs: number; firstOk: boolean; cycleOk: boolean };

/** Agrupa los cargos MIT (sin upgrades) por usuario en ciclos: un cargo inicia
 *  ciclo si no hubo otro cargo MIT del mismo user en los 25 días previos. El ciclo
 *  hereda el importe y la hora de su PRIMER intento; cycleOk = algún cargo OK. */
export function buildCycles(charges: ChargeRow[], gapDays = RETRY_GAP_DAYS): Cycle[] {
  const gap = gapDays * DAY;
  const byUser = new Map<number, ChargeRow[]>();
  for (const c of charges) {
    if (c.isUpgrade) continue;
    if (!byUser.has(c.userId)) byUser.set(c.userId, []);
    byUser.get(c.userId)!.push(c);
  }
  const cycles: Cycle[] = [];
  for (const list of Array.from(byUser.values())) {
    list.sort((a, b) => a.createdAtMs - b.createdAtMs);
    let cur: Cycle | null = null;
    let prevMs = -Infinity;
    for (const c of list) {
      const isFirst = c.createdAtMs - prevMs > gap;
      if (isFirst) {
        cur = { userId: c.userId, amountCents: c.amountCents, firstAtMs: c.createdAtMs, firstOk: c.ok, cycleOk: c.ok };
        cycles.push(cur);
      } else if (cur) {
        cur.cycleOk = cur.cycleOk || c.ok;
      }
      prevMs = c.createdAtMs;
    }
  }
  return cycles;
}

// ── BLOQUE 1 — Aceptación de MIT ─────────────────────────────────────────────
export type Rate = { ok: number; n: number; pct: number | null; insufficient: boolean };
const rate = (ok: number, n: number): Rate => ({ ok, n, pct: n ? +(100 * ok / n).toFixed(1) : null, insufficient: n < MIN_SAMPLE });

export type Block1Window = {
  first: Rate;   // aprobado a primer intento (importe actual)
  final: Rate;   // aprobado final incl. reintentos (importe actual)
  other: Rate;   // otros importes (final), en línea aparte
};
export function block1(cycles: Cycle[], opts: { currentAmountCents: number; nowMs: number }): {
  d7: Block1Window; d30: Block1Window; baselinePct: number;
} {
  const win = (days: number): Block1Window => {
    const from = opts.nowMs - days * DAY;
    const inWin = cycles.filter((c) => c.firstAtMs >= from && c.firstAtMs <= opts.nowMs);
    const cur = inWin.filter((c) => c.amountCents === opts.currentAmountCents);
    const other = inWin.filter((c) => c.amountCents !== opts.currentAmountCents);
    return {
      first: rate(cur.filter((c) => c.firstOk).length, cur.length),
      final: rate(cur.filter((c) => c.cycleOk).length, cur.length),
      other: rate(other.filter((c) => c.cycleOk).length, other.length),
    };
  };
  return { d7: win(7), d30: win(30), baselinePct: 35.3 };
}

// ── BLOQUE 2 — Trial → suscriptor, por cohorte semanal ───────────────────────
export type CohortRow = {
  week: string; cohort: "48h" | "7d" | "otro";
  altas: number; trialEnded: number; canceledPre: number; paid: number; failed: number;
  convPct: number | null; insufficient: boolean; inProgress: boolean;
};
export function block2(subs: SubRow[], opts: { nowMs: number }): CohortRow[] {
  const real = subs.filter((s) => !isTestEmail(s.email));
  const groups = new Map<string, SubRow[]>();
  for (const s of real) {
    const key = `${s.altaWeek}|${cohortOf(s.trialDays, s.trialHours)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const rows: CohortRow[] = [];
  for (const [key, list] of Array.from(groups.entries())) {
    const [week, cohort] = key.split("|") as [string, "48h" | "7d" | "otro"];
    const trialEnded = list.filter((s) => s.periodEndMs != null && s.periodEndMs <= opts.nowMs);
    const paid = list.filter((s) => s.mitOk > 0).length;
    const canceledPre = list.filter((s) => s.cancelAtPeriodEnd && s.mitOk === 0).length;
    const failed = trialEnded.filter((s) => s.mitOk === 0 && !s.cancelAtPeriodEnd).length;
    rows.push({
      week, cohort, altas: list.length, trialEnded: trialEnded.length, canceledPre, paid, failed,
      convPct: list.length ? +(100 * paid / list.length).toFixed(1) : null,
      insufficient: list.length < MIN_SAMPLE,
      inProgress: trialEnded.length < list.length, // aún hay subs en trial → cohorte en curso
    });
  }
  return rows.sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : a.cohort.localeCompare(b.cohort)));
}

// ── BLOQUE 3 — Dónde se pierden (últimos 30 días) ────────────────────────────
export type LossBreakdown = {
  total: number;
  usuario: number; codigoDuro: number; blockedProvider: number; reintentosAgotados: number;
  pct: { usuario: number; codigoDuro: number; blockedProvider: number; reintentosAgotados: number } | null;
  insufficient: boolean;
};
export function block3(subs: SubRow[], opts: { nowMs: number; windowDays?: number }): LossBreakdown {
  const from = opts.nowMs - (opts.windowDays ?? 30) * DAY;
  const real = subs.filter((s) => !isTestEmail(s.email) && s.createdAtMs >= from && s.mitOk === 0);
  // Perdidas = no convirtieron y llegaron a un estado terminal/bloqueado (no en curso).
  const usuario = real.filter((s) => s.cancelAtPeriodEnd).length;
  const codigoDuro = real.filter((s) => !s.cancelAtPeriodEnd && s.declineCategory === "hard").length;
  const blockedProvider = real.filter((s) => !s.cancelAtPeriodEnd && s.declineCategory === "blocked_provider").length;
  const reintentosAgotados = real.filter((s) => !s.cancelAtPeriodEnd && s.status === "canceled" && s.declineCategory === "soft").length;
  const total = usuario + codigoDuro + blockedProvider + reintentosAgotados;
  const p = (x: number) => (total ? +(100 * x / total).toFixed(1) : 0);
  return {
    total, usuario, codigoDuro, blockedProvider, reintentosAgotados,
    pct: total ? { usuario: p(usuario), codigoDuro: p(codigoDuro), blockedProvider: p(blockedProvider), reintentosAgotados: p(reintentosAgotados) } : null,
    insufficient: total < MIN_SAMPLE,
  };
}
