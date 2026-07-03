import { useEffect, useState } from "react";

/**
 * Hidden route (/internal-test) to toggle the internal-test flag. When ON,
 * localStorage.internal_test === "1" and ALL analytics are suppressed
 * (GA4/Hotjar funnel events via trackEvent + the Google Ads conversion on
 * /payment/success). Affects only THIS browser. Visiting the page enables it.
 */
export default function InternalTest() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("internal_test", "1");
      setEnabled(true);
    } catch {
      /* localStorage blocked */
    }
  }, []);

  const enable = () => {
    try { localStorage.setItem("internal_test", "1"); setEnabled(true); } catch {}
  };
  const disable = () => {
    try { localStorage.removeItem("internal_test"); setEnabled(false); } catch {}
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0B", color: "#fff", fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <div style={{ fontSize: 52 }}>{enabled ? "🧪" : "📊"}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "14px 0 6px" }}>Modo prueba interna</h1>
        <p style={{ color: enabled ? "#4ade80" : "#f59e0b", fontWeight: 700, fontSize: 16 }}>
          {enabled ? "✅ Analytics DESACTIVADO en este navegador" : "⚠️ Analytics ACTIVO"}
        </p>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>
          Con el modo activo, tus pruebas <strong>NO</strong> envían eventos a GA4, Hotjar ni
          conversiones de Google Ads. Solo afecta a <strong>este navegador</strong> (se guarda en localStorage).
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}>
          {enabled ? (
            <button onClick={disable} style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid #334155", background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Reactivar analytics
            </button>
          ) : (
            <button onClick={enable} style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: "#E63946", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Activar modo prueba
            </button>
          )}
        </div>
        <p style={{ color: "#475569", fontSize: 12, marginTop: 24 }}>editorpdf.net · uso interno</p>
      </div>
    </div>
  );
}
