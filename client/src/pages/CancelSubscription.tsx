import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactModal from "@/components/ContactModal";
import {
  AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft,
  XCircle, Clock, HelpCircle, DollarSign, Frown, Zap
} from "lucide-react";

const CANCEL_REASONS = [
  { id: "too_expensive", icon: DollarSign, label: "Es demasiado caro" },
  { id: "not_using", icon: Clock, label: "No lo uso suficiente" },
  { id: "missing_features", icon: Zap, label: "Le faltan funciones que necesito" },
  { id: "found_alternative", icon: XCircle, label: "Encontré una alternativa mejor" },
  { id: "technical_issues", icon: AlertTriangle, label: "Problemas técnicos" },
  { id: "other", icon: HelpCircle, label: "Otro motivo" },
];

type Step = "reason" | "confirm" | "done";

export default function CancelSubscription() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("reason");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherText, setOtherText] = useState("");
  const [contactOpen, setContactOpen] = useState(false);

  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      setStep("done");
    },
    onError: (err: { message: string }) => {
      toast.error("Error al cancelar: " + err.message);
    },
  });

  const { data: subData } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleContinue = () => {
    if (!selectedReason) {
      toast.error("Por favor selecciona un motivo");
      return;
    }
    setStep("confirm");
  };

  const handleConfirmCancel = () => {
    cancelMutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.97 0.005 250)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "oklch(0.75 0.15 50)" }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: "oklch(0.15 0.03 250)" }}>Inicia sesión primero</h2>
            <p className="text-sm mb-4" style={{ color: "oklch(0.45 0.02 250)" }}>Necesitas estar autenticado para gestionar tu suscripción.</p>
            <Button onClick={() => navigate("/")} style={{ backgroundColor: "oklch(0.55 0.22 260)", color: "white" }}>
              Ir al inicio
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "oklch(0.97 0.005 250)" }}>
      <Navbar />

      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-lg">

          {/* Back button */}
          {step !== "done" && (
            <button
              onClick={() => step === "confirm" ? setStep("reason") : navigate("/dashboard")}
              className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
              style={{ color: "oklch(0.55 0.22 260)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              {step === "confirm" ? "Volver" : "Volver al panel"}
            </button>
          )}

          {/* ── STEP 1: Reason ── */}
          {step === "reason" && (
            <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "oklch(0.75 0.15 50 / 0.12)" }}>
                  <Frown className="w-5 h-5" style={{ color: "oklch(0.65 0.15 50)" }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: "oklch(0.15 0.03 250)" }}>Cancelar suscripción</h1>
                  <p className="text-sm" style={{ color: "oklch(0.55 0.02 250)" }}>Sentimos que te vayas, {user?.name?.split(" ")[0] || "usuario"}</p>
                </div>
              </div>

              {/* Subscription info */}
              {subData?.isPremium && (
                <div className="rounded-lg p-3 mb-6 text-sm" style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.06)", color: "oklch(0.35 0.03 260)" }}>
                  <p className="font-medium">Tu suscripción activa seguirá funcionando hasta el final del período actual.</p>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 250)" }}>No se realizarán más cobros tras la cancelación.</p>
                </div>
              )}

              <p className="text-sm font-semibold mb-4" style={{ color: "oklch(0.25 0.03 250)" }}>¿Por qué quieres cancelar?</p>

              <div className="flex flex-col gap-2 mb-6">
                {CANCEL_REASONS.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedReason(id)}
                    className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: selectedReason === id ? "oklch(0.55 0.22 260)" : "oklch(0.90 0.01 250)",
                      backgroundColor: selectedReason === id ? "oklch(0.55 0.22 260 / 0.06)" : "transparent",
                      color: "oklch(0.25 0.03 250)",
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                      backgroundColor: selectedReason === id ? "oklch(0.55 0.22 260 / 0.12)" : "oklch(0.96 0.005 250)",
                    }}>
                      <Icon className="w-4 h-4" style={{ color: selectedReason === id ? "oklch(0.55 0.22 260)" : "oklch(0.55 0.02 250)" }} />
                    </div>
                    <span className="text-sm">{label}</span>
                    {selectedReason === id && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />}
                  </button>
                ))}
              </div>

              {selectedReason === "other" && (
                <textarea
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Cuéntanos más (opcional)..."
                  rows={3}
                  className="w-full rounded-xl border p-3 text-sm resize-none mb-4 outline-none focus:ring-2"
                  style={{
                    borderColor: "oklch(0.85 0.01 250)",
                    color: "oklch(0.25 0.03 250)",
                    backgroundColor: "oklch(0.98 0.003 250)",
                  }}
                />
              )}

              {/* Retention offer */}
              <div className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: "oklch(0.97 0.01 150 / 0.5)", borderColor: "oklch(0.75 0.12 150 / 0.3)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.30 0.10 150)" }}>¿Sabías que puedes pausar tu suscripción?</p>
                <p className="text-xs" style={{ color: "oklch(0.45 0.08 150)" }}>Contacta con soporte y pausamos tu cuenta hasta 3 meses sin perder tus documentos.</p>
                <button
                  onClick={() => setContactOpen(true)}
                  className="text-xs font-semibold mt-2 hover:underline"
                  style={{ color: "oklch(0.40 0.12 150)" }}
                >
                  Contactar soporte →
                </button>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2"
                style={{ backgroundColor: "oklch(0.55 0.22 260)", color: "white" }}
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Confirm ── */}
          {step === "confirm" && (
            <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "oklch(0.65 0.20 20 / 0.10)" }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: "oklch(0.55 0.20 20)" }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: "oklch(0.15 0.03 250)" }}>Confirmar cancelación</h1>
                  <p className="text-sm" style={{ color: "oklch(0.55 0.02 250)" }}>Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: "oklch(0.65 0.20 20 / 0.05)", borderColor: "oklch(0.65 0.20 20 / 0.20)" }}>
                <p className="text-sm font-semibold mb-3" style={{ color: "oklch(0.30 0.12 20)" }}>Al cancelar perderás acceso a:</p>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "Descarga de documentos editados",
                    "Historial de documentos guardados",
                    "Herramientas avanzadas del editor",
                    "Soporte prioritario",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.40 0.10 20)" }}>
                      <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.55 0.20 20)" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-center mb-6" style={{ color: "oklch(0.55 0.02 250)" }}>
                Tu suscripción permanecerá activa hasta el final del período de facturación actual. No se realizarán más cobros.
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleConfirmCancel}
                  disabled={cancelMutation.isPending}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  {cancelMutation.isPending ? "Cancelando..." : "Sí, cancelar mi suscripción"}
                </Button>
                <Button
                  onClick={() => setStep("reason")}
                  className="w-full"
                  style={{ backgroundColor: "oklch(0.55 0.22 260)", color: "white" }}
                >
                  No, mantener mi suscripción
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === "done" && (
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center" style={{ borderColor: "oklch(0.90 0.01 250)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "oklch(0.75 0.12 150 / 0.15)" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "oklch(0.55 0.15 150)" }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "oklch(0.15 0.03 250)" }}>Suscripción cancelada</h1>
              <p className="text-sm mb-6" style={{ color: "oklch(0.45 0.02 250)" }}>
                Tu suscripción ha sido cancelada correctamente. Seguirás teniendo acceso hasta el final del período actual.
              </p>

              <div className="rounded-xl p-4 mb-6 text-left" style={{ backgroundColor: "oklch(0.96 0.005 250)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.35 0.02 250)" }}>¿Cambias de opinión?</p>
                <p className="text-xs" style={{ color: "oklch(0.55 0.02 250)" }}>Puedes reactivar tu suscripción en cualquier momento desde tu panel de usuario.</p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full"
                  style={{ backgroundColor: "oklch(0.55 0.22 260)", color: "white" }}
                >
                  Ir a mi panel
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full"
                >
                  Volver al inicio
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
