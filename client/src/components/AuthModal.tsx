/* =============================================================
   EditorPDF AuthModal — Sign Up + Login
   ============================================================= */
import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
  onSuccess?: () => void;
}

// Google SVG icon
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal({ open, onClose, defaultMode = "signup", onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(defaultMode);

  // Sync mode when defaultMode changes or modal opens
  useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const utils = trpc.useUtils();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success("¡Perfil configurado exitosamente!");
      utils.auth.me.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Error al registrarse");
    },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("¡Bienvenido de nuevo!");
      utils.auth.me.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Email o contraseña incorrectos");
    },
  });

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      toast.success("Si el email existe, recibirás un enlace de recuperación");
      setMode("login");
    },
    onError: () => {
      toast.error("Error al enviar el email");
    },
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      registerMutation.mutate({ email, password, name: name || undefined });
    } else if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else if (mode === "forgot") {
      forgotMutation.mutate({ email: forgotEmail });
    }
  };

  const isLoading = registerMutation.isPending || loginMutation.isPending || forgotMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6"
        style={{ backgroundColor: "#fff" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Mode label */}
        <p className="text-xs font-medium text-gray-400 mb-2">
          {mode === "signup" ? "Sign up" : mode === "login" ? "Login" : "Forgot password"}
        </p>

        {/* Title */}
        {mode === "signup" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
              Get started with our 7-day trial plan
            </h2>
            <p className="text-sm text-gray-500 mb-5">Sign up with your social media or email.</p>
          </>
        )}
        {mode === "login" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
              Welcome Back!
            </h2>
            <p className="text-sm text-gray-500 mb-5">Sign in with your social networks or complete your details.</p>
          </>
        )}
        {mode === "forgot" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
              Reset your password
            </h2>
            <p className="text-sm text-gray-500 mb-5">Enter your email and we'll send you a reset link.</p>
          </>
        )}

        {/* Forgot password form */}
        {mode === "forgot" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="name@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: isLoading ? "#9ca3af" : "#1565C0" }}
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              Send reset link
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-center text-gray-500 hover:text-blue-700"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Full name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Forgot password link (login only) */}
            {mode === "login" && (
              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                >
                  Did you forget your password? <span className="underline">Click here</span>
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all mt-1"
              style={{ backgroundColor: isLoading ? "#9ca3af" : "#6b7280" }}
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {mode === "signup" ? "Create an account" : "Login"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google button — uses direct Google OAuth (shows "EditorPDF" on consent screen) */}
            <a
              href={`/api/auth/google?origin=${encodeURIComponent(window.location.origin)}&returnPath=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2.5 hover:bg-gray-50 transition-colors"
            >
              <GoogleIcon />
              {mode === "signup" ? "Create account with Google" : "Sign in with Google"}
            </a>

            {/* Switch mode */}
            {mode === "signup" ? (
              <p className="text-xs text-center text-gray-500 mt-1">
                I already have an account{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-orange-500 font-semibold hover:underline"
                >
                  Login
                </button>
              </p>
            ) : (
              <p className="text-xs text-center text-gray-500 mt-1">
                You do not have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-orange-500 font-semibold hover:underline"
                >
                  Create an account
                </button>
              </p>
            )}

            {/* Legal */}
            {mode === "signup" && (
              <p className="text-[10px] text-center text-gray-400 mt-1 leading-relaxed">
                By creating an account, you acknowledge that you have read and agree to the{" "}
                <a href="/es/terms" className="underline hover:text-gray-600">Terms of Use and Contract</a>{" "}
                and the{" "}
                <a href="/es/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
