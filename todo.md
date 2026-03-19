
## Paywall & Suscripción

- [x] Actualizar schema DB con tabla subscriptions y campo isPremium en users
- [x] Crear procedimientos tRPC: checkSubscription, createCheckoutSession
- [x] Implementar modal de paywall (registro → pago)
- [x] Bloquear descarga y herramientas avanzadas para usuarios sin suscripción
- [x] Integrar Stripe Checkout (prueba 0,99€/7 días + mensual 9,99€)
- [x] Webhook Stripe para activar suscripción tras pago
- [x] Restaurar Home.tsx con el diseño PDFPro original
- [x] Restaurar NotFound.tsx con el diseño PDFPro original

## Correcciones Editor PDF

- [x] Firma arrastrable/movible por el PDF
- [x] Botón deshacer (undo) y borrar elemento seleccionado
- [x] Corregir API pdfjs-dist v5 (canvas en lugar de canvasContext, worker correcto)
- [x] Corregir errores de BlobPart con Buffer.from()
- [x] Tarjetas de herramientas de Home abren el editor con la herramienta activa
- [x] Herramientas de conversión (PDF a Word, JPG, etc.) funcionales o con mensaje claro

## Panel Admin + Páginas Legales + Contacto

- [x] Schema DB: tabla legal_pages (slug, title, content, updatedAt)
- [x] Schema DB: tabla contact_messages (name, email, subject, message, createdAt)
- [x] Panel Admin /admin: lista de usuarios suscritos con país, fecha, plan, botón dar de baja
- [x] Panel Admin: editor de páginas legales (Términos, Privacidad, Reembolso, Cookies)
- [x] Páginas legales públicas /privacy, /terms, /cookies, /legal renderizadas desde DB
- [x] Botón de Contacto en la Navbar con modal/formulario
- [x] Formulario de contacto funcional con notificación al admin
- [x] Rutas protegidas para admin en App.tsx
- [x] Panel Admin: MRR, ARR, churn rate, estadísticas día/semana/mes
- [x] Panel Admin: gráfica de ingresos mensuales y nuevas suscripciones
- [x] Panel Admin: tabla de usuarios dados de baja
- [x] Panel Admin: ajustes del sitio (nombre, email soporte, precios)
- [x] Flujo cancelar suscripción en footer → página /cancelar-suscripcion

## Dashboard de Usuario

- [x] Página /dashboard con pestañas: Mi Cuenta, Documentos, Equipo, Facturación
- [x] Pestaña Mi Cuenta: editar perfil (nombre, email, teléfono, idioma, zona horaria)
- [x] Pestaña Documentos: lista de PDFs guardados con carpetas
- [x] Pestaña Equipo: invitar colaboradores por email con roles
- [x] Pestaña Facturación: plan actual, opciones de pago, cancelar suscripción
- [x] Navbar actualizada con menú de usuario autenticado (Mi panel, Facturación, Cerrar sesión)

## PaywallModal Mejorado

- [x] Flujo: Descargar → Elegir Google o Email → Crear cuenta → Pago
- [x] Botón "Descargar con Google" (OAuth)
- [x] Botón "Descargar con Email"
- [x] Mostrar planes directamente si ya está autenticado

## Internacionalización (i18n)

- [x] Crear sistema de traducciones con contexto React y hook useLanguage
- [x] Rutas por idioma: /es/, /en/, /fr/, /de/, /pt/, /it/, /nl/, /pl/, /ru/, /zh/
- [x] Redirección automática según idioma del navegador
- [x] Selector de idioma en Navbar (dropdown con banderas, desktop + mobile)
- [ ] Selector de idioma en Footer
- [x] Traducir textos de Navbar, Footer, Home hero y secciones principales
- [x] Traducir PaywallModal y textos de precios
- [x] Preservar rutas relativas al cambiar de idioma

## Auth propia (email+password+Google)

- [x] Schema: añadir campos password_hash, google_id, reset_token a tabla users
- [x] Endpoints: register, login, google-oauth, forgot-password, reset-password
- [x] AuthModal: Sign Up + Login como modal estilo pdfe.com
- [x] Integrar AuthModal en Navbar y PaywallModal
- [x] Reemplazar getLoginUrl() por apertura del AuthModal

## Bugs Auth

- [x] Modal login muestra signup por defecto (defaultMode no se aplica correctamente)
- [x] Botón "Login con Google" falla con error "code and state are required"

## Rediseño Editor PDF (estilo pdfe.com)

- [x] Editor ocupa toda la pantalla (100vh - navbar)
- [x] Páginas separadas con espacio entre ellas, fondo gris claro
- [x] Panel de miniaturas compacto a la izquierda (como pdfe.com)
- [x] Área de trabajo con scroll vertical, páginas centradas y a tamaño real

## Editor pantalla completa (estilo pdfe.com)

- [x] Crear ruta /editor con el PdfEditor en pantalla completa
- [x] Home redirige a /editor al subir un PDF (pasando el archivo via contexto React)
- [x] Editor ocupa 100vh - altura navbar, sin hero encima
- [x] Páginas separadas con espacio entre ellas, fondo gris claro
- [x] Panel miniaturas compacto (150px), páginas bien visibles

## Drop zone mejorado

- [x] Drop zone acepta cualquier formato (Word, Excel, JPG, PNG, etc.) con mensaje de conversión a PDF
- [x] Editor PDF en pantalla completa estilo pdfe.com

## Toolbar del editor

- [x] Centrar la barra de herramientas del editor PDF
- [x] Traducir etiquetas de herramientas al idioma activo (Sign, Add text, Highlight, etc.)

## Responsive fixes

- [x] Navbar responsive con menú hamburguesa en móvil/tablet
- [x] Centrar toolbar del editor PDF
- [x] Traducir etiquetas de herramientas del editor al idioma activo

## Herramientas Editor PDF (correcciones)
- [x] Borrador: rectángulo blanco arrastrable para borrar zonas del PDF
- [x] Añadir texto: selector de fuentes (Arial, Times, Helvetica, etc.) y tamaño
- [x] Editar texto: panel con instrucciones y acceso al puntero
- [x] Resaltado: arrastrar para crear rectángulo de resaltado sobre el PDF
- [x] Pincel: dibujo libre a mano alzada con color y grosor
- [x] Verificar resto de herramientas (formas, notas, puntero, mover)

## Bugs Editor (v2)
- [x] Resize de anotaciones (notas, imágenes, texto, formas) no funciona — el handle de esquina no responde
- [x] Barra de acciones (Deshacer / Borrar último / Borrar todo) en panel lateral de TODAS las herramientas

## Modelo de pago Trial (pdfe.com style)
- [x] Stripe: checkout con trial_period_days=7 y 49,95€/mes (subscription mode)
- [x] PaywallModal: mostrar "0€ hoy, luego 49,95€/mes" con texto legal del trial
- [x] Checkout: primer cobro 0€ con tarjeta requerida
- [x] Barra de acciones (Deshacer/Borrar último/Borrar todo) en paneles del editor

## Entrega PDF tras pago
- [ ] Subir PDF editado a S3 antes de abrir el checkout, guardar URL en metadata de Stripe
- [ ] Página /payment/success: descargar PDF automáticamente y guardarlo en documentos del usuario
- [ ] Webhook: cuando suscripción se activa, marcar documento como entregado
- [ ] Panel de documentos muestra el PDF entregado con enlace de descarga

## Panel de Usuario - Restricción de Descarga
- [x] Panel documentos: mostrar botón de descarga solo si suscripción activa
- [x] Si no tiene suscripción: mostrar PaywallModal al intentar descargar (icono corona dorada)
- [x] Indicador visual en el panel que muestra el estado de la suscripción (badge verde/ámbar)

## Editor PDF - Bugs Móvil
- [x] Panel lateral como drawer overlay en móvil con botón X para cerrar
- [x] Thumbnails ocultos en móvil (hidden md:flex) para más espacio al canvas
- [x] Herramienta "Buscar texto" implementada con pdf.js getTextContent(), resultados con página y snippet
- [x] Al seleccionar herramienta en móvil, el panel se abre automáticamente

## Bugs Editor (v3)
- [ ] Herramienta Mover no funciona (no permite arrastrar anotaciones)

## Nuevas tareas (v4)
- [ ] Herramienta Mover: añadir panel con instrucciones y corregir drag
- [x] Página /cancelar-suscripcion con formulario de motivo de baja y confirmación
- [x] Resize de anotaciones: handle de esquina arrastrable para notas, imágenes y formas
- [x] Conectar tarjetas de conversión de la Home al editor con herramienta activa

## Rebranding editPDF.online
- [x] Nuevo logo editPDF (edit pequeño + PDF bold azul) en Navbar
- [x] Actualizar título de página a editPDF - Free Online PDF Editor
- [x] Actualizar meta description en inglés
- [x] Actualizar Footer: nombre editPDF y copyright
- [x] Actualizar i18n: footer_col_pdfpro y copyright en todos los idiomas
- [x] Actualizar textos visibles PDFPro → editPDF en Home, Login, Signup, Admin

## Blog SEO/GEO
- [x] Corregir spacing entre icono y texto del logo en Navbar
- [x] Schema DB: tabla blog_posts (slug, title, excerpt, content, metaTitle, metaDescription, publishedAt, readTime, category)
- [x] tRPC: procedimientos getBlogPosts, getBlogPost(slug)
- [x] Página /blog con listado de artículos (cards con imagen, título, excerpt, fecha)
- [x] Página /blog/:slug con artículo completo + meta tags SEO dinámicos
- [x] Enlace Blog en Navbar y Footer
- [x] 3 artículos SEO/GEO optimizados sobre keywords PDF de alto volumen
- [x] Seed de artículos en DB

## Blog Admin + Público
- [x] tRPC: getBlogPosts, getBlogPost(slug), createBlogPost, updateBlogPost, deleteBlogPost (admin)
- [x] Panel Admin: sección Blog con lista de entradas, crear/editar/eliminar
- [x] Editor rich text con TipTap (negrita, cursiva, listas, imágenes, HTML, headings)
- [x] Campos SEO: metaTitle, metaDescription, tags, categoría, tiempo de lectura
- [x] Publicar/despublicar entradas desde el panel
- [x] Página pública /blog con listado de artículos (cards)
- [x] Página pública /blog/:slug con artículo completo + JSON-LD + meta tags dinámicos
- [x] Enlace Blog en Navbar y Footer
- [x] sitemap.xml dinámico con todas las entradas del blog
- [x] 3 artículos de ejemplo pre-cargados en la DB

## Fixes post-publicación
- [ ] Actualizar VITE_APP_TITLE a "editPDF - Free Online PDF Editor" (pestaña navegador y portal OAuth)
- [x] Bug: login aparece al entrar en la web, debe aparecer solo al descargar
- [ ] Bug: sesión no persiste entre visitas (usuario tiene que volver a loguearse cada vez)
- [ ] Bug: al entrar en la web redirige hacia atrás / no mantiene la sesión
- [x] Fix OAuth callback: redirigir al usuario a la página de origen tras el login (no a "/")
- [x] Integrar Trustpilot en panel admin: reseñas demo, filtros, responder, guía de integración real

## Bugs Editor (v5) + Nuevas funciones
- [x] Bug CRÍTICO: flujo descarga tras login corregido (PDF guardado en sessionStorage, paywall se abre automáticamente al volver)
- [x] Bug: handle de resize (cuadro azul) desaparece al soltar el click — corregido (stopPropagation en click de anotación)
- [x] Bug: al hacer click en una anotación cambia a herramienta puntero — corregido (herramienta permanece activa)
- [x] Bug: no se puede eliminar una anotación individual — corregido (botón X en toolbar de selección)
- [x] Bug: formas no permiten editar tipo — añadido toggle Relleno/Solo borde en panel de formas
- [x] Bug: imágenes no permiten resize, cambiar opacidad ni eliminar individualmente — en progreso
- [x] Bug: la web no se traduce correctamente al cambiar idioma — corregido (Home.tsx usa t. para todos los textos)
- [x] Feature: firma con nombre — añadido tab 'Nombre' en panel de firma con fuente Dancing Script cursiva
- [x] Feature: formas — toggle 'solo borde' vs 'relleno' añadido en panel de formas
- [x] Feature: imágenes — slider de opacidad y botón eliminar en panel lateral — en progreso

## Editor Móvil (estilo pdfe.com)
- [x] Barra de herramientas horizontal fija en la parte inferior (scroll horizontal) en móvil
- [x] Botón Download grande fijo en la parte inferior en móvil
- [x] Botón compartir a la izquierda del Download en móvil
- [x] PDF ocupa toda la pantalla en móvil (sin panel lateral)
- [x] Panel de opciones de herramienta como bottom sheet desde abajo en móvil

## Editor UX - Interacción con anotaciones
- [x] Mover cualquier anotación directamente arrastrando (sin cambiar a herramienta "mover")
- [x] Botón X rojo en esquina superior derecha del cuadro azul de selección para eliminar
- [ ] Herramienta "Editar texto": capa de corrección blanca sobre texto original + reemplazo
- [ ] Bug: título pestaña sigue mostrando "PDFPro" en lugar de "editPDF"
- [x] Bug móvil: barra herramientas y botón descargar ahora fixed en bottom — siempre visible
- [x] Móvil: PDF encuadrado con márgenes grises, escala automática al ancho de pantalla
- [x] Móvil: indicador visual de scroll horizontal en barra de herramientas (gradiente fade derecho)
- [ ] Bug: dibujo de firma en canvas no funciona
- [ ] Feature: firma electrónica (eSign) con nombre, fecha, IP y certificado

## Stripe Elements - Pago embebido en modal (pdfe.com style)
- [x] Instalar @stripe/react-stripe-js y @stripe/stripe-js
- [x] Backend: endpoint createSetupIntent (crea customer + SetupIntent para capturar tarjeta)
- [x] Backend: endpoint confirmSubscription (adjunta tarjeta + crea suscripción con trial 7 días)
- [x] Frontend: reemplazar redirect a Stripe Checkout por formulario CardElement embebido en PaywallModal
- [x] Frontend: flujo completo: SetupIntent → confirmCardSetup → confirmSubscription → descarga automática
- [x] onPaymentSuccess callback en PdfEditor para descargar PDF tras pago exitoso

## Móvil - Touch para mover y redimensionar anotaciones
- [x] Touch drag: arrastrar anotación con el dedo (touchstart/touchmove/touchend en la anotación)
- [x] Touch resize: handle de esquina azul responde a touch para redimensionar (handle ampliado a 20x20px)
- [x] Sin necesidad de cambiar de herramienta: funciona siempre al tocar la anotación
- [x] touchAction: none en anotaciones para evitar conflicto con scroll del navegador

## SEO On-page - Página de inicio (/)
- [x] Meta title y description con palabras clave principales
- [x] H1 con keyword principal "Free Online PDF Editor" en contenido estático
- [x] H2/H3 con keywords secundarias (convert PDF, sign PDF, merge PDF, etc.)
- [x] Contenido estático HTML para crawlers con densidad de keywords adecuada
- [x] Datos estructurados JSON-LD (WebApplication + FAQPage)
- [x] Open Graph y Twitter Card tags
- [x] Meta keywords y canonical URL
- [x] html lang="en" para señalar idioma principal al crawler

## Modelo Freemium - Trial 0,50€ vs Mensual 49,95€
- [ ] DB: campo download_count en tabla users (contador de descargas)
- [ ] Backend: endpoint checkDownloadLimit - devuelve si el usuario puede descargar
- [ ] Backend: endpoint incrementDownloadCount - suma 1 al contador tras descarga exitosa
- [ ] Lógica: trial = máx 5 descargas en 7 días; mensual = ilimitado
- [ ] Pricing page: tabla de comparación Trial vs Mensual con checkmarks
- [ ] PaywallModal: mostrar dos planes con precios y límites claros
- [ ] PaywallModal: Trial destacado como "Most popular" con precio 0,50€
- [ ] PdfEditor: llamar a checkDownloadLimit antes de mostrar paywall

## PaywallModal - Rediseño estilo pdfe.com
- [x] Título "Your document is ready!" con check verde
- [x] Importe "0,50 € — Trial plan" visible arriba a la derecha
- [x] Tabs Card / Google Pay
- [x] Formulario Stripe Elements limpio (card number, expiry, CVC)
- [x] Checkbox con texto legal: renovación automática 49,95€/mes
- [x] Botón "Pay and download" negro
- [x] Preview del PDF a la izquierda del modal
- [x] Backend: cobrar 0,50€ real (PaymentIntent inmediato + suscripción 49,95€/mes con trial 7 días)

## Flujo completo pdfe.com
- [ ] Editor: botón "Save" guarda PDF en My Documents sin pagar
- [ ] Editor: botón "Download" abre directamente el modal de pago (si no tiene suscripción)
- [ ] Editor: si tiene suscripción activa, Download descarga directamente sin modal
- [ ] My Documents: columna "Timer" con cuenta atrás de 24h para usuarios sin suscripción
- [ ] My Documents: popup "Download not available" con botón "Subscribe" → /billing
- [ ] Página /billing: tabla de planes Trial 0,50€ / Monthly 49,95€
- [ ] Página /billing: tabla comparativa de funciones (Trial vs Monthly)
- [ ] Página /billing: FAQ con preguntas frecuentes
- [ ] Página /billing: modal de pago con tarjeta al pulsar "Start Test"

## Flujo completo pdfe.com
- [x] Botón Save en el editor (desktop + móvil)
- [x] My Documents: tabla con columnas Name, Updated Date, Size, Timer
- [x] Timer 24h: cuenta atrás desde createdAt para usuarios sin suscripción
- [x] Popup "Download not available" con botón Subscribe → /billing
- [x] Banner "Make the most of your account" con Upgrade now → /billing
- [x] Página /billing con tabla de planes Trial 0,50€ / Monthly 49,95€
- [x] Tabla comparativa de funciones (Trial vs Monthly)
- [x] FAQ en página de Billing
- [x] Modal de pago con tarjeta se abre desde botón "Start Test" en Billing
- [x] Sidebar Dashboard: Facturación → navega a /billing

## Edit Text - Detección y edición de texto nativo del PDF
- [x] Reducir keywords SEO en index.html a máximo 8 palabras clave enfocadas
- [x] Corregir error de sintaxis en PdfEditor.tsx (overlay de texto nativo roto)
- [x] Detectar bloques de texto con pdf.js getTextContent() por página
- [x] Mostrar cajas editables con borde punteado sobre cada bloque de texto
- [x] Al hacer clic en una caja: textarea editable en panel lateral con mismo font-size aproximado
- [x] Guardar ediciones de texto en nativeTextBlocks con editedStr
- [x] Al descargar: capa blanca sobre texto original + nuevo texto encima con pdf-lib

## Firma - Rediseño modal estilo pdfe.com
- [ ] Tab "Draw signature": lienzo más grande, selector de color, slider de grosor, botón Clear
- [ ] Tab "Write signature": input texto + dropdown 5 fuentes (Alex Brush, Dancing Script, Great Vibes, Pacifico, Sacramento) + preview en tiempo real
- [ ] Tab "Use image": subir imagen escaneada de la firma
- [ ] Botones Cancel / Create and use
- [ ] Fuentes caligráficas cargadas desde Google Fonts

## Panel Admin - Modo Test Stripe
- [ ] Campo stripe_test_mode en tabla site_settings de la DB
- [ ] Procedimiento tRPC admin: getStripeMode, setStripeMode
- [ ] Botón toggle en panel admin con indicador visual (verde=test, rojo=live)
- [ ] Aplicar modo test/live en todos los endpoints de Stripe (checkout, webhook, setup intent)

## Bugs i18n
- [ ] Bug: PaywallModal no se traduce al idioma activo (aparece siempre en inglés)
- [ ] Bug: Edit Text — texto original no se borra al exportar (solo se superpone el nuevo texto)

## Bug crítico: Edit Text no borra texto original al exportar
- [x] Corregir buildAnnotatedPdf: la capa blanca no cubre el texto original (problema de coordenadas pdf.js vs pdf-lib)

## Bug móvil: subida de archivo no funciona
- [x] Bug: en móvil al pulsar "Upload PDF to edit" no pasa nada y desaparece el header

## Bug móvil: seleccionar archivo no abre el editor
- [x] Bug: en móvil el selector de archivos se abre pero al seleccionar el archivo no navega al editor
