/* =============================================================
   EditorPDF AuthModal — Sign Up + Login
   ============================================================= */
import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Mail, Lock, User as UserIcon, Loader2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthStrings } from "@/lib/authModalStrings";


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
  const { t, lang } = useLanguage();
  const s = getAuthStrings(lang);
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
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [gdprError, setGdprError] = useState(false);

  const utils = trpc.useUtils();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success(s.registerSuccess);
      utils.auth.me.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || s.registerError);
    },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success(s.loginSuccess);
      utils.auth.me.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || s.loginError);
    },
  });

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      toast.success(s.forgotSent);
      setMode("login");
    },
    onError: () => {
      toast.error(s.forgotError);
    },
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!gdprAccepted) {
        setGdprError(true);
        toast.error(s.gdprRequired);
        return;
      }
      registerMutation.mutate({ email, password, name: name || undefined });
    } else if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else if (mode === "forgot") {
      forgotMutation.mutate({ email: forgotEmail });
    }
  };

  const googleHref = `/api/auth/google?origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}&returnPath=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`;
  const handleGoogleClick = (e: React.MouseEvent) => {
    if (mode === "signup" && !gdprAccepted) {
      e.preventDefault();
      setGdprError(true);
      toast.error(s.gdprRequired);
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
          {mode === "signup" ? s.signupEyebrow : mode === "login" ? s.loginEyebrow : s.forgotEyebrow}
        </p>

        {/* Title */}
        {mode === "signup" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#1565C0] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1 text-center">
              {t.paywall_register}
            </h2>
            <p className="text-sm text-gray-500 mb-5 text-center">{s.signupSubtitle}</p>
          </>
        )}
        {mode === "login" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
              {s.welcomeTitle}
            </h2>
            <p className="text-sm text-gray-500 mb-5">{s.welcomeSubtitle}</p>
          </>
        )}
        {mode === "forgot" && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
              {s.resetTitle}
            </h2>
            <p className="text-sm text-gray-500 mb-5">{s.resetSubtitle}</p>
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
              {s.sendReset}
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-center text-gray-500 hover:text-blue-700"
            >
              {s.backToLogin}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Google button (primero, como en PaywallModal) */}
            <div className="relative group">
              <a
                href={googleHref}
                onClick={handleGoogleClick}
                aria-disabled={mode === "signup" && !gdprAccepted}
                className={`w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer ${mode === "signup" && !gdprAccepted ? "opacity-60 text-gray-500 hover:bg-gray-50" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <GoogleIcon />
                {t.paywall_continue_google}
              </a>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{t.paywall_or}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.paywall_name}
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
                placeholder={t.paywall_password}
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
                  {s.forgotQ} <span className="underline">{s.clickHere}</span>
                </button>
              </div>
            )}

            {/* GDPR checkbox (solo en signup) — se resalta en rojo si el usuario intenta enviar sin marcarlo */}
            {mode === "signup" && (
              <label
                className={`flex items-start gap-2 cursor-pointer select-none rounded-lg transition-all duration-200 ${gdprError ? "ring-2 ring-red-500 bg-red-50 p-2" : "pt-1"}`}
              >
                <input
                  type="checkbox"
                  checked={gdprAccepted}
                  onChange={(e) => {
                    setGdprAccepted(e.target.checked);
                    if (e.target.checked) setGdprError(false);
                  }}
                  className={`mt-0.5 w-4 h-4 shrink-0 cursor-pointer ${gdprError ? "accent-red-600" : "accent-[#1565C0]"}`}
                />
                <span className={`text-xs leading-relaxed ${gdprError ? "text-red-700" : "text-gray-500"}`}>
                  {s.gdprPrefix}{" "}
                  <a href={`/${lang}/terms`} target="_blank" rel="noreferrer" className="underline text-[#1565C0] hover:text-[#0D47A1]" onClick={(e) => e.stopPropagation()}>
                    {s.termsLinkLabel}
                  </a>
                  {s.gdprAnd}
                  <a href={`/${lang}/privacy`} target="_blank" rel="noreferrer" className="underline text-[#1565C0] hover:text-[#0D47A1]" onClick={(e) => e.stopPropagation()}>
                    {s.privacyLinkLabel}
                  </a>
                  {s.gdprSuffix}
                </span>
              </label>
            )}

            {/* Submit: stays clickable even when GDPR is unchecked — on click we highlight the checkbox + toast. */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: isLoading ? "#9ca3af" : (mode === "signup" && !gdprAccepted) ? "#9ca3af" : "#1565C0" }}
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {mode === "signup" ? t.paywall_register : t.paywall_login}
            </button>

            {/* Switch mode */}
            {mode === "signup" ? (
              <p className="text-xs text-center text-gray-500 mt-1">
                {t.paywall_have_account}{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-orange-500 font-semibold hover:underline"
                >
                  {t.paywall_login}
                </button>
              </p>
            ) : (
              <p className="text-xs text-center text-gray-500 mt-1">
                {t.paywall_no_account}{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-orange-500 font-semibold hover:underline"
                >
                  {s.createAccountSwitch}
                </button>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
