import { upsertLegalPage, getLegalPage } from "./db";

const termsContent = `
<h2>1. Identificacion del titular</h2>
<p>El presente sitio web <strong>editorpdf.net</strong> es propiedad y esta operado por <strong>Naiara Muerte Parra</strong> (en adelante, "el Titular"). Para cualquier comunicacion, puede dirigirse a <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a>.</p>

<h2>2. Objeto y descripcion del servicio</h2>
<p>editorpdf.net ofrece una plataforma en linea de edicion de documentos PDF que permite a los usuarios editar, convertir, firmar y proteger archivos PDF directamente desde el navegador. El procesamiento de archivos se realiza preferentemente en el navegador del usuario; cuando sea necesario el uso del servidor, los archivos se almacenan temporalmente y se eliminan de forma automatica en un plazo maximo de 24 horas.</p>

<h2>3. Registro de cuenta y responsabilidades del usuario</h2>
<p>Para acceder a las funcionalidades completas del servicio, el usuario debera crear una cuenta proporcionando informacion veraz y actualizada. El usuario es el unico responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que se realicen bajo su cuenta.</p>
<p>El usuario se compromete a:</p>
<ul>
  <li>No compartir sus credenciales de acceso con terceros.</li>
  <li>Notificar de inmediato al Titular cualquier uso no autorizado de su cuenta.</li>
  <li>Proporcionar datos veraces durante el proceso de registro.</li>
</ul>

<h2>4. Modelo de suscripcion y precios</h2>
<p>editorpdf.net opera mediante un modelo de suscripcion con las siguientes condiciones:</p>
<ul>
  <li><strong>Periodo de prueba:</strong> El usuario puede acceder al servicio completo durante 48 horas por un coste de 0,50 EUR.</li>
  <li><strong>Suscripcion mensual:</strong> Tras finalizar el periodo de prueba, la suscripcion se renueva automaticamente a un precio de {price} al mes.</li>
  <li>La renovacion es automatica salvo que el usuario cancele su suscripcion antes de que finalice el periodo de facturacion vigente.</li>
</ul>

<h2>5. Condiciones de pago</h2>
<p>Todos los pagos se procesan de forma segura a traves de <strong>Stripe</strong>, un proveedor de pagos certificado PCI DSS. editorpdf.net no almacena directamente los datos de tarjetas de credito o debito del usuario. Al suscribirse, el usuario autoriza el cargo recurrente en el metodo de pago proporcionado hasta que cancele la suscripcion.</p>
<p>Los precios indicados incluyen los impuestos aplicables salvo que se indique expresamente lo contrario.</p>

<h2>6. Propiedad intelectual sobre los archivos del usuario</h2>
<p>El usuario conserva la plena titularidad y todos los derechos de propiedad intelectual sobre los archivos que suba, edite o genere mediante editorpdf.net. El Titular no adquiere ningun derecho sobre dichos archivos y no accede a su contenido salvo que sea estrictamente necesario para la prestacion tecnica del servicio.</p>

<h2>7. Propiedad intelectual de la plataforma</h2>
<p>El diseno, logotipos, textos, graficos, codigo fuente y demas elementos que componen editorpdf.net son propiedad del Titular o de sus licenciantes y estan protegidos por la normativa vigente en materia de propiedad intelectual e industrial. Queda prohibida su reproduccion, distribucion o transformacion sin autorizacion expresa.</p>

<h2>8. Uso aceptable</h2>
<p>El usuario se compromete a utilizar editorpdf.net de manera licita y conforme a estos Terminos. Queda expresamente prohibido:</p>
<ul>
  <li>Utilizar el servicio para procesar, almacenar o distribuir contenido ilegal, difamatorio o que vulnere derechos de terceros.</li>
  <li>Intentar acceder de forma no autorizada a los sistemas o infraestructura de la plataforma.</li>
  <li>Emplear mecanismos automatizados (bots, scrapers) para interactuar con el servicio sin permiso previo.</li>
  <li>Realizar ingenieria inversa, descompilar o desensamblar cualquier componente del software.</li>
  <li>Revender o redistribuir el acceso al servicio sin autorizacion escrita del Titular.</li>
</ul>

<h2>9. Limitacion de responsabilidad</h2>
<p>editorpdf.net se proporciona "tal cual" y "segun disponibilidad". El Titular no garantiza que el servicio sea ininterrumpido, libre de errores o que satisfaga todas las expectativas del usuario.</p>
<p>En la maxima medida permitida por la legislacion aplicable, el Titular no sera responsable de:</p>
<ul>
  <li>Perdidas o danos derivados de la indisponibilidad temporal del servicio.</li>
  <li>Perdida de datos que no hayan sido causadas por negligencia directa del Titular.</li>
  <li>Danos indirectos, incidentales o consecuenciales derivados del uso del servicio.</li>
</ul>
<p>La responsabilidad total del Titular frente al usuario queda limitada, en cualquier caso, al importe de las cantidades abonadas por el usuario en los 12 meses anteriores al hecho causante.</p>

<h2>10. Cancelacion y terminacion</h2>
<p>El usuario puede cancelar su suscripcion en cualquier momento desde la configuracion de su cuenta. La cancelacion sera efectiva al final del periodo de facturacion en curso, manteniendo el acceso al servicio hasta esa fecha.</p>
<p>El Titular se reserva el derecho de suspender o cancelar cuentas que infrinjan estos Terminos de Servicio, previa notificacion al usuario salvo en casos de urgencia o infraccion grave.</p>

<h2>11. Modificaciones de los terminos</h2>
<p>El Titular podra modificar estos Terminos de Servicio en cualquier momento. Las modificaciones sustanciales seran comunicadas al usuario con al menos 30 dias de antelacion mediante correo electronico o aviso en la plataforma. El uso continuado del servicio tras la entrada en vigor de los cambios implica la aceptacion de los nuevos terminos.</p>

<h2>12. Legislacion aplicable y jurisdiccion</h2>
<p>Estos Terminos se rigen por la legislacion del Reino de Espana y la normativa aplicable de la Union Europea. Para la resolucion de cualquier controversia, las partes se someten a los juzgados y tribunales competentes del domicilio del usuario, cuando este tenga la condicion de consumidor conforme a la normativa vigente.</p>
<p>Asimismo, el usuario puede recurrir a la plataforma de resolucion de litigios en linea de la Comision Europea disponible en <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr</a>.</p>

<h2>13. Contacto</h2>
<p>Para cualquier consulta relacionada con estos Terminos de Servicio, puede ponerse en contacto con nosotros a traves de:</p>
<ul>
  <li><strong>Correo electronico:</strong> <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a></li>
  <li><strong>Sitio web:</strong> <a href="https://editorpdf.net">editorpdf.net</a></li>
</ul>
<p><em>Ultima actualizacion: 1 de diciembre de 2025</em></p>
`;

const privacyContent = `
<h2>1. Responsable del tratamiento</h2>
<p>El responsable del tratamiento de los datos personales recogidos a traves de <strong>editorpdf.net</strong> es:</p>
<ul>
  <li><strong>Titular:</strong> Naiara Muerte Parra</li>
  <li><strong>Correo electronico:</strong> <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a></li>
  <li><strong>Sitio web:</strong> <a href="https://editorpdf.net">editorpdf.net</a></li>
</ul>

<h2>2. Datos personales que recopilamos</h2>
<p>En funcion de la interaccion del usuario con nuestra plataforma, podemos recopilar las siguientes categorias de datos:</p>

<h3>2.1. Datos proporcionados directamente por el usuario</h3>
<ul>
  <li><strong>Datos de registro:</strong> nombre, direccion de correo electronico.</li>
  <li><strong>Datos de contacto:</strong> informacion facilitada a traves del formulario de contacto (nombre, email, asunto, mensaje).</li>
</ul>

<h3>2.2. Datos generados por el uso del servicio</h3>
<ul>
  <li><strong>Archivos PDF:</strong> los documentos subidos para su edicion. Estos se procesan preferentemente en el navegador del usuario. Cuando el procesamiento en servidor es necesario, los archivos se almacenan temporalmente y se eliminan de forma automatica en un plazo maximo de 24 horas.</li>
  <li><strong>Datos tecnicos:</strong> direccion IP, tipo de navegador, sistema operativo, paginas visitadas y duracion de la sesion.</li>
</ul>

<h3>2.3. Datos de pago</h3>
<p>Los datos de pago (numero de tarjeta, fecha de caducidad, CVC) son gestionados exclusivamente por <strong>Stripe</strong> y nunca se almacenan en nuestros servidores. Unicamente recibimos de Stripe un identificador de cliente y el estado de la suscripcion.</p>

<h2>3. Finalidad y base juridica del tratamiento</h2>
<table>
  <thead>
    <tr><th>Finalidad</th><th>Base juridica (RGPD)</th></tr>
  </thead>
  <tbody>
    <tr><td>Gestion de la cuenta de usuario y prestacion del servicio</td><td>Ejecucion del contrato (art. 6.1.b)</td></tr>
    <tr><td>Procesamiento de pagos y gestion de suscripciones</td><td>Ejecucion del contrato (art. 6.1.b)</td></tr>
    <tr><td>Envio de comunicaciones relacionadas con el servicio (avisos de cuenta, cambios en los terminos)</td><td>Interes legitimo (art. 6.1.f)</td></tr>
    <tr><td>Atencion de consultas y solicitudes del usuario</td><td>Consentimiento (art. 6.1.a)</td></tr>
    <tr><td>Cumplimiento de obligaciones legales y fiscales</td><td>Obligacion legal (art. 6.1.c)</td></tr>
    <tr><td>Mejora del servicio y analisis de uso agregado</td><td>Interes legitimo (art. 6.1.f)</td></tr>
  </tbody>
</table>

<h2>4. Plazos de conservacion de los datos</h2>
<ul>
  <li><strong>Datos de cuenta:</strong> mientras la cuenta del usuario permanezca activa y hasta 12 meses despues de su eliminacion, salvo obligacion legal de conservacion.</li>
  <li><strong>Archivos PDF procesados en servidor:</strong> se eliminan automaticamente en un maximo de 24 horas.</li>
  <li><strong>Datos de facturacion:</strong> durante el periodo exigido por la normativa fiscal aplicable (minimo 5 anos en Espana).</li>
  <li><strong>Datos de contacto:</strong> hasta la resolucion de la consulta y un maximo de 12 meses adicionales.</li>
</ul>

<h2>5. Terceros encargados del tratamiento</h2>
<p>Para la prestacion del servicio, compartimos datos con los siguientes proveedores, todos ellos con garantias adecuadas de proteccion de datos:</p>
<ul>
  <li><strong>Stripe, Inc.</strong> (Estados Unidos) — Procesamiento de pagos. Adherido al Marco de Privacidad de Datos UE-EE.UU. (<a href="https://stripe.com/privacy" target="_blank" rel="noopener">Politica de privacidad de Stripe</a>).</li>
  <li><strong>Cloudflare, Inc.</strong> (Estados Unidos) — Almacenamiento temporal de archivos mediante Cloudflare R2 y servicios de red. Opera bajo Clausulas Contractuales Tipo de la UE.</li>
  <li><strong>Resend, Inc.</strong> (Estados Unidos) — Envio de correos electronicos transaccionales. Opera bajo Clausulas Contractuales Tipo de la UE.</li>
</ul>

<h2>6. Transferencias internacionales de datos</h2>
<p>Algunos de los proveedores mencionados tienen sede en Estados Unidos. Estas transferencias se realizan con las garantias previstas en el RGPD, incluyendo Clausulas Contractuales Tipo aprobadas por la Comision Europea y, en su caso, la adhesion al Marco de Privacidad de Datos UE-EE.UU.</p>

<h2>7. Derechos del usuario</h2>
<p>Conforme al Reglamento General de Proteccion de Datos (RGPD), el usuario tiene derecho a:</p>
<ul>
  <li><strong>Acceso:</strong> Conocer si sus datos estan siendo tratados y obtener una copia de los mismos.</li>
  <li><strong>Rectificacion:</strong> Solicitar la correccion de datos inexactos o incompletos.</li>
  <li><strong>Supresion:</strong> Solicitar la eliminacion de sus datos cuando ya no sean necesarios para la finalidad para la que fueron recogidos.</li>
  <li><strong>Limitacion del tratamiento:</strong> Solicitar la restriccion del uso de sus datos en determinadas circunstancias.</li>
  <li><strong>Portabilidad:</strong> Recibir sus datos en un formato estructurado, de uso comun y lectura mecanica, y transmitirlos a otro responsable.</li>
  <li><strong>Oposicion:</strong> Oponerse al tratamiento de sus datos cuando este se base en el interes legitimo del responsable.</li>
  <li><strong>Retirada del consentimiento:</strong> Cuando el tratamiento se base en el consentimiento, retirarlo en cualquier momento sin que ello afecte a la licitud del tratamiento previo.</li>
</ul>
<p>Para ejercer cualquiera de estos derechos, envie un correo a <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a> indicando el derecho que desea ejercitar y acompanando copia de su documento de identidad. Responderemos en un plazo maximo de 30 dias.</p>
<p>Asimismo, el usuario tiene derecho a presentar una reclamacion ante la <strong>Agencia Espanola de Proteccion de Datos</strong> (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>) si considera que el tratamiento de sus datos no se ajusta a la normativa vigente.</p>

<h2>8. Uso de cookies</h2>
<p>editorpdf.net utiliza cookies para el correcto funcionamiento del servicio. Para informacion detallada sobre las cookies empleadas, sus finalidades y como gestionarlas, consulte nuestra <a href="/legal/cookies">Politica de Cookies</a>.</p>

<h2>9. Seguridad de los datos</h2>
<p>Aplicamos medidas tecnicas y organizativas adecuadas para proteger los datos personales frente a accesos no autorizados, alteraciones, perdidas o destruccion. Entre ellas se incluyen el cifrado de comunicaciones mediante HTTPS/TLS, el control de accesos a los sistemas y la eliminacion automatica de archivos temporales.</p>

<h2>10. Modificaciones de esta politica</h2>
<p>Nos reservamos el derecho de actualizar esta Politica de Privacidad para adaptarla a novedades legislativas o cambios en nuestro servicio. Cualquier modificacion sustancial sera notificada al usuario por correo electronico o mediante aviso destacado en la plataforma.</p>

<h2>11. Contacto</h2>
<p>Para cualquier consulta relacionada con la proteccion de sus datos personales, puede ponerse en contacto con nosotros en:</p>
<ul>
  <li><strong>Correo electronico:</strong> <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a></li>
  <li><strong>Sitio web:</strong> <a href="https://editorpdf.net">editorpdf.net</a></li>
</ul>
<p><em>Ultima actualizacion: 1 de diciembre de 2025</em></p>
`;

const cookiesContent = `
<h2>1. Que son las cookies</h2>
<p>Las cookies son pequenos archivos de texto que los sitios web almacenan en el dispositivo del usuario (ordenador, telefono movil o tableta) cuando los visita. Sirven para recordar preferencias, mantener sesiones activas y, en algunos casos, recopilar informacion sobre el uso del sitio.</p>

<h2>2. Cookies que utilizamos</h2>
<p>editorpdf.net utiliza unicamente cookies estrictamente necesarias para el funcionamiento de la plataforma y cookies de preferencias del usuario. No empleamos cookies de publicidad ni de seguimiento de terceros con fines publicitarios.</p>

<h3>2.1. Cookies esenciales (estrictamente necesarias)</h3>
<p>Estas cookies son imprescindibles para que el sitio funcione correctamente. Sin ellas no es posible iniciar sesion ni utilizar las funcionalidades principales del servicio.</p>
<table>
  <thead>
    <tr><th>Nombre</th><th>Proveedor</th><th>Finalidad</th><th>Duracion</th></tr>
  </thead>
  <tbody>
    <tr><td>session_token</td><td>editorpdf.net</td><td>Mantener la sesion del usuario activa tras el inicio de sesion.</td><td>7 dias</td></tr>
    <tr><td>csrf_token</td><td>editorpdf.net</td><td>Proteger los formularios frente a ataques de falsificacion de solicitudes (CSRF).</td><td>Sesion</td></tr>
    <tr><td>__cf_bm</td><td>Cloudflare</td><td>Identificar trafico automatizado y proteger el sitio de bots maliciosos.</td><td>30 minutos</td></tr>
  </tbody>
</table>

<h3>2.2. Cookies de preferencias</h3>
<p>Estas cookies permiten que el sitio recuerde las elecciones del usuario para ofrecer una experiencia mas personalizada.</p>
<table>
  <thead>
    <tr><th>Nombre</th><th>Proveedor</th><th>Finalidad</th><th>Duracion</th></tr>
  </thead>
  <tbody>
    <tr><td>lang</td><td>editorpdf.net</td><td>Recordar el idioma seleccionado por el usuario.</td><td>1 ano</td></tr>
    <tr><td>theme</td><td>editorpdf.net</td><td>Almacenar la preferencia de tema visual (claro u oscuro).</td><td>1 ano</td></tr>
    <tr><td>cookie_consent</td><td>editorpdf.net</td><td>Registrar la aceptacion o rechazo de cookies por parte del usuario.</td><td>1 ano</td></tr>
  </tbody>
</table>

<h3>2.3. Cookies de terceros vinculadas al pago</h3>
<p>Durante el proceso de pago, <strong>Stripe</strong> puede establecer sus propias cookies para gestionar la transaccion de forma segura. Estas cookies son gestionadas directamente por Stripe y estan sujetas a su propia <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener">Politica de Cookies</a>.</p>

<h2>3. Como gestionar las cookies</h2>
<p>El usuario puede configurar su navegador para bloquear o eliminar cookies en cualquier momento. A continuacion se incluyen enlaces a las instrucciones de los navegadores mas comunes:</p>
<ul>
  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Google Chrome</a></li>
  <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener">Mozilla Firefox</a></li>
  <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Safari</a></li>
  <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener">Microsoft Edge</a></li>
</ul>
<p>Tenga en cuenta que la desactivacion de las cookies esenciales puede impedir el correcto funcionamiento de editorpdf.net, incluyendo el inicio de sesion y el uso de las herramientas de edicion de PDF.</p>

<h2>4. Base juridica para el uso de cookies</h2>
<p>Las cookies esenciales se instalan en virtud del interes legitimo del Titular para garantizar el funcionamiento tecnico del servicio (art. 6.1.f RGPD). Las cookies de preferencias se basan en el consentimiento del usuario (art. 6.1.a RGPD), que puede otorgarse o retirarse a traves del banner de cookies o la configuracion del navegador.</p>

<h2>5. Actualizaciones de esta politica</h2>
<p>Esta Politica de Cookies puede actualizarse para reflejar cambios en las cookies utilizadas o en la normativa aplicable. Recomendamos revisarla periodicamente.</p>

<h2>6. Contacto</h2>
<p>Si tiene alguna pregunta sobre el uso de cookies en editorpdf.net, puede escribirnos a:</p>
<ul>
  <li><strong>Correo electronico:</strong> <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a></li>
</ul>
<p><em>Ultima actualizacion: 1 de diciembre de 2025</em></p>
`;

const refundContent = `
<h2>1. Derecho de reembolso</h2>
<p>En editorpdf.net queremos que nuestros usuarios esten satisfechos con el servicio. Por ello, ofrecemos un <strong>periodo de reembolso de 7 dias naturales</strong> contados desde la fecha del primer cargo realizado en su metodo de pago.</p>
<p>Este derecho aplica tanto al cargo del periodo de prueba (0,50 EUR) como al primer cargo de la suscripcion mensual ({price}) si este se produce dentro de los 7 dias posteriores al inicio del uso del servicio.</p>

<h2>2. Como solicitar un reembolso</h2>
<p>Para solicitar un reembolso, envie un correo electronico a <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a> con la siguiente informacion:</p>
<ul>
  <li>Asunto del correo: "Solicitud de reembolso".</li>
  <li>Direccion de correo electronico asociada a su cuenta en editorpdf.net.</li>
  <li>Motivo de la solicitud (opcional, pero nos ayuda a mejorar el servicio).</li>
</ul>

<h2>3. Plazo de procesamiento</h2>
<p>Una vez recibida su solicitud, la revisaremos y procesaremos el reembolso en un plazo de <strong>5 a 10 dias habiles</strong>. El reembolso se realizara al mismo metodo de pago utilizado para la compra original. Dependiendo de su entidad bancaria, la devolucion puede tardar entre 3 y 7 dias adicionales en reflejarse en su cuenta.</p>

<h2>4. Consecuencias del reembolso</h2>
<p>Al procesarse el reembolso:</p>
<ul>
  <li>Su suscripcion quedara <strong>cancelada de forma inmediata</strong>.</li>
  <li>Perdera el acceso a las funcionalidades de pago de editorpdf.net.</li>
  <li>Los documentos almacenados en su cuenta permaneceran accesibles durante un periodo de gracia de 30 dias, tras el cual seran eliminados permanentemente. Le recomendamos descargar cualquier archivo importante antes de solicitar el reembolso.</li>
  <li>Su cuenta de usuario seguira existiendo y podra reactivar la suscripcion en cualquier momento.</li>
</ul>

<h2>5. Excepciones</h2>
<p>No se concedera reembolso en los siguientes supuestos:</p>
<ul>
  <li><strong>Solicitud fuera de plazo:</strong> cuando hayan transcurrido mas de 7 dias naturales desde el primer cargo.</li>
  <li><strong>Uso abusivo:</strong> cuando se detecte que el usuario ha utilizado el servicio de forma intensiva durante el periodo de prueba con la intencion manifiesta de obtener un reembolso tras haber aprovechado las prestaciones del servicio.</li>
  <li><strong>Reembolsos previos:</strong> cuando el usuario ya haya obtenido un reembolso anteriormente por el mismo servicio (un reembolso por usuario).</li>
  <li><strong>Incumplimiento de los Terminos de Servicio:</strong> cuando la cuenta haya sido suspendida por infraccion de nuestros <a href="/legal/terms">Terminos de Servicio</a>.</li>
</ul>

<h2>6. Cargos recurrentes posteriores</h2>
<p>Los cargos de renovacion mensual ({price}) realizados tras el primer periodo de facturacion no son reembolsables, salvo que existan circunstancias excepcionales que seran valoradas caso por caso. Si desea evitar cargos futuros, le recomendamos cancelar su suscripcion antes de la fecha de renovacion desde la configuracion de su cuenta.</p>

<h2>7. Derecho de desistimiento legal</h2>
<p>De conformidad con la normativa europea de proteccion al consumidor, el usuario tiene derecho a desistir de la contratacion en el plazo de 14 dias naturales desde la celebracion del contrato. No obstante, al tratarse de un servicio de contenido digital cuya prestacion comienza con el consentimiento expreso del usuario, este acepta la perdida del derecho de desistimiento una vez que haya accedido al servicio, conforme al articulo 103.m) del Real Decreto Legislativo 1/2007.</p>
<p>En cualquier caso, la politica de reembolso de 7 dias descrita anteriormente resulta de aplicacion preferente cuando sus condiciones sean mas favorables para el usuario.</p>

<h2>8. Contacto</h2>
<p>Para cualquier duda o consulta sobre reembolsos, no dude en ponerse en contacto con nosotros:</p>
<ul>
  <li><strong>Correo electronico:</strong> <a href="mailto:morteapps@outlook.com">morteapps@outlook.com</a></li>
  <li><strong>Sitio web:</strong> <a href="https://editorpdf.net">editorpdf.net</a></li>
</ul>
<p><em>Ultima actualizacion: 1 de diciembre de 2025</em></p>
`;

export async function seedLegalPages() {
  const pages = [
    { slug: "terms", title: "Términos de Servicio", content: termsContent.trim() },
    { slug: "privacy", title: "Política de Privacidad", content: privacyContent.trim() },
    { slug: "cookies", title: "Política de Cookies", content: cookiesContent.trim() },
    { slug: "refund", title: "Política de Reembolso", content: refundContent.trim() },
  ];

  for (const page of pages) {
    const existing = await getLegalPage(page.slug);
    if (!existing) {
      await upsertLegalPage(page.slug, page.title, page.content);
      console.log(`[Seed] Created legal page: ${page.slug}`);
    }
  }
}
