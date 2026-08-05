import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const PROVIDER: Record<string, string> = { fastpay: "Tarjeta", gpay: "Google Pay", apay: "Apple Pay", mit: "Renovación" };
const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

type Rate = { ok: number; n: number; pct: number | null; insufficient: boolean };
function RateBlock({ label, r, pending }: { label: string; r: Rate; pending?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-white/55 text-[13px]">{label}{pending ? " *" : ""}</span>
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <b className="text-white text-lg tabular-nums">{r.pct == null ? "—" : `${r.pct}%`}</b>
        <span className="text-white/45 text-xs tabular-nums">· {r.ok}/{r.n}</span>
        {r.insufficient && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300">n&lt;20</span>}
      </span>
    </div>
  );
}
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#141416] border border-white/10 rounded-2xl p-4">
      {title && <h2 className="text-white/40 text-[11px] uppercase tracking-wider mb-3">{title}</h2>}
      {children}
    </section>
  );
}

export default function AdminMobile() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const isAdmin = !!user && user.role === "admin";

  // Instala el manifest del admin (PWA "añadir a pantalla de inicio") solo en
  // esta pantalla. Sin caché offline: solo instalable. Se retira al desmontar.
  useEffect(() => {
    const els: HTMLElement[] = [];
    const add = (tag: string, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el); els.push(el);
    };
    add("link", { rel: "manifest", href: "/admin.webmanifest" });
    add("meta", { name: "theme-color", content: "#0a0a0b" });
    add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    add("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" });
    add("meta", { name: "apple-mobile-web-app-title", content: "EP Admin" });
    add("link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" });
    return () => els.forEach((el) => el.remove());
  }, []);

  const conv = trpc.admin.trialConversion.useQuery(undefined, { enabled: isAdmin, refetchInterval: 60000 });
  const summary = trpc.admin.mobileSummary.useQuery(undefined, { enabled: isAdmin, refetchInterval: 60000 });

  if (loading) return <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-white/60">Cargando…</div>;
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-white">Acceso restringido a administradores</p>
        <button onClick={() => navigate("/")} className="text-white/50 underline">Volver</button>
      </div>
    );
  }

  const c = conv.data;
  const s = summary.data;
  const cohorts = c?.block2 ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white px-3 py-4 max-w-md mx-auto space-y-3" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="flex items-center justify-between px-1 pb-1">
        <div className="font-extrabold tracking-tight">editor<span className="text-[#E63946]">pdf</span> · admin</div>
        <button onClick={() => navigate("/es/admin")} className="text-white/40 text-xs underline">escritorio</button>
      </header>

      {/* HOY */}
      <Card title="Hoy">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Altas", s ? s.today.altas : "…"], ["Renovac.", s ? s.today.renovaciones : "…"], ["Total", s ? eur(s.today.totalEur) : "…"]].map(([k, v], i) => (
            <div key={i} className="bg-white/5 rounded-xl py-3">
              <div className="text-2xl font-extrabold tabular-nums leading-none">{v as any}</div>
              <div className="text-[11px] text-white/45 mt-1">{k}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ACEPTACIÓN MIT */}
      <Card title={`Aceptación MIT · 1er intento`}>
        {c ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-white/35 text-[11px]">Últimos 7 días</div>
              <RateBlock label="1er intento" r={c.block1.d7.first} />
              <RateBlock label="Final (con reintentos)" r={c.block1.d7.final} pending />
            </div>
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="text-white/35 text-[11px]">Últimos 30 días</div>
              <RateBlock label="1er intento" r={c.block1.d30.first} />
              <RateBlock label="Final (con reintentos)" r={c.block1.d30.final} />
            </div>
            <div className="text-[10px] text-white/35 pt-1">* reintentos aún pendientes → el final solo subirá · Baseline fija <b className="text-white/60">{c.block1.baselinePct}%</b></div>
          </div>
        ) : <div className="text-white/40 text-sm">…</div>}
      </Card>

      {/* CONVERSIÓN POR COHORTE */}
      <Card title="Trial → suscriptor · por cohorte">
        {cohorts.length ? (
          <div className="space-y-2">
            {cohorts.slice(0, 8).map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm border-b border-white/5 pb-1.5 last:border-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-white/70 tabular-nums text-xs">{r.week.slice(5)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.cohort === "7d" ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/70"}`}>{r.cohort}</span>
                  {r.inProgress && <span className="text-[9px] text-emerald-300">en curso</span>}
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-white/45 text-xs tabular-nums">{r.paid}/{r.altas}</span>
                  <b className="tabular-nums">{r.convPct == null ? "—" : `${r.convPct}%`}</b>
                  {r.insufficient && <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">n&lt;20</span>}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="text-white/40 text-sm">…</div>}
      </Card>

      {/* BLOQUEADAS Y CANCELADAS */}
      <Card title="Pérdidas · últimos 30 días">
        {c ? (
          <div className="space-y-1.5 text-sm">
            {([["Canceladas por usuario", c.block3.usuario, c.block3.pct?.usuario],
               ["Código duro", c.block3.codigoDuro, c.block3.pct?.codigoDuro],
               ["Bloqueadas (172/174)", c.block3.blockedProvider, c.block3.pct?.blockedProvider],
               ["Reintentos agotados", c.block3.reintentosAgotados, c.block3.pct?.reintentosAgotados]] as [string, number, number | undefined][])
              .map(([k, n, pct]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-white/65">{k}</span>
                  <span className="tabular-nums"><b>{n}</b> <span className="text-white/40 text-xs">· {pct ?? 0}%</span></span>
                </div>
              ))}
            <div className="text-[11px] text-white/35 pt-1">Total perdidas: {c.block3.total}{c.block3.insufficient ? " · muestra insuf." : ""}</div>
          </div>
        ) : <div className="text-white/40 text-sm">…</div>}
      </Card>

      {/* ÚLTIMOS COBROS */}
      <Card title="Últimos cobros">
        {s?.recentCharges?.length ? (
          <div className="space-y-1.5">
            {s.recentCharges.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{PROVIDER[r.provider] ?? r.provider} <span className="text-white/35 text-xs">{r.when}</span></span>
                <span className="text-emerald-300 tabular-nums">{eur(r.amountEur)}</span>
              </div>
            ))}
          </div>
        ) : <div className="text-white/40 text-sm">Sin cobros recientes.</div>}
      </Card>

      {/* ÚLTIMOS FALLOS */}
      <Card title="Últimos fallos">
        {s?.recentFailures?.length ? (
          <div className="space-y-1.5">
            {s.recentFailures.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{PROVIDER[r.provider] ?? r.provider} <span className="text-white/35 text-xs">{r.when}</span></span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-white/45 text-xs tabular-nums">{eur(r.amountEur)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-xs tabular-nums">{r.code}</span>
                </span>
              </div>
            ))}
          </div>
        ) : <div className="text-white/40 text-sm">Sin fallos recientes.</div>}
      </Card>

      <p className="text-center text-[10px] text-white/25 pt-1">Añade a pantalla de inicio para abrir a pantalla completa.</p>
    </div>
  );
}
