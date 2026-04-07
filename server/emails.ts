import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendSubscriptionConfirmationEmail(params: {
  to: string;
  userName: string;
  plan: string;
  amount: string;
  nextBillingDate: string;
  cancelUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return;
  }

  const { to, userName, plan, amount, nextBillingDate, cancelUrl } = params;

  try {
    await resend.emails.send({
      from: "WeGetDoc <noreply@wegetdoc.com>",
      to,
      subject: "Tu suscripción a WeGetDoc está activa",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #1B5E20; font-size: 24px; margin: 0;">WeGetDoc</h1>
  </div>

  <h2 style="font-size: 20px; margin-bottom: 16px;">¡Hola ${userName}!</h2>

  <p style="font-size: 14px; line-height: 1.6; color: #475569;">
    Tu suscripción a WeGetDoc se ha activado correctamente. Aquí tienes los detalles:
  </p>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
    <table style="width: 100%; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Plan:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${plan}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Cobrado hoy:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${amount}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Próximo cobro:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${nextBillingDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Precio mensual:</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600;">49,90€/mes</td>
      </tr>
    </table>
  </div>

  <p style="font-size: 14px; line-height: 1.6; color: #475569;">
    Puedes cancelar tu suscripción en cualquier momento desde tu panel de usuario:
  </p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${cancelUrl}" style="display: inline-block; background: #1B5E20; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Gestionar suscripción
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

  <p style="font-size: 12px; color: #94a3b8; text-align: center;">
    WeGetDoc · Naiara Muerte Parra · morteapps@outlook.com<br/>
    <a href="https://wegetdoc.com/es/terms" style="color: #64748b;">Términos</a> ·
    <a href="https://wegetdoc.com/es/privacy" style="color: #64748b;">Privacidad</a> ·
    <a href="https://wegetdoc.com/es/refund" style="color: #64748b;">Reembolsos</a>
  </p>
</body>
</html>
      `.trim(),
    });
    console.log(`[Email] Subscription confirmation sent to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send subscription confirmation:", err);
  }
}
