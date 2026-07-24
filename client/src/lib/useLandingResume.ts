import { useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePdfFile } from "@/contexts/PdfFileContext";

/**
 * Landing paywall resume across the Google-OAuth full-page redirect (mobile).
 *
 * The bug this solves: tool landings (merge/split/compress/rotate/watermark and
 * the converters) keep the file/result in React state and open <PaywallModal>.
 * On mobile the "register with Google" step is a FULL-PAGE redirect — the page
 * reloads on return, React state is wiped, and (crucially) these pages had no
 * logic to reopen the paywall. Result: the user came back to an empty page,
 * their work gone, and never paid. A real leak of mobile ad-traffic sales.
 *
 * How it works (mirrors PdfEditor's tempKey flow):
 *  - `persist(bytes, name, params?)` — call right before opening the paywall.
 *    Uploads the bytes to S3 (temp-upload) and stashes the key (rk), name (rn)
 *    and any small params (rp_*) in the URL. The modal reads the current URL as
 *    its OAuth returnPath, so these ride the cross-origin redirect and come back.
 *  - `tryResume(onResume)` — call from a useEffect keyed on `isAuthenticated`.
 *    On return (URL has `resume=download` + rk/rn) and once authenticated, it
 *    pulls the bytes back from S3 and hands them + params to `onResume`, which
 *    restores the page state and reopens the paywall at the payment step.
 *
 * For client-side tools (merge/split/…) the bytes are the READY OUTPUT, so no
 * params are needed. For the server-side converters the bytes are the INPUT and
 * `params.fmt` carries the chosen target.
 */

// Chunked base64 so 100 MB files don't blow the call stack. Uses apply on a
// plain number[] (no iterator spread — keeps the ES2015 target happy).
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, bytes.length);
    const arr: number[] = [];
    for (let j = i; j < end; j++) arr.push(bytes[j]);
    bin += String.fromCharCode.apply(null, arr);
  }
  return btoa(bin);
}

const RESUME_PARAM_KEYS = ["rk", "rn", "resume", "tk", "tn"];

export function useLandingResume() {
  const { isAuthenticated } = useAuth();
  const { saveEditedPdfToSession } = usePdfFile();
  const triedRef = useRef(false);

  // Fire-and-forget: don't block the modal opening on the S3 upload. By the time
  // the user taps "Google" (a few seconds of reading later) the URL is updated.
  const persist = (bytes: Uint8Array, name: string, params: Record<string, string> = {}) => {
    (async () => {
      try {
        const base64 = bytesToBase64(bytes);
        const tk = await saveEditedPdfToSession(base64, name, bytes.length);
        if (tk) {
          const p = new URLSearchParams(window.location.search);
          p.set("rk", tk);
          p.set("rn", name);
          for (const [k, v] of Object.entries(params)) p.set(`rp_${k}`, v);
          window.history.replaceState({}, "", window.location.pathname + `?${p.toString()}`);
        }
      } catch {
        /* best-effort — desktop popup flow keeps state without this */
      }
    })();
  };

  const tryResume = (onResume: (r: { bytes: Uint8Array; name: string; params: Record<string, string> }) => void) => {
    if (triedRef.current) return;
    const p = new URLSearchParams(window.location.search);
    const rk = p.get("rk");
    const rn = p.get("rn");
    if (p.get("resume") !== "download" || !rk || !rn) return;
    if (!isAuthenticated) return; // wait until auth.me resolves after the redirect
    triedRef.current = true;
    (async () => {
      try {
        let bytes: Uint8Array | null = null;
        if (rk.startsWith("base64:")) {
          const binv = atob(rk.slice(7));
          bytes = new Uint8Array(binv.length);
          for (let i = 0; i < binv.length; i++) bytes[i] = binv.charCodeAt(i);
        } else {
          const resp = await fetch(`/api/documents/temp-download/${encodeURIComponent(rk)}`);
          if (resp.ok) bytes = new Uint8Array(await resp.arrayBuffer());
        }
        if (bytes) {
          const params: Record<string, string> = {};
          p.forEach((v, k) => { if (k.startsWith("rp_")) params[k.slice(3)] = v; });
          onResume({ bytes, name: rn, params });
        }
      } catch {
        /* ignore — user can re-upload */
      } finally {
        const q = new URLSearchParams(window.location.search);
        const toDelete: string[] = [];
        q.forEach((_v, k) => { if (RESUME_PARAM_KEYS.includes(k) || k.startsWith("rp_")) toDelete.push(k); });
        toDelete.forEach((k) => q.delete(k));
        const qs = q.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      }
    })();
  };

  return { isAuthenticated, persist, tryResume };
}
