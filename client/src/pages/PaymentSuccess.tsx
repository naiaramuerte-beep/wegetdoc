import { useEffect, useState, useRef } from "react";
import { CheckCircle, ArrowRight, FolderOpen, Loader2, Download } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { fireConversionEvents } from "@/lib/conversionTracking";
import { toast } from "sonner";

/**
 * PaymentSuccess page — handles two flows:
 * 1. Direct navigation after checkout.completed event (original flow)
 * 2. Redirect from Paddle after 3D Secure (Paddle appends _ptxn to successUrl)
 *
 * When coming from 3DS redirect, we need to:
 * - Extract the transaction ID from URL params (_ptxn or txn)
 * - Call confirmPaddleCheckout on the backend to activate the subscription
 * - Fire conversion tracking events
 * - Redirect to dashboard
 */
export default function PaymentSuccess() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [confirming, setConfirming] = useState(false);
  const trackedRef = useRef(false);
  const confirmedRef = useRef(false);
  const { isAuthenticated, user } = useAuth();

  const confirmPaddleCheckout = trpc.subscription.confirmPaddleCheckout.useMutation();

  useEffect(() => {
    // Get transaction_id from URL params
    // Paddle appends _ptxn (Paddle transaction ID) to the successUrl after 3DS
    const params = new URLSearchParams(window.location.search);
    const paddleTxn = params.get("_ptxn");
    const txnParam = params.get("txn") || params.get("transaction_id");
    const sessionId = params.get("session_id");
    const transactionId = paddleTxn || txnParam || sessionId || "";

    // If we have a Paddle transaction ID from 3DS redirect, confirm the checkout
    if (paddleTxn && isAuthenticated && !confirmedRef.current) {
      confirmedRef.current = true;
      setConfirming(true);

      confirmPaddleCheckout.mutateAsync({
        transactionId: paddleTxn,
        subscriptionId: "", // Will be resolved from transaction on backend
        customerId: "", // Will be resolved from transaction on backend
      }).then(() => {
        console.log("[PaymentSuccess] Subscription confirmed via 3DS redirect");
        utils.subscription.status.invalidate();
        toast.success("Subscription activated!");
      }).catch((err) => {
        console.error("[PaymentSuccess] Confirm failed:", err);
        // Don't show error - the webhook will handle it as fallback
      }).finally(() => {
        setConfirming(false);
      });
    } else {
      // Normal flow - just invalidate subscription status
      utils.subscription.status.invalidate();
    }

    // Fire conversion tracking only once
    if (!trackedRef.current && transactionId) {
      trackedRef.current = true;
      fireConversionEvents(transactionId);
    }

    // Detect lang from URL
    const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    const lang = langMatch ? langMatch[1] : "es";

    // Auto-redirect to dashboard documents tab after countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(`/${lang}/dashboard?tab=documents&payment=success`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Try to auto-download the PDF that was saved in sessionStorage before checkout
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check if there's a pending edited PDF in sessionStorage
    try {
      const editedPdfStr = sessionStorage.getItem("pdfup_edited_pdf");
      if (editedPdfStr) {
        const editedPdf = JSON.parse(editedPdfStr);
        if (editedPdf.base64 && editedPdf.name) {
          // Auto-download the PDF
          const binary = atob(editedPdf.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = editedPdf.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Clear the stored PDF
          sessionStorage.removeItem("pdfup_edited_pdf");
          toast.success("PDF downloaded!");
        }
      }
    } catch (err) {
      console.error("[PaymentSuccess] Auto-download failed:", err);
    }
  }, [isAuthenticated]);

  const handleGoNow = () => {
    const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    const lang = langMatch ? langMatch[1] : "es";
    navigate(`/${lang}/dashboard?tab=documents&payment=success`);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "oklch(0.98 0.005 250)" }}
    >
      {/* Success icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "oklch(0.55 0.22 260 / 0.12)" }}
      >
        {confirming ? (
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "oklch(0.55 0.22 260)" }} />
        ) : (
          <CheckCircle className="w-10 h-10" style={{ color: "oklch(0.55 0.22 260)" }} />
        )}
      </div>

      <h1
        className="text-3xl font-extrabold mb-3"
        style={{ fontFamily: "'Sora', sans-serif", color: "oklch(0.15 0.03 250)" }}
      >
        {confirming ? "Activating subscription..." : "Payment completed!"}
      </h1>
      <p
        className="text-base mb-4 max-w-md"
        style={{ color: "oklch(0.45 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}
      >
        {confirming
          ? "Please wait while we activate your subscription..."
          : "Your subscription is active. Your document is saved in your dashboard and ready to download."}
      </p>

      {/* Countdown redirect notice */}
      {!confirming && (
        <div
          className="flex items-center gap-2 mb-8 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "oklch(0.55 0.22 260 / 0.08)",
            border: "1px solid oklch(0.55 0.22 260 / 0.20)",
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
          <span className="text-sm font-medium" style={{ color: "oklch(0.35 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
            Redirecting to your documents in <strong>{countdown}</strong>s...
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <button
          onClick={handleGoNow}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all duration-200"
          style={{
            backgroundColor: "oklch(0.55 0.22 260)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <FolderOpen className="w-4 h-4" />
          Go to my documents
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* What you can do now */}
      <div
        className="p-5 rounded-xl max-w-sm w-full text-left"
        style={{
          backgroundColor: "oklch(1 0 0)",
          border: "1px solid oklch(0.90 0.01 250)",
        }}
      >
        <h3
          className="font-bold mb-3 text-sm"
          style={{ color: "oklch(0.15 0.03 250)", fontFamily: "'Sora', sans-serif" }}
        >
          What you can do now
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "oklch(0.40 0.02 250)", fontFamily: "'DM Sans', sans-serif" }}>
          {[
            "Download your edited PDFs without watermarks",
            "Edit any document from your dashboard",
            "Add text, signatures and annotations",
            "Compress, merge and split PDFs",
            "Access your documents anytime",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.55 0.22 260)" }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
