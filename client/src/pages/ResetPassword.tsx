/* =============================================================
   EditorPDF — Reset password page
   Reached from the password-reset email (`?token=xxx`).
   On success, sends user back to /login.
   ============================================================= */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success("Contraseña actualizada");
      setTimeout(() => navigate("/es"), 2500);
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo cambiar la contraseña");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Mínimo 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    resetMutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0A0A0B" }}>
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[#E63946]" />
          <h1 className="text-lg font-bold text-gray-900 mb-2">Enlace inválido</h1>
          <p className="text-sm text-gray-500 mb-5">
            Este enlace de recuperación no es válido o ha caducado. Solicita uno nuevo desde la pantalla de inicio de sesión.
          </p>
          <button
            onClick={() => navigate("/es")}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#0A0A0B" }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0A0A0B" }}>
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center bg-[#0A0A0B] mb-3 relative">
            <Lock className="w-6 h-6 text-white" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#E63946] ring-2 ring-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Crear nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Mínimo 6 caracteres.</p>
        </div>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <p className="text-sm text-gray-700 font-semibold mb-1">Contraseña actualizada</p>
            <p className="text-xs text-gray-500">Redirigiendo…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                style={{ borderColor: "#e2e8f0" }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              style={{ borderColor: "#e2e8f0" }}
            />
            <button
              type="submit"
              disabled={resetMutation.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#E63946" }}
            >
              {resetMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              ) : (
                "Cambiar contraseña"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
