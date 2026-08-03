import { useLanguage } from "@/contexts/LanguageContext";

// Document-loading / processing screen, styled after the reference but in the
// EditorPDF brand (ink + red, our isotype). Responsive (stacks on mobile) and
// translated in all 12 site languages via a local STRINGS map (same pattern as
// ContactModal / PaymentRetry). Shows real progress when given, an indeterminate
// animated bar otherwise.
type Strings = { badge: string; status: string; title: string; subtitle: string; tipLabel: string; tip: string };

const STRINGS: Record<string, Strings> = {
  es: { badge: "PROCESANDO", status: "En curso", title: "Cargando, por favor espera", subtitle: "Estamos preparando tu documento. Tardará solo unos segundos.", tipLabel: "Consejo rápido:", tip: "haz las ediciones o modificaciones que necesites en tu documento." },
  en: { badge: "PROCESSING", status: "Working", title: "Loading, please wait", subtitle: "We're preparing your document. It'll only take a few seconds.", tipLabel: "Quick tip:", tip: "make any edits or changes you need in your document." },
  fr: { badge: "TRAITEMENT", status: "En cours", title: "Chargement, veuillez patienter", subtitle: "Nous préparons votre document. Cela ne prendra que quelques secondes.", tipLabel: "Astuce :", tip: "effectuez les modifications nécessaires sur votre document." },
  de: { badge: "VERARBEITUNG", status: "Läuft", title: "Wird geladen, bitte warten", subtitle: "Wir bereiten Ihr Dokument vor. Es dauert nur wenige Sekunden.", tipLabel: "Kurzer Tipp:", tip: "nehmen Sie die gewünschten Änderungen an Ihrem Dokument vor." },
  pt: { badge: "A PROCESSAR", status: "Em curso", title: "A carregar, aguarde por favor", subtitle: "Estamos a preparar o seu documento. Demora apenas alguns segundos.", tipLabel: "Dica rápida:", tip: "faça as edições ou alterações que precisar no seu documento." },
  it: { badge: "ELABORAZIONE", status: "In corso", title: "Caricamento, attendere prego", subtitle: "Stiamo preparando il tuo documento. Ci vorranno solo pochi secondi.", tipLabel: "Consiglio rapido:", tip: "apporta le modifiche necessarie al tuo documento." },
  nl: { badge: "VERWERKEN", status: "Bezig", title: "Laden, even geduld", subtitle: "We bereiden je document voor. Het duurt maar een paar seconden.", tipLabel: "Snelle tip:", tip: "breng de bewerkingen of wijzigingen aan die je nodig hebt in je document." },
  pl: { badge: "PRZETWARZANIE", status: "W toku", title: "Ładowanie, proszę czekać", subtitle: "Przygotowujemy Twój dokument. Zajmie to tylko kilka sekund.", tipLabel: "Szybka wskazówka:", tip: "wprowadź potrzebne zmiany w swoim dokumencie." },
  ru: { badge: "ОБРАБОТКА", status: "В процессе", title: "Загрузка, пожалуйста, подождите", subtitle: "Мы готовим ваш документ. Это займёт всего несколько секунд.", tipLabel: "Быстрый совет:", tip: "внесите нужные правки или изменения в документ." },
  uk: { badge: "ОБРОБКА", status: "У процесі", title: "Завантаження, будь ласка, зачекайте", subtitle: "Ми готуємо ваш документ. Це займе лише кілька секунд.", tipLabel: "Швидка порада:", tip: "внесіть потрібні правки чи зміни у ваш документ." },
  ro: { badge: "PROCESARE", status: "În curs", title: "Se încarcă, vă rugăm așteptați", subtitle: "Pregătim documentul tău. Va dura doar câteva secunde.", tipLabel: "Sfat rapid:", tip: "fă modificările de care ai nevoie în documentul tău." },
  zh: { badge: "处理中", status: "进行中", title: "正在加载，请稍候", subtitle: "我们正在准备您的文档，只需几秒钟。", tipLabel: "小提示：", tip: "在您的文档中进行所需的编辑或修改。" },
};

function DocArt() {
  return (
    <div className="relative w-[132px] h-[120px] flex-shrink-0" aria-hidden="true">
      <div className="absolute rounded-[26px]" style={{ width: 64, height: 64, top: 2, left: 8, background: "#FEE7EA", filter: "blur(2px)" }} />
      <div className="absolute rounded-[26px]" style={{ width: 52, height: 52, bottom: 4, right: 6, background: "#EAF0FB", opacity: 0.8, filter: "blur(2px)" }} />
      <div className="absolute bg-white" style={{ top: 16, left: 30, width: 76, height: 92, border: "2px solid #0A0A0B", borderRadius: 12, boxShadow: "0 10px 20px -10px rgba(10,10,11,.25)" }}>
        <div className="absolute" style={{ top: -2, right: -2, width: 22, height: 22, background: "#fff", borderLeft: "2px solid #0A0A0B", borderBottom: "2px solid #0A0A0B", borderRadius: "0 10px 0 8px" }} />
        <div className="absolute rounded-[3px]" style={{ left: 14, top: 24, width: 44, height: 5, background: "#E63946", opacity: 0.85 }} />
        <div className="absolute rounded-[3px]" style={{ left: 14, top: 38, width: 40, height: 5, background: "#E3E3E8" }} />
        <div className="absolute rounded-[3px]" style={{ left: 14, top: 50, width: 46, height: 5, background: "#E3E3E8" }} />
        <div className="absolute rounded-[3px]" style={{ left: 14, top: 62, width: 32, height: 5, background: "#E3E3E8" }} />
      </div>
      {/* isotype badge */}
      <div className="absolute flex items-center justify-center" style={{ top: 6, left: 16, width: 30, height: 30, background: "#0A0A0B", borderRadius: 9, boxShadow: "0 6px 14px -6px rgba(10,10,11,.5)" }}>
        <svg width="17" height="17" viewBox="0 0 512 512" fill="none">
          <path d="M176 180v152M176 180h82a50 50 0 010 100h-82" stroke="white" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="352" cy="352" r="34" fill="#E63946" />
        </svg>
      </div>
      {/* success check */}
      <div className="absolute flex items-center justify-center text-white" style={{ bottom: 8, right: 6, width: 34, height: 34, background: "#16a34a", borderRadius: "50%", boxShadow: "0 8px 16px -8px rgba(22,163,74,.7)" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
}

export default function DocumentLoadingCard({
  progress,
  stepLabel,
  fileName,
}: {
  progress?: number;      // 0-100; undefined = indeterminate animated bar
  stepLabel?: string;     // e.g. "Reading…" (already translated by the caller)
  fileName?: string;
}) {
  const { lang } = useLanguage();
  const s = STRINGS[lang] ?? STRINGS.en;
  const indeterminate = progress == null;
  const pct = Math.max(0, Math.min(100, Math.round(progress ?? 0)));
  const done = pct === 100;

  return (
    <div className="w-full min-h-[420px] flex items-center justify-center px-4 py-10 rounded-2xl" style={{ background: "#F4F4F6" }}>
      <style>{`@keyframes dlIndeterminate{0%{width:12%}70%{width:82%}100%{width:12%}}`}</style>
      <div className="w-full max-w-[560px] bg-white border border-[#ECECEF] rounded-[20px] p-6 sm:p-7" style={{ boxShadow: "0 30px 60px -34px rgba(10,10,11,.35)" }}>

        {/* top row */}
        <div className="flex items-center justify-between mb-5">
          <span className="inline-flex items-center gap-2 bg-[#FEE7EA] text-[#E63946] font-extrabold text-[12.5px] tracking-[0.08em] px-3 py-1.5 rounded-full">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" fill="currentColor" /></svg>
            {s.badge}
          </span>
          <span className="inline-flex items-center gap-2 text-[12px] font-bold text-[#6B7280] bg-[#F4F4F6] border border-[#ECECEF] px-2.5 py-1.5 rounded-full">
            <span className="w-[7px] h-[7px] rounded-full bg-[#E63946] animate-pulse" /> {s.status}
          </span>
        </div>

        {/* body */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[22px] sm:text-[26px] font-extrabold text-[#0A0A0B] tracking-[-0.02em] leading-[1.12]" style={{ textWrap: "balance" as any }}>{s.title}</h2>
            <p className="mt-2.5 text-[15px] text-[#6B7280] leading-relaxed max-w-[320px]">{s.subtitle}</p>
            {fileName ? <p className="mt-1.5 text-[13px] text-[#9AA3B2] truncate max-w-[320px]">{fileName}</p> : null}
          </div>
          <DocArt />
        </div>

        {/* progress */}
        <div className="h-2 rounded-full bg-[#EEEEF1] overflow-hidden mt-5 mb-3">
          <div
            className={`h-full rounded-full ${indeterminate ? "" : "transition-all duration-300 ease-out"}`}
            style={{
              width: indeterminate ? "60%" : `${pct}%`,
              background: done ? "#16a34a" : "linear-gradient(90deg,#E63946,#C82F3B)",
              animation: indeterminate ? "dlIndeterminate 2.4s ease-in-out infinite" : undefined,
            }}
          />
        </div>
        {(stepLabel || !indeterminate) && (
          <div className="flex justify-between mb-4">
            <span className="text-[12px] font-medium text-[#6B7280]">{stepLabel ?? ""}</span>
            {!indeterminate && <span className="text-[12px] font-bold text-[#E63946]">{pct}%</span>}
          </div>
        )}

        {/* tip */}
        <div className="flex items-center gap-3 bg-[#FBFBFC] border border-[#ECECEF] rounded-[14px] px-4 py-3">
          <span className="w-9 h-9 rounded-[10px] bg-[#FEE7EA] text-[#E63946] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.4 1 1.1 1 1.8v.3h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0012 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <p className="text-[13px] leading-snug"><b className="text-[#0A0A0B]">{s.tipLabel}</b> <span className="text-[#6B7280]">{s.tip}</span></p>
        </div>
      </div>
    </div>
  );
}
