
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
- [ ] Tarjetas de herramientas de Home abren el editor con la herramienta activa
- [ ] Herramientas de conversión (PDF a Word, JPG, etc.) funcionales o con mensaje claro

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
- [ ] Flujo cancelar suscripción en footer → página /cancelar-suscripcion

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
- [ ] Resize de anotaciones (notas, imágenes, texto, formas) no funciona — el handle de esquina no responde
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
- [ ] Página /cancelar-suscripcion con formulario de motivo de baja y confirmación
- [ ] Resize de anotaciones: handle de esquina arrastrable para notas, imágenes y formas
- [ ] Conectar tarjetas de conversión de la Home al editor con herramienta activa
