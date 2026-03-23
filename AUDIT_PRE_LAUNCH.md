# Auditoría Pre-Lanzamiento: editPDF con Google Ads

**Fecha:** 23 de marzo de 2026  
**Proyecto:** editPDF (editpdf.online)

---

## Resumen ejecutivo

La web editPDF tiene una base sólida: editor PDF funcional, sistema de suscripción con Stripe, autenticación propia (email + Google), internacionalización en 10 idiomas, blog SEO, panel admin y panel de usuario. Sin embargo, hay **elementos críticos** que deben resolverse antes de invertir en Google Ads para evitar pérdida de dinero, problemas legales con Stripe, o una mala experiencia de usuario que arruine la tasa de conversión.

A continuación se clasifican los pendientes en tres niveles de prioridad.

---

## 1. BLOQUEANTES — Resolver antes de lanzar Ads

Estos problemas pueden causar pérdida directa de dinero, bans de Stripe, o que los usuarios no puedan completar el flujo de pago.

| # | Problema | Impacto | Detalle |
|---|---------|---------|---------|
| 1 | **Sesión no persiste entre visitas** | El usuario se desloguea al cerrar el navegador y tiene que volver a registrarse. Si paga y vuelve al día siguiente, no puede acceder a sus documentos. | Bug reportado en todo.md, no corregido. La cookie JWT se establece correctamente (1 año de expiración), pero algo en el flujo pierde la sesión. Hay que diagnosticar si es un problema de `sameSite`, dominio de cookie, o redirección. |
| 2 | **Claves live de Stripe** | Sin claves live, no se puede cobrar dinero real. Actualmente solo funciona en modo test (sandbox). | Necesitas completar el KYC de Stripe, obtener las claves live y configurarlas en Settings → Payment en el panel de Manus. |
| 3 | **Email de confirmación post-pago** | Stripe puede suspender tu cuenta si no envías confirmación de compra al usuario. Es requisito de cumplimiento. | La función `sendPaymentConfirmationEmail` existe en `email.ts` y se llama en `routers.ts`, pero usa `onboarding@resend.dev` (dirección de prueba de Resend). Necesitas configurar un dominio verificado en Resend para que los emails lleguen realmente. |
| 4 | **Texto de autorización de cargo recurrente** | Stripe exige que el botón de pago incluya texto explícito de autorización de cargo recurrente. Sin esto, pueden rechazar disputas a tu favor. | El checkbox legal ya existe con texto claro sobre el trial y el cobro de 49,90€/mes, lo cual es bueno. Pero el botón de pago debería decir algo como "Iniciar prueba gratuita — 49,90€/mes tras 7 días" en lugar de solo "Pagar y descargar". |
| 5 | **Páginas legales incompletas** | Solo existe la página de "Términos y Condiciones" en la DB. Faltan: Política de Privacidad, Política de Cookies, RGPD. Las rutas existen pero muestran contenido vacío. | Google Ads puede rechazar anuncios si las páginas legales no están completas, especialmente la política de privacidad. |
| 6 | **Título de pestaña muestra "PDFPro"** | Los usuarios ven "PDFPro" en la pestaña del navegador en lugar de "editPDF". Confuso para la marca. | Actualizar `VITE_APP_TITLE` en los secrets del proyecto. |

---

## 2. IMPORTANTES — Resolver en la primera semana

Estos problemas afectan la conversión y la experiencia del usuario, pero no impiden técnicamente el lanzamiento.

| # | Problema | Impacto | Detalle |
|---|---------|---------|---------|
| 7 | **Dibujo de firma en canvas no funciona** | Los usuarios que quieran firmar con dibujo (no con nombre) no podrán hacerlo. Es una de las herramientas más usadas. | Bug reportado. El tab "Nombre" funciona, pero el canvas de dibujo no responde. |
| 8 | **Selector de idioma en Footer** | El Footer tiene un `<select>` decorativo que no cambia el idioma. Los usuarios que lleguen desde otros países no podrán cambiar idioma desde el footer. | Ya existe el selector en Navbar, pero el del Footer es solo visual. Hay que conectarlo al `useLanguage` hook. |
| 9 | **Traducir PaywallModal** | El modal de pago mezcla textos hardcodeados con traducciones. Usuarios no hispanohablantes verán una mezcla de idiomas en el momento más crítico (el pago). | Pendiente en todo.md. |
| 10 | **Imagen OG (Open Graph)** | El meta tag apunta a `https://editpdf.online/og-image.png` pero no existe el archivo en `client/public/`. Los enlaces compartidos en redes sociales no mostrarán preview. | Crear una imagen OG de 1200x630px con el logo y subirla. |
| 11 | **robots.txt no existe** | Sin robots.txt, los crawlers indexan todo (incluido /admin, /dashboard). | Crear un robots.txt básico que bloquee /admin y /dashboard. |
| 12 | **Enlace "Cancelar suscripción" en footer sin login** | Stripe recomienda que haya un enlace visible de cancelación accesible sin necesidad de estar logueado. | La ruta `/cancelar-suscripcion` existe pero hay que verificar que funcione sin login. |

---

## 3. DESEABLES — Mejorar después del lanzamiento

Estos son mejoras de producto que aumentarán la retención y el valor percibido, pero no son urgentes para el lanzamiento.

| # | Problema | Detalle |
|---|---------|---------|
| 13 | Exportar PDF a Word/Excel | El endpoint del servidor ya está implementado (esta sesión). Falta conectar el panel del editor (ya hecho parcialmente). |
| 14 | Barra de progreso en protección | Ya implementada en esta sesión. |
| 15 | Herramienta "Editar texto" mejorada | Funciona de forma básica pero las coordenadas no son perfectas en todos los PDFs. |
| 16 | Herramienta "Mover" | No funciona, pero el drag directo de anotaciones sí funciona (se puede mover arrastrando). Es redundante. |
| 17 | Firma electrónica (eSign) con certificado | Feature avanzada, no necesaria para el lanzamiento. |
| 18 | Sitemap más completo | El sitemap actual incluye es/en + blog, pero no incluye las demás páginas por idioma (fr, de, pt, etc.) ni las páginas legales. |
| 19 | Verificación Google OAuth | Publicar la app en Google Cloud Console para que el login muestre "editPDF" en lugar de "app no verificada". |

---

## 4. Lo que YA está bien

Para dar contexto, esto es lo que **ya funciona correctamente** y no necesita cambios:

- Editor PDF completo (texto, firma por nombre, resaltado, pincel, formas, imágenes, notas, borrador, comprimir, proteger con contraseña, rotar, eliminar páginas, buscar texto)
- Suscripción Stripe con trial 7 días gratuito + 49,90€/mes
- Autenticación propia (email + Google OAuth)
- Panel admin con estadísticas, gestión de usuarios, blog, páginas legales editables
- Panel de usuario con documentos, facturación, perfil
- Internacionalización en 10 idiomas (Navbar, Home, Pricing, Editor)
- Blog con 3 artículos SEO
- Sitemap dinámico
- Google Analytics (gtag) + Umami analytics
- Google Search Console y Bing Webmaster verificados
- JSON-LD structured data (WebApplication + FAQPage)
- Meta tags SEO completos (title, description, OG, Twitter Card)
- Responsive design (móvil, tablet, desktop)
- Conversión de formatos (Word, Excel, JPG, PNG, TXT → PDF)
- Email de cancelación de suscripción
- Página de cancelación de suscripción

---

## 5. Plan de acción recomendado

**Antes de activar Google Ads (1-2 días de trabajo):**

1. Diagnosticar y corregir el bug de persistencia de sesión
2. Completar las páginas legales (Privacidad, Cookies, RGPD) desde el panel admin
3. Actualizar VITE_APP_TITLE a "editPDF - Free Online PDF Editor"
4. Configurar dominio en Resend para que los emails de confirmación lleguen
5. Completar KYC de Stripe y configurar claves live
6. Crear robots.txt y og-image.png
7. Actualizar texto del botón de pago con autorización explícita

**Primera semana tras lanzamiento:**

8. Corregir firma por canvas
9. Conectar selector de idioma del Footer
10. Traducir PaywallModal completamente
11. Ampliar sitemap con todos los idiomas
