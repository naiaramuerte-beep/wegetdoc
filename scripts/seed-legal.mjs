/**
 * Seed all legal pages for wegetdoc.com
 * Run with: node scripts/seed-legal.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Condiciones Generales de Uso y Contratación ────────────────────
const termsContent = `# Condiciones Generales de Uso y Contratación

**Fecha de entrada en vigor:** 7 de abril de 2026

El presente documento establece las condiciones que regulan el acceso y la utilización de la plataforma **WeGetDoc**, disponible en el dominio wegetdoc.com (en lo sucesivo, "la Plataforma"). Toda persona que acceda a la Plataforma o haga uso de sus funcionalidades adquiere la condición de usuario y se obliga al cumplimiento íntegro de las presentes Condiciones. En caso de desacuerdo con cualquiera de las disposiciones aquí recogidas, el usuario deberá abstenerse de utilizar la Plataforma.

## 1. Identificación de la Plataforma

WeGetDoc es una solución digital de edición documental en formato PDF accesible íntegramente a través de navegadores web. La Plataforma permite modificar, anotar, comprimir, proteger mediante contraseña, firmar electrónicamente y convertir documentos PDF sin necesidad de instalar aplicaciones adicionales en el dispositivo del usuario. WeGetDoc dispone de funcionalidades de acceso libre y de funcionalidades avanzadas sujetas a la contratación de un plan de suscripción.

## 2. Creación de Cuenta y Responsabilidad del Usuario

El acceso a las funcionalidades avanzadas de la Plataforma requiere la creación de una cuenta de usuario a través del sistema de autenticación habilitado. El usuario asume la plena responsabilidad sobre la custodia de sus credenciales de acceso, así como sobre cualquier actividad realizada desde su cuenta. Cualquier indicio de acceso no autorizado deberá ser comunicado de forma inmediata a WeGetDoc a través de support@wegetdoc.com.

## 3. Suscripciones y Condiciones de Pago

### 3.1 Periodo de prueba inicial

La contratación del servicio incluye un **periodo de prueba de 7 días** con un coste inicial de **0,50 EUR** (impuestos incluidos). Durante este periodo, el usuario dispondrá de acceso completo a todas las funcionalidades avanzadas de la Plataforma.

### 3.2 Cobro recurrente y autorización expresa

**AVISO IMPORTANTE:** Al formalizar el pago inicial de 0,50 EUR, el usuario **otorga autorización expresa** para que WeGetDoc efectúe un cargo periódico de **49,90 EUR/mes** (impuestos incluidos) en el medio de pago registrado una vez concluido el periodo de prueba de 7 días. Dicho cargo se repetirá mensualmente de forma automática hasta que el usuario proceda a la cancelación de su suscripción.

El importe mensual se cargará en el mismo medio de pago utilizado en la transacción inicial, salvo que el usuario cancele antes de la finalización del periodo de prueba.

### 3.3 Procedimiento de cancelación

El usuario podrá dar de baja su suscripción en cualquier momento **con anterioridad a la finalización del periodo de prueba** sin que se genere cargo adicional alguno. Si la cancelación se produce una vez iniciado un ciclo de facturación mensual, esta surtirá efecto al término del periodo ya abonado, sin derecho a devolución proporcional.

Para proceder a la cancelación, el usuario deberá acceder a su panel de control en [wegetdoc.com/dashboard](https://wegetdoc.com/dashboard), dirigirse a la sección **Facturación** y pulsar **Cancelar suscripción**.

### 3.4 Política de devoluciones

Los importes abonados no serán objeto de reembolso, excepto en los supuestos contemplados por la normativa vigente en materia de protección del consumidor (Directiva 2011/83/UE). El derecho de desistimiento de 14 días naturales no será aplicable una vez que la prestación del servicio digital haya dado comienzo con el consentimiento expreso del usuario.

### 3.5 Tarifas y modificaciones de precio

Todas las tarifas se expresan en euros (EUR) y llevan incluido el IVA correspondiente. WeGetDoc se reserva la facultad de revisar las tarifas vigentes, notificando al usuario con una antelación mínima de 30 días a través de correo electrónico.

## 4. Normas de Uso Responsable

El usuario se compromete a utilizar la Plataforma de conformidad con la legalidad vigente y las buenas prácticas, absteniéndose de:

- Cargar contenidos de naturaleza ilícita, injuriosa, ofensiva o que vulneren derechos de terceros.
- Intentar acceder a cuentas ajenas o a la infraestructura interna de la Plataforma.
- Emplear la Plataforma como medio para distribuir software malicioso, correo no solicitado o para perpetrar actividades fraudulentas.
- Practicar ingeniería inversa o intentar extraer el código fuente de la Plataforma.
- Recurrir a herramientas automatizadas (robots, extractores de datos) sin contar con autorización escrita previa.

WeGetDoc se reserva el derecho de suspender o dar de baja de forma inmediata las cuentas que incurran en el incumplimiento de estas normas.

## 5. Titularidad de la Propiedad Intelectual

La totalidad de elementos que conforman la Plataforma —incluyendo diseño, código fuente, logotipos, marcas y contenidos— son titularidad exclusiva de WeGetDoc y se encuentran amparados por la legislación vigente en materia de propiedad intelectual e industrial. Los documentos que el usuario cargue en la Plataforma seguirán siendo de su exclusiva propiedad en todo momento.

## 6. Gestión y Tratamiento de Archivos

Los archivos cargados por el usuario se procesan en los servidores de WeGetDoc con la única finalidad de prestar las funcionalidades solicitadas. WeGetDoc no accede, revisa ni comparte el contenido de los documentos del usuario. Los archivos de carácter temporal se eliminan de forma automática una vez finalizado su procesamiento. Los documentos almacenados en la cuenta del usuario permanecerán disponibles mientras este mantenga una suscripción en vigor.

## 7. Exclusión y Limitación de Responsabilidad

La Plataforma se ofrece en su estado actual ("as is") y sujeta a disponibilidad. WeGetDoc no garantiza la continuidad ininterrumpida del servicio, la ausencia total de errores ni la adecuación de la Plataforma a las necesidades particulares de cada usuario. En la medida máxima que permita la legislación aplicable, WeGetDoc quedará exenta de responsabilidad por cualesquiera daños indirectos, incidentales, especiales o consecuenciales derivados del uso de la Plataforma.

La responsabilidad total de WeGetDoc no excederá, en ningún supuesto, del importe efectivamente abonado por el usuario durante los 12 meses inmediatamente anteriores al hecho generador de la reclamación.

## 8. Revisión de las Condiciones

WeGetDoc podrá modificar las presentes Condiciones en cualquier momento. Las versiones actualizadas entrarán en vigor desde su publicación en la Plataforma. La continuación del uso del servicio tras la publicación de modificaciones implicará la aceptación de las nuevas condiciones. En caso de cambios de carácter sustancial, WeGetDoc informará a los usuarios registrados por correo electrónico con un mínimo de 15 días de antelación.

## 9. Normativa Aplicable y Fuero Competente

Las presentes Condiciones quedan sometidas a la legislación de la Unión Europea y, subsidiariamente, a la legislación del Reino de España. Para la resolución de controversias, las partes se someterán a los juzgados y tribunales correspondientes al domicilio del consumidor, de conformidad con la normativa comunitaria de protección al consumidor.

## 10. Datos de Contacto

Para cualquier cuestión relativa a las presentes Condiciones, el usuario puede dirigirse a WeGetDoc a través de support@wegetdoc.com o mediante el formulario disponible en [wegetdoc.com/contact](https://wegetdoc.com/contact).`;

// ─── Política de Privacidad ─────────────────────────────────────────
const privacyContent = `# Política de Privacidad

**Fecha de entrada en vigor:** 7 de abril de 2026

**WeGetDoc** (accesible en wegetdoc.com) reconoce la importancia de salvaguardar la privacidad y los datos personales de sus usuarios. La presente Política de Privacidad detalla las prácticas relativas a la recogida, uso, conservación y protección de la información personal cuando se accede o se utiliza nuestra plataforma de edición documental PDF.

## 1. Identidad del Responsable del Tratamiento

El responsable del tratamiento de los datos personales es **WeGetDoc**, con sede digital en wegetdoc.com. El usuario puede dirigir cualquier consulta a la dirección support@wegetdoc.com o a través del formulario de contacto disponible en [wegetdoc.com/contact](https://wegetdoc.com/contact).

## 2. Categorías de Datos Recabados

### 2.1 Información facilitada voluntariamente por el usuario

- **Datos de alta:** nombre completo, dirección de correo electrónico y credenciales generadas a través del sistema de autenticación.
- **Información de facturación:** datos relativos al medio de pago, gestionados de forma segura mediante Stripe. WeGetDoc no almacena en sus sistemas números completos de tarjeta ni datos financieros sensibles.
- **Comunicaciones:** cualquier información que el usuario facilite voluntariamente a través de formularios de contacto o solicitudes de soporte técnico.

### 2.2 Información recogida de forma automatizada

- **Datos de navegación:** secciones visitadas, funcionalidades empleadas, duración de las sesiones y patrones de interacción.
- **Datos técnicos del dispositivo:** dirección IP, tipo y versión de navegador, sistema operativo, resolución de pantalla y configuración de idioma.
- **Cookies y tecnologías equivalentes:** conforme a lo establecido en nuestra [Política de Cookies](/es/cookies).

### 2.3 Documentos cargados en la Plataforma

Los archivos PDF y demás documentos cargados por el usuario se tratan exclusivamente con el propósito de prestar las funcionalidades de edición solicitadas. WeGetDoc no accede, inspecciona ni analiza el contenido de dichos documentos para fines ajenos a la prestación del servicio.

## 3. Fundamento Jurídico del Tratamiento

El tratamiento de datos personales se sustenta en las siguientes bases legales previstas en el Reglamento General de Protección de Datos (RGPD):

- **Ejecución contractual** (Art. 6.1.b RGPD): necesario para la prestación del servicio, la administración de la cuenta de usuario y la gestión de pagos.
- **Consentimiento del interesado** (Art. 6.1.a RGPD): aplicable al envío de comunicaciones promocionales y al uso de cookies no esenciales.
- **Interés legítimo del responsable** (Art. 6.1.f RGPD): optimización de la Plataforma, detección de fraude y seguridad operativa.
- **Cumplimiento de obligaciones legales** (Art. 6.1.c RGPD): atención a requerimientos fiscales y normativos.

## 4. Usos de la Información Personal

WeGetDoc utiliza los datos personales del usuario para los siguientes fines:

- Facilitar el acceso a la Plataforma y administrar la cuenta de usuario.
- Tramitar cobros y gestionar la relación de suscripción.
- Remitir comunicaciones operativas (confirmaciones de pago, actualizaciones de condiciones, alertas de seguridad).
- Perfeccionar el funcionamiento y la experiencia de uso de la Plataforma.
- Detectar y prevenir usos fraudulentos o abusivos.
- Dar cumplimiento a las obligaciones legales y tributarias aplicables.
- Previo consentimiento, informar al usuario sobre novedades, funcionalidades o promociones.

## 5. Comunicación de Datos a Terceros

WeGetDoc podrá compartir datos personales con los terceros que se indican, exclusivamente para los fines señalados:

- **Stripe:** procesamiento de transacciones de pago (EE. UU., al amparo de cláusulas contractuales tipo).
- **Proveedores de infraestructura:** alojamiento y procesamiento de datos (UE / EE. UU.).
- **Herramientas analíticas:** medición del uso y rendimiento de la Plataforma (UE / EE. UU.).

WeGetDoc no vende, cede ni transfiere datos personales a terceros con fines publicitarios sin el consentimiento expreso del usuario.

## 6. Transferencias Internacionales de Datos

Determinados proveedores de servicios de WeGetDoc pueden estar ubicados fuera del Espacio Económico Europeo (EEE). En tales supuestos, WeGetDoc garantiza la adopción de las salvaguardias pertinentes, tales como cláusulas contractuales tipo aprobadas por la Comisión Europea o decisiones de adecuación vigentes.

## 7. Plazos de Conservación

Los datos personales se conservarán durante el periodo estrictamente necesario para el cumplimiento de los fines para los que fueron recogidos:

- **Datos de la cuenta:** mientras la cuenta permanezca activa y durante los 30 días posteriores a su supresión.
- **Datos de facturación:** durante el plazo legalmente exigido (con carácter general, 5 años conforme a la normativa tributaria española).
- **Documentos cargados:** los archivos temporales se eliminan automáticamente tras su procesamiento; los archivos guardados se conservan mientras la suscripción permanezca activa.
- **Datos analíticos y de navegación:** un máximo de 26 meses.

## 8. Derechos del Usuario

De conformidad con el RGPD, el usuario dispone de los siguientes derechos:

- **Acceso:** conocer si WeGetDoc trata sus datos y obtener una copia de los mismos.
- **Rectificación:** solicitar la corrección de datos que resulten inexactos o incompletos.
- **Supresión:** solicitar la eliminación de sus datos cuando ya no resulten necesarios para la finalidad que motivó su recogida.
- **Limitación del tratamiento:** solicitar la restricción del uso de sus datos en determinadas circunstancias.
- **Portabilidad:** recibir sus datos en un formato estructurado, de uso común y lectura mecánica.
- **Oposición:** oponerse al tratamiento de sus datos en los supuestos legalmente previstos.
- **Revocación del consentimiento:** retirar el consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento realizado con anterioridad.

Para el ejercicio de estos derechos, el usuario puede dirigirse a support@wegetdoc.com o a través de [wegetdoc.com/contact](https://wegetdoc.com/contact). WeGetDoc responderá en un plazo máximo de 30 días naturales.

Asimismo, el usuario tiene derecho a interponer reclamación ante la Agencia Española de Protección de Datos (AEPD) en [www.aepd.es](https://www.aepd.es) o ante la autoridad de control de protección de datos de su país de residencia.

## 9. Medidas de Seguridad

WeGetDoc aplica medidas técnicas y organizativas adecuadas para proteger los datos personales frente a accesos no autorizados, alteración, divulgación o destrucción, incluyendo cifrado SSL/TLS de 256 bits, almacenamiento seguro de credenciales y control de acceso basado en el principio de mínimo privilegio.

## 10. Uso por Menores de Edad

La Plataforma no está concebida para su uso por menores de 16 años. WeGetDoc no recaba conscientemente datos de menores de dicha edad. En caso de detectar que se han recogido datos de un menor sin el debido consentimiento parental, se procederá a su supresión inmediata.

## 11. Modificaciones de la Política

WeGetDoc se reserva la facultad de actualizar la presente Política de Privacidad. Cualquier modificación se publicará en esta página con la fecha de actualización correspondiente. Ante cambios sustanciales, se notificará a los usuarios registrados mediante correo electrónico.

## 12. Contacto

Para cualquier consulta relativa a la presente Política o al tratamiento de datos personales, el usuario puede contactar con WeGetDoc en support@wegetdoc.com o a través de [wegetdoc.com/contact](https://wegetdoc.com/contact).`;

// ─── Política de Cookies ────────────────────────────────────────────
const cookiesContent = `# Política de Cookies

**Fecha de entrada en vigor:** 7 de abril de 2026

**WeGetDoc** (wegetdoc.com) emplea cookies y mecanismos de seguimiento similares con el objetivo de optimizar la experiencia de navegación, evaluar el rendimiento de la Plataforma y adaptar los contenidos mostrados al usuario. En el presente documento se describe qué son las cookies, qué categorías emplea WeGetDoc y de qué manera el usuario puede administrarlas.

## 1. Definición de Cookie

Una cookie es un pequeño fichero de datos que el servidor web deposita en el dispositivo del usuario (ordenador, tableta o teléfono móvil) al visitar un sitio web. Las cookies permiten al sitio recordar las preferencias y acciones del usuario durante un periodo determinado, evitando que deba reconfigurarlas en cada visita o al navegar entre distintas secciones.

## 2. Categorías de Cookies Empleadas

### 2.1 Cookies esenciales (estrictamente necesarias)

Son imprescindibles para el correcto funcionamiento de la Plataforma y no pueden ser desactivadas por el usuario. Se generan en respuesta a acciones realizadas por este, tales como la configuración de preferencias de privacidad, el inicio de sesión o el envío de formularios.

- **session_token:** identificación y mantenimiento de la sesión del usuario (duración: sesión activa).
- **csrf_token:** protección frente a ataques de falsificación de solicitudes (duración: sesión activa).
- **cookie_consent:** registro de las preferencias de cookies del usuario (duración: 12 meses).

### 2.2 Cookies analíticas y de rendimiento

Permiten contabilizar las visitas, identificar fuentes de tráfico y medir el rendimiento de la Plataforma, facilitando la detección de las secciones más y menos frecuentadas y el análisis de los recorridos de navegación.

- **_ga:** Google Analytics — identificador de usuario único (duración: 24 meses).
- **_ga_*:** Google Analytics — mantenimiento del estado de sesión (duración: 24 meses).

### 2.3 Cookies de preferencias y funcionalidad

Posibilitan funciones avanzadas de personalización, como el almacenamiento del idioma seleccionado o la configuración visual elegida por el usuario.

- **lang:** idioma de preferencia del usuario (duración: 12 meses).
- **theme:** preferencia de modo visual claro u oscuro (duración: 12 meses).

### 2.4 Cookies instaladas por terceros

WeGetDoc integra servicios de terceros que pueden establecer sus propias cookies:

- **Stripe:** gestión segura de procesos de pago. Más información en [stripe.com/privacy](https://stripe.com/privacy).
- **Google Analytics:** análisis estadístico de uso de la Plataforma. Más información en [policies.google.com/privacy](https://policies.google.com/privacy).

## 3. Administración de las Cookies por el Usuario

El usuario dispone de diversas vías para controlar y gestionar las cookies:

### 3.1 Ajustes del navegador

Todos los navegadores modernos ofrecen opciones para visualizar, administrar y suprimir cookies. No obstante, la desactivación de determinadas cookies puede afectar al correcto funcionamiento de la Plataforma.

- **Chrome:** Configuración > Privacidad y seguridad > Cookies
- **Firefox:** Opciones > Privacidad y seguridad > Cookies
- **Safari:** Preferencias > Privacidad > Cookies
- **Edge:** Configuración > Privacidad > Cookies

### 3.2 Mecanismos de exclusión voluntaria

Para las cookies de analítica de Google, el usuario puede instalar el [complemento de inhabilitación de Google Analytics](https://tools.google.com/dlpage/gaoptout).

## 4. Fundamento Jurídico

La utilización de cookies esenciales se ampara en el interés legítimo de WeGetDoc en ofrecer un servicio operativo y seguro. Respecto a las demás categorías de cookies, se recabará el consentimiento previo del usuario conforme al artículo 22.2 de la Ley 34/2002, de Servicios de la Sociedad de la Información (LSSI), y al artículo 6.1.a del RGPD.

## 5. Revisiones de esta Política

WeGetDoc podrá actualizar la presente Política de Cookies periódicamente con el fin de reflejar cambios en las cookies utilizadas o por razones operativas, normativas o regulatorias. Se recomienda al usuario consultar esta página de forma regular.

## 6. Contacto

Ante cualquier duda relativa a la Política de Cookies, el usuario puede dirigirse a support@wegetdoc.com o a través de [wegetdoc.com/contact](https://wegetdoc.com/contact).`;

// ─── Aviso Legal e Información Corporativa ──────────────────────────
const legalContent = `# Aviso Legal e Información Corporativa

**Fecha de entrada en vigor:** 7 de abril de 2026

## 1. Información del Titular

De conformidad con lo dispuesto en el artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se facilitan los siguientes datos identificativos del titular del sitio web:

- **Denominación:** WeGetDoc
- **Dominio web:** [wegetdoc.com](https://wegetdoc.com)
- **Correo electrónico:** support@wegetdoc.com
- **Formulario de contacto:** [wegetdoc.com/contact](https://wegetdoc.com/contact)

## 2. Actividad y Finalidad del Sitio Web

WeGetDoc proporciona a los usuarios una plataforma digital de edición de documentos en formato PDF que permite modificar, anotar, firmar electrónicamente, comprimir, proteger y convertir archivos PDF de manera íntegra a través del navegador web, sin requerir la instalación de software en el dispositivo del usuario.

## 3. Derechos de Propiedad Intelectual e Industrial

La totalidad de los contenidos presentes en el sitio web —incluyendo, sin carácter limitativo, textos, elementos gráficos, fotografías, iconos, software, código fuente, diseño visual y cualquier otro material audiovisual—, así como las marcas, nombres comerciales y signos distintivos, son titularidad de WeGetDoc o de terceros que han autorizado expresamente su utilización. Queda prohibida la reproducción, distribución, transformación o comunicación pública de dichos contenidos sin autorización expresa, salvo lo estrictamente necesario para el uso legítimo de la Plataforma.

## 4. Obligaciones del Usuario

El usuario se compromete a realizar un uso adecuado de la Plataforma, absteniéndose de emplearla para:

- Llevar a cabo actividades contrarias a la ley, la buena fe o el orden público.
- Difundir contenidos discriminatorios, violentos, pornográficos, apologéticos del terrorismo o lesivos de los derechos fundamentales.
- Causar daños en los sistemas informáticos de WeGetDoc, de sus proveedores o de terceros.
- Introducir o propagar virus informáticos u otros elementos susceptibles de alterar, dañar o inutilizar sistemas o datos.

## 5. Exclusión de Garantías y Limitación de Responsabilidad

WeGetDoc no asumirá responsabilidad alguna, salvo disposición legal en contrario, por los daños y perjuicios de cualquier índole que pudieran derivarse de, entre otros supuestos: inexactitudes u omisiones en los contenidos, indisponibilidad temporal de la Plataforma, o la eventual presencia de programas maliciosos, pese a haber adoptado todas las medidas tecnológicas razonablemente exigibles para prevenirlo.

## 6. Enlaces a Sitios de Terceros

En caso de que la Plataforma incluya enlaces o hipervínculos a sitios web de terceros, WeGetDoc no ejerce control alguno sobre dichos sitios ni sobre sus contenidos. En consecuencia, WeGetDoc declina toda responsabilidad respecto de la información, disponibilidad, veracidad o legalidad de los contenidos alojados en páginas externas enlazadas.

## 7. Potestad de Exclusión

WeGetDoc se reserva la facultad de denegar o retirar el acceso a la Plataforma y a sus servicios, sin obligación de preaviso, a aquellos usuarios que contravengan las presentes condiciones de uso, ya sea por iniciativa propia o a instancia de tercero.

## 8. Legislación Aplicable y Fuero Jurisdiccional

La relación entre WeGetDoc y el usuario se regirá por la normativa española y comunitaria vigente. Para la resolución de cualquier controversia, las partes se someterán a los Juzgados y Tribunales del domicilio del usuario consumidor, de conformidad con la legislación de protección del consumidor de la Unión Europea.

Adicionalmente, y conforme al Reglamento (UE) 524/2013, se informa de que la Comisión Europea dispone de una plataforma de resolución de litigios en línea accesible en [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).`;

// ─── Compromiso con el RGPD ────────────────────────────────────────
const gdprContent = `# Compromiso con el Reglamento General de Protección de Datos

**Fecha de entrada en vigor:** 7 de abril de 2026

**WeGetDoc** (wegetdoc.com) mantiene un firme compromiso con el cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales (RGPD), así como de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).

## 1. Principios Rectores del Tratamiento

WeGetDoc fundamenta todas sus operaciones de tratamiento de datos en los principios esenciales del RGPD:

- **Licitud, lealtad y transparencia:** los datos se tratan de manera lícita y con plena transparencia hacia el interesado, informando en todo momento sobre las finalidades y modalidades de tratamiento.
- **Limitación de la finalidad:** la recogida de datos se circunscribe a finalidades concretas, explícitas y legítimas, sin que se realicen tratamientos incompatibles con dichas finalidades.
- **Minimización de datos:** únicamente se recaban aquellos datos estrictamente indispensables para cada finalidad específica.
- **Exactitud:** se adoptan medidas razonables para garantizar que los datos sean actuales y, en su caso, rectificados o suprimidos sin demora.
- **Limitación del plazo de conservación:** los datos no se mantienen más allá del tiempo necesario para el cumplimiento de los fines para los que fueron recogidos.
- **Integridad y confidencialidad:** se aplican medidas técnicas y organizativas orientadas a preservar la seguridad de los datos tratados.

## 2. Derechos Reconocidos a los Interesados

Todo usuario de WeGetDoc puede ejercer los derechos que el RGPD le reconoce:

- **Derecho de acceso** (Art. 15 RGPD): obtener confirmación sobre la existencia de tratamiento y acceder a una copia de los datos personales objeto del mismo.
- **Derecho de rectificación** (Art. 16 RGPD): solicitar la subsanación de datos inexactos o la cumplimentación de datos incompletos.
- **Derecho de supresión** (Art. 17 RGPD): reclamar la eliminación de los datos personales cuando concurra alguno de los supuestos previstos legalmente ("derecho al olvido").
- **Derecho a la limitación del tratamiento** (Art. 18 RGPD): solicitar la restricción del tratamiento cuando se den las circunstancias legalmente previstas.
- **Derecho a la portabilidad** (Art. 20 RGPD): recibir los datos personales en un formato estructurado, de uso habitual y lectura mecánica, y transmitirlos a otro responsable.
- **Derecho de oposición** (Art. 21 RGPD): oponerse al tratamiento de los datos en los supuestos contemplados por la normativa.
- **Derecho a no ser objeto de decisiones automatizadas** (Art. 22 RGPD): no quedar sujeto a decisiones basadas exclusivamente en tratamientos automatizados que produzcan efectos jurídicos o le afecten significativamente.

### Procedimiento de ejercicio

El usuario podrá ejercer cualquiera de estos derechos dirigiéndose a support@wegetdoc.com o a través del formulario de contacto en [wegetdoc.com/contact](https://wegetdoc.com/contact). WeGetDoc verificará la identidad del solicitante antes de tramitar la solicitud y ofrecerá respuesta en un plazo máximo de 30 días naturales desde su recepción.

En caso de que el usuario considere que sus derechos no han sido debidamente atendidos, podrá presentar reclamación ante la **Agencia Española de Protección de Datos (AEPD)** en [www.aepd.es](https://www.aepd.es), o ante la autoridad de control competente de su país de residencia dentro de la Unión Europea.

## 3. Medidas Técnicas y Organizativas de Seguridad

WeGetDoc aplica las siguientes medidas para garantizar un nivel de seguridad adecuado al riesgo:

**En el ámbito técnico:**

- Cifrado de las comunicaciones mediante protocolo SSL/TLS de 256 bits.
- Cifrado de datos sensibles en estado de reposo.
- Procesamiento de pagos a través de Stripe, entidad certificada PCI DSS Nivel 1.
- Supresión automática de archivos temporales tras la finalización de su procesamiento.
- Realización de copias de respaldo periódicas con cifrado.

**En el ámbito organizativo:**

- Acceso a datos personales restringido conforme al principio de necesidad de conocimiento.
- Políticas internas de protección de datos y formación continua del personal.
- Evaluaciones periódicas de seguridad y privacidad.
- Protocolos de notificación de incidentes de seguridad conforme al artículo 33 del RGPD.

## 4. Transferencias Internacionales de Datos

Cuando resulte necesario transferir datos personales fuera del Espacio Económico Europeo (EEE), WeGetDoc se asegura de que se apliquen las garantías adecuadas conforme al Capítulo V del RGPD:

- **Decisiones de adecuación** dictadas por la Comisión Europea (Art. 45 RGPD).
- **Cláusulas contractuales tipo** aprobadas por la Comisión Europea (Art. 46.2.c RGPD).
- **Marco de Privacidad de Datos UE-EE. UU.** para proveedores adheridos y certificados.

## 5. Evaluaciones de Impacto en la Protección de Datos

WeGetDoc lleva a cabo evaluaciones de impacto relativas a la protección de datos (EIPD) en aquellos supuestos en que el tratamiento previsto pueda entrañar un alto riesgo para los derechos y libertades de los interesados, conforme a lo establecido en el artículo 35 del RGPD.

## 6. Registro de Actividades de Tratamiento

WeGetDoc mantiene un registro actualizado de las actividades de tratamiento conforme al artículo 30 del RGPD, en el que se recogen, entre otros extremos, las categorías de datos tratados, las finalidades perseguidas, los destinatarios de los datos y los plazos de conservación aplicables.

## 7. Gestión de Brechas de Seguridad

Ante la detección de una brecha de seguridad que afecte a datos personales, WeGetDoc actuará conforme al siguiente protocolo:

1. Comunicación a la autoridad de control competente en un plazo no superior a 72 horas desde la toma de conocimiento de la brecha (Art. 33 RGPD).
2. Notificación a los interesados afectados sin dilación indebida cuando la brecha suponga un riesgo elevado para sus derechos y libertades (Art. 34 RGPD).

## 8. Canal de Contacto

Para cualquier consulta relacionada con la protección de datos personales o el ejercicio de derechos, el usuario puede contactar con WeGetDoc en support@wegetdoc.com o mediante el formulario de contacto en [wegetdoc.com/contact](https://wegetdoc.com/contact).

## 9. Actualizaciones

La presente página será objeto de revisión periódica para reflejar cualquier modificación en las prácticas de protección de datos de WeGetDoc o en la normativa aplicable.`;

// ─── Insert/Update all pages ────────────────────────────────────────
const pages = [
  { slug: "terms", title: "Condiciones Generales de Uso y Contratación", content: termsContent },
  { slug: "privacy", title: "Política de Privacidad", content: privacyContent },
  { slug: "cookies", title: "Política de Cookies", content: cookiesContent },
  { slug: "legal", title: "Aviso Legal e Información Corporativa", content: legalContent },
  { slug: "gdpr", title: "Compromiso con el RGPD", content: gdprContent },
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
