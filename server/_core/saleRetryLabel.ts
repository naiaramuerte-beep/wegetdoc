/**
 * ¿Este cobro entró a la primera o lo hemos rescatado?
 *
 * El aviso de venta de Telegram no distinguía entre un cobro limpio y uno que
 * entra al tercer intento, y no es lo mismo: si la mitad de los ingresos vienen
 * de reintentos, el problema no es el precio ni el tráfico, es que la pasarela
 * deniega el primer cargo. Con la etiqueta delante se ve sin abrir el panel.
 *
 * `fallosPrevios` son los intentos rechazados de ESE ciclo antes de este cobro
 * (los del cron, no los del alta).
 */
export function etiquetaReintento(i: {
  provider: string;
  fallosPrevios: number;
}): string {
  // El alta y los wallets cobran a la primera por definición: ahí no hay
  // reintento que contar, y meter "a la primera" en cada alta sería ruido.
  if (i.provider !== "mit") return "";
  const n = Number.isFinite(i.fallosPrevios) ? Math.max(0, Math.trunc(i.fallosPrevios)) : 0;
  if (n === 0) return "✅ a la primera";
  if (n === 1) return "🔁 rescatado en el 1.er reintento";
  return `🔁 rescatado en el ${n}.º reintento`;
}
