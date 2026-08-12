/**
 * Borrador de respuesta a una queja, montado con los datos reales del cliente.
 *
 * La mayoría de las quejas de este modelo no son "quiero mi dinero" sino "no
 * sabía que me ibais a cobrar". A esa se responde con hechos concretos —la hora
 * exacta en que aceptó, el correo que recibió, lo que decían las condiciones ese
 * día— y se cierra sola. Pelear a quien pide su dinero dentro de los 14 días de
 * desistimiento, en cambio, va contra nuestras propias condiciones y acaba en un
 * contracargo, que sale más caro que el reembolso y además penaliza el ratio con
 * el adquirente.
 *
 * Por eso esto NO envía nada: genera un borrador para que una persona lo lea,
 * lo edite y decida. Una respuesta automática a un cliente enfadado que resulta
 * tener razón es la vía rápida para convertir una queja en una disputa.
 */

/** Ventana legal de desistimiento con reembolso, en días naturales. */
export const WITHDRAWAL_DAYS = 14;

export type DraftKind =
  /** Pide el dinero dentro de los 14 días → la ley y nuestros Términos obligan. */
  | "refund_within_withdrawal"
  /** Pide el dinero fuera de plazo → se explica y se ofrece cancelar. */
  | "refund_outside_withdrawal"
  /** "No sabía que me cobrabais" → se responde con la prueba. */
  | "unaware"
  /** Quiere dejar de pagar hacia adelante. */
  | "cancel"
  /** Amenaza con el banco o ya lo ha hecho. */
  | "chargeback_threat"
  /** No encaja en nada de lo anterior. */
  | "other";

export type DraftContext = {
  name: string | null;
  email: string;
  message: string;
  lang: string;
  /** Cargos del cliente, el más reciente primero. */
  charges: Array<{ amountCents: number; createdAt: Date | string; status: string; refundedCents?: number | null }>;
  /** Consentimientos registrados, el más reciente primero. */
  consents: Array<{ event: string; createdAt: Date | string; ip: string | null; lang: string | null; textShown: string | null }>;
  /** Fin del periodo de prueba de su suscripción, si la tiene. */
  trialEnd: Date | string | null;
  trialHours: number | null;
  /** Si recibió el correo de bienvenida y cuándo. */
  welcomeSentAt: Date | string | null;
};

const DIA_MS = 24 * 3600 * 1000;

/**
 * Clasifica la queja. Deliberadamente conservador: ante la duda entre "quiere
 * reembolso" y "solo pregunta", gana reembolso, porque tratar una petición de
 * dinero como una duda es lo que escala a disputa.
 */
export function classifyComplaint(message: string, primerCargo: Date | null): DraftKind {
  const t = (message || "").toLowerCase();
  const banco = /(chargeback|contracargo|contracarg|banco|denuncia|denunciar|abogad|fraude|estafa|policia|policía|reclamaci|bank|dispute|scam|fraud|lawyer)/.test(t);
  const dinero = /(reembols|devolu|devolv|refund|remboursement|rückerstattung|rimborso|zwrot|повернен|возврат|money back|mi dinero|meu dinheiro)/.test(t);
  const cancelar = /(cancel|anular|darme de baja|baja|unsubscribe|kündig|annull|desactivar|resiliation|résiliation)/.test(t);
  const ignoraba = /(no sab|no sabía|no era consciente|sin mi permiso|no autoric|no autoriz|didn't know|did not know|unaware|nicht gewusst|non sapevo|не знав|не знал|nie wiedział)/.test(t);

  if (banco) return "chargeback_threat";
  if (dinero) {
    if (!primerCargo) return "refund_within_withdrawal"; // sin dato, se asume a favor del cliente
    const dias = (Date.now() - new Date(primerCargo).getTime()) / DIA_MS;
    return dias <= WITHDRAWAL_DAYS ? "refund_within_withdrawal" : "refund_outside_withdrawal";
  }
  if (ignoraba) return "unaware";
  if (cancelar) return "cancel";
  return "other";
}

const LOCALES: Record<string, string> = {
  es: "es-ES", en: "en-GB", fr: "fr-FR", de: "de-DE", pt: "pt-PT", it: "it-IT",
  nl: "nl-NL", pl: "pl-PL", ru: "ru-RU", uk: "uk-UA", ro: "ro-RO", zh: "zh-CN",
};

const fecha = (v: Date | string | null | undefined, lang: string): string | null => {
  if (!v) return null;
  return new Date(v).toLocaleString(LOCALES[lang] ?? "es-ES", {
    dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid",
  });
};

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

/** Textos por idioma. Solo los 12 que publica el sitio; el resto cae a español. */
type Frases = {
  saludo: (n: string) => string;
  gracias: string;
  /** Bloque de hechos, con los datos ya interpolados. */
  hechosTitulo: string;
  hechoAlta: (fecha: string, importe: string) => string;
  hechoConsentimiento: (fecha: string, ip: string) => string;
  hechoEmail: (fecha: string) => string;
  hechoCobro: (fecha: string, importe: string) => string;
  hechoCondiciones: string;
  // cierres por tipo
  cierreReembolsoSi: string;
  cierreReembolsoFuera: string;
  cierreIgnoraba: string;
  cierreCancelar: string;
  cierreBanco: string;
  cierreOtro: string;
  firma: string;
};

const F: Record<string, Frases> = {
  es: {
    saludo: (n) => `Hola ${n}:`,
    gracias: "Gracias por escribirnos. Te cuento exactamente lo que consta en tu cuenta.",
    hechosTitulo: "Lo que registra tu cuenta:",
    hechoAlta: (f, i) => `· El ${f} contrataste el acceso y se cobró ${i}.`,
    hechoConsentimiento: (f, ip) => `· Ese mismo día, a las ${f}, aceptaste las condiciones desde la IP ${ip}.`,
    hechoEmail: (f) => `· El ${f} te enviamos un correo con las condiciones y la fecha exacta del siguiente cobro.`,
    hechoCobro: (f, i) => `· El ${f} se cobró ${i}, según esas condiciones.`,
    hechoCondiciones: "· Las condiciones que aceptaste están en editorpdf.net/es/terms y en editorpdf.net/es/pricing.",
    cierreReembolsoSi:
      "Tienes derecho a desistir en los 14 días naturales desde la contratación, así que procedemos con la devolución sin más trámite. La verás en tu método de pago en unos días hábiles, según tu banco. Cancelo también la suscripción para que no haya más cargos.",
    cierreReembolsoFuera:
      "El plazo de desistimiento de 14 días ya ha vencido, así que la devolución no procede de forma automática. Lo que sí hago ahora mismo es cancelar la suscripción, de modo que no se te cobre nada más. Si consideras que hay algo que se nos escapa, cuéntamelo y lo revisamos.",
    cierreIgnoraba:
      "Entiendo el susto. Cancelo la suscripción ahora mismo para que no haya más cargos. Si quieres que revisemos la devolución del último, dímelo y lo vemos.",
    cierreCancelar:
      "Cancelo la suscripción ahora mismo. No se te volverá a cobrar y mantienes el acceso hasta el final del periodo que ya has pagado.",
    cierreBanco:
      "Prefiero resolverlo directamente contigo antes de que intervenga el banco, que es más lento para los dos. Dime qué prefieres y lo hacemos hoy: cancelar la suscripción, devolver el último cargo, o ambas cosas.",
    cierreOtro: "Dime qué necesitas y lo resolvemos.",
    firma: "Un saludo,\nEquipo EditorPDF",
  },
  en: {
    saludo: (n) => `Hi ${n},`,
    gracias: "Thanks for writing. Here's exactly what your account shows.",
    hechosTitulo: "What your account records:",
    hechoAlta: (f, i) => `· On ${f} you signed up and ${i} was charged.`,
    hechoConsentimiento: (f, ip) => `· That same day, at ${f}, you accepted the terms from IP ${ip}.`,
    hechoEmail: (f) => `· On ${f} we emailed you the terms and the exact date of the next charge.`,
    hechoCobro: (f, i) => `· On ${f}, ${i} was charged under those terms.`,
    hechoCondiciones: "· The terms you accepted are at editorpdf.net/en/terms and editorpdf.net/en/pricing.",
    cierreReembolsoSi:
      "You have the right to withdraw within 14 calendar days of purchase, so we're processing your refund right away. It will show on your payment method within a few business days, depending on your bank. I'm also cancelling the subscription so there are no further charges.",
    cierreReembolsoFuera:
      "The 14-day withdrawal period has passed, so a refund doesn't apply automatically. What I am doing right now is cancelling the subscription so you won't be charged again. If you think we're missing something, tell me and I'll look into it.",
    cierreIgnoraba:
      "I understand the surprise. I'm cancelling the subscription right now so there are no further charges. If you'd like us to look at refunding the last one, just say so.",
    cierreCancelar:
      "I'm cancelling the subscription right now. You won't be charged again and you keep access until the end of the period you've already paid for.",
    cierreBanco:
      "I'd rather sort this out with you directly before the bank gets involved, which is slower for both of us. Tell me what you'd prefer and we'll do it today: cancel the subscription, refund the last charge, or both.",
    cierreOtro: "Tell me what you need and we'll sort it out.",
    firma: "Best regards,\nThe EditorPDF team",
  },
};

/** Construye el borrador. Devuelve texto plano, listo para editar y enviar. */
export function buildSupportDraft(kind: DraftKind, ctx: DraftContext): string {
  const f = F[ctx.lang] ?? F.es;
  const nombre = (ctx.name || ctx.email.split("@")[0] || "").trim();

  const alta = ctx.charges.filter((c) => c.status !== "failed").slice(-1)[0]
    ?? ctx.charges[ctx.charges.length - 1];
  const primerCargo = ctx.charges.length ? ctx.charges[ctx.charges.length - 1] : null;
  const ultimoCargo = ctx.charges.length ? ctx.charges[0] : null;
  const consentPago = ctx.consents.find((c) => c.event === "payment") ?? ctx.consents[0];

  const hechos: string[] = [];
  if (primerCargo) {
    const fa = fecha(primerCargo.createdAt, ctx.lang);
    if (fa) hechos.push(f.hechoAlta(fa, eur(primerCargo.amountCents)));
  }
  if (consentPago) {
    const fc = fecha(consentPago.createdAt, ctx.lang);
    if (fc && consentPago.ip) hechos.push(f.hechoConsentimiento(fc, consentPago.ip));
  }
  if (ctx.welcomeSentAt) {
    const fe = fecha(ctx.welcomeSentAt, ctx.lang);
    if (fe) hechos.push(f.hechoEmail(fe));
  }
  // El cobro mensual solo se menciona si de verdad lo hubo — si el cliente aún
  // está en prueba, hablarle de un cargo que no existe confunde y enfada.
  if (ultimoCargo && ultimoCargo !== primerCargo && ultimoCargo.amountCents > 100) {
    const fu = fecha(ultimoCargo.createdAt, ctx.lang);
    if (fu) hechos.push(f.hechoCobro(fu, eur(ultimoCargo.amountCents)));
  }
  hechos.push(f.hechoCondiciones);

  const cierre =
    kind === "refund_within_withdrawal" ? f.cierreReembolsoSi
    : kind === "refund_outside_withdrawal" ? f.cierreReembolsoFuera
    : kind === "unaware" ? f.cierreIgnoraba
    : kind === "cancel" ? f.cierreCancelar
    : kind === "chargeback_threat" ? f.cierreBanco
    : f.cierreOtro;

  return [
    f.saludo(nombre),
    "",
    f.gracias,
    "",
    f.hechosTitulo,
    ...hechos,
    "",
    cierre,
    "",
    f.firma,
  ].join("\n");
}
