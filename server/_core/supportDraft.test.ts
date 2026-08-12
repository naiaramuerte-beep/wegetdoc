import { describe, it, expect } from "vitest";
import { classifyComplaint, buildSupportDraft, WITHDRAWAL_DAYS } from "./supportDraft";

const DIA = 24 * 3600 * 1000;
const hace = (d: number) => new Date(Date.now() - d * DIA);

describe("classifyComplaint — clasificar mal una queja cuesta dinero", () => {
  it("una petición de dinero dentro de los 14 días obliga a devolver", () => {
    expect(classifyComplaint("quiero un reembolso ya", hace(3))).toBe("refund_within_withdrawal");
    expect(classifyComplaint("I want a refund", hace(13))).toBe("refund_within_withdrawal");
    expect(classifyComplaint("devolvedme mi dinero", hace(WITHDRAWAL_DAYS))).toBe("refund_within_withdrawal");
  });

  it("fuera de plazo se separa, para poder tratarlo distinto", () => {
    expect(classifyComplaint("quiero un reembolso", hace(20))).toBe("refund_outside_withdrawal");
  });

  it("sin fecha de compra se asume a favor del cliente", () => {
    // Preferimos equivocarnos devolviendo antes que negarnos por falta de datos:
    // negar una devolución legítima es lo que escala a disputa con el banco.
    expect(classifyComplaint("refund please", null)).toBe("refund_within_withdrawal");
  });

  it("la amenaza de banco manda sobre todo lo demás", () => {
    expect(classifyComplaint("quiero un reembolso o llamo a mi banco", hace(30))).toBe("chargeback_threat");
    expect(classifyComplaint("esto es una estafa", hace(2))).toBe("chargeback_threat");
    expect(classifyComplaint("I will dispute this with my bank", hace(1))).toBe("chargeback_threat");
  });

  it("distingue 'no lo sabía' de 'quiero mi dinero'", () => {
    expect(classifyComplaint("no sabía que me ibais a cobrar", hace(5))).toBe("unaware");
    expect(classifyComplaint("I didn't know about this charge", hace(5))).toBe("unaware");
  });

  it("una cancelación sin mención al dinero no es una petición de reembolso", () => {
    expect(classifyComplaint("quiero cancelar la suscripción", hace(5))).toBe("cancel");
    expect(classifyComplaint("please cancel my subscription", hace(40))).toBe("cancel");
  });

  it("pedir dinero pesa más que pedir la baja cuando aparecen los dos", () => {
    expect(classifyComplaint("cancelad y devolvedme el dinero", hace(2))).toBe("refund_within_withdrawal");
  });

  it("lo que no encaja no se fuerza", () => {
    expect(classifyComplaint("¿cómo uno dos PDFs?", hace(1))).toBe("other");
  });
});

const ctx = (over: Partial<Parameters<typeof buildSupportDraft>[1]> = {}) => ({
  name: "Ana",
  email: "ana@example.com",
  message: "",
  lang: "es",
  charges: [
    { amountCents: 2995, createdAt: hace(1), status: "ok" },
    { amountCents: 50, createdAt: hace(2), status: "ok" },
  ],
  consents: [
    { event: "payment", createdAt: hace(2), ip: "88.1.2.3", lang: "es", textShown: "Al registrarte, aceptas los Términos" },
  ],
  trialEnd: hace(1),
  trialHours: 24,
  welcomeSentAt: hace(2),
  ...over,
});

describe("buildSupportDraft — el borrador dice hechos, no promesas", () => {
  it("incluye la fecha del alta, la IP del consentimiento y los importes", () => {
    const d = buildSupportDraft("unaware", ctx());
    expect(d).toContain("Ana");
    expect(d).toContain("88.1.2.3");
    expect(d).toContain("0,50 €");
    expect(d).toContain("29,95 €");
    expect(d).toContain("editorpdf.net");
  });

  it("dentro de plazo, concede la devolución sin condicionarla", () => {
    const d = buildSupportDraft("refund_within_withdrawal", ctx());
    expect(d).toMatch(/14 días/);
    expect(d).toMatch(/devoluci/i);
    // No debe insinuar que hay que discutirlo antes.
    expect(d).not.toMatch(/no procede/i);
  });

  it("fuera de plazo, cancela igualmente en vez de dejarlo en el aire", () => {
    const d = buildSupportDraft("refund_outside_withdrawal", ctx());
    expect(d).toMatch(/cancel/i);
  });

  it("no menciona un cobro mensual si el cliente aún no lo ha tenido", () => {
    const soloAlta = ctx({ charges: [{ amountCents: 50, createdAt: hace(1), status: "ok" }] });
    const d = buildSupportDraft("unaware", soloAlta);
    expect(d).not.toContain("29,95");
  });

  it("aguanta un cliente del que no sabemos nada", () => {
    const d = buildSupportDraft("other", ctx({ charges: [], consents: [], welcomeSentAt: null, name: null }));
    expect(d.length).toBeGreaterThan(40);
    expect(d).toContain("ana");        // cae al nombre del email
    expect(d).not.toContain("undefined");
    expect(d).not.toContain("NaN");
    expect(d).not.toContain("Invalid Date");
  });

  it("responde en inglés a un cliente inglés", () => {
    const d = buildSupportDraft("cancel", ctx({ lang: "en" }));
    expect(d).toContain("Hi Ana");
    expect(d).toMatch(/cancelling/i);
  });

  it("un idioma que no tenemos cae al español sin romperse", () => {
    const d = buildSupportDraft("cancel", ctx({ lang: "zz" }));
    expect(d).toContain("Hola Ana");
  });
});
