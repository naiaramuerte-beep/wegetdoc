/* =============================================================
   EditorPDF Admin Panel — Dashboard completo
   MRR, ARR, estadísticas de facturación, usuarios, pagos, legal
   ============================================================= */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { brandName, isFastDoc } from "@/lib/brand";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, DollarSign, TrendingUp, TrendingDown, MessageSquare, FileText,
  Search, Trash2, ShieldCheck, ShieldOff, Mail, ChevronDown, ChevronUp,
  CreditCard, Settings, BookOpen, BarChart2, UserX, RefreshCw, Eye, EyeOff,
  ArrowLeft, Crown, Rss, Star, Calendar, Zap, AlertTriangle, RotateCcw,
} from "lucide-react";

// Date-range presets used by the Billing tab. "today" includes today only,
// "yesterday" only yesterday, the rest are rolling N-day windows.
type RangePreset = "today" | "yesterday" | "7d" | "30d" | "month" | "ytd" | "custom";
function rangeFromPreset(preset: RangePreset, customFrom?: string, customTo?: string): { from: Date; to: Date; label: string } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: startOfToday, to: now, label: "Hoy" };
    case "yesterday": {
      const start = new Date(startOfToday); start.setDate(start.getDate() - 1);
      const end = new Date(startOfToday); end.setMilliseconds(end.getMilliseconds() - 1);
      return { from: start, to: end, label: "Ayer" };
    }
    case "7d": {
      const start = new Date(startOfToday); start.setDate(start.getDate() - 6);
      return { from: start, to: now, label: "Últimos 7 días" };
    }
    case "30d": {
      const start = new Date(startOfToday); start.setDate(start.getDate() - 29);
      return { from: start, to: now, label: "Últimos 30 días" };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, label: "Mes actual" };
    case "ytd":
      return { from: new Date(now.getFullYear(), 0, 1), to: now, label: "Año actual" };
    case "custom": {
      const from = customFrom ? new Date(customFrom) : startOfToday;
      const to = customTo ? new Date(customTo + "T23:59:59") : now;
      return { from, to, label: "Personalizado" };
    }
  }
}
import BlogAdmin from "./BlogAdmin";
import TrustpilotAdmin from "./TrustpilotAdmin";

type AdminTab = "overview" | "billing" | "users" | "subscribers" | "documents" | "canceled" | "messages" | "legal" | "settings" | "blog" | "trustpilot";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
  const [editingLegal, setEditingLegal] = useState<string | null>(null);
  const [legalTitle, setLegalTitle] = useState("");
  const [legalContent, setLegalContent] = useState("");


  // Date range for Billing tab. Must be memoized — recalculating on every
  // render produces a fresh `to = new Date()` every time, which changes the
  // ISO string and retriggers the useQuery, causing an infinite refetch loop.
  const [rangePreset, setRangePreset] = useState<RangePreset>("today");
  const [customFrom, setCustomFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const range = useMemo(
    () => rangeFromPreset(rangePreset, customFrom, customTo),
    [rangePreset, customFrom, customTo]
  );
  const rangeFromISO = range.from.toISOString();
  const rangeToISO = range.to.toISOString();

  // Queries
  const statsQ = trpc.admin.stats.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const billingQ = trpc.admin.billingStats.useQuery(
    { from: rangeFromISO, to: rangeToISO },
    { enabled: !!user && user.role === "admin" && tab === "billing" }
  );
  const stripeRevQ = trpc.admin.stripeRevenue.useQuery(
    { from: rangeFromISO, to: rangeToISO },
    { enabled: !!user && user.role === "admin" && tab === "billing", staleTime: 60 * 1000 }
  );
  const subsAboutToCancelQ = trpc.admin.subsAboutToCancel.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && tab === "billing",
  });
  const pastDueSubsQ = trpc.admin.pastDueSubs.useQuery(undefined, {
    enabled: !!user && user.role === "admin" && tab === "billing",
  });
  const usersQ = trpc.admin.users.useQuery({ search: userSearch }, { enabled: !!user && user.role === "admin" && tab === "users" });
  const subscribersQ = trpc.admin.subscribedUsers.useQuery(undefined, { enabled: !!user && user.role === "admin" && tab === "subscribers" });
  const [docSearch, setDocSearch] = useState("");
  const docsQ = trpc.admin.documents.useQuery({ search: docSearch }, { enabled: !!user && user.role === "admin" && tab === "documents" });
  const storageQ = trpc.admin.storageByUser.useQuery(undefined, { enabled: !!user && user.role === "admin" && tab === "documents" });
  const canceledQ = trpc.admin.canceledSubscriptions.useQuery(undefined, { enabled: !!user && user.role === "admin" && tab === "canceled" });
  const messagesQ = trpc.admin.contactMessages.useQuery(undefined, { enabled: !!user && user.role === "admin" && tab === "messages" });
  const legalQ = trpc.admin.legalPages.useQuery(undefined, { enabled: !!user && user.role === "admin" && tab === "legal" });
  const settingsQ = trpc.admin.settings.useQuery(undefined, { enabled: !!user && user.role === "admin" && tab === "settings" });

  const utils = trpc.useUtils();

  const deleteUserMut = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { toast.success("Usuario eliminado"); utils.admin.users.invalidate(); },
    onError: () => toast.error("Error al eliminar usuario"),
  });

  const promoteUserMut = trpc.admin.promoteUser.useMutation({
    onSuccess: () => { toast.success("Rol actualizado"); utils.admin.users.invalidate(); },
    onError: () => toast.error("Error al actualizar rol"),
  });

  const markReadMut = trpc.admin.markMessageRead.useMutation({
    onSuccess: () => utils.admin.contactMessages.invalidate(),
  });

  const saveLegalMut = trpc.admin.saveLegalPage.useMutation({
    onSuccess: () => {
      toast.success("Página legal guardada");
      setEditingLegal(null);
      utils.admin.legalPages.invalidate();
    },
    onError: () => toast.error("Error al guardar"),
  });

  const saveSettingMut = trpc.admin.saveSetting.useMutation({
    onSuccess: () => { toast.success("Ajuste guardado"); utils.admin.settings.invalidate(); },
  });

  // Auth guard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0f1117" }}>
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#0f1117" }}>
        <p className="text-white text-lg">Acceso restringido a administradores</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#1565C0" }}
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const stats = statsQ.data;
  const billing = billingQ.data;

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Resumen", icon: <BarChart2 size={16} /> },
    { id: "billing", label: "Facturación & MRR", icon: <DollarSign size={16} /> },
    { id: "users", label: "Usuarios", icon: <Users size={16} /> },
    { id: "subscribers", label: "Suscriptores", icon: <Crown size={16} /> },
    { id: "documents", label: "Documentos", icon: <FileText size={16} /> },
    { id: "canceled", label: "Bajas", icon: <UserX size={16} /> },
    { id: "messages", label: "Mensajes", icon: <MessageSquare size={16} /> },
    { id: "legal", label: "Páginas legales", icon: <BookOpen size={16} /> },
    { id: "settings", label: "Ajustes", icon: <Settings size={16} /> },
    ...(!isFastDoc ? [{ id: "blog" as AdminTab, label: "Blog", icon: <Rss size={16} /> }] : []),
    ...(!isFastDoc ? [{ id: "trustpilot" as AdminTab, label: "Trustpilot", icon: <Star size={16} /> }] : []),
  ];

  const formatEur = (n: number) =>
    `€${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Quote CSV cells safely (commas / quotes / newlines are wrapped).
  const csvEscape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const s = val instanceof Date ? val.toISOString() : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const downloadCsv = (rows: Record<string, unknown>[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")).join("\n");
    const csv = headers.join(",") + "\n" + body;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f1117", color: "#e2e8f0" }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "#1e2433", backgroundColor: "#0a0d14" }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
            <p className="text-xs text-gray-400">{brandName} — {user.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            utils.admin.stats.invalidate();
            utils.admin.billingStats.invalidate();
            utils.admin.stripeRevenue.invalidate();
            utils.admin.subsAboutToCancel.invalidate();
            utils.admin.pastDueSubs.invalidate();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
          style={{ backgroundColor: "#1e2433" }}
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className="w-52 min-h-[calc(100vh-64px)] border-r flex-shrink-0"
          style={{ borderColor: "#1e2433", backgroundColor: "#0a0d14" }}
        >
          <nav className="p-3 flex flex-col gap-1">
            {tabs.map((t) => {
              const unread = t.id === "messages" ? (stats?.unreadMessages ?? 0) : 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors w-full"
                  style={{
                    backgroundColor: tab === t.id ? "#0D47A1" : "transparent",
                    color: tab === t.id ? "white" : "#94a3b8",
                  }}
                  onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.backgroundColor = "#1e2433"; }}
                  onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {t.icon}
                  <span className="flex-1">{t.label}</span>
                  {unread > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: "#E63946" }}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Resumen general</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total usuarios", value: stats?.totalUsers ?? "—", icon: <Users size={20} />, color: "#1565C0" },
                  { label: "Suscripciones activas", value: stats?.activeSubscriptions ?? "—", icon: <CreditCard size={20} />, color: "#10b981" },
                  { label: "Documentos", value: stats?.totalDocuments ?? "—", icon: <FileText size={20} />, color: "#8b5cf6" },
                  { label: "Mensajes sin leer", value: stats?.unreadMessages ?? "—", icon: <MessageSquare size={20} />, color: "#f59e0b" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-400">{card.label}</p>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: card.color + "20", color: card.color }}
                      >
                        {card.icon}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{card.value}</p>
                  </div>
                ))}
              </div>

              <div
                className="rounded-xl p-5 border"
                style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
              >
                <p className="text-sm font-semibold text-white mb-1">Estadísticas de facturación</p>
                <p className="text-xs text-gray-400 mb-4">
                  Accede a la pestaña "Facturación &amp; MRR" para el análisis completo con gráficas.
                </p>
                <button
                  onClick={() => setTab("billing")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: "#1565C0" }}
                >
                  Ver estadísticas de facturación →
                </button>
              </div>
            </div>
          )}

          {/* ── BILLING & MRR ── */}
          {tab === "billing" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Facturación &amp; MRR</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Datos del rango: <span className="text-gray-200 font-medium">{range.label}</span> · {range.from.toLocaleString("es-ES")} → {range.to.toLocaleString("es-ES")}
                  </p>
                </div>
              </div>

              {/* Date range picker */}
              <div className="rounded-xl p-3 border flex flex-wrap items-center gap-2"
                style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}>
                <Calendar size={14} className="text-gray-400 ml-1" />
                {([
                  ["today", "Hoy"],
                  ["yesterday", "Ayer"],
                  ["7d", "7 días"],
                  ["30d", "30 días"],
                  ["month", "Mes"],
                  ["ytd", "Año"],
                  ["custom", "Custom"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setRangePreset(id)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: rangePreset === id ? "#1565C0" : "transparent",
                      color: rangePreset === id ? "white" : "#94a3b8",
                      border: rangePreset === id ? "1px solid #1565C0" : "1px solid #1e2433",
                    }}
                  >
                    {label}
                  </button>
                ))}
                {rangePreset === "custom" && (
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="px-2 py-1 rounded-md text-xs text-white"
                      style={{ backgroundColor: "#0a0d14", border: "1px solid #1e2433" }}
                    />
                    <span className="text-xs text-gray-500">→</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="px-2 py-1 rounded-md text-xs text-white"
                      style={{ backgroundColor: "#0a0d14", border: "1px solid #1e2433" }}
                    />
                  </div>
                )}
              </div>

              {billingQ.isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500">Cargando datos…</p>
                </div>
              ) : billingQ.error ? (
                <div className="rounded-xl p-5 border" style={{ backgroundColor: "#1a0a0a", borderColor: "#7f1d1d" }}>
                  <p className="text-sm font-semibold text-red-300 mb-1">Error al cargar facturación</p>
                  <p className="text-xs text-red-200/80 font-mono">{billingQ.error.message}</p>
                  <button
                    onClick={() => billingQ.refetch()}
                    className="mt-3 px-3 py-1.5 rounded-md text-xs font-medium text-white"
                    style={{ backgroundColor: "#dc2626" }}
                  >
                    Reintentar
                  </button>
                </div>
              ) : billing ? (
                <>
                  {/* ── REAL CASH FROM STRIPE (range-aware) ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ingresos reales (Stripe)</p>
                      {stripeRevQ.isLoading && (
                        <span className="text-[10px] text-gray-500 inline-flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> consultando…
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          label: "Ingresos brutos",
                          value: stripeRevQ.data ? formatEur(stripeRevQ.data.grossEur) : "—",
                          sub: "Cobros antes de comisiones",
                          icon: <DollarSign size={18} />,
                          color: "#10b981",
                        },
                        {
                          label: "Ingresos netos",
                          value: stripeRevQ.data ? formatEur(stripeRevQ.data.netEur) : "—",
                          sub: "Brutos − reembolsos",
                          icon: <Zap size={18} />,
                          color: "#22c55e",
                        },
                        {
                          label: "Cobros en rango",
                          value: stripeRevQ.data?.chargesCount ?? "—",
                          sub: `${billing.newSubsInRange} suscripciones nuevas`,
                          icon: <CreditCard size={18} />,
                          color: "#8b5cf6",
                        },
                        {
                          label: "Reembolsos",
                          value: stripeRevQ.data ? formatEur(stripeRevQ.data.refundedEur) : "—",
                          sub: `${stripeRevQ.data?.refundsCount ?? 0} reembolsos`,
                          icon: <RotateCcw size={18} />,
                          color: "#f59e0b",
                        },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="rounded-xl p-4 border"
                          style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-400">{card.label}</p>
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: card.color + "20", color: card.color }}
                            >
                              {card.icon}
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white">{card.value}</p>
                          <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── MRR / ARR (point-in-time, NOT range-aware) ── */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">MRR · ARR · Churn</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          label: "MRR",
                          value: formatEur(billing.mrr),
                          sub: "Solo suscripciones cobrando",
                          icon: <TrendingUp size={18} />,
                          color: "#10b981",
                        },
                        {
                          label: "MRR comprometido",
                          value: formatEur(billing.mrrCommitted),
                          sub: `Incluye ${billing.trialingSubscriptions} en trial`,
                          icon: <TrendingUp size={18} />,
                          color: "#1565C0",
                        },
                        {
                          label: "ARR comprometido",
                          value: formatEur((billing as any).arrCommitted ?? billing.arr),
                          sub: `ARR real: ${formatEur(billing.arr)}`,
                          icon: <DollarSign size={18} />,
                          color: "#8b5cf6",
                        },
                        {
                          label: "Churn rate",
                          value: `${billing.churnRate}%`,
                          sub: `${billing.canceledSubscriptions} canceladas total`,
                          icon: <TrendingDown size={18} />,
                          color: "#ef4444",
                        },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="rounded-xl p-4 border"
                          style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-400">{card.label}</p>
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: card.color + "20", color: card.color }}
                            >
                              {card.icon}
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white">{card.value}</p>
                          <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── SUBSCRIPTION BREAKDOWN ── */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Suscripciones</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                      {[
                        { label: "Pagando recurrente",  value: (billing as any).payingSubscriptions ?? 0,  color: "#10b981", icon: <CreditCard size={18} />, sub: "Plan monthly/annual" },
                        { label: "En trial (48h)",      value: billing.trialingSubscriptions,  color: "#1565C0", icon: <Zap size={18} />, sub: "Convertirán en 48h" },
                        { label: "Cobro fallido",       value: (billing as any).pastDueSubscriptions ?? 0, color: "#ef4444", icon: <RotateCcw size={18} />, sub: "Stripe reintentando" },
                        { label: "Por cancelar",        value: billing.subsAboutToCancel,      color: "#f59e0b", icon: <AlertTriangle size={18} />, sub: "Cancel at period end" },
                        { label: "Canceladas total",    value: billing.canceledSubscriptions,  color: "#ef4444", icon: <UserX size={18} /> },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="rounded-xl p-4 border"
                          style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-400">{card.label}</p>
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: card.color + "20", color: card.color }}
                            >
                              {card.icon}
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white">{card.value}</p>
                          {card.sub && <p className="text-xs text-gray-500 mt-1">{card.sub}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── PERIOD COUNTERS ── */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Crecimiento</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: `Suscripciones (${range.label.toLowerCase()})`, value: billing.newSubsInRange, color: "#10b981" },
                        { label: `Usuarios (${range.label.toLowerCase()})`,      value: billing.newUsersInRange, color: "#1565C0" },
                        { label: "Suscripciones hoy",                            value: billing.newSubsToday,  color: "#8b5cf6" },
                        { label: "Usuarios hoy",                                 value: billing.newUsersToday, color: "#8b5cf6" },
                        { label: "Suscripciones esta semana",                    value: billing.newSubsWeek,   color: "#94a3b8" },
                        { label: "Usuarios esta semana",                         value: billing.newUsersWeek,  color: "#94a3b8" },
                        { label: "Suscripciones este mes",                       value: billing.newSubsMonth,  color: "#94a3b8" },
                        { label: "Usuarios este mes",                            value: billing.newUsersMonth, color: "#94a3b8" },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-xl p-4 border"
                          style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                        >
                          <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                          <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── ABOUT-TO-CANCEL TABLE ── */}
                  <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}>
                    <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e2433" }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <p className="text-sm font-semibold text-white">Suscripciones que se van a cancelar</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {subsAboutToCancelQ.data?.length ?? 0} en cola
                      </p>
                    </div>
                    {subsAboutToCancelQ.data && subsAboutToCancelQ.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead style={{ backgroundColor: "#0a0d14" }}>
                            <tr className="text-left text-gray-400">
                              <th className="px-4 py-2 font-medium">Email</th>
                              <th className="px-4 py-2 font-medium">Plan</th>
                              <th className="px-4 py-2 font-medium">Estado</th>
                              <th className="px-4 py-2 font-medium">Fin del periodo</th>
                              <th className="px-4 py-2 font-medium">País</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subsAboutToCancelQ.data.map((s: any) => (
                              <tr key={s.id} className="border-t" style={{ borderColor: "#1e2433" }}>
                                <td className="px-4 py-2 text-white">{s.email}</td>
                                <td className="px-4 py-2 text-gray-300">{s.plan}</td>
                                <td className="px-4 py-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold"
                                    style={{ backgroundColor: s.status === "trialing" ? "#1565C020" : "#10b98120", color: s.status === "trialing" ? "#60a5fa" : "#10b981" }}>
                                    {s.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-300">
                                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es-ES") : "—"}
                                </td>
                                <td className="px-4 py-2 text-gray-400">{s.country ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="px-5 py-6 text-center text-xs text-gray-500">
                        Ningún cliente con cancelación programada — buena señal.
                      </p>
                    )}
                  </div>

                  {/* ── PAST-DUE (failed recurring charge) TABLE ── */}
                  <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}>
                    <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e2433" }}>
                      <div className="flex items-center gap-2">
                        <RotateCcw size={14} className="text-red-500" />
                        <p className="text-sm font-semibold text-white">Cobro fallido — Stripe reintentando</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {pastDueSubsQ.data?.length ?? 0} {pastDueSubsQ.data?.length === 1 ? "cliente" : "clientes"}
                      </p>
                    </div>
                    {pastDueSubsQ.data && pastDueSubsQ.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead style={{ backgroundColor: "#0a0d14" }}>
                            <tr className="text-left text-gray-400">
                              <th className="px-4 py-2 font-medium">Email</th>
                              <th className="px-4 py-2 font-medium">Nombre</th>
                              <th className="px-4 py-2 font-medium">Plan</th>
                              <th className="px-4 py-2 font-medium">Fin del periodo</th>
                              <th className="px-4 py-2 font-medium">País</th>
                              <th className="px-4 py-2 font-medium">Stripe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pastDueSubsQ.data.map((s: any) => (
                              <tr key={s.id} className="border-t" style={{ borderColor: "#1e2433" }}>
                                <td className="px-4 py-2 text-white">{s.email}</td>
                                <td className="px-4 py-2 text-gray-300">{s.name || "—"}</td>
                                <td className="px-4 py-2 text-gray-300">{s.plan}</td>
                                <td className="px-4 py-2 text-gray-300">
                                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es-ES") : "—"}
                                </td>
                                <td className="px-4 py-2 text-gray-400">{s.country ?? "—"}</td>
                                <td className="px-4 py-2">
                                  {s.stripeCustomerId ? (
                                    <a
                                      href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[#E63946] hover:underline"
                                    >
                                      Ver en Stripe →
                                    </a>
                                  ) : (
                                    <span className="text-gray-500">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="px-5 py-3 text-[11px] text-gray-500 border-t" style={{ borderColor: "#1e2433" }}>
                          Stripe reintenta el cobro automáticamente durante ~3 semanas (smart retries). Si todos los intentos fallan, la sub se cancela.
                        </p>
                      </div>
                    ) : (
                      <p className="px-5 py-6 text-center text-xs text-gray-500">
                        Ningún cobro fallido — todos los pagos recurrentes al día.
                      </p>
                    )}
                  </div>

                  {/* Revenue chart */}
                  <div
                    className="rounded-xl p-5 border"
                    style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                  >
                    <p className="text-sm font-semibold text-white mb-4">
                      Ingresos mensuales (últimos 12 meses)
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={billing.monthlyRevenue}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 11 }}
                          tickFormatter={(v) => `€${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e2433",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#e2e8f0",
                          }}
                          formatter={(v: number) => [`€${v.toFixed(2)}`, "Ingresos"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#1565C0"
                          fill="url(#revGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Subscriptions chart */}
                  <div
                    className="rounded-xl p-5 border"
                    style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                  >
                    <p className="text-sm font-semibold text-white mb-4">
                      Nuevas suscripciones por mes
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={billing.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e2433",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#e2e8f0",
                          }}
                        />
                        <Bar dataKey="subs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="text-gray-400">No hay datos disponibles</p>
              )}
            </div>
          )}

          {/* ── SUBSCRIBERS (historic + current) ── */}
          {tab === "subscribers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Suscriptores</h2>
                <button
                  onClick={() => {
                    if (!subscribersQ.data?.length) return;
                    downloadCsv(
                      subscribersQ.data.map((s: any) => ({
                        email: s.email,
                        name: s.name,
                        plan: s.plan,
                        status: s.subStatus,
                        country: s.country,
                        currentPeriodEnd: s.currentPeriodEnd,
                        createdAt: s.createdAt,
                        lastSignedIn: s.lastSignedIn,
                        stripeCustomerId: s.stripeCustomerId,
                      })),
                      `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ backgroundColor: "#1e2433" }}
                >
                  Exportar CSV
                </button>
              </div>
              {subscribersQ.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "#1e2433" }}>
                  <table className="w-full text-xs">
                    <thead style={{ backgroundColor: "#0a0d14" }}>
                      <tr className="text-left text-gray-400">
                        <th className="px-4 py-2 font-medium">Email</th>
                        <th className="px-4 py-2 font-medium">Nombre</th>
                        <th className="px-4 py-2 font-medium">Plan</th>
                        <th className="px-4 py-2 font-medium">Estado</th>
                        <th className="px-4 py-2 font-medium">Fin periodo</th>
                        <th className="px-4 py-2 font-medium">País</th>
                        <th className="px-4 py-2 font-medium">Stripe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribersQ.data?.map((s: any) => (
                        <tr key={s.id} className="border-t" style={{ borderColor: "#1e2433" }}>
                          <td className="px-4 py-2 text-white">{s.email}</td>
                          <td className="px-4 py-2 text-gray-300">{s.name || "—"}</td>
                          <td className="px-4 py-2 text-gray-300">{s.plan}</td>
                          <td className="px-4 py-2">
                            <span
                              className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                backgroundColor:
                                  s.subStatus === "active" ? "#10b98120" :
                                  s.subStatus === "trialing" ? "#1565C020" :
                                  s.subStatus === "past_due" ? "#ef444420" :
                                  s.subStatus === "canceled" ? "#6b728020" : "#6b728020",
                                color:
                                  s.subStatus === "active" ? "#10b981" :
                                  s.subStatus === "trialing" ? "#60a5fa" :
                                  s.subStatus === "past_due" ? "#ef4444" :
                                  "#9ca3af",
                              }}
                            >
                              {s.subStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-300">
                            {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es-ES") : "—"}
                          </td>
                          <td className="px-4 py-2 text-gray-400">{s.country ?? "—"}</td>
                          <td className="px-4 py-2">
                            {s.stripeCustomerId ? (
                              <a
                                href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#E63946] hover:underline"
                              >
                                Ver →
                              </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!subscribersQ.data?.length && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                            Sin suscriptores todavía.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-white">Documentos</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-600"
                      style={{ borderColor: "#1e2433", color: "#e2e8f0", backgroundColor: "#131720" }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!docsQ.data?.length) return;
                      downloadCsv(
                        docsQ.data.map((d: any) => ({
                          id: d.id,
                          name: d.name,
                          user: d.userEmail,
                          sizeBytes: d.fileSize,
                          paymentStatus: d.paymentStatus,
                          createdAt: d.createdAt,
                        })),
                        `documents-${new Date().toISOString().slice(0, 10)}.csv`
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: "#1e2433" }}
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>

              {/* Storage by user — top 10 */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1e2433", backgroundColor: "#131720" }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: "#1e2433" }}>
                  <p className="text-sm font-semibold text-white">Top usuarios por almacenamiento (R2)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead style={{ backgroundColor: "#0a0d14" }}>
                      <tr className="text-left text-gray-400">
                        <th className="px-4 py-2 font-medium">Email</th>
                        <th className="px-4 py-2 font-medium">Nombre</th>
                        <th className="px-4 py-2 font-medium text-right">Documentos</th>
                        <th className="px-4 py-2 font-medium text-right">Almacenamiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storageQ.data?.slice(0, 10).map((s: any) => (
                        <tr key={s.userId} className="border-t" style={{ borderColor: "#1e2433" }}>
                          <td className="px-4 py-2 text-white">{s.email}</td>
                          <td className="px-4 py-2 text-gray-300">{s.name || "—"}</td>
                          <td className="px-4 py-2 text-right text-gray-300">{s.docCount}</td>
                          <td className="px-4 py-2 text-right text-gray-200 font-mono">
                            {(() => {
                              const b = Number(s.totalBytes) || 0;
                              if (b < 1024) return `${b} B`;
                              if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
                              if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
                              return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                            })()}
                          </td>
                        </tr>
                      ))}
                      {!storageQ.data?.length && (
                        <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">Sin datos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Documents list */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1e2433", backgroundColor: "#131720" }}>
                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e2433" }}>
                  <p className="text-sm font-semibold text-white">Últimos documentos</p>
                  <p className="text-xs text-gray-500">
                    {docsQ.data?.length ?? 0} resultados
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead style={{ backgroundColor: "#0a0d14" }}>
                      <tr className="text-left text-gray-400">
                        <th className="px-4 py-2 font-medium">Nombre</th>
                        <th className="px-4 py-2 font-medium">Usuario</th>
                        <th className="px-4 py-2 font-medium text-right">Tamaño</th>
                        <th className="px-4 py-2 font-medium">Pago</th>
                        <th className="px-4 py-2 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docsQ.data?.map((d: any) => (
                        <tr key={d.id} className="border-t" style={{ borderColor: "#1e2433" }}>
                          <td className="px-4 py-2 text-white truncate max-w-[260px]">{d.name}</td>
                          <td className="px-4 py-2 text-gray-300">{d.userEmail ?? "—"}</td>
                          <td className="px-4 py-2 text-right text-gray-200 font-mono">
                            {(() => {
                              const b = d.fileSize || 0;
                              if (b < 1024) return `${b} B`;
                              if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
                              return `${(b / (1024 * 1024)).toFixed(1)} MB`;
                            })()}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                backgroundColor: d.paymentStatus === "paid" ? "#10b98120" : "#f59e0b20",
                                color: d.paymentStatus === "paid" ? "#10b981" : "#f59e0b",
                              }}
                            >
                              {d.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-400">
                            {new Date(d.createdAt).toLocaleString("es-ES")}
                          </td>
                        </tr>
                      ))}
                      {!docsQ.data?.length && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Sin documentos.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Gestión de usuarios</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-600"
                      style={{ borderColor: "#1e2433", color: "#e2e8f0", backgroundColor: "#131720" }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!usersQ.data?.length) return;
                      downloadCsv(
                        usersQ.data.map((u: any) => ({
                          id: u.id,
                          name: u.name,
                          email: u.email,
                          role: u.role,
                          country: u.country,
                          subStatus: u.subStatus,
                          plan: u.subPlan,
                          stripeCustomerId: u.stripeCustomerId,
                          currentPeriodEnd: u.currentPeriodEnd,
                          createdAt: u.createdAt,
                          lastSignedIn: u.lastSignedIn,
                        })),
                        `users-${new Date().toISOString().slice(0, 10)}.csv`
                      );
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: "#1e2433" }}
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>

              <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "#1e2433" }}>
                <table className="w-full text-sm min-w-[1300px]">
                  <thead>
                    <tr style={{ backgroundColor: "#0a0d14" }}>
                      {["ID", "Nombre", "Email", "Rol", "Suscripción", "Plan", "ID Pago", "Vence", "Registro", "Último acceso", "Acciones"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usersQ.isLoading ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                          Cargando...
                        </td>
                      </tr>
                    ) : (usersQ.data ?? []).map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          backgroundColor: i % 2 === 0 ? "#131720" : "#0f1117",
                          borderTop: "1px solid #1e2433",
                        }}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{u.id}</td>
                        <td className="px-4 py-3 text-white font-medium">{u.name ?? "\u2014"}</td>
                        <td className="px-4 py-3 text-gray-300">{u.email ?? "\u2014"}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: u.role === "admin" ? "#7c3aed20" : "#1e2433",
                              color: u.role === "admin" ? "#a78bfa" : "#94a3b8",
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.subStatus ? (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                              style={{
                                backgroundColor:
                                  u.subStatus === "active" || u.subStatus === "trialing" ? "#10b98120" :
                                  u.subStatus === "canceled" ? "#ef444420" :
                                  u.subStatus === "past_due" ? "#f59e0b20" :
                                  u.subStatus === "incomplete" ? "#6366f120" : "#1e2433",
                                color:
                                  u.subStatus === "active" || u.subStatus === "trialing" ? "#34d399" :
                                  u.subStatus === "canceled" ? "#f87171" :
                                  u.subStatus === "past_due" ? "#fbbf24" :
                                  u.subStatus === "incomplete" ? "#a5b4fc" : "#94a3b8",
                              }}
                            >
                              {u.subStatus === "active" ? "\u2705 Activa" :
                               u.subStatus === "trialing" ? "\u23F3 Trial" :
                               u.subStatus === "canceled" ? "\u274C Cancelada" :
                               u.subStatus === "past_due" ? "\u26A0\uFE0F Impago" :
                               u.subStatus === "incomplete" ? "\u23F3 Incompleta" : u.subStatus}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Sin suscripci\u00f3n</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {u.subPlan ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                          {u.stripeCustomerId ??"\u2014"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toLocaleDateString("es-ES") : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(u.lastSignedIn).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                promoteUserMut.mutate({
                                  userId: u.id,
                                  role: u.role === "admin" ? "user" : "admin",
                                })
                              }
                              title={u.role === "admin" ? "Quitar admin" : "Hacer admin"}
                              className="p-1.5 rounded transition-colors hover:bg-gray-700"
                              style={{ color: u.role === "admin" ? "#f59e0b" : "#64748b" }}
                            >
                              {u.role === "admin" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                            </button>
                            {u.email && (
                              <a
                                href={`mailto:${u.email}`}
                                className="p-1.5 rounded transition-colors hover:bg-gray-700 text-gray-400 hover:text-blue-400"
                              >
                                <Mail size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar usuario ${u.email}?`)) {
                                  deleteUserMut.mutate({ userId: u.id });
                                }
                              }}
                              className="p-1.5 rounded transition-colors hover:bg-gray-700 text-gray-400 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CANCELED ── */}
          {tab === "canceled" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Usuarios que se han dado de baja</h2>
                <button
                  onClick={() => {
                    if (!canceledQ.data?.length) return;
                    downloadCsv(
                      canceledQ.data.map((c: any) => ({
                        name: c.name,
                        email: c.email,
                        plan: c.plan,
                        canceledAt: c.canceledAt,
                        country: c.country,
                        stripeCustomerId: c.stripeCustomerId,
                      })),
                      `canceled-${new Date().toISOString().slice(0, 10)}.csv`
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ backgroundColor: "#1e2433" }}
                >
                  Exportar CSV
                </button>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1e2433" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "#0a0d14" }}>
                      {["Nombre", "Email", "Plan", "Fecha baja", "País", "ID Pago"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {canceledQ.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          Cargando...
                        </td>
                      </tr>
                    ) : (canceledQ.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No hay bajas registradas
                        </td>
                      </tr>
                    ) : (canceledQ.data ?? []).map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          backgroundColor: i % 2 === 0 ? "#131720" : "#0f1117",
                          borderTop: "1px solid #1e2433",
                        }}
                      >
                        <td className="px-4 py-3 text-white">{u.name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-300">{u.email ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: "#ef444420", color: "#f87171" }}
                          >
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {u.canceledAt
                            ? new Date(u.canceledAt).toLocaleDateString("es-ES")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{u.country ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                          {u.stripeCustomerId ??"—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {tab === "messages" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Mensajes de contacto</h2>
              {messagesQ.isLoading ? (
                <p className="text-gray-400">Cargando...</p>
              ) : (messagesQ.data ?? []).length === 0 ? (
                <p className="text-gray-400">No hay mensajes</p>
              ) : (
                <div className="space-y-2">
                  {(messagesQ.data ?? []).map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-xl border p-4 cursor-pointer transition-colors"
                      style={{
                        backgroundColor: msg.read ? "#131720" : "#1a1f2e",
                        borderColor: msg.read ? "#1e2433" : "#1565C040",
                      }}
                      onClick={() => {
                        setExpandedMsg(expandedMsg === msg.id ? null : msg.id);
                        if (!msg.read) markReadMut.mutate({ id: msg.id });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {!msg.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {msg.name}{" "}
                              <span className="text-gray-400 font-normal">— {msg.email}</span>
                            </p>
                            <p className="text-xs text-gray-400">{msg.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(msg.createdAt).toLocaleDateString("es-ES")}
                          </span>
                          {expandedMsg === msg.id ? (
                            <ChevronUp size={14} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                      {expandedMsg === msg.id && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: "#1e2433" }}>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                          <a
                            href={`mailto:${msg.email}?subject=Re: ${msg.subject}`}
                            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                            style={{ backgroundColor: "#1565C0" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail size={12} />
                            Responder por email
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LEGAL ── */}
          {tab === "legal" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Páginas legales</h2>
              {editingLegal ? (
                <div
                  className="rounded-xl border p-5 space-y-4"
                  style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      Editando:{" "}
                      <span className="text-blue-400">{editingLegal}</span>
                    </h3>
                    <button
                      onClick={() => setEditingLegal(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Título</label>
                    <input
                      type="text"
                      value={legalTitle}
                      onChange={(e) => setLegalTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-600"
                      style={{ borderColor: "#1e2433", color: "#e2e8f0", backgroundColor: "#0f1117" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Contenido (HTML o texto)
                    </label>
                    <textarea
                      value={legalContent}
                      onChange={(e) => setLegalContent(e.target.value)}
                      rows={16}
                      className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono resize-y"
                      style={{ borderColor: "#1e2433", color: "#e2e8f0", backgroundColor: "#0f1117" }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      saveLegalMut.mutate({
                        slug: editingLegal,
                        title: legalTitle,
                        content: legalContent,
                      })
                    }
                    disabled={saveLegalMut.isPending}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: "#1565C0" }}
                  >
                    {saveLegalMut.isPending ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { slug: "terms", title: "Términos de Uso y Contrato" },
                    { slug: "privacy", title: "Política de privacidad" },
                    { slug: "cookies", title: "Política de cookies" },
                    { slug: "legal", title: "Aviso legal" },
                    { slug: "refund", title: "Política de reembolso" },
                  ].map((page) => {
                    const existing = legalQ.data?.find((p) => p.slug === page.slug);
                    return (
                      <div
                        key={page.slug}
                        className="rounded-xl border p-4 flex items-center justify-between"
                        style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{page.title}</p>
                          <p className="text-xs text-gray-400">
                            {existing
                              ? `Actualizado: ${new Date(existing.updatedAt).toLocaleDateString("es-ES")}`
                              : "Sin contenido"}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingLegal(page.slug);
                            setLegalTitle(existing?.title ?? page.title);
                            setLegalContent(existing?.content ?? "");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                          style={{ backgroundColor: "#1565C0" }}
                        >
                          Editar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Ajustes del sitio</h2>

              {/* Site settings */}
              <div
                className="rounded-xl border p-5 space-y-4"
                style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
              >
                <p className="text-sm font-semibold text-white">Configuración del sitio</p>
                {settingsQ.isLoading ? (
                  <p className="text-gray-400 text-sm">Cargando...</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      { key: "site_name", label: "Nombre del sitio", placeholder: brandName },
                      { key: "support_email", label: "Email de soporte", placeholder: "soporte@editorpdf.net" },
                      { key: "trial_price_eur", label: "Precio prueba 7 días (€)", placeholder: "0.99" },
                      { key: "monthly_price_eur", label: "Precio mensual (€)", placeholder: "9.99" },
                    ].map((setting) => {
                      const current =
                        settingsQ.data?.find((s) => s.key === setting.key)?.value ?? "";
                      return (
                        <SettingRow
                          key={setting.key}
                          label={setting.label}
                          defaultValue={current}
                          placeholder={setting.placeholder}
                          onSave={(value) =>
                            saveSettingMut.mutate({ key: setting.key, value })
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {!isFastDoc && tab === "blog" && <BlogAdmin />}
          {!isFastDoc && tab === "trustpilot" && <TrustpilotAdmin />}
        </main>
      </div>
    </div>
  );
}

// ─── SettingRow helper ────────────────────────────────────────
function SettingRow({
  label,
  defaultValue,
  placeholder,
  onSave,
}: {
  label: string;
  defaultValue: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-gray-400 w-44 flex-shrink-0">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-600"
        style={{ borderColor: "#1e2433", color: "#e2e8f0", backgroundColor: "#0f1117" }}
      />
      <button
        onClick={handleSave}
        className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors flex-shrink-0"
        style={{ backgroundColor: saved ? "#10b981" : "#1565C0" }}
      >
        {saved ? "✓ Guardado" : "Guardar"}
      </button>
    </div>
  );
}


