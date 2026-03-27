import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const articles = [
  {
    slug: "como-editar-un-pdf-online-gratis",
    title: "Cómo editar un PDF online gratis en 2025: guía completa paso a paso",
    excerpt: "Aprende a editar cualquier PDF directamente desde tu navegador sin instalar ningún programa. Texto, imágenes, firmas y más en menos de 2 minutos.",
    content: `<h2>¿Se puede editar un PDF online sin instalar nada?</h2>
<p>Sí. Con <strong>editPDF.online</strong> puedes editar cualquier documento PDF directamente desde tu navegador, sin descargar ningún programa y completamente gratis. Solo necesitas subir el archivo y empezar a editar.</p>

<h2>Qué puedes editar en un PDF online</h2>
<p>Las herramientas de edición de PDF online modernas permiten realizar prácticamente cualquier modificación que necesites:</p>
<ul>
  <li><strong>Editar texto existente</strong>: corregir errores tipográficos, cambiar palabras o frases completas</li>
  <li><strong>Añadir texto nuevo</strong>: insertar anotaciones, comentarios o bloques de texto en cualquier parte del documento</li>
  <li><strong>Insertar imágenes</strong>: añadir logos, fotografías o ilustraciones</li>
  <li><strong>Añadir firma digital</strong>: firmar documentos con tu firma manuscrita digitalizada</li>
  <li><strong>Resaltar y subrayar</strong>: marcar partes importantes del texto</li>
  <li><strong>Añadir formas y flechas</strong>: para señalar o destacar áreas específicas</li>
</ul>

<h2>Cómo editar un PDF paso a paso con editPDF</h2>
<p>El proceso es muy sencillo y lleva menos de 2 minutos:</p>
<ol>
  <li><strong>Sube tu PDF</strong>: arrastra el archivo al editor o haz clic en "Subir PDF para editar"</li>
  <li><strong>Selecciona la herramienta</strong>: elige entre editar texto, añadir firma, insertar imágenes, etc.</li>
  <li><strong>Realiza los cambios</strong>: haz clic en el área del documento que quieres modificar</li>
  <li><strong>Descarga el resultado</strong>: cuando termines, haz clic en "Descargar PDF"</li>
</ol>

<h2>¿Es seguro editar PDFs online?</h2>
<p>editPDF.online procesa los documentos directamente en tu navegador usando tecnología WebAssembly. Esto significa que <strong>el contenido de tus archivos nunca sale de tu dispositivo</strong>. No almacenamos ni transmitimos tus documentos a ningún servidor externo.</p>

<h2>Diferencia entre editar un PDF y convertirlo</h2>
<p>Muchos usuarios confunden "editar un PDF" con "convertir un PDF". Aquí está la diferencia:</p>
<ul>
  <li><strong>Editar un PDF</strong>: modificar el contenido directamente sobre el archivo PDF, manteniendo el formato original</li>
  <li><strong>Convertir un PDF</strong>: transformar el PDF a otro formato (Word, Excel, JPG) para editarlo en otra aplicación</li>
</ul>
<p>Para la mayoría de los casos, editar directamente el PDF es más rápido y mantiene mejor el diseño original del documento.</p>

<h2>Preguntas frecuentes sobre edición de PDF</h2>
<h3>¿Puedo editar un PDF escaneado?</h3>
<p>Los PDFs escaneados son imágenes, no texto editable. Para editarlos necesitas OCR (reconocimiento óptico de caracteres). editPDF permite añadir texto encima de documentos escaneados, aunque no puede modificar el texto de la imagen original.</p>

<h3>¿Funciona en móvil?</h3>
<p>Sí, editPDF.online funciona en cualquier dispositivo con navegador web: ordenador, tablet y móvil. No necesitas instalar ninguna app.</p>

<h3>¿Hay límite de tamaño de archivo?</h3>
<p>Los usuarios gratuitos pueden editar PDFs de hasta 10 MB. Con el plan Pro, el límite sube a 100 MB.</p>`,
    metaTitle: "Cómo editar un PDF online gratis en 2025 | editPDF",
    metaDescription: "Guía completa para editar PDFs online sin instalar nada. Edita texto, añade firmas e imágenes en tu PDF directamente desde el navegador, gratis.",
    category: "guides",
    tags: "editar pdf, pdf online, editar pdf gratis, editor pdf, pdf sin instalar",
    readTime: 5,
    published: true,
  },
  {
    slug: "como-convertir-pdf-a-word-online",
    title: "Cómo convertir PDF a Word online: las 5 mejores formas gratuitas",
    excerpt: "Comparativa de los mejores métodos para convertir un PDF a Word (.docx) online, gratis y sin perder el formato. Cuál usar según tu caso.",
    content: `<h2>¿Por qué convertir un PDF a Word?</h2>
<p>Los archivos PDF son ideales para compartir documentos con un formato fijo, pero cuando necesitas <strong>editar el contenido de forma extensiva</strong>, convertirlos a Word (.docx) es la opción más cómoda. Esto es especialmente útil para:</p>
<ul>
  <li>Contratos y documentos legales que necesitan modificaciones</li>
  <li>Informes que deben actualizarse periódicamente</li>
  <li>Formularios que quieres rellenar y reenviar</li>
  <li>Documentos académicos que necesitas citar o editar</li>
</ul>

<h2>Los 5 mejores métodos para convertir PDF a Word gratis</h2>

<h3>1. editPDF.online (recomendado para uso rápido)</h3>
<p>La forma más rápida: sube el PDF, selecciona "PDF a Word" y descarga el .docx. No requiere registro para archivos pequeños.</p>

<h3>2. Microsoft Word (si tienes Office instalado)</h3>
<p>Word puede abrir PDFs directamente y convertirlos automáticamente. Abre Word → Archivo → Abrir → selecciona el PDF. Funciona bien con PDFs de texto, pero puede perder formato en documentos complejos.</p>

<h3>3. Google Docs (gratis con cuenta Google)</h3>
<p>Sube el PDF a Google Drive → clic derecho → "Abrir con Google Docs". Google convertirá el PDF automáticamente. Ideal para documentos de texto simple.</p>

<h3>4. Adobe Acrobat online (7 días gratis)</h3>
<p>Adobe ofrece una prueba gratuita de 7 días con conversión de alta calidad. La mejor opción para documentos complejos con tablas y gráficos.</p>

<h3>5. LibreOffice Draw (software gratuito)</h3>
<p>LibreOffice puede abrir PDFs y exportarlos a Word. Es gratuito y funciona sin conexión, aunque la calidad de conversión es variable.</p>

<h2>¿Qué método da mejor resultado?</h2>
<p>La calidad de la conversión depende del tipo de PDF:</p>
<ul>
  <li><strong>PDFs de texto simple</strong>: cualquier método funciona bien</li>
  <li><strong>PDFs con tablas y columnas</strong>: Adobe Acrobat o editPDF dan mejores resultados</li>
  <li><strong>PDFs escaneados</strong>: necesitas un servicio con OCR (reconocimiento de texto)</li>
  <li><strong>PDFs protegidos con contraseña</strong>: primero debes desprotegerlos</li>
</ul>

<h2>Preguntas frecuentes sobre conversión PDF a Word</h2>
<h3>¿Se pierde el formato al convertir PDF a Word?</h3>
<p>Depende de la complejidad del documento. Los PDFs con texto simple se convierten casi perfectamente. Los documentos con diseño complejo (columnas, tablas, imágenes integradas) pueden perder algo de formato.</p>

<h3>¿Puedo convertir un PDF escaneado a Word?</h3>
<p>Sí, pero necesitas un servicio con OCR. La tecnología OCR "lee" el texto de la imagen y lo convierte en texto editable. La precisión depende de la calidad del escaneo.</p>

<h3>¿Es seguro subir documentos confidenciales?</h3>
<p>editPDF.online procesa los archivos en tu navegador sin enviarlos a servidores externos. Para documentos muy sensibles, usa siempre herramientas que procesen localmente.</p>`,
    metaTitle: "Cómo convertir PDF a Word online gratis (2025) | editPDF",
    metaDescription: "Los 5 mejores métodos para convertir PDF a Word online gratis. Comparativa con pros y contras de cada opción. Sin instalar nada.",
    category: "comparisons",
    tags: "convertir pdf a word, pdf a word, pdf a docx, convertir pdf, word online",
    readTime: 6,
    published: true,
  },
  {
    slug: "como-anadir-firma-digital-a-pdf",
    title: "Cómo añadir una firma digital a un PDF online (sin certificado)",
    excerpt: "Tutorial paso a paso para firmar un PDF online con tu firma manuscrita digitalizada. Sin certificados digitales, sin software, completamente gratis.",
    content: `<h2>¿Qué es una firma digital en un PDF?</h2>
<p>Cuando hablamos de "firmar un PDF" existen dos conceptos muy diferentes que a menudo se confunden:</p>
<ul>
  <li><strong>Firma electrónica simple</strong>: imagen de tu firma manuscrita insertada en el PDF. Es visualmente idéntica a una firma en papel, pero no tiene validez legal certificada.</li>
  <li><strong>Firma digital certificada</strong>: firma con certificado criptográfico que garantiza la identidad del firmante y la integridad del documento. Tiene plena validez legal.</li>
</ul>
<p>En este artículo explicamos cómo añadir una <strong>firma electrónica simple</strong>, que es suficiente para la mayoría de documentos cotidianos (contratos privados, formularios, acuerdos internos).</p>

<h2>Cómo firmar un PDF con editPDF paso a paso</h2>
<ol>
  <li><strong>Sube tu PDF</strong> a editPDF.online</li>
  <li>Selecciona la herramienta <strong>"Añadir firma"</strong> en el panel lateral</li>
  <li>Dibuja tu firma con el ratón o el dedo (en móvil/tablet)</li>
  <li>Ajusta el tamaño y colócala en el lugar correcto del documento</li>
  <li>Haz clic en <strong>"Descargar PDF"</strong></li>
</ol>

<h2>Tipos de firma que puedes añadir</h2>
<p>editPDF ofrece tres formas de crear tu firma:</p>
<ul>
  <li><strong>Dibujar</strong>: traza tu firma directamente con el ratón o el dedo</li>
  <li><strong>Escribir</strong>: escribe tu nombre y elige entre diferentes estilos caligráficos</li>
  <li><strong>Subir imagen</strong>: sube una foto de tu firma en papel (fondo blanco o transparente)</li>
</ul>

<h2>¿Tiene validez legal una firma en PDF?</h2>
<p>En España y la Unión Europea, la validez legal de una firma electrónica está regulada por el <strong>Reglamento eIDAS (UE 910/2014)</strong>. Según este reglamento:</p>
<ul>
  <li>Una firma electrónica simple (imagen de firma) tiene validez legal básica para contratos privados</li>
  <li>Para documentos con mayor exigencia legal (contratos mercantiles importantes, documentos notariales) se recomienda una firma electrónica avanzada o cualificada</li>
</ul>
<p>Para la mayoría de acuerdos cotidianos, contratos de servicios y formularios internos, una firma electrónica simple es completamente válida.</p>

<h2>Cómo conseguir una firma de mayor validez legal</h2>
<p>Si necesitas una firma con plena validez legal para documentos importantes:</p>
<ul>
  <li><strong>Certificado digital de la FNMT</strong>: gratuito, emitido por la Fábrica Nacional de Moneda y Timbre</li>
  <li><strong>DNI electrónico</strong>: el DNIe español incluye certificados digitales</li>
  <li><strong>Servicios como DocuSign o Adobe Sign</strong>: plataformas especializadas en firma electrónica certificada</li>
</ul>

<h2>Preguntas frecuentes sobre firma de PDFs</h2>
<h3>¿Puedo firmar un PDF desde el móvil?</h3>
<p>Sí, editPDF.online funciona perfectamente en móvil. Puedes dibujar tu firma con el dedo directamente en la pantalla táctil.</p>

<h3>¿Se puede eliminar una firma añadida a un PDF?</h3>
<p>Sí, mientras estés editando el documento puedes seleccionar la firma y eliminarla. Una vez descargado el PDF, la firma queda integrada en el documento.</p>

<h3>¿Cómo sé si un PDF ya tiene firma digital?</h3>
<p>En Adobe Reader, ve a Panel de firmas (Ver → Mostrar/Ocultar → Paneles de navegación → Firmas). Si el PDF tiene firma digital certificada, aparecerá aquí con información sobre el firmante y la validez.</p>`,
    metaTitle: "Cómo añadir firma digital a un PDF online gratis | editPDF",
    metaDescription: "Tutorial paso a paso para firmar un PDF online sin certificados ni software. Añade tu firma manuscrita a cualquier PDF en segundos, gratis.",
    category: "tutorials",
    tags: "firma digital pdf, firmar pdf online, firma electronica, pdf firma, firmar documento",
    readTime: 7,
    published: true,
  },
];

for (const article of articles) {
  const now = new Date();
  await conn.execute(
    `INSERT INTO blog_posts (slug, title, excerpt, content, metaTitle, metaDescription, category, tags, readTime, published, publishedAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), updatedAt=VALUES(updatedAt)`,
    [
      article.slug,
      article.title,
      article.excerpt,
      article.content,
      article.metaTitle,
      article.metaDescription,
      article.category,
      article.tags,
      article.readTime,
      article.published ? 1 : 0,
      now,
      now,
    ]
  );
  console.log(`✓ Seeded: ${article.title}`);
}

await conn.end();
console.log("Done! 3 blog articles seeded.");
