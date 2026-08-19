// Stale-chunk recovery: after a deploy, users with an old tab open hit
// "Failed to fetch dynamically imported module" when navigating to a route
// whose chunk hash changed. Reload once to pick up the fresh manifest.
// 30s cooldown prevents reload loops if the new bundle ALSO fails (e.g.
// CDN propagation lag, server outage masquerading as a chunk error).

const RELOAD_TS_KEY = "vite-chunk-reload-ts";

function maybeReload(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

function looksLikeChunkError(message: string): boolean {
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Loading chunk") ||
    message.includes("Loading CSS chunk")
  );
}

/**
 * Envuelve un `import()` de ruta para recargar si el chunk no se puede traer.
 *
 * Por qué hace falta además del filtro de mensajes: **Safari no dice ninguna de
 * esas frases**. Cuando a un iPhone se le queda un chunk viejo tras un deploy,
 * el error es un escueto `TypeError: Load failed`, que es lo que Safari usa para
 * CUALQUIER fetch fallido. Visto en producción el 19-ago en `/de/editor` con iOS
 * 16.7 (Sentry `a247de20`): el usuario se quedaba con el editor roto y sin
 * recarga automática, porque el patrón no coincidía.
 *
 * Y no se puede arreglar metiendo "Load failed" en la lista: eso recargaría la
 * página ante cualquier petición de red fallida, por ejemplo al perder cobertura
 * a mitad de una subida. Aquí, en cambio, sabemos con certeza que lo que falló
 * fue la carga de un chunk, así que se recarga sin mirar el mensaje.
 */
export function lazySafe<T>(cargar: () => Promise<T>): () => Promise<T> {
  return () =>
    cargar().catch((err) => {
      maybeReload();
      // Se relanza igual: si la recarga no llega a ocurrir (cooldown de 30 s),
      // React sigue viendo el error y muestra su pantalla de fallo en vez de
      // quedarse colgado para siempre.
      throw err;
    });
}

export function isChunkErrorMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  return looksLikeChunkError(message);
}

export function installChunkErrorRecovery(): void {
  window.addEventListener("vite:preloadError", (e: Event) => {
    e.preventDefault();
    maybeReload();
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason = e.reason as unknown;
    const msg = String(
      (reason as { message?: string })?.message ?? reason ?? "",
    );
    if (looksLikeChunkError(msg)) maybeReload();
  });

  window.addEventListener("error", (e: ErrorEvent) => {
    if (looksLikeChunkError(e.message ?? "")) maybeReload();
  });
}
