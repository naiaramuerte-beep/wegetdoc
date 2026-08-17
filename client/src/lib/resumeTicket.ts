// Resolves the R2-temp ticket (tk) for the edited PDF BEFORE the Google
// full-page redirect, with a shield against the footgun proved in
// preRedirectTicket.test.ts:
//
//   Old goRedirect did `await (preUploadRef.current ?? saveEditedPdfToSession())`.
//   A pre-upload that FAILED is a promise RESOLVED TO NULL — still truthy — so the
//   `??` never retried, tk stayed null, the OAuth return URL carried no tk, and
//   the edited draft was unrecoverable on return (empty preview, lost edits).
//
// The shield: take the pre-upload's VALUE (not just its promise); if null, retry
// fresh uploads; NEVER return a redirect-worthy result without a confirmed
// ticket. The caller must NOT redirect when this returns null. Every branch logs
// under [pre-redirect-guard] so a real smoke pinpoints the exact path.

export interface ResumeTicketDeps {
  /** The pre-upload promise kicked off when the modal opened (may resolve to null). */
  preUpload: Promise<string | null> | null;
  /** A fresh upload of the edited PDF, returning its temp key or null. */
  upload: () => Promise<string | null>;
  /** Max fresh retries after the pre-upload yields no ticket. Default 3. */
  maxRetries?: number;
  /** Called before each retry so the UI can show "guardando tu documento…". */
  onSaving?: () => void;
  log?: (msg: string) => void;
}

// BARRIER #2 — on resume, only open the paywall when the edited PDF is actually
// available: either still loaded in the editor, or successfully recovered from
// the temp key. If neither, the user would be paying for a copy WITHOUT their
// edits (the chargeback risk), so the caller must block payment and tell them to
// re-edit instead.
export function canOpenResumePaywall(i: { hasEditorBytes: boolean; recoveredEditedPreview: boolean }): boolean {
  return i.hasEditorBytes || i.recoveredEditedPreview;
}

// ── Lado de la BAJADA del billete ───────────────────────────────────────────────
// La subida del PDF editado ya reintentaba (resolveResumeTicket); la recuperación
// al volver de Google era de UN SOLO intento. Si el cuerpo se cortaba a medias
// —móvil saltando de wifi a datos justo al volver, que es cuando pasa— el
// `arrayBuffer()` rechazaba, la BARRIER #2 daba el documento por perdido y el
// usuario terminaba en la pantalla de subir archivo. En el servidor solo quedaba
// un `DOWNLOAD status=200`, así que desde fuera parecía que la web se había roto.
export interface RecoverEditedPdfDeps {
  /** Clave temporal de R2, o `base64:<...>` cuando el PDF viajó incrustado. */
  tempKey: string;
  /** fetch inyectable (en producción, el del navegador). */
  fetchImpl: (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer: () => Promise<ArrayBuffer> }>;
  /** Intentos totales, incluido el primero. Por defecto 3. */
  attempts?: number;
  /** Espera entre intentos; inyectable para que los tests no duerman. */
  sleep?: (ms: number) => Promise<void>;
  decodeBase64?: (b64: string) => Uint8Array;
  log?: (msg: string) => void;
  /** Aviso al servidor de cada fallo, para que deje rastro en los logs. */
  trace?: (step: string, detail?: string) => void;
}

export async function recoverEditedPdf(d: RecoverEditedPdfDeps): Promise<Uint8Array | null> {
  const attempts = d.attempts ?? 3;
  const sleep = d.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));

  if (d.tempKey.startsWith("base64:")) {
    try {
      return (d.decodeBase64 ?? defaultDecodeBase64)(d.tempKey.slice(7));
    } catch (e: any) {
      d.trace?.("download_b64_error", String(e?.message ?? e).slice(0, 80));
      return null;
    }
  }

  const url = `/api/documents/temp-download/${encodeURIComponent(d.tempKey)}`;
  for (let i = 1; i <= attempts; i++) {
    try {
      const resp = await d.fetchImpl(url);
      d.log?.(`[pre-redirect-guard] temp-download ${d.tempKey}: HTTP ${resp.status} (intento ${i}/${attempts})`);
      if (resp.ok) {
        const bytes = new Uint8Array(await resp.arrayBuffer());
        if (bytes.byteLength > 0) return bytes;
        throw new Error("cuerpo vacío");
      }
      // Un 404 es definitivo: el objeto no está en R2 y reintentar no lo va a traer.
      if (resp.status === 404) { d.trace?.("download_404", `try=${i}`); return null; }
      d.trace?.("download_http", `try=${i} status=${resp.status}`);
    } catch (e: any) {
      d.log?.(`[pre-redirect-guard] temp-download falló (intento ${i}/${attempts}): ${e?.message ?? e}`);
      d.trace?.("download_error", `try=${i} ${String(e?.message ?? e).slice(0, 80)}`);
    }
    if (i < attempts) await sleep(i * 500);
  }
  return null;
}

function defaultDecodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function resolveResumeTicket(d: ResumeTicketDeps): Promise<string | null> {
  const max = d.maxRetries ?? 3;
  // 1. The VALUE of the pre-upload — not just awaiting the (possibly null) promise.
  let tk: string | null = null;
  try {
    tk = await (d.preUpload ?? d.upload());
  } catch {
    tk = null;
  }
  if (tk) {
    d.log?.(`[pre-redirect-guard] ticket from pre-upload: ${tk}`);
    return tk;
  }
  // 2. Retry fresh uploads — never leave without a confirmed ticket.
  for (let attempt = 1; attempt <= max && !tk; attempt++) {
    d.log?.(`[pre-redirect-guard] no ticket — retry ${attempt}/${max}`);
    d.onSaving?.();
    try {
      tk = await d.upload();
    } catch {
      tk = null;
    }
  }
  if (tk) d.log?.(`[pre-redirect-guard] ticket confirmed after retry: ${tk}`);
  else d.log?.(`[pre-redirect-guard] NO ticket after ${max} retries — caller must NOT redirect`);
  return tk;
}
