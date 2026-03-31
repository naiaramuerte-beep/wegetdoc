/**
 * TrustpilotAdmin — Panel de gestión de reseñas Trustpilot
 *
 * MODO DEMO: Muestra datos de ejemplo realistas.
 * Para conectar la API real de Trustpilot:
 *   1. Obtén tu Business Unit ID desde Trustpilot Business Portal
 *   2. Añade TRUSTPILOT_API_KEY en Settings → Secrets del panel de administración
 *   3. Cambia DEMO_MODE = false y activa el endpoint en server/routers.ts
 *
 * API Trustpilot: https://developers.trustpilot.com/
 */
import { useState } from "react";
import {
  Star, MessageSquare, ThumbsUp, Filter, RefreshCw,
  ExternalLink, ChevronDown, ChevronUp, Send, X, AlertCircle,
  TrendingUp, Award, Globe, Clock
} from "lucide-react";

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_STATS = {
  trustScore: 4.3,
  numberOfReviews: 127,
  stars: {
    five: 78,
    four: 24,
    three: 12,
    two: 8,
    one: 5,
  },
  lastUpdated: new Date().toISOString(),
};

const DEMO_REVIEWS = [
  {
    id: "r1",
    stars: 5,
    title: "Excelente editor de PDF online",
    text: "Llevo meses usando CloudPDF y es sin duda la mejor herramienta que he encontrado. La interfaz es intuitiva, rápida y hace exactamente lo que promete. Muy recomendable.",
    author: "María García",
    date: "2026-03-15T10:30:00Z",
    language: "es",
    replied: false,
    replyText: "",
    verified: true,
  },
  {
    id: "r2",
    stars: 5,
    title: "Perfect for daily use",
    text: "I use CloudPDF every day for my work documents. The conversion quality is outstanding and the interface is clean and easy to use. Worth every penny!",
    author: "James Wilson",
    date: "2026-03-14T15:20:00Z",
    language: "en",
    replied: true,
    replyText: "Thank you so much, James! We're thrilled to hear CloudPDF is part of your daily workflow. We'll keep improving the tool for you.",
    verified: true,
  },
  {
    id: "r3",
    stars: 4,
    title: "Muy buena herramienta, con alguna mejora pendiente",
    text: "En general estoy muy satisfecho. La edición de texto funciona perfectamente y la firma digital es muy cómoda. Echo de menos poder editar imágenes dentro del PDF con más opciones.",
    author: "Carlos Martínez",
    date: "2026-03-12T09:15:00Z",
    language: "es",
    replied: false,
    replyText: "",
    verified: true,
  },
  {
    id: "r4",
    stars: 5,
    title: "Ottimo servizio, lo consiglio!",
    text: "Ho provato molti editor PDF online ma questo è il migliore. Veloce, preciso e con tutte le funzionalità che servono. La prova di 7 giorni è stata sufficiente per convincermi.",
    author: "Luca Bianchi",
    date: "2026-03-11T14:00:00Z",
    language: "it",
    replied: false,
    replyText: "",
    verified: true,
  },
  {
    id: "r5",
    stars: 3,
    title: "Bien pero podría mejorar la velocidad",
    text: "La herramienta funciona bien para documentos pequeños, pero con PDFs de más de 50 páginas se vuelve algo lenta. El soporte respondió rápido a mis dudas, eso sí.",
    author: "Ana López",
    date: "2026-03-10T11:45:00Z",
    language: "es",
    replied: true,
    replyText: "Hola Ana, gracias por tu feedback. Estamos trabajando activamente en mejorar el rendimiento para documentos grandes. ¡Pronto verás mejoras notables!",
    verified: false,
  },
  {
    id: "r6",
    stars: 5,
    title: "Meilleur éditeur PDF en ligne",
    text: "J'ai essayé de nombreux outils similaires mais CloudPDF est clairement le meilleur. L'interface est moderne, les fonctionnalités sont complètes et le prix est très raisonnable.",
    author: "Sophie Dubois",
    date: "2026-03-09T16:30:00Z",
    language: "fr",
    replied: false,
    replyText: "",
    verified: true,
  },
  {
    id: "r7",
    stars: 2,
    title: "Problemas con la descarga",
    text: "Tuve problemas para descargar el archivo después de editarlo. El soporte tardó un poco en responder, aunque al final lo solucionaron. Esperaba más fluidez.",
    author: "Roberto Silva",
    date: "2026-03-08T08:20:00Z",
    language: "es",
    replied: false,
    replyText: "",
    verified: false,
  },
  {
    id: "r8",
    stars: 4,
    title: "Great tool, minor UI improvements needed",
    text: "Overall a fantastic PDF editor. The annotation tools are excellent and the merge/split functionality works flawlessly. The mobile experience could be improved slightly.",
    author: "Emma Johnson",
    date: "2026-03-07T13:10:00Z",
    language: "en",
    replied: false,
    replyText: "",
    verified: true,
  },
];

type FilterStars = "all" | "5" | "4" | "3" | "2" | "1";
type FilterReplied = "all" | "pending" | "replied";
type FilterLang = "all" | "es" | "en" | "fr" | "de" | "it";

interface Review {
  id: string;
  stars: number;
  title: string;
  text: string;
  author: string;
  date: string;
  language: string;
  replied: boolean;
  replyText: string;
  verified: boolean;
}

// ─── Star display ─────────────────────────────────────────────────────────────
function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= value ? "fill-[#00b67a] text-[#00b67a]" : "fill-gray-600 text-gray-600"}
        />
      ))}
    </div>
  );
}

// ─── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ score }: { score: number }) {
  const bg =
    score >= 4.5 ? "#00b67a" :
    score >= 4.0 ? "#73cf11" :
    score >= 3.5 ? "#ffce00" :
    score >= 2.5 ? "#ff8622" : "#ff3722";
  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white"
      style={{ backgroundColor: bg }}
    >
      {score.toFixed(1)}
    </div>
  );
}

// ─── Bar chart for star distribution ─────────────────────────────────────────
function StarDistribution({ stars, total }: { stars: typeof DEMO_STATS.stars; total: number }) {
  const rows = [
    { label: "5 ★", count: stars.five, color: "#00b67a" },
    { label: "4 ★", count: stars.four, color: "#73cf11" },
    { label: "3 ★", count: stars.three, color: "#ffce00" },
    { label: "2 ★", count: stars.two, color: "#ff8622" },
    { label: "1 ★", count: stars.one, color: "#ff3722" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8 text-right">{row.label}</span>
          <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${total > 0 ? (row.count / total) * 100 : 0}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
          <span className="text-xs text-gray-400 w-6 text-right">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({
  review,
  onReply,
}: {
  review: Review;
  onReply: (id: string, text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyDraft, setReplyDraft] = useState(review.replyText || "");
  const [sending, setSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyDraft.trim()) return;
    setSending(true);
    // Simulate API call delay
    await new Promise((r) => setTimeout(r, 800));
    onReply(review.id, replyDraft);
    setSending(false);
    setShowReplyBox(false);
  };

  const flagEmoji: Record<string, string> = {
    es: "🇪🇸", en: "🇬🇧", fr: "🇫🇷", de: "🇩🇪", it: "🇮🇹", pt: "🇵🇹",
  };

  return (
    <div
      className="rounded-xl border p-4 space-y-3 transition-all"
      style={{ backgroundColor: "#131720", borderColor: review.replied ? "#1e3a2e" : "#1e2433" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
            style={{ backgroundColor: "oklch(0.35 0.12 260)" }}
          >
            {review.author.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white">{review.author}</span>
              {review.verified && (
                <span className="text-xs px-1.5 py-0.5 rounded text-green-400 bg-green-900/30 border border-green-800/50">
                  Verificado
                </span>
              )}
              <span className="text-xs text-gray-500">
                {flagEmoji[review.language] ?? "🌐"} {review.language.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating value={review.stars} size={13} />
              <span className="text-xs text-gray-500">
                {new Date(review.date).toLocaleDateString("es-ES", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {review.replied ? (
            <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-800/50">
              Respondida
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/50">
              Sin respuesta
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-sm font-medium text-white mb-1">{review.title}</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          {expanded || review.text.length <= 150
            ? review.text
            : `${review.text.slice(0, 150)}...`}
        </p>
        {review.text.length > 150 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-1"
          >
            {expanded ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver más</>}
          </button>
        )}
      </div>

      {/* Existing reply */}
      {review.replied && review.replyText && (
        <div
          className="rounded-lg p-3 border-l-2 ml-4"
          style={{ backgroundColor: "#0f1117", borderLeftColor: "#00b67a" }}
        >
          <p className="text-xs font-medium text-green-400 mb-1">Respuesta de CloudPDF</p>
          <p className="text-xs text-gray-400">{review.replyText}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {!review.replied && (
          <button
            onClick={() => setShowReplyBox(!showReplyBox)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: showReplyBox ? "oklch(0.28 0.08 260)" : "#1e2433", color: "#e2e8f0" }}
          >
            <MessageSquare size={12} />
            Responder
          </button>
        )}
        <a
          href={`https://www.trustpilot.com/reviews/${review.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
          style={{ backgroundColor: "#1e2433" }}
          onClick={(e) => e.preventDefault()} // Demo: prevent navigation
        >
          <ExternalLink size={12} />
          Ver en Trustpilot
        </a>
        {review.stars <= 2 && (
          <span className="flex items-center gap-1 text-xs text-amber-400 ml-auto">
            <AlertCircle size={12} />
            Requiere atención
          </span>
        )}
      </div>

      {/* Reply box */}
      {showReplyBox && (
        <div className="space-y-2 pt-1">
          <textarea
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder="Escribe tu respuesta pública para esta reseña..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm border bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            style={{ borderColor: "#2d3748", color: "#e2e8f0", backgroundColor: "#0f1117" }}
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowReplyBox(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
            >
              <X size={12} className="inline mr-1" />
              Cancelar
            </button>
            <button
              onClick={handleSendReply}
              disabled={sending || !replyDraft.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "oklch(0.55 0.22 260)" }}
            >
              {sending ? (
                <><RefreshCw size={12} className="animate-spin" /> Enviando...</>
              ) : (
                <><Send size={12} /> Publicar respuesta</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TrustpilotAdmin() {
  const [reviews, setReviews] = useState<Review[]>(DEMO_REVIEWS);
  const [filterStars, setFilterStars] = useState<FilterStars>("all");
  const [filterReplied, setFilterReplied] = useState<FilterReplied>("all");
  const [filterLang, setFilterLang] = useState<FilterLang>("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing(false);
  };

  const handleReply = (id: string, text: string) => {
    setReviews((prev) =>
      prev.map((r) => r.id === id ? { ...r, replied: true, replyText: text } : r)
    );
  };

  const filtered = reviews.filter((r) => {
    if (filterStars !== "all" && r.stars !== parseInt(filterStars)) return false;
    if (filterReplied === "pending" && r.replied) return false;
    if (filterReplied === "replied" && !r.replied) return false;
    if (filterLang !== "all" && r.language !== filterLang) return false;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.replied).length;
  const avgScore = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;

  return (
    <div className="space-y-6">
      {/* Demo banner */}
      <div
        className="rounded-xl p-4 border flex items-start gap-3"
        style={{ backgroundColor: "#1a1a2e", borderColor: "#2d2d5e" }}
      >
        <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-300">Modo demostración activo</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Los datos mostrados son de ejemplo. Para conectar tu cuenta real de Trustpilot,
            añade tu <strong className="text-gray-300">Business Unit ID</strong> y{" "}
            <strong className="text-gray-300">API Key</strong> en Ajustes → Secrets.{" "}
            <a
              href="https://developers.trustpilot.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Ver documentación →
            </a>
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <img
              src="https://cdn.trustpilot.net/brand-assets/4.1.0/logo-white.svg"
              alt="Trustpilot"
              className="h-5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            Reseñas
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Gestiona y responde las reseñas de tus clientes
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
          style={{ backgroundColor: "#1e2433" }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "TrustScore",
            value: DEMO_STATS.trustScore.toFixed(1),
            sub: "de 5.0",
            icon: <Award size={18} />,
            color: "#00b67a",
          },
          {
            label: "Total reseñas",
            value: DEMO_STATS.numberOfReviews,
            sub: "verificadas",
            icon: <Star size={18} />,
            color: "#3b82f6",
          },
          {
            label: "Sin responder",
            value: pendingCount,
            sub: "requieren atención",
            icon: <MessageSquare size={18} />,
            color: pendingCount > 0 ? "#f59e0b" : "#10b981",
          },
          {
            label: "Promedio local",
            value: avgScore.toFixed(1),
            sub: `${reviews.length} reseñas`,
            icon: <TrendingUp size={18} />,
            color: "#8b5cf6",
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
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.color + "20", color: card.color }}
              >
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Score + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score visual */}
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
        >
          <p className="text-sm font-medium text-white mb-4">Puntuación global</p>
          <div className="flex items-center gap-5">
            <ScorePill score={DEMO_STATS.trustScore} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StarRating value={Math.round(DEMO_STATS.trustScore)} size={18} />
                <span className="text-lg font-bold text-white">{DEMO_STATS.trustScore}</span>
              </div>
              <p className="text-xs text-gray-400">
                Basado en {DEMO_STATS.numberOfReviews} reseñas verificadas
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Globe size={12} className="text-gray-500" />
                <span className="text-xs text-gray-500">cloud-pdf.net</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#1e2433" }}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={12} />
              Última actualización: {new Date(DEMO_STATS.lastUpdated).toLocaleString("es-ES")}
            </div>
          </div>
        </div>

        {/* Distribution */}
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
        >
          <p className="text-sm font-medium text-white mb-4">Distribución de estrellas</p>
          <StarDistribution stars={DEMO_STATS.stars} total={DEMO_STATS.numberOfReviews} />
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-4 border flex flex-wrap items-center gap-3"
        style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
      >
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Filter size={13} />
          Filtrar:
        </div>

        {/* Stars filter */}
        <div className="flex items-center gap-1">
          {(["all", "5", "4", "3", "2", "1"] as FilterStars[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStars(s)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterStars === s ? "oklch(0.28 0.08 260)" : "#1e2433",
                color: filterStars === s ? "white" : "#94a3b8",
              }}
            >
              {s === "all" ? "Todas" : `${s}★`}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-700" />

        {/* Replied filter */}
        <div className="flex items-center gap-1">
          {([
            { id: "all", label: "Todas" },
            { id: "pending", label: "Sin responder" },
            { id: "replied", label: "Respondidas" },
          ] as { id: FilterReplied; label: string }[]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterReplied(f.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterReplied === f.id ? "oklch(0.28 0.08 260)" : "#1e2433",
                color: filterReplied === f.id ? "white" : "#94a3b8",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-700" />

        {/* Language filter */}
        <div className="flex items-center gap-1">
          {([
            { id: "all", label: "Todos" },
            { id: "es", label: "🇪🇸 ES" },
            { id: "en", label: "🇬🇧 EN" },
            { id: "fr", label: "🇫🇷 FR" },
            { id: "it", label: "🇮🇹 IT" },
          ] as { id: FilterLang; label: string }[]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterLang(f.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterLang === f.id ? "oklch(0.28 0.08 260)" : "#1e2433",
                color: filterLang === f.id ? "white" : "#94a3b8",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-500">
          {filtered.length} de {reviews.length} reseñas
        </span>
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div
            className="rounded-xl p-8 border text-center"
            style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
          >
            <ThumbsUp size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No hay reseñas con los filtros seleccionados</p>
          </div>
        ) : (
          filtered.map((review) => (
            <ReviewCard key={review.id} review={review} onReply={handleReply} />
          ))
        )}
      </div>

      {/* Integration guide */}
      <div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: "#131720", borderColor: "#1e2433" }}
      >
        <p className="text-sm font-semibold text-white mb-3">
          Cómo conectar la API real de Trustpilot
        </p>
        <ol className="space-y-2 text-xs text-gray-400">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">1</span>
            Crea tu cuenta en{" "}
            <a href="https://business.trustpilot.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              business.trustpilot.com
            </a>{" "}
            y verifica tu dominio <strong className="text-gray-300">cloud-pdf.net</strong>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">2</span>
            Ve a <strong className="text-gray-300">Integrations → API</strong> y crea una aplicación para obtener tu API Key y Business Unit ID
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">3</span>
            En el panel de administración, ve a <strong className="text-gray-300">Settings → Secrets</strong> y añade:
            <code className="px-1.5 py-0.5 rounded bg-gray-800 text-green-400">TRUSTPILOT_API_KEY</code> y{" "}
            <code className="px-1.5 py-0.5 rounded bg-gray-800 text-green-400">TRUSTPILOT_BUSINESS_UNIT_ID</code>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">4</span>
            Avisa al equipo de CloudPDF para activar el endpoint real en el servidor y desactivar el modo demo
          </li>
        </ol>
      </div>
    </div>
  );
}
