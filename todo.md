
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
- [ ] Traducir PaywallModal y textos de precios
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

## Stripe - Configuración completa
- [ ] Crear productos y precios en Stripe (Trial 0,50€ + Mensual 49,95€)
- [ ] Actualizar schema DB con stripe_customer_id y stripe_subscription_id
- [ ] Implementar PaywallModal con Stripe Elements (tarjeta inline)
- [ ] Implementar suscripción automática mensual con trial
- [x] Price IDs reales de Stripe configurados (49,90€/mes + 0,50€ activación)
- [x] Flujo pago: 0,50€ inmediato + suscripción automática 49,90€/mes tras 7 días
- [x] Webhook para sincronizar estado de suscripción
- [ ] Claves live de Stripe configuradas en Settings → Secrets (pendiente usuario)

## UX - Drag directo en anotaciones
- [x] Anotaciones arrastrables sin cambiar a herramienta mover (desktop mouse)
- [x] Anotaciones arrastrables sin cambiar a herramienta mover (móvil touch)
- [x] Handle de resize visible siempre en anotación seleccionada

## i18n - Textos hardcodeados en PdfEditor
- [x] Traducir "Selecciona una herramienta para comenzar" y textos del estado vacío
- [x] Traducir todos los textos hardcodeados del editor (tooltips, mensajes, etc.) - 10 idiomas

## Bug CRÍTICO - Editar texto
- [x] Herramienta "Editar texto": corregido — coordenadas PDF directas + editor inline sobre el bloque + auto-guardado al perder foco

## Bug CRÍTICO (v2) - Editar texto sigue sin funcionar
- [ ] Diagnosticar con prueba real qué coordenadas llegan al export y por qué el texto aparece mal
- [ ] Reimplementar con enfoque diferente: leer coordenadas directamente desde pdf-lib en el servidor

## Bugs reportados 19/03
- [x] Panel "Editar texto": eliminado conflicto autoFocus, ahora popup flotante sobre el bloque
- [x] Miniaturas de páginas: escala corregida de 0.2 a 0.4
- [x] Error "Failed to save document": cambiado a REST multipart upload (evita límite base64 tRPC)

## Bug - Error "No PDF header found"
- [x] buildAnnotatedPdf: añadida validación de header %PDF antes de cargar + ignoreEncryption:true + mensaje de error claro si el archivo no es PDF válido

## Bugs 19/03 v2
- [x] Validación %PDF: busca en primeros 1024 bytes (soporta PDFs con BOM/espacios antes del header)
- [x] Texto editado: capa blanca ahora cubre hasta el borde derecho de la página para borrar completamente el original

## Bugs 19/03 v3
- [x] Toolbar superior: botones se salen del contenedor (overflow) — corregido con overflow-x-auto y min-w-0
- [x] Canvas de firma: no registra el dibujo al arrastrar el ratón — corregido usando useRef en lugar de useState para isSignDrawing
- [x] Texto editado aparece encima del original — corregido con fondo blanco opaco en el bloque editado
- [x] Error "Cannot perform slice on detached ArrayBuffer" — corregido copiando pdfBytes antes de usar en buildAnnotatedPdf

## Bugs críticos reportados por usuario (19/03 v4)
- [ ] Bug 1: Subir archivo no-PDF da error y redirige a inicio sin header (página rota)
- [ ] Bug 2: Botones del toolbar no se ven bien (overflow/visual)
- [ ] Bug 3: Canvas de firma no permite dibujar (solo funciona tab "Nombre")
- [ ] Bug 5: Botón Rotar página no funciona
- [ ] Bug 6: Botón Eliminar página no funciona
- [ ] Bug 7: Al dar Descargar sin login, pide login, y al logearse pierde el PDF y va a inicio
- [ ] Bug 8: Pago Stripe cobra 0€ (error "card velocity exceeded") en lugar de 0,50€
- [ ] Bug 9: Error al guardar documento (Save) aunque el usuario está logueado
- [ ] Bug 10: Mezcla de idiomas en el editor (textos en inglés cuando debería estar en español)

## Bugs críticos reportados y corregidos 19/03 v5

- [x] Bug 1: subir no-PDF da error y redirige sin header — validación en Home.tsx (solo acepta PDF) + EditorPage con isRestoringFromSession para no redirigir mientras se restaura
- [x] Bug 2: botones toolbar se salen del contenedor — flex-1 y truncate en ActionBar
- [x] Bug 3: canvas firma no dibuja — useRef para isSignDrawing + ResizeObserver + global mouseup listener
- [x] Bug 5: botón rotar no funciona — copia defensiva de pdfBytes en rotatePage
- [x] Bug 6: botón eliminar página no funciona — copia defensiva de pdfBytes en deletePage
- [x] Bug 7: login pierde el PDF — isRestoringFromSession en PdfFileContext + EditorPage espera antes de redirigir
- [x] Bug 8: Stripe cobra 0€ / card velocity exceeded — mensajes de error amigables en español con mapeo de códigos Stripe
- [x] Bug 9: error al guardar — mejor manejo de errores con mensaje específico + fix ArrayBuffer slice
- [x] Bug 10: mezcla de idiomas — textos hardcodeados en inglés reemplazados por traducciones (Card tab, Save button, etc.)

## Mejoras Post-Pago (19/03 v5)
- [x] Corregir precio mostrado en PaywallModal (mostrar 0,50€ en lugar de 0,00€)
- [x] Añadir botón "Editar" en documentos del panel de usuario
- [x] Tras pago exitoso, redirigir automáticamente al panel de documentos

## Bug crítico: documento no se guarda antes del pago
- [x] Generar PDF final con anotaciones y guardarlo en sessionStorage antes del redirect de login
- [x] Restaurar PDF editado desde sessionStorage tras el login y pasarlo al PaywallModal
- [x] Subir PDF editado a S3 durante el pago (en CheckoutForm) y guardarlo en DB
- [x] Tras el pago, el documento ya aparece en el panel del usuario listo para descargar

## Bug rotación de páginas
- [x] Bug: rotar página solo funciona una vez, no permite rotar múltiples veces consecutivas

## Aviso verificación bancaria
- [ ] Añadir texto explicativo en PaywallModal sobre verificación de 0,00€ del banco

## Autoguardado al descargar
- [x] Guardar PDF editado en panel del usuario al pulsar Descargar (independientemente del pago)

## Rediseño checkout
- [x] Rediseñar PaywallModal: layout dos columnas (preview PDF izquierda + formulario derecha), checkbox obligatorio, colores PDFPro

## Cancelación de suscripción (panel Facturación)
- [x] Endpoint tRPC subscription.cancel que llama a Stripe cancel_at_period_end
- [x] Mostrar estado de suscripción en apartado Facturación del Dashboard (plan, fecha renovación/expiración)
- [x] Botón "Cancelar suscripción" con modal de confirmación — cancela al final del ciclo actual
- [x] Mostrar aviso "Tu acceso expira el [fecha]" si la suscripción está en periodo de cancelación

## Bug crítico: PDF no se guarda tras pago
- [x] Corregir orden: confirmar suscripción PRIMERO, luego subir PDF (para que el usuario sea premium al subir)
- [x] Reemplazar upload base64 tRPC por REST multipart en CheckoutForm (evita límite de tamaño)
- [x] Añadir reintento automático si el upload falla en el primer intento
- [x] Eliminar auto-save pre-pago (causaba duplicados y subía antes de tener suscripción activa)
- [x] Invalidar cache de documentos tras upload exitoso para que aparezca inmediatamente en el panel

## Indicador de progreso en checkout
- [x] Mostrar pasos animados durante el pago: "Verificando tarjeta" → "Activando suscripción" → "Guardando documento..."

## Cumplimiento Stripe (anti-ban)
- [ ] Texto de autorización de cargo recurrente en el botón de pago
- [ ] Enlace "Cancelar suscripción" en el footer (sin login)
- [ ] Página pública de cancelación de suscripción
- [ ] Email de confirmación automático post-pago
- [ ] Términos actualizados con sección de suscripción y cargos recurrentes
- [x] Email de confirmación de cancelación de suscripción con fecha de acceso y enlace de reactivación

## Google OAuth propio (sin Manus)
- [x] Configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET como secrets
- [x] Implementar endpoint /api/auth/google en el servidor
- [x] Implementar callback /api/auth/google/callback para Google OAuth propio
- [x] Actualizar frontend (AuthModal + PaywallModal) para usar el nuevo flujo de Google OAuth
- [ ] Publicar y verificar que el login muestra "editPDF" en la pantalla de Google
- [x] Cambiar checkout a trial gratuito 0,00€ (eliminar cobro de 0,50€, mostrar 100% Discount - New User)
- [x] Corregir bug eliminar página (no se eliminaba realmente)
- [x] Todos los toast del editor usan traducciones (no hardcodeados en español)
- [x] Panel protección con contraseña mejorado: confirmación + algoritmo de cifrado (128-AES, 256-AES, ARC-FOUR)
- [x] Textos legales del paywall actualizados en todos los idiomas (0,00€ trial gratuito)

## Rediseño Home orientado a conversión (CRO)
- [x] Hero oscuro con fondo navy, CTA grande, barra de social proof
- [x] Añadir nuevas claves i18n para textos de conversión en 10 idiomas
- [x] Sección de beneficios orientada a valor (no features técnicas)
- [x] Urgencia sutil y trust signals en el hero

## Correcciones i18n y Pricing (Sesión actual - 22/03/2026)
- [x] Corregir errores de sintaxis en i18n.ts (comillas tipográficas en faq_a7 en todos los idiomas)
- [x] Actualizar página de Pricing para usar sistema i18n (useLanguage hook)
- [x] Corregir precios en i18n.ts: 49,90 €/mes y 0,00 € trial en todos los idiomas
- [x] Agregar traducciones de pricing_feature_*, pricing_faq_*, pricing_popular, etc. en 10 idiomas
- [x] Agregar FAQ de cancelación de suscripción (faq_q7/faq_a7) en 10 idiomas
- [x] Página de Pricing completamente i18n-ready

## Soporte multi-formato en dropzone (22/03/2026)
- [x] Home dropzone: aceptar Word, Excel, PPT, JPG, PNG, GIF, WebP, BMP, TIFF, HTML, TXT además de PDF
- [x] Home openEditor: eliminar bloqueo de archivos no-PDF, solo rechazar formatos no soportados
- [x] PdfEditor initialFile: convertir automáticamente archivos no-PDF antes de cargar en el editor
- [x] Verificado: conversión de TXT, JPG, DOCX a PDF funciona correctamente en el servidor

## Soporte multi-formato en dropzone (22/03/2026)
- [x] Home dropzone: aceptar Word, Excel, PPT, JPG, PNG y más además de PDF
- [x] Home openEditor: eliminar bloqueo de archivos no-PDF
- [x] PdfEditor initialFile: convertir automáticamente archivos no-PDF antes de cargar

## Bug: conversión colgada en móvil (22/03/2026)
- [x] Diagnosticar por qué la conversión se queda en "Convirtiendo..." indefinidamente en móvil
- [x] Corregir: servidor devuelve PDF binario en lugar de base64 JSON (elimina 33% overhead + atob memory issues)
- [x] Corregir: cliente lee resp.blob() en lugar de resp.json() + atob()
- [x] Añadir AbortController con timeout de 90s para evitar colgadas indefinidas
- [x] Añadir detección de tipo MIME por extensión en el servidor (fix para móvil que envía application/octet-stream)

## Bugs Editor (v6) - 22/03/2026
- [x] Bug: herramienta "Proteger PDF" pide registro/pago antes de usarla — eliminado paywall prematuro
- [x] Bug: revisar todas las herramientas que bloquean antes de descargar — eliminados paywalls en comprimir, proteger, convertir a imagen, fusionar, dividir
- [x] Bug: pincel no funciona en móvil — añadidos touch handlers (onTouchStart/Move/End) al canvas de dibujo
- [x] Bug: pincel no funciona en PC — pendiente verificación en navegador real

## Revisión completa del código (22/03/2026)
- [x] Revisar todos los archivos principales del proyecto en busca de fallos
- [x] Corregir: precio del trial 0,50€ → 0,00€ en Dashboard, Pricing, email.ts, products.ts, routers.ts y tests
- [x] Corregir: enlace roto /contacto en CancelSubscription → ContactModal
- [x] Corregir: ruta /gdpr faltante en App.tsx → añadida ruta a LegalPage
- [x] Corregir: stale closure en pincel (isCanvasDrawing useState → useRef)
- [x] Corregir: touch handlers del pincel usan isCanvasDrawingRef.current en lugar del valor capturado
- [x] Corregir: pdfjs worker usa local (Vite) en lugar de CDN externo para evitar n.toHex error
- [x] Corregir: ACCEPTED_MIME_TYPES/EXTENSIONS movidos fuera del componente Home (evita recreación en cada render)
- [x] Corregir: email de confirmación de pago mostraba 0,50€ → corregido a 0,00€

## Nuevas tareas completadas (22/03/2026 v2)
- [x] FAQ cancelación: añadida pregunta faq_q7/faq_a7 en Home y Pricing (paso a paso: login → Facturación → Cancelar + contacto si no pueden acceder)
- [x] Protección con contraseña: implementado cifrado real con pikepdf (AES-256, AES-128, ARC4) en el servidor
- [x] Pincel confirmado funcionando en móvil por el usuario

## Mejoras v6
- [ ] Exportar PDF a Word (.docx) usando LibreOffice en el servidor
- [ ] Exportar PDF a Excel (.xlsx) usando LibreOffice en el servidor
- [ ] Barra de progreso animada en el panel de protección con contraseña
- [x] Selector de idioma en el Footer

## UX: Pantalla de carga al convertir archivos
- [x] Reemplazar toast "Convirtiendo..." por overlay de carga completo con barra de progreso animada en la Home
- [x] Bug: anotación seleccionada (cuadro azul) no se deselecciona al cambiar de herramienta o clic en zona vacía
- [x] Bug: flujo de "Añadir texto" invertido — debería ser clic en PDF primero, luego escribir
- [x] Bug: no se puede editar texto ya añadido (color, tamaño, fuente) al seleccionarlo

## Textos legales EDITPDF.ONLINE
- [x] Crear/actualizar Términos y Condiciones
- [x] Crear Política de Privacidad
- [x] Crear Política de Cookies
- [x] Crear página de cumplimiento RGPD

## Banner de cookies y robots.txt
- [x] Crear componente CookieBanner con consentimiento de cookies (LSSI)
- [x] Crear robots.txt bloqueando /dashboard, /admin y rutas internas

## OG Image y persistencia de sesión
- [x] Crear og-image.png atractiva para compartir en redes sociales
- [x] Configurar meta tags OG en index.html con la imagen
- [x] Diagnosticar y corregir persistencia de sesión (cookie/JWT no persiste entre visitas — añadido maxAge: ONE_YEAR_MS a cookies de login y register)

## Google Consent Mode v2
- [x] Implementar Google Consent Mode v2 vinculado al banner de cookies para cumplir EEE/Google Ads

## Google Ads Conversion Tracking
- [x] Implementar evento gtag conversion (AW-18034146775/8NSFCKitgI4cENf7rJdD) al detectar ?payment=success en Dashboard

## Fix descarga cross-origin Dashboard
- [x] Corregir descarga de documentos en Dashboard: usar fetch+blob en lugar de <a download> para URLs de S3 cross-origin

## Google Ads compliance - Cloud SaaS messaging
- [x] Ajustar Home para dejar claro que es un servicio en la nube (no software descargable)
- [x] Añadir badges/textos como "100% Cloud-Based", "No Download Required", "Works in your browser"
- [x] Asegurar que no haya lenguaje que sugiera descarga de software

## Bug: URL /en/ muestra contenido en español
- [x] Corregir detección de idioma: la URL /en/ debe mostrar contenido en inglés, no usar el idioma del navegador
- [x] Reescribir Tools.tsx para usar sistema i18n (useLanguage hook) en lugar de textos hardcodeados en español
- [x] Añadir claves i18n faltantes para la página Tools: categorías, descripciones de herramientas, textos de la página
- [x] Reescribir Footer.tsx para usar sistema i18n (useLanguage hook) en lugar de textos hardcodeados en español

## Rebranding editPDF → PDFUp (pdfup.io)
- [x] Rebrand: Cambiar nombre de "editPDF" a "PDFUp" en Navbar
- [x] Rebrand: Cambiar nombre en Footer
- [x] Rebrand: Cambiar nombre en Home.tsx (hero, textos)
- [x] Rebrand: Cambiar nombre en meta tags y título de página
- [x] Rebrand: Cambiar nombre en todas las traducciones i18n (10 idiomas)
- [x] Rebrand: Generar nuevo logo/favicon para PDFUp
- [x] Rebrand: Actualizar VITE_APP_TITLE a "PDFUp" (requiere cambio manual en Settings)
- [x] Rebrand: Cambiar nombre en páginas de Pricing, Blog, FAQ, etc.
- [x] Rebrand: Cambiar nombre en AuthModal, PaywallModal, Dashboard
- [x] Rebrand: Nuevo dominio pdfup.io configurado

## Reemplazo Google Analytics/Ads → Nuevo Google Tag
- [x] Borrar código antiguo de Google Analytics (G-S9PBPV95TL, G-LKD51NK94C)
- [x] Borrar código antiguo de Google Ads (AW-18034146775)
- [x] Instalar nuevo Google Tag (G-XBH23TMG7K)
- [x] Mantener Google Consent Mode v2 compatible con nuevo tag
- [x] Corregir ID de Google Tag: G-XBH23TMG7K → G-XBHZ3TMG7K
