/**
 * Seed all legal pages for cloud-pdf.net
 * Run with: node scripts/seed-legal.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Términos de Uso y Contrato ─────────────────────────────────────────
const termsContent = `# Términos de Uso y Contrato

**Última actualización:** 23 de marzo de 2026

Bienvenido a **CLOUD-PDF.NET** (en adelante, "el Servicio"), una plataforma de edición de documentos PDF online accesible a través del dominio cloud-pdf.net. Al acceder o utilizar el Servicio, aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguno de estos términos, no utilices el Servicio.

## 1. Descripción del Servicio

CLOUD-PDF.NET es un editor de documentos PDF online que permite a los usuarios editar, anotar, firmar, comprimir, proteger con contraseña y convertir archivos PDF directamente desde el navegador, sin necesidad de instalar ningún software. El Servicio ofrece tanto funciones gratuitas como funciones premium accesibles mediante suscripción de pago.

## 2. Registro y Cuenta

Para acceder a las funciones premium del Servicio, deberás crear una cuenta mediante el sistema de autenticación proporcionado. Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades que se realicen bajo tu cuenta. Debes notificarnos inmediatamente cualquier uso no autorizado de tu cuenta.

## 3. Suscripción y Pagos

### 3.1 Período de prueba

Al contratar el Servicio, se aplica un **período de prueba de 7 días** con un cargo inicial de **0,50 €** (IVA incluido). Este cargo cubre el acceso completo a todas las funciones premium del Servicio durante los 7 días del período de prueba.

### 3.2 Renovación automática

**IMPORTANTE:** Al completar el pago inicial de 0,50 €, **autorizas expresamente** a CLOUD-PDF.NET a cargar automáticamente **49,90 €/mes** (IVA incluido) en tu método de pago al finalizar el período de prueba de 7 días, y de forma recurrente cada mes a partir de entonces, hasta que canceles tu suscripción.

El cargo mensual de 49,90 € se realizará automáticamente en la misma tarjeta o método de pago utilizado para el pago inicial, salvo que canceles antes de que finalice el período de prueba.

### 3.3 Cancelación

Puedes cancelar tu suscripción en cualquier momento **antes de que finalice el período de prueba** sin coste adicional. Si cancelas durante el período de prueba, no se realizará ningún cargo adicional. Si cancelas después de que comience el período de facturación mensual, la cancelación entrará en vigor al final del ciclo de facturación en curso y no se realizarán reembolsos por el período parcial.

Para cancelar, accede a tu cuenta en [cloud-pdf.net/es/dashboard](https://cloud-pdf.net/es/dashboard), ve a la pestaña **Facturación** y haz clic en **Cancelar suscripción**.

### 3.4 Reembolsos

Los pagos realizados no son reembolsables, salvo en los casos previstos por la legislación aplicable (Directiva 2011/83/UE sobre derechos de los consumidores). El derecho de desistimiento de 14 días no aplica una vez que el servicio digital ha comenzado a prestarse con el consentimiento expreso del usuario.

### 3.5 Precios

Todos los precios se muestran en euros (€) e incluyen el IVA aplicable. Nos reservamos el derecho a modificar los precios con un preaviso mínimo de 30 días mediante notificación por correo electrónico.

## 4. Uso Aceptable

Al utilizar el Servicio, te comprometes a:

- No subir contenido ilegal, difamatorio, obsceno o que infrinja derechos de terceros.
- No intentar acceder a cuentas de otros usuarios ni a sistemas internos del Servicio.
- No utilizar el Servicio para distribuir malware, spam o realizar actividades fraudulentas.
- No realizar ingeniería inversa ni intentar extraer el código fuente del Servicio.
- No utilizar herramientas automatizadas (bots, scrapers) para acceder al Servicio sin autorización previa.

Nos reservamos el derecho a suspender o cancelar cuentas que incumplan estas condiciones.

## 5. Propiedad Intelectual

Todo el contenido, diseño, código, logotipos y marcas del Servicio son propiedad exclusiva de CLOUD-PDF.NET y están protegidos por las leyes de propiedad intelectual aplicables. Los documentos que subas al Servicio siguen siendo de tu propiedad exclusiva.

## 6. Tratamiento de Archivos

Los archivos que subas al Servicio se procesan en nuestros servidores exclusivamente para proporcionarte las funciones solicitadas. No accedemos, revisamos ni compartimos el contenido de tus documentos. Los archivos temporales se eliminan automáticamente de nuestros servidores tras su procesamiento. Los archivos guardados en tu cuenta permanecen almacenados mientras mantengas una suscripción activa.

## 7. Limitación de Responsabilidad

El Servicio se proporciona "tal cual" y "según disponibilidad". CLOUD-PDF.NET no garantiza que el Servicio sea ininterrumpido, libre de errores o que cumpla con todos tus requisitos específicos. En la máxima medida permitida por la ley, CLOUD-PDF.NET no será responsable de daños indirectos, incidentales, especiales o consecuentes derivados del uso del Servicio.

En ningún caso la responsabilidad total de CLOUD-PDF.NET excederá el importe pagado por el usuario durante los 12 meses anteriores al evento que dio lugar a la reclamación.

## 8. Modificaciones

Nos reservamos el derecho a modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor a partir de su publicación en el Servicio. El uso continuado del Servicio tras la publicación de las modificaciones constituye la aceptación de los nuevos términos. Para cambios sustanciales, notificaremos a los usuarios registrados por correo electrónico con al menos 15 días de antelación.

## 9. Legislación Aplicable y Jurisdicción

Estos Términos se rigen por la legislación de la Unión Europea y, en particular, por la legislación española. Para la resolución de cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del consumidor, conforme a la normativa de protección del consumidor de la UE.

## 10. Contacto

Para cualquier consulta relacionada con estos Términos y Condiciones, puedes contactarnos a través de la página de contacto en [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact).`;

// ─── Política de Privacidad ─────────────────────────────────────────
const privacyContent = `# Política de Privacidad

**Última actualización:** 23 de marzo de 2026

En **CLOUD-PDF.NET** nos comprometemos a proteger tu privacidad y tus datos personales. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos tu información cuando utilizas nuestro servicio de edición de PDF online accesible en cloud-pdf.net.

## 1. Responsable del Tratamiento

El responsable del tratamiento de tus datos personales es **CLOUD-PDF.NET**, con domicilio digital en cloud-pdf.net. Puedes contactarnos en cualquier momento a través de nuestra página de contacto en [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact).

## 2. Datos que Recopilamos

### 2.1 Datos proporcionados directamente por el usuario

- **Datos de registro:** nombre, dirección de correo electrónico y datos de autenticación proporcionados a través del sistema de inicio de sesión.
- **Datos de pago:** información de facturación procesada de forma segura a través de Stripe. CLOUD-PDF.NET no almacena números completos de tarjeta de crédito ni datos financieros sensibles en sus servidores.
- **Datos de contacto:** información que nos proporcionas voluntariamente a través de formularios de contacto o soporte.

### 2.2 Datos recopilados automáticamente

- **Datos de uso:** páginas visitadas, funciones utilizadas, tiempo de sesión y patrones de navegación.
- **Datos técnicos:** dirección IP, tipo de navegador, sistema operativo, resolución de pantalla e idioma preferido.
- **Cookies y tecnologías similares:** según se detalla en nuestra [Política de Cookies](/es/cookies).

### 2.3 Archivos subidos

Los documentos PDF y otros archivos que subas al Servicio se procesan exclusivamente para proporcionarte las funciones de edición solicitadas. No accedemos, revisamos ni analizamos el contenido de tus documentos para fines distintos a la prestación del Servicio.

## 3. Base Legal del Tratamiento

Tratamos tus datos personales sobre las siguientes bases legales conforme al Reglamento General de Protección de Datos (RGPD):

- **Ejecución del contrato** (Art. 6.1.b RGPD): Prestación del Servicio, gestión de tu cuenta y procesamiento de pagos.
- **Consentimiento** (Art. 6.1.a RGPD): Envío de comunicaciones comerciales y uso de cookies no esenciales.
- **Interés legítimo** (Art. 6.1.f RGPD): Mejora del Servicio, prevención de fraude y seguridad.
- **Obligación legal** (Art. 6.1.c RGPD): Cumplimiento de obligaciones fiscales y legales.

## 4. Finalidades del Tratamiento

Utilizamos tus datos personales para las siguientes finalidades:

- Proporcionarte acceso al Servicio y gestionar tu cuenta de usuario.
- Procesar pagos y gestionar tu suscripción.
- Enviarte comunicaciones relacionadas con el Servicio (confirmaciones de pago, cambios en los términos, avisos de seguridad).
- Mejorar y optimizar el funcionamiento del Servicio.
- Prevenir fraudes y garantizar la seguridad del Servicio.
- Cumplir con nuestras obligaciones legales y fiscales.
- Con tu consentimiento previo, enviarte comunicaciones comerciales sobre nuevas funciones o promociones.

## 5. Destinatarios de los Datos

Podemos compartir tus datos personales con los siguientes terceros, exclusivamente para las finalidades indicadas:

- **Stripe:** Procesamiento de pagos (EE.UU., con cláusulas contractuales tipo).
- **Proveedores de alojamiento:** Almacenamiento y procesamiento de datos (UE / EE.UU.).
- **Servicios de analítica:** Análisis de uso del Servicio (UE / EE.UU.).

No vendemos, alquilamos ni compartimos tus datos personales con terceros para fines de marketing sin tu consentimiento expreso.

## 6. Transferencias Internacionales

Algunos de nuestros proveedores de servicios pueden estar ubicados fuera del Espacio Económico Europeo (EEE). En estos casos, garantizamos que las transferencias se realizan con las salvaguardias adecuadas, incluyendo cláusulas contractuales tipo aprobadas por la Comisión Europea o decisiones de adecuación.

## 7. Conservación de los Datos

Conservamos tus datos personales durante el tiempo necesario para cumplir con las finalidades para las que fueron recopilados:

- **Datos de cuenta:** mientras mantengas una cuenta activa en el Servicio, y hasta 30 días después de su eliminación.
- **Datos de facturación:** durante el período legalmente exigido (generalmente 5 años conforme a la legislación fiscal española).
- **Archivos subidos:** los archivos temporales se eliminan automáticamente tras su procesamiento. Los archivos guardados en tu cuenta se conservan mientras mantengas una suscripción activa.
- **Datos de uso y analítica:** durante un máximo de 26 meses.

## 8. Tus Derechos

Conforme al RGPD, tienes los siguientes derechos sobre tus datos personales:

- **Derecho de acceso:** obtener confirmación de si tratamos tus datos y acceder a ellos.
- **Derecho de rectificación:** solicitar la corrección de datos inexactos o incompletos.
- **Derecho de supresión:** solicitar la eliminación de tus datos cuando ya no sean necesarios.
- **Derecho de limitación:** solicitar la restricción del tratamiento en determinadas circunstancias.
- **Derecho de portabilidad:** recibir tus datos en un formato estructurado y de uso común.
- **Derecho de oposición:** oponerte al tratamiento de tus datos en determinadas circunstancias.
- **Derecho a retirar el consentimiento:** en cualquier momento, sin que ello afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada.

Para ejercer cualquiera de estos derechos, contacta con nosotros a través de [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact). Responderemos a tu solicitud en un plazo máximo de 30 días.

También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en [www.aepd.es](https://www.aepd.es) o ante la autoridad de protección de datos de tu país de residencia.

## 9. Seguridad

Implementamos medidas técnicas y organizativas apropiadas para proteger tus datos personales contra el acceso no autorizado, la alteración, la divulgación o la destrucción, incluyendo cifrado SSL/TLS de 256 bits, almacenamiento seguro de contraseñas y acceso restringido a los datos personales.

## 10. Menores

El Servicio no está dirigido a menores de 16 años. No recopilamos conscientemente datos personales de menores de 16 años. Si descubrimos que hemos recopilado datos de un menor sin el consentimiento de sus padres o tutores, procederemos a eliminarlos.

## 11. Modificaciones

Nos reservamos el derecho a modificar esta Política de Privacidad. Cualquier cambio será publicado en esta página con la fecha de actualización correspondiente. Para cambios sustanciales, notificaremos a los usuarios registrados por correo electrónico.

## 12. Contacto

Para cualquier consulta relacionada con esta Política de Privacidad o el tratamiento de tus datos personales, contacta con nosotros en [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact).`;

// ─── Política de Cookies ────────────────────────────────────────────
const cookiesContent = `# Política de Cookies

**Última actualización:** 23 de marzo de 2026

En **CLOUD-PDF.NET** utilizamos cookies y tecnologías similares para mejorar tu experiencia de navegación, analizar el uso del Servicio y personalizar el contenido. Esta Política de Cookies explica qué son las cookies, qué tipos utilizamos y cómo puedes gestionarlas.

## 1. ¿Qué son las cookies?

Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, tablet o teléfono móvil) cuando visitas un sitio web. Las cookies permiten que el sitio web recuerde tus acciones y preferencias durante un período de tiempo, para que no tengas que volver a configurarlas cada vez que visites el sitio o navegues entre sus páginas.

## 2. Tipos de Cookies que Utilizamos

### 2.1 Cookies estrictamente necesarias

Estas cookies son esenciales para el funcionamiento del Servicio y no pueden desactivarse. Se establecen en respuesta a acciones realizadas por ti, como establecer tus preferencias de privacidad, iniciar sesión o rellenar formularios.

- **session_token:** Autenticación y sesión de usuario (duración: sesión).
- **csrf_token:** Protección contra ataques CSRF (duración: sesión).
- **cookie_consent:** Registro de tus preferencias de cookies (duración: 12 meses).

### 2.2 Cookies de rendimiento y analítica

Estas cookies nos permiten contar las visitas y las fuentes de tráfico para poder medir y mejorar el rendimiento del Servicio. Nos ayudan a saber qué páginas son las más y las menos populares, y a ver cómo se mueven los visitantes por el sitio.

- **_ga:** Google Analytics — Identificación de usuarios (duración: 24 meses).
- **_ga_*:** Google Analytics — Estado de sesión (duración: 24 meses).

### 2.3 Cookies funcionales

Estas cookies permiten que el Servicio ofrezca funciones mejoradas y personalización, como recordar tu idioma preferido o la región en la que te encuentras.

- **lang:** Preferencia de idioma (duración: 12 meses).
- **theme:** Preferencia de tema claro/oscuro (duración: 12 meses).

### 2.4 Cookies de terceros

Utilizamos servicios de terceros que pueden establecer sus propias cookies:

- **Stripe:** Procesamiento seguro de pagos. Más información en [stripe.com/privacy](https://stripe.com/privacy).
- **Google Analytics:** Análisis de uso del sitio. Más información en [policies.google.com/privacy](https://policies.google.com/privacy).

## 3. Cómo Gestionar las Cookies

Puedes controlar y gestionar las cookies de varias formas:

### 3.1 Configuración del navegador

La mayoría de los navegadores te permiten ver, gestionar y eliminar cookies. Ten en cuenta que si desactivas las cookies, algunas funciones del Servicio pueden no funcionar correctamente.

- **Chrome:** Configuración > Privacidad y seguridad > Cookies
- **Firefox:** Opciones > Privacidad y seguridad > Cookies
- **Safari:** Preferencias > Privacidad > Cookies
- **Edge:** Configuración > Privacidad > Cookies

### 3.2 Herramientas de exclusión

Para las cookies de analítica de Google, puedes instalar el [complemento de inhabilitación de Google Analytics](https://tools.google.com/dlpage/gaoptout).

## 4. Base Legal

El uso de cookies estrictamente necesarias se basa en nuestro interés legítimo en proporcionar un servicio funcional y seguro. Para las demás cookies, solicitamos tu consentimiento previo conforme al artículo 22.2 de la Ley 34/2002, de Servicios de la Sociedad de la Información (LSSI), y al artículo 6.1.a del RGPD.

## 5. Actualizaciones

Podemos actualizar esta Política de Cookies periódicamente para reflejar cambios en las cookies que utilizamos o por motivos operativos, legales o regulatorios. Te recomendamos revisar esta página regularmente.

## 6. Contacto

Si tienes alguna pregunta sobre nuestra Política de Cookies, puedes contactarnos en [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact).`;

// ─── Aviso Legal ────────────────────────────────────────────────────
const legalContent = `# Aviso Legal

**Última actualización:** 23 de marzo de 2026

## 1. Datos Identificativos

En cumplimiento del deber de información establecido en el artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa que el presente sitio web es propiedad de:

- **Denominación:** CLOUD-PDF.NET
- **Sitio web:** [cloud-pdf.net](https://cloud-pdf.net)
- **Contacto:** A través de la página de contacto en [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact)

## 2. Objeto

CLOUD-PDF.NET pone a disposición de los usuarios un servicio de edición de documentos PDF online que permite editar, anotar, firmar, comprimir, proteger y convertir archivos PDF directamente desde el navegador web.

## 3. Propiedad Intelectual e Industrial

Todos los contenidos del sitio web, incluyendo a título enunciativo pero no limitativo, textos, fotografías, gráficos, imágenes, iconos, tecnología, software, enlaces y demás contenidos audiovisuales o sonoros, así como su diseño gráfico y códigos fuente, son propiedad intelectual de CLOUD-PDF.NET o de terceros que han autorizado su uso, sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación sobre los mismos más allá de lo estrictamente necesario para el correcto uso del Servicio.

Las marcas, nombres comerciales o signos distintivos son titularidad de CLOUD-PDF.NET, sin que pueda entenderse que el acceso al sitio web atribuya ningún derecho sobre las citadas marcas, nombres comerciales y/o signos distintivos.

## 4. Condiciones de Uso

El usuario se compromete a hacer un uso adecuado de los contenidos y servicios que CLOUD-PDF.NET ofrece y a no emplearlos para:

- Realizar actividades ilícitas o contrarias a la buena fe y al orden público.
- Difundir contenidos o propaganda de carácter racista, xenófobo, pornográfico, de apología del terrorismo o que atenten contra los derechos humanos.
- Provocar daños en los sistemas físicos y lógicos de CLOUD-PDF.NET, de sus proveedores o de terceros.
- Introducir o difundir virus informáticos o cualesquiera otros sistemas que sean susceptibles de provocar daños.

## 5. Exclusión de Garantías y Responsabilidad

CLOUD-PDF.NET no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los contenidos, falta de disponibilidad del sitio web o la transmisión de virus o programas maliciosos en los contenidos, a pesar de haber adoptado todas las medidas tecnológicas necesarias para evitarlo.

## 6. Enlaces

En el caso de que en el sitio web se dispusiesen enlaces o hipervínculos hacia otros sitios de Internet, CLOUD-PDF.NET no ejercerá ningún tipo de control sobre dichos sitios y contenidos. En ningún caso asumirá responsabilidad alguna por los contenidos de algún enlace perteneciente a un sitio web ajeno, ni garantizará la disponibilidad técnica, calidad, fiabilidad, exactitud, amplitud, veracidad, validez y constitucionalidad de cualquier material o información contenida en dichos hipervínculos.

## 7. Derecho de Exclusión

CLOUD-PDF.NET se reserva el derecho a denegar o retirar el acceso al sitio web y/o los servicios ofrecidos sin necesidad de preaviso, a instancia propia o de un tercero, a aquellos usuarios que incumplan las presentes Condiciones de Uso.

## 8. Legislación Aplicable y Jurisdicción

La relación entre CLOUD-PDF.NET y el usuario se regirá por la normativa española y europea vigente. Para la resolución de cualquier controversia, las partes se someterán a los Juzgados y Tribunales del domicilio del usuario consumidor, conforme a la normativa de protección del consumidor de la UE.

Asimismo, conforme al Reglamento (UE) 524/2013, informamos que la Comisión Europea facilita una plataforma de resolución de litigios en línea disponible en [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).`;

// ─── Cumplimiento RGPD ──────────────────────────────────────────────
const gdprContent = `# Cumplimiento del RGPD

**Última actualización:** 23 de marzo de 2026

En **CLOUD-PDF.NET** estamos comprometidos con el cumplimiento del Reglamento General de Protección de Datos (Reglamento (UE) 2016/679, "RGPD") y la normativa española de protección de datos (Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales, "LOPDGDD").

## 1. Nuestro Compromiso

CLOUD-PDF.NET aplica los principios fundamentales del RGPD en todas sus operaciones:

- **Licitud, lealtad y transparencia:** Tratamos los datos de forma lícita y transparente, informando siempre sobre cómo y por qué los utilizamos.
- **Limitación de la finalidad:** Solo recopilamos datos para finalidades determinadas, explícitas y legítimas.
- **Minimización de datos:** Solo recopilamos los datos estrictamente necesarios para cada finalidad.
- **Exactitud:** Mantenemos los datos actualizados y tomamos medidas para corregir o suprimir datos inexactos.
- **Limitación del plazo de conservación:** No conservamos los datos más tiempo del necesario.
- **Integridad y confidencialidad:** Aplicamos medidas técnicas y organizativas para proteger los datos.

## 2. Derechos de los Interesados

Como usuario de CLOUD-PDF.NET, tienes los siguientes derechos reconocidos por el RGPD:

- **Acceso** (Art. 15): Obtener confirmación de si tratamos tus datos y acceder a una copia.
- **Rectificación** (Art. 16): Solicitar la corrección de datos inexactos o incompletos.
- **Supresión** (Art. 17): Solicitar la eliminación de tus datos ("derecho al olvido").
- **Limitación** (Art. 18): Solicitar la restricción del tratamiento en ciertos supuestos.
- **Portabilidad** (Art. 20): Recibir tus datos en formato estructurado y transmitirlos a otro responsable.
- **Oposición** (Art. 21): Oponerte al tratamiento de tus datos en determinados supuestos.
- **No ser objeto de decisiones automatizadas** (Art. 22): No ser sometido a decisiones basadas únicamente en tratamiento automatizado.

### Cómo ejercer tus derechos

Puedes ejercer cualquiera de estos derechos contactándonos a través de [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact). Necesitaremos verificar tu identidad antes de procesar tu solicitud. Responderemos en un plazo máximo de 30 días desde la recepción de tu solicitud.

Si consideras que tus derechos no han sido debidamente atendidos, puedes presentar una reclamación ante la **Agencia Española de Protección de Datos (AEPD)** en [www.aepd.es](https://www.aepd.es), o ante la autoridad de protección de datos de tu país de residencia dentro de la UE.

## 3. Medidas de Seguridad

CLOUD-PDF.NET implementa las siguientes medidas técnicas y organizativas para garantizar la seguridad de tus datos personales:

**Medidas técnicas:**

- Cifrado SSL/TLS de 256 bits en todas las comunicaciones.
- Cifrado de datos sensibles en reposo.
- Procesamiento seguro de pagos a través de Stripe (certificado PCI DSS Nivel 1).
- Eliminación automática de archivos temporales tras su procesamiento.
- Copias de seguridad periódicas con cifrado.

**Medidas organizativas:**

- Acceso restringido a datos personales basado en el principio de necesidad de conocer.
- Políticas internas de protección de datos y formación del personal.
- Evaluaciones periódicas de seguridad y privacidad.
- Procedimientos de notificación de brechas de seguridad conforme al artículo 33 del RGPD.

## 4. Transferencias Internacionales

Cuando transferimos datos personales fuera del Espacio Económico Europeo (EEE), nos aseguramos de que se apliquen las salvaguardias adecuadas conforme al Capítulo V del RGPD:

- **Decisiones de adecuación** de la Comisión Europea (Art. 45 RGPD).
- **Cláusulas contractuales tipo** aprobadas por la Comisión Europea (Art. 46.2.c RGPD).
- **Marco de Privacidad de Datos UE-EE.UU.** para proveedores certificados.

## 5. Evaluación de Impacto

Realizamos evaluaciones de impacto en la protección de datos (EIPD) cuando el tratamiento puede entrañar un alto riesgo para los derechos y libertades de las personas, conforme al artículo 35 del RGPD.

## 6. Registro de Actividades de Tratamiento

Mantenemos un registro de actividades de tratamiento conforme al artículo 30 del RGPD, que incluye las categorías de datos tratados, las finalidades del tratamiento, los destinatarios de los datos y los plazos de conservación.

## 7. Notificación de Brechas de Seguridad

En caso de producirse una brecha de seguridad que afecte a datos personales, CLOUD-PDF.NET:

1. Notificará a la autoridad de control competente en un plazo máximo de 72 horas desde que tenga conocimiento de la brecha (Art. 33 RGPD).
2. Comunicará la brecha a los interesados afectados sin dilación indebida cuando la brecha entrañe un alto riesgo para sus derechos y libertades (Art. 34 RGPD).

## 8. Contacto

Para cualquier consulta relacionada con la protección de datos o el ejercicio de tus derechos, puedes contactarnos en [cloud-pdf.net/es/contact](https://cloud-pdf.net/es/contact).

## 9. Actualizaciones

Esta página se actualizará periódicamente para reflejar cualquier cambio en nuestras prácticas de protección de datos o en la normativa aplicable.`;

// ─── Insert/Update all pages ────────────────────────────────────────
const pages = [
  { slug: "terms", title: "Términos de Uso y Contrato", content: termsContent },
  { slug: "privacy", title: "Política de Privacidad", content: privacyContent },
  { slug: "cookies", title: "Política de Cookies", content: cookiesContent },
  { slug: "legal", title: "Aviso Legal", content: legalContent },
  { slug: "gdpr", title: "Cumplimiento RGPD", content: gdprContent },
];

try {
  for (const page of pages) {
    const [rows] = await db.execute("SELECT id FROM legal_pages WHERE slug = ?", [page.slug]);
    if (rows.length > 0) {
      await db.execute(
        "UPDATE legal_pages SET title = ?, content = ?, updatedAt = NOW() WHERE slug = ?",
        [page.title, page.content, page.slug]
      );
      console.log(`✓ Updated: ${page.slug} (${page.title})`);
    } else {
      await db.execute(
        "INSERT INTO legal_pages (slug, title, content) VALUES (?, ?, ?)",
        [page.slug, page.title, page.content]
      );
      console.log(`✓ Inserted: ${page.slug} (${page.title})`);
    }
  }
  console.log("\n✅ All legal pages inserted/updated successfully!");
} catch (err) {
  console.error("❌ Error:", err.message);
} finally {
  await db.end();
}
