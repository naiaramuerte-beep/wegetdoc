import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const articles = [
  {
    slug: "editar-pdf-en-el-navegador-sin-programas",
    title: "Editar PDF en el navegador sin programas: tutorial completo para 2026",
    excerpt: "Descubre cómo modificar cualquier documento PDF desde tu navegador web en pocos pasos. Cambia textos, agrega imágenes, firma y descarga al instante.",
    content: `<h2>Modifica tus PDFs directamente desde el navegador</h2>
<p>Hoy en día ya no es necesario descargar software pesado para trabajar con archivos PDF. Plataformas como <strong>editorpdf.net</strong> ofrecen un editor completo que funciona íntegramente en tu navegador, permitiéndote realizar cambios en cualquier documento en cuestión de segundos.</p>

<h2>Funcionalidades disponibles al editar un PDF online</h2>
<p>Un buen editor de PDF basado en web debería cubrir las necesidades más habituales del día a día:</p>
<ul>
  <li><strong>Modificar texto</strong>: corrige datos incorrectos, actualiza cifras o reescribe párrafos completos sin alterar el diseño original</li>
  <li><strong>Incorporar texto adicional</strong>: añade notas, observaciones o bloques informativos en cualquier zona del documento</li>
  <li><strong>Agregar elementos visuales</strong>: logotipos corporativos, sellos, fotografías o diagramas</li>
  <li><strong>Firmar documentos</strong>: estampa tu rúbrica manuscrita digitalizada en contratos y formularios</li>
  <li><strong>Destacar información</strong>: usa resaltadores, subrayados y anotaciones de color</li>
  <li><strong>Dibujar elementos gráficos</strong>: rectángulos, círculos y flechas para señalizar secciones clave</li>
</ul>

<h2>Pasos para editar tu PDF con EditorPDF</h2>
<p>El flujo de trabajo es directo y no requiere conocimientos técnicos:</p>
<ol>
  <li><strong>Carga el documento</strong>: arrastra tu archivo PDF al área de carga o selecciónalo manualmente desde tu dispositivo</li>
  <li><strong>Elige la herramienta adecuada</strong>: texto, firma, imagen, resaltador u otra opción del panel de herramientas</li>
  <li><strong>Aplica las modificaciones</strong>: haz clic en la zona que deseas editar y realiza los ajustes necesarios</li>
  <li><strong>Guarda y descarga</strong>: obtén tu PDF modificado con un solo clic en el botón de descarga</li>
</ol>

<h2>Privacidad y seguridad al editar documentos online</h2>
<p>Una de las preocupaciones más frecuentes al utilizar herramientas web es la confidencialidad de los documentos. EditorPDF emplea tecnología WebAssembly que procesa el contenido directamente en tu dispositivo, lo que implica que <strong>tus archivos no se transfieren a servidores externos</strong> durante la edición.</p>

<h2>Editar vs. convertir: dos procesos distintos</h2>
<p>Es habitual confundir ambos conceptos, pero conviene diferenciarlos:</p>
<ul>
  <li><strong>Editar</strong>: intervenir directamente sobre el archivo PDF, conservando su estructura y maquetación originales</li>
  <li><strong>Convertir</strong>: transformar el PDF en otro formato (como Word o imagen) para trabajarlo con un programa diferente</li>
</ul>
<p>En la mayoría de situaciones, la edición directa resulta más eficiente y preserva fielmente la apariencia del documento.</p>

<h2>Dudas habituales sobre la edición de PDFs</h2>
<h3>¿Es posible editar un PDF que proviene de un escáner?</h3>
<p>Los documentos escaneados son esencialmente imágenes. Para manipular el texto contenido en ellos se necesita tecnología OCR (reconocimiento óptico de caracteres). Con EditorPDF puedes superponer texto y anotaciones sobre estos documentos, aunque el texto original de la imagen no es modificable.</p>

<h3>¿Puedo usar el editor desde un teléfono móvil?</h3>
<p>Sí. editorpdf.net está optimizado para todo tipo de dispositivos: ordenadores de sobremesa, portátiles, tabletas y smartphones. No hace falta descargar ninguna aplicación.</p>

<h3>¿Existe un límite en el peso del archivo?</h3>
<p>Los usuarios con acceso gratuito pueden trabajar con PDFs de hasta 10 MB. El plan Pro amplía este límite hasta 100 MB por documento.</p>`,
    metaTitle: "Editar PDF en el navegador sin instalar nada (2026) | EditorPDF",
    metaDescription: "Tutorial paso a paso para editar documentos PDF online sin descargar programas. Modifica textos, inserta firmas e imágenes desde tu navegador.",
    category: "guides",
    tags: "editar pdf online, modificar pdf, editor pdf web, pdf sin instalar, editar pdf gratis",
    readTime: 5,
    published: true,
  },
  {
    slug: "transformar-pdf-a-word-mejores-opciones",
    title: "Transformar PDF a Word sin perder formato: 5 alternativas gratuitas comparadas",
    excerpt: "Análisis detallado de las mejores opciones disponibles para pasar un PDF a formato Word (.docx) online y sin coste. Ventajas e inconvenientes de cada una.",
    content: `<h2>¿En qué situaciones conviene pasar un PDF a Word?</h2>
<p>El formato PDF garantiza que un documento se visualice igual en cualquier dispositivo, pero no siempre es práctico cuando necesitas <strong>realizar modificaciones extensas en el contenido</strong>. Convertirlo a Word (.docx) facilita enormemente la tarea en casos como:</p>
<ul>
  <li>Documentación contractual que precisa revisiones o enmiendas</li>
  <li>Informes periódicos cuyas cifras o datos deben actualizarse</li>
  <li>Plantillas de formularios que se reutilizan con frecuencia</li>
  <li>Trabajos académicos o de investigación que requieren citas o ediciones</li>
</ul>

<h2>5 alternativas gratuitas para convertir PDF a Word</h2>

<h3>1. EditorPDF (ideal para conversiones rápidas)</h3>
<p>La opción más ágil: sube tu documento PDF a editorpdf.net, selecciona la función "PDF a Word" y obtén el archivo .docx en segundos. No es necesario registrarse para documentos de tamaño reducido.</p>

<h3>2. Microsoft Word (requiere licencia de Office)</h3>
<p>Si dispones de Microsoft Office, Word puede abrir archivos PDF y transformarlos automáticamente. La ruta es: Archivo > Abrir > seleccionar el PDF. Ofrece buenos resultados con documentos basados en texto, pero puede presentar desajustes en maquetaciones elaboradas.</p>

<h3>3. Google Docs (acceso gratuito con cuenta de Google)</h3>
<p>Sube el PDF a Google Drive, haz clic derecho y selecciona "Abrir con Google Docs". El sistema realizará la conversión al instante. Funciona de manera óptima con documentos de texto plano.</p>

<h3>4. Adobe Acrobat en línea (prueba de 7 días)</h3>
<p>Adobe proporciona un periodo de prueba gratuito con herramientas de conversión de alta fidelidad. Es la alternativa preferida para documentos con estructura visual compleja, como tablas y gráficos incrustados.</p>

<h3>5. LibreOffice Draw (aplicación de escritorio gratuita)</h3>
<p>LibreOffice permite importar PDFs y guardarlos como archivos Word. Al ser software libre, funciona sin conexión a Internet, si bien la calidad del resultado puede variar según la complejidad del documento.</p>

<h2>¿Cuál ofrece mejores resultados según el tipo de PDF?</h2>
<p>La fidelidad de la conversión está directamente relacionada con la naturaleza del documento original:</p>
<ul>
  <li><strong>Documentos de texto plano</strong>: cualquiera de las cinco opciones produce resultados satisfactorios</li>
  <li><strong>Documentos con tablas y columnas</strong>: Adobe Acrobat y EditorPDF tienden a respetar mejor la estructura</li>
  <li><strong>PDFs digitalizados (escaneados)</strong>: se requiere un motor OCR para extraer el texto de las imágenes</li>
  <li><strong>PDFs con contraseña</strong>: es imprescindible retirar la protección antes de iniciar la conversión</li>
</ul>

<h2>Preguntas frecuentes sobre la conversión PDF a Word</h2>
<h3>¿El formato del documento se mantiene intacto tras la conversión?</h3>
<p>Depende del grado de complejidad visual. Los documentos con estructura sencilla se transforman con gran precisión. En cambio, aquellos con diseños elaborados (columnas múltiples, tablas anidadas, gráficos) pueden experimentar ciertos desajustes.</p>

<h3>¿Es viable convertir documentos escaneados a Word editable?</h3>
<p>Sí, siempre que la herramienta disponga de OCR. Esta tecnología analiza la imagen y extrae el texto, convirtiéndolo en contenido editable. La exactitud del resultado depende en gran medida de la calidad de la digitalización.</p>

<h3>¿Mis documentos están protegidos al subirlos?</h3>
<p>EditorPDF procesa los archivos directamente en el navegador del usuario, evitando su envío a servidores remotos. Para documentación de alta confidencialidad, es recomendable utilizar siempre herramientas que operen de forma local.</p>`,
    metaTitle: "Convertir PDF a Word gratis: 5 métodos comparados (2026) | EditorPDF",
    metaDescription: "Comparativa de las 5 mejores formas gratuitas de transformar un PDF en documento Word sin perder el formato. Encuentra la opción ideal para tu caso.",
    category: "comparisons",
    tags: "pdf a word, convertir pdf, pdf a docx, transformar pdf, word gratis",
    readTime: 6,
    published: true,
  },
  {
    slug: "firmar-pdf-online-sin-certificado-digital",
    title: "Firmar un PDF online sin certificado digital: guía práctica y legal",
    excerpt: "Aprende a insertar tu firma manuscrita en cualquier PDF directamente desde el navegador. Sin certificados y sin instalaciones.",
    content: `<h2>Tipos de firma electrónica: diferencias clave</h2>
<p>Antes de firmar un documento PDF es fundamental distinguir entre los dos tipos principales de firma electrónica:</p>
<ul>
  <li><strong>Firma electrónica simple</strong>: consiste en la inserción de una imagen de tu rúbrica manuscrita sobre el documento. Visualmente reproduce una firma en papel, aunque carece de certificación criptográfica.</li>
  <li><strong>Firma digital cualificada</strong>: emplea un certificado criptográfico que acredita la identidad del firmante y asegura la integridad del documento. Posee pleno valor jurídico probatorio.</li>
</ul>
<p>En esta guía nos centramos en la <strong>firma electrónica simple</strong>, que resulta adecuada para la mayoría de documentos de uso cotidiano: contratos entre particulares, autorizaciones internas, formularios administrativos y similares.</p>

<h2>Proceso de firma con EditorPDF</h2>
<ol>
  <li><strong>Carga tu documento</strong> en editorpdf.net</li>
  <li>Accede a la opción <strong>"Firma"</strong> en la barra de herramientas lateral</li>
  <li>Traza tu rúbrica utilizando el ratón o, si estás en un dispositivo táctil, con el dedo</li>
  <li>Redimensiona la firma y sitúala en la posición deseada del documento</li>
  <li>Pulsa <strong>"Descargar PDF"</strong> para obtener el documento firmado</li>
</ol>

<h2>Tres maneras de crear tu firma</h2>
<p>EditorPDF pone a tu disposición tres modalidades para generar tu firma:</p>
<ul>
  <li><strong>Dibujo a mano alzada</strong>: reproduce tu rúbrica directamente sobre la pantalla con el ratón o el dedo</li>
  <li><strong>Texto con estilo caligráfico</strong>: introduce tu nombre y selecciona entre diversos estilos tipográficos que imitan la escritura manual</li>
  <li><strong>Carga de imagen</strong>: sube una fotografía de tu firma manuscrita sobre fondo blanco o transparente</li>
</ul>

<h2>Marco legal de la firma electrónica en la UE</h2>
<p>Dentro de la Unión Europea, la validez jurídica de las firmas electrónicas se regula por el <strong>Reglamento eIDAS (UE 910/2014)</strong>. Conforme a esta normativa:</p>
<ul>
  <li>La firma electrónica simple goza de validez legal básica y resulta admisible como prueba en procedimientos judiciales para acuerdos privados</li>
  <li>Para actos jurídicos de especial trascendencia (operaciones mercantiles de gran envergadura, documentos notariales) se aconseja recurrir a una firma electrónica avanzada o cualificada</li>
</ul>
<p>En la práctica diaria, la firma electrónica simple es plenamente aceptada para la inmensa mayoría de contratos de servicios, acuerdos internos y formularios convencionales.</p>

<h2>Alternativas para obtener una firma con mayor validez jurídica</h2>
<p>Si tu caso requiere una firma con garantías legales reforzadas, dispones de estas opciones:</p>
<ul>
  <li><strong>Certificado digital de la FNMT</strong>: expedido sin coste por la Fábrica Nacional de Moneda y Timbre</li>
  <li><strong>DNI electrónico (DNIe)</strong>: incorpora certificados digitales reconocidos oficialmente</li>
  <li><strong>Plataformas especializadas</strong>: soluciones como DocuSign o Adobe Sign proporcionan firmas electrónicas cualificadas con trazabilidad completa</li>
</ul>

<h2>Dudas frecuentes sobre firmas en PDF</h2>
<h3>¿Es posible firmar desde un smartphone o tableta?</h3>
<p>Por supuesto. editorpdf.net funciona a la perfección en dispositivos móviles. Puedes trazar tu firma directamente con el dedo sobre la pantalla táctil, lo que resulta incluso más natural que hacerlo con ratón.</p>

<h3>¿Puedo retirar una firma ya insertada?</h3>
<p>Mientras el documento permanezca abierto en el editor, puedes seleccionar la firma y suprimirla sin problema. No obstante, una vez descargado el PDF, la firma queda fusionada con el documento de forma permanente.</p>

<h3>¿Cómo puedo verificar si un PDF contiene una firma digital certificada?</h3>
<p>Abre el documento en Adobe Acrobat Reader y accede al panel de firmas desde el menú Ver > Mostrar/Ocultar > Paneles de navegación > Firmas. Si el PDF incorpora una firma digital con certificado, aparecerán los datos del firmante junto con el estado de validación.</p>`,
    metaTitle: "Firmar PDF online sin certificado: guía gratuita (2026) | EditorPDF",
    metaDescription: "Guía práctica para insertar tu firma manuscrita en documentos PDF desde el navegador, sin necesidad de certificados digitales.",
    category: "tutorials",
    tags: "firmar pdf, firma electrónica pdf, firma online gratis, firmar documento pdf, rúbrica digital",
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
