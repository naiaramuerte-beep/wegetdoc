/**
 * Seed legal pages with Stripe-compliant content
 * Run with: node scripts/seed-legal.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const termsContent = `# Términos y Condiciones de Uso

**Última actualización:** 20 de marzo de 2026

Bienvenido a **editPDF** (en adelante, "el Servicio"), operado por el titular del sitio web editpdf.online. Al acceder o utilizar el Servicio, aceptas quedar vinculado por estos Términos y Condiciones.

## 1. Descripción del Servicio

editPDF es un editor de documentos PDF online que permite a los usuarios editar, anotar, firmar, comprimir y convertir archivos PDF directamente desde el navegador, sin necesidad de instalar ningún software.

## 2. Registro y Cuenta

Para acceder a las funciones premium del Servicio, deberás crear una cuenta. Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades que se realicen bajo tu cuenta.

## 3. Suscripción y Pagos

### 3.1 Período de prueba

Al contratar el Servicio, se aplica un **período de prueba de 7 días** con un cargo inicial de **0,50 €** (IVA incluido). Este cargo cubre el acceso completo al Servicio durante los 7 días del período de prueba.

### 3.2 Renovación automática

**IMPORTANTE:** Al completar el pago inicial de 0,50 €, **autorizas expresamente** a editPDF a cargar automáticamente **49,90 €/mes** (IVA incluido) en tu método de pago al finalizar el período de prueba de 7 días, y de forma recurrente cada mes a partir de entonces, hasta que canceles tu suscripción.

El cargo mensual de 49,90 € se realizará automáticamente en la misma tarjeta o método de pago utilizado para el pago inicial, salvo que canceles antes de que finalice el período de prueba.

### 3.3 Cancelación

Puedes cancelar tu suscripción en cualquier momento **antes de que finalice el período de prueba** sin coste adicional. Si cancelas durante el período de prueba, no se realizará ningún cargo adicional. Si cancelas después de que comience el período de facturación mensual, la cancelación entrará en vigor al final del ciclo de facturación en curso y no se realizarán reembolsos por el período parcial.

Para cancelar, accede a tu cuenta en [editpdf.online/es/dashboard](https://editpdf.online/es/dashboard), ve a la pestaña **Facturación** y haz clic en **Cancelar suscripción**. También puedes cancelar directamente desde el enlace de cancelación en el pie de página del sitio web.

### 3.4 Reembolsos

Los pagos realizados no son reembolsables, salvo en los casos previstos por la legislación aplicable (Directiva 2011/83/UE sobre derechos de los consumidores). El derecho de desistimiento de 14 días no aplica una vez que el servicio digital ha comenzado a prestarse con el consentimiento expreso del usuario.

### 3.5 Precios

Todos los precios se muestran en euros (€) e incluyen el IVA aplicable. Nos reservamos el derecho a modificar los precios con un preaviso mínimo de 30 días.

## 4. Uso Aceptable

Te comprometes a utilizar el Servicio únicamente para fines lícitos y de acuerdo con estos Términos. Queda prohibido:

- Subir contenido ilegal, difamatorio, obsceno o que infrinja derechos de terceros
- Intentar acceder de forma no autorizada a los sistemas del Servicio
- Utilizar el Servicio para actividades fraudulentas o que puedan causar daño a terceros

## 5. Propiedad Intelectual

El Servicio y su contenido original (excluyendo los documentos subidos por los usuarios) son propiedad exclusiva de editPDF y están protegidos por las leyes de propiedad intelectual aplicables.

## 6. Privacidad y Protección de Datos

El tratamiento de tus datos personales se rige por nuestra [Política de Privacidad](/es/privacy), que forma parte integrante de estos Términos.

## 7. Limitación de Responsabilidad

El Servicio se proporciona "tal cual" y "según disponibilidad". En la máxima medida permitida por la ley aplicable, editPDF no será responsable de daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del Servicio.

## 8. Modificaciones

Nos reservamos el derecho a modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigor 30 días después de su publicación en el sitio web. El uso continuado del Servicio tras la publicación de los cambios constituye la aceptación de los nuevos Términos.

## 9. Ley Aplicable y Jurisdicción

Estos Términos se rigen por la legislación española. Para cualquier controversia derivada de estos Términos, las partes se someten a la jurisdicción de los Juzgados y Tribunales de España.

## 10. Contacto

Para cualquier consulta relacionada con estos Términos, puedes contactarnos en:

**Email:** support@editpdf.online  
**Web:** [editpdf.online](https://editpdf.online)
`;

try {
  // Check if terms already exists
  const [rows] = await db.execute("SELECT id FROM legal_pages WHERE slug = 'terms'");
  
  if (rows.length > 0) {
    await db.execute(
      "UPDATE legal_pages SET title = ?, content = ?, updatedAt = NOW() WHERE slug = 'terms'",
      ["Términos y Condiciones", termsContent]
    );
    console.log("✅ Terms page updated successfully");
  } else {
    await db.execute(
      "INSERT INTO legal_pages (slug, title, content) VALUES (?, ?, ?)",
      ["terms", "Términos y Condiciones", termsContent]
    );
    console.log("✅ Terms page created successfully");
  }
} catch (err) {
  console.error("❌ Error seeding terms:", err.message);
} finally {
  await db.end();
}
