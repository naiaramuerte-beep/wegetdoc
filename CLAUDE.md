# EditorPDF (formerly WeGetDoc)

## Project Overview

Online PDF editor SaaS — edit, convert, sign, and protect PDFs in the browser. Built with React (Vite) frontend + Express/tRPC backend, deployed on Railway.

- **Domain:** editorpdf.net (migrated from wegetdoc.com)
- **Brand name:** EditorPDF
- **Logo parts:** ["Editor", "PDF"]
- **Repo:** github.com/naiaramuerte-beep/wegetdoc

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, Wouter (routing), tRPC client
- **Backend:** Express, tRPC, Drizzle ORM (MySQL)
- **Payments:** Stripe (SetupIntent + SubscriptionSchedule)
- **Auth:** Google OAuth 2.0, email/password
- **Storage:** Cloudflare R2 (documents)
- **Email:** Resend (transactional emails)
- **Hosting:** Railway
- **i18n:** 10 languages (es, en, fr, de, pt, it, nl, pl, ru, zh)

## Key Architecture

### Stripe Payment Flow
1. `createCheckoutSession` creates a **PaymentIntent** for the intro amount (0.50€, read from `STRIPE_INTRO_PRICE_ID` which is a one-time price) with `setup_future_usage: "off_session"` to save the card
2. Frontend calls `stripe.confirmPayment()` with billing country + postal_code from `/api/geo` — 3D Secure shows 0.50€
3. `confirmSetup` sets the saved card as default, creates a **Subscription** with `STRIPE_PRICE_ID` (19.99€/month) and `trial_end` 7 days out (first monthly charge delayed since intro was already paid)
4. PaymentElement hides country and postalCode fields (`"never"`) — values come from geolocation

### Google OAuth
- Redirect URIs hardcoded in `server/_core/googleOauth.ts` for `editorpdf.net` and `www.editorpdf.net`
- Must be registered in Google Cloud Console
- Cookie config in `server/_core/cookies.ts` — no domain hardcoded, uses request host

### CSP (Content Security Policy)
- Configured in `server/_core/index.ts` (security headers middleware)
- Allowed: Stripe, Google Analytics, Google Tag Manager, Google Translate (gstatic.com), Google.com, Google Fonts

### Auth Detection (autoResume)
- `PdfEditor.tsx` polls `isAuthenticated` every 300ms after OAuth redirect
- Calls `refreshAuth()` every ~1.5s to re-query `auth.me` (since `retry: false`)
- Timeout after 15 seconds

## Important Files

- `client/src/lib/brand.ts` — Client brand config (name, domain, logoParts, colors)
- `server/brand.ts` — Server brand config
- `client/src/lib/i18n.ts` — All translations (10 languages)
- `server/_core/index.ts` — Express middleware, CSP, geo endpoint, sitemap
- `server/_core/googleOauth.ts` — Google OAuth routes
- `server/_core/cookies.ts` — Session cookie config
- `server/routers.ts` — tRPC routes (auth, subscription, documents)
- `client/src/components/PaywallModal.tsx` — Stripe payment modal
- `client/src/components/PdfEditor.tsx` — Main PDF editor
- `server/email.ts` — Payment/cancellation email templates (Resend)
- `server/emails.ts` — Subscription confirmation email
- `scripts/seed-legal.mjs` — Legal pages seed (terms, privacy, cookies, legal, GDPR)
- `server/seed-legal-pages.ts` — Alternative legal pages seed (terms, privacy, cookies, refund)

## Environment Variables

- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID` (monthly), `STRIPE_INTRO_PRICE_ID` (intro 0.50€)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL` (MySQL)
- `R2_*` (Cloudflare R2 storage)
- `RESEND_API_KEY`
- `CLOUDCONVERT_API_KEY` (PDF→Office/Image conversions on `/api/convert/pdf-to/:format`)
- `BRAND_NAME` / `VITE_BRAND_NAME` (defaults to "EditorPDF")

## Commands

- `npm run dev` — Start dev server
- `npm run db:push` — Generate + apply Drizzle migrations
- `railway run npm run db:push` — Run migrations against Railway DB
- `node scripts/seed-legal.mjs` — Seed legal pages
- `node scripts/seed-blog.mjs` — Seed blog articles

## Recent Changes (this session)

1. **Domain migration:** wegetdoc.com → editorpdf.net (all URLs, emails, OAuth, sitemap, robots.txt)
2. **Rebrand:** WeGetDoc → EditorPDF (brand name, logo, i18n, email templates, legal texts, comments)
3. **Stripe fixes:**
   - Pass billing country from geolocation to `confirmSetup`
   - Pass postal_code from geolocation to `confirmSetup`
   - Removed `attach_to_self` (incompatible with `customer`), added fallback in `confirmSetup` to retrieve payment method from latest SetupIntent if not found via `paymentMethods.list`
4. **CSP updates:** Added Google Translate (gstatic.com, translate.googleapis.com) and google.com
5. **Auth fix:** autoResume poll now calls `refreshAuth()` periodically instead of relying on single `retry: false` query
6. **Google Translate fix:** Added `translate="no"` and `notranslate` class to root div + meta tag to prevent Google Translate from modifying React-managed DOM (causes `insertBefore` errors)
7. **Stripe payment flow rewrite:** Replaced SetupIntent (0€) with PaymentIntent using STRIPE_INTRO_PRICE_ID (0.50€, one-time price). confirmSetup creates monthly subscription with 7-day trial.
8. **Google Ads compliance:** Removed "free", "no software", "no installation" language from schema markup, FAQ, i18n strings, and blog content to avoid "free desktop software" classification.
9. **WYSIWYG text edit — metric-compatible fonts.** Editor overlay and exported PDF now use the same font for edited text blocks, so word-wrap matches between preview and download.
   - Added `@pdf-lib/fontkit` and bundled 4 open-source families (Carlito/Arimo/Tinos/Cousine) as 16 TTFs in `client/public/fonts/` — metric-identical substitutes for Calibri/Arial/Times/Courier.
   - `@font-face` declarations in `client/src/index.css` load them; `PdfEditor.tsx` font map prepends the matching family to every CSS stack (e.g. `"Carlito, Calibri, sans-serif"`).
   - In `buildAnnotatedPdf`, `doc.registerFontkit(fontkit)` + per-family embed (subset) via `getCustomFont(family, variant)`; Helvetica kept as fallback only. Line-height lowered to 1.2 to match overlay CSS.
10. **Undo/redo covers native text edits + correct initial state.**
    - `HistoryEntry` now stores `{ annotations, textBlocks: Map<number, NativeTextBlock[]> }` so Ctrl+Z reverts BOTH annotations and edits to the PDF's detected text blocks.
    - On PDF load, history is seeded with an empty initial entry at index 0 (previously `[]`/index -1), so the first user action creates a reversible state instead of wiping work.
    - `loadNativeTextBlocks` backfills its result into existing history entries for that page (PDF-native data, not a user action) so undoing past the first edit doesn't erase detected text.
    - `allNativeTextBlocksRef` mirrors the state so `pushHistory` can snapshot without closure races.
11. **Mobile UX: no tool preselected on PDF open.** Desktop keeps "edit-text" as default; on mobile (`window.innerWidth < 768`) the default is `pointer`, avoiding auto-opening the tool sheet on file load.
12. **Google Tag Manager (GTM-5MTRQR7W) installed.** `client/index.html`: JS snippet at top of `<head>` (before gtag.js), `<noscript>` iframe right after `<body>`. CSP in `server/_core/index.ts` already allows `googletagmanager.com` in script-src/frame-src/img-src/connect-src.
13. **CookieBanner + AuthModal + Login: ink/red palette.** Replaced remaining blue accents (`#1565C0`/`#0D47A1`, `bg-blue-*`, `text-orange-500`) with ink `#0A0A0B` + accent `#E63946` to match the redesigned site. AuthModal brand chip is now a black square with a small red dot (mini isotipo). Login page bg switched to ink and wordmark to "editor**pdf**".
14. **Product Tour: 9-step desktop onboarding.** `@reactour/tour` wrapped in `client/src/components/ProductTour.tsx`. Auto-starts 1.5s after PDF load, persists via `localStorage["editorpdf_tour_seen_v1"]`, "?" help button in editor header relaunches. Steps: welcome → filename → toolbar → undo/redo → edit-text → sign → thumbnails → save → download. `data-tour="..."` attributes on PdfEditor.tsx target each step. 18 i18n keys × 10 langs.
15. **Google Ads conversion tracking with real PaymentIntent ID + value.** `PaywallModal.tsx` now captures `paymentIntent.id` from `stripe.confirmPayment()` and threads it through `PaymentForm → handleComplete → onSuccess` until it lands as `?txn=pi_xxx` on `/payment/success`. `PaymentSuccess.tsx` reads `?txn=` and fires gtag with `transaction_id: <pi_xxx>`, `value: 19.99`, `currency: 'EUR'` (conversion ID `AW-18071860641/pjCqCJ3srZkcEKHrqqlD`). Fallback `pmt_<timestamp>` in PdfEditor:5353 still covers the edge case where Stripe returns no PaymentIntent (e.g. 3DS redirect).
16. **Standalone PDF→Office/Image converter** (separate from the editor — SEO-driven funnel).
    - New page `client/src/pages/ConverterPage.tsx` for slugs `pdf-to-word`, `pdf-to-excel`, `pdf-to-powerpoint`, `pdf-to-jpg`, `pdf-converter` (mapped in `App.tsx > CONVERTER_ROUTES`). Routes for these slugs bypass `ToolLanding` so the user lands directly on the converter UI. `key={slug}` on the route forces a fresh component instance when navigating between converter targets so leftover state doesn't bleed across.
    - Flow: upload PDF → fake "Converting…" progress (~4s) → "ready" preview card with rendered page-1 thumbnail (pdf.js, with the toHex polyfill + workerSrc init re-applied locally) → click "Download" → `PaywallModal` opens (auth + Stripe in one) → after payment, real call to `POST /api/convert/pdf-to/:format` with the original PDF, autodownload of the converted file, redirect to `/payment/success?txn=pi_...`.
    - Backend endpoint added to `server/_core/index.ts` — uses the `cloudconvert` npm SDK and `process.env.CLOUDCONVERT_API_KEY` (must be added to Railway envvars). Pipeline: `import/upload → convert → export/url`, then re-streams the result back to the client with `Content-Disposition: attachment` + `X-Converted-Name` header.
    - `PaywallModal.tsx` got a new `converter?: { label, price }` prop. When present (only from the converter), the auth subtitle, the "ready" sidebar text and the pricing block all swap to converter-specific copy ("Your Word file for only 0,50€") — editor flow unaffected. Same commit also swept the remaining blue accents in PaywallModal's auth + payment steps to ink/red (`#0A0A0B` + `#E63946`), including the Stripe Elements `colorPrimary`.
    - "All conversion tools" grid below the upload card lists 10 tiles (4 PDF→X, 3 X→PDF, 3 utilities) for cross-navigation between landings; the active landing is highlighted with a "NOW" badge and is non-clickable.
17. **Admin Billing tab — real revenue from Stripe + fixed MRR + date range.**
    - **MRR bug fixed**: previous calc added €0.50 per trial sub to MRR; trial intro is one-time, not recurring. Now MRR only counts `status=active` subs with monthly/annual plans. Added `mrrCommitted` field that includes trialing subs (projected MRR once they convert).
    - **Real cash from Stripe**: new `getStripeRevenue({from, to})` in `server/db.ts` paginates `stripe.charges.list` for the range and aggregates gross / net / refunds / charges count. 60-second in-memory cache to keep the panel snappy. Exposed via tRPC `admin.stripeRevenue`.
    - **Date range picker** in `client/src/pages/Admin.tsx`: presets Hoy / Ayer / 7d / 30d / Mes / Año / Custom. `billingStats` and `stripeRevenue` queries refetch on range change; new `newSubsInRange` / `newUsersInRange` counters reflect the picked range.
    - **Subs about to cancel**: new `getSubsAboutToCancel()` returns active/trialing subs where `cancelAtPeriodEnd = true`, surfaced as a counter card and a table at the bottom of the tab.
    - Admin tab now has 4 grouped sections: Ingresos reales (Stripe), MRR/ARR/Churn, Suscripciones (active/trial/by-cancel/canceled), Crecimiento (range-aware + fixed period anchors).
18. **Admin expansion roadmap (rounds 1-3).** After fixing Stripe webhook, MRR calc and adding past_due visibility, extended the admin panel broadly. All features backed by existing `site_settings` / new `webhook_events` / new `audit_log` tables (drizzle migration 0014 — additive only).
    - **New tabs**: Suscriptores (surfaces previously-orphaned `admin.subscribedUsers` endpoint), Documentos (list + "top storage users" via new `getAllDocuments` and `getStorageByUser`), Webhooks (auto-refreshing log of Stripe events from `webhook_events` table, server webhook handler now records every delivery via `recordWebhookEvent`), Audit log (every admin mutation logged via `recordAuditEntry` — refund/delete/deactivate/promote/notes all instrumented).
    - **Unread badge** on Mensajes sidebar item using existing `stats.unreadMessages` counter.
    - **CSV export** buttons on Usuarios, Suscriptores, Documentos, Bajas, past_due — client-side `downloadCsv()` helper with proper quoting + UTF-8 BOM.
    - **Stripe refund from admin**: `getStripeChargesList()` + `refundStripeCharge()` in server/db.ts, `admin.refundCharge` mutation logs to audit_log and clears the revenue cache. Admin.tsx has a "Últimos cobros" table with red "Reembolsar" button per row + confirmation dialog.
    - **Cancellation reasons**: new `cancelReason` enum + `cancelFeedback` text column on subscriptions, `setCancelReason()` + `getCancelReasonsAgg()`, admin panel "Motivos de cancelación" aggregates card in Facturación.
    - **User internal notes**: new `adminNotes` text column on users, sticky-note icon action on the Usuarios row; click opens prompt, saves via `admin.updateUserNotes` mutation (audit-logged).
    - **MRR by country (geo)**: `getRevenueByCountry()` groups active+trialing subs by `user.country`, projects each to monthly value; admin renders horizontal bar chart top 12.
    - **Feature flags**: 5 boolean toggles in Ajustes stored as `site_settings` rows with key `flag_*`. Read with `getSiteSetting("flag_xxx") === "true"` anywhere. Toggles for converter, product tour, blog, promo banner, ads tracking.
19. **Admin expansion rounds 4-5.**
    - **U1 User timeline** (Usuarios tab): clipboard-list icon per row opens a modal with user summary + all subscriptions + last 50 docs + last 20 messages. `getUserTimeline(userId)` in server/db.ts, `admin.userTimeline` query.
    - **O1 Health checks** (Resumen tab): `getHealthChecks()` probes DB / Stripe / R2 / Resend / CloudConvert in parallel, returns ok + latency + detail. Auto-refresh every 30s when tab is open. Green/red status indicator + error message inline.
    - **G3 Announcement banner**: new public `site.announcement` tRPC procedure reading `flag_promo_banner` + `promo_banner_text` + `promo_banner_level` from site_settings. `client/src/components/AnnouncementBanner.tsx` renders above all routes; dismissible per session; info/warning/success colour variants. Admin edits text+level from Ajustes rows.
    - **F7 Coupons** (new Cupones tab): `listStripeCoupons()` joins coupons + promotion codes; `createCoupon()` wraps Stripe's 2-step flow into 1 call; `deleteCoupon()` too. UI has inline create form (code/%/duration/max redemptions/expiry) + active-coupons table with redemption count and delete button. All mutations audit-logged.
20. **Trial limit: 2 PDFs per €0,50 trial + 1-click upgrade to monthly.**
    - **Schema** (migration 0015, additive): `documents.firstDownloadedAt timestamp` stamped on first download only (re-downloads free).
    - **Server** (`server/db.ts`): `getTrialUsageCount(userId)` reads `getActiveSubscription` + `getSiteSetting("trial_download_limit", default 2)` and counts docs with `firstDownloadedAt >= currentPeriodStart`. `canDownloadForUser(userId, docId)` short-circuits for paying/monthly users and re-downloads. `upgradeTrialImmediately(userId)` calls `stripe.subscriptions.update(subId, { trial_end: "now", proration_behavior: "none" })` to trigger the €19,99 recurring charge against the saved card; optimistically flips local row to `plan=monthly/status=active`; `invoice.paid` webhook reconciles asynchronously.
    - **Gate** in `/api/documents/download/:id` returns 403 `{ error: "trial-limit", usage, limit }` when blocked and stamps `firstDownloadedAt` on success.
    - **tRPC** (under `subscription.*`): `trialUsage` query, `recordDownload` mutation, `upgradeTrialNow` mutation (audit-logged).
    - **Frontend**: `PaywallModal.tsx` gets a new `reason?: "trial-limit"` prop that renders a compact 1-click upgrade view; on failure, an internal `upgradeFallbackToCheckout` flag flips to the full Stripe Elements form. `PdfEditor.tsx` polls `trialUsage` + calls `recordDownload` before triggering each download; opens the paywall in trial-limit mode when blocked.
    - **i18n**: 3 new keys (`paywall_trial_limit_title/body/cta`) × 10 languages.
21. **Mobile fix: native text edit no longer pops the format sheet.** `PdfEditor.tsx` used to call `setShowMobilePanel(true)` on the first click of a native text block, which on mobile slid up the tool panel (font/size/align/color) and covered the PDF — blocking the very text the user was trying to edit. Guarded that call to desktop-only (`window.innerWidth >= 768`); on mobile the chevron on the bottom bar still lets the user expand formatting options manually.
22. **Admin billing: decline-reason visibility.**
    - `getPastDueSubs()` now enriches each row with `declineCode`, `declineMessage`, `attemptCount`, `nextAttemptAt` and `amountDueEur` by fetching `stripe.subscriptions.retrieve(..., { expand: ["latest_invoice.payment_intent"] })` per row and reading `last_payment_error`. The admin past-due table now shows the exact Stripe reason (`insufficient_funds`, `card_declined`, etc.) without jumping to the dashboard.
    - New `getRecentSubsWithoutPayment({ hours })` finds subs created in the last N hours (default 24) whose initial invoice didn't reach `status=paid` — used to spot trials abandoned in 3DS or with a never-confirmed PaymentIntent. Rows are ordered suspicious-first, each flagged with invoice/PI status + decline code + a direct link to the hosted invoice or customer in Stripe. Exposed via tRPC `admin.recentSubsWithoutPayment`; rendered as a dedicated table in the Facturación tab beneath past-due.
23. **Safari/macOS download fix.** `triggerDownload` / `triggerBlobDownload` in `PdfEditor.tsx`, `downloadBytes` in `usePdfEditor.ts`, and the dashboard document download in `Dashboard.tsx` used `a.click(); URL.revokeObjectURL(url);` synchronously. WebKit (both macOS and iOS Safari) cancels the download if the blob URL is revoked before the navigation fires, so Mac users ended up with blank/no downloads. Fix: append the anchor to `document.body` before clicking, remove it after, and delay `revokeObjectURL` by 1s in all four places. Pattern already existed in `Admin.tsx` and `ConverterPage.tsx` — consolidated.
24. **Safari "This page has no editable text" bug — pdfjs worker fix.** pdfjs-dist v5 internally calls `Uint8Array.prototype.toHex()` (TC39 proposal that only landed in WebKit 18.4). Older Safari/iOS threw inside the pdf worker, pdfjs swallowed the error, and `page.getTextContent()` returned an empty items array — so the "Editar texto nativo" panel showed "Esta página no tiene texto editable" for every PDF on Safari regardless of content. The existing polyfill in `PdfEditor.tsx` only ran in the main thread, not inside the worker. Fix: new `client/src/lib/pdfjs-safe.ts` centralises the polyfills (`toHex` / `setFromHex` / `fromHex`) AND exports `pdfjsCompatOpts()` which returns `{ disableWorker: true }` when the browser needed the polyfill (i.e. the worker thread is guaranteed to still be missing it). `PdfEditor.tsx`, `PdfViewer.tsx` and `ConverterPage.tsx` now import from pdfjs-safe and spread `...pdfjsCompatOpts()` into every `pdfjsLib.getDocument(...)` call, so affected Safari users run pdfjs on the main thread where the polyfills apply. Modern Safari / Chrome / Firefox keep using the worker for perf.
31. **Sipay migration — Fase 0 (cliente sandbox + probe).** Stripe está siendo sustituido por Sipay (PSP español sobre Redsys). Documentación: developer.sipay.es. Esta fase solo introduce el cliente y un endpoint de prueba — el modal y los webhooks siguen con Stripe hasta que se prueben las fases siguientes.
    - **Decisiones de arquitectura**: 3DS = redirect (FastPay SDK gestiona popup si puede, fallback a `url_ok`/`url_ko`). Recurrencia = cron nuestro con `all-in-one` MIT-R (NO planes Sipay, porque sin webhooks no nos enteraríamos de fallos a tiempo y perderíamos el A/B de precios). Multimoneda = solo EUR de momento.
    - **`server/_core/env.ts`**: 4 vars nuevas — `SIPAY_ENDPOINT` (default `https://sandbox.sipay.es`), `SIPAY_KEY`, `SIPAY_SECRET`, `SIPAY_RESOURCE`. Sandbox key/secret/resource = `clicklabsdigital / 3KsWEtN9J0z / clicklabsdigital`.
    - **`server/_core/sipay.ts`** (nuevo): cliente HMAC SHA256. Wrapper común `{key, resource, nonce, mode:"sha256", payload}` con firma hex del JSON del body en headers `Authorization: HMAC-SHA256 <sig>` y `X-Signature`. Helpers: `createPaymentWithTokenization` (intro + token), `confirmPayment(requestId)` (paso 2 tras 3DS), `createMITRecurring` (cobro mensual con `sca_exemptions:"MIT", reason:"R"`), `refundPayment`, y `probeSandbox` (lanza all-in-one con tarjeta VISA test `4548819407777774 12/25 CVV 123`).
    - **`admin.sipayProbe`** mutation en `server/routers.ts`: dispara `probeSandbox` y devuelve la respuesta completa de Sipay + el body firmado + la firma para depurar el formato HMAC.
    - **`SipayProbeCard`** en Ajustes (`client/src/pages/Admin.tsx`): botón rojo "Lanzar probe sandbox" + dos `<details>` (respuesta parseada + body+firma enviados). Sirve para iterar el formato exacto de firma cuando Sipay responda con error de signature.
    - **Pendiente Fase 1**: integrar FastPay JS en `PaywallModal.tsx` (script `sandbox.sipay.es/fpay/v1/static/bundle/fastpay.js`), capturar `request_id` por callback JS, mandar a backend `POST /api/sipay/confirm`. Endpoint `/sipay/callback/ok` para volver tras 3DS y disparar `confirmPayment`.
40. **Google Pay: merchantId pegado → PRODUCTION en editorpdf.net.** Tras crear el perfil en pay.google.com/business/console como "Clicklabs Digital Venture S.L." y obtener el merchantId `BCR2DN4T2627BZYZ`, el botón GPay deja de mostrar el banner "Test Card / No se realizará ningún cargo" en `editorpdf.net` y pasa a cobrar tarjetas reales vía Sipay. En hosts no-prod (preview de Railway, localhost) sigue en TEST para no cobrar por error en pruebas. Pendiente: la aprobación final de Google del Web Integration (3 flags AI de "Potential issue": ecommerce intent, fondo oscuro del botón, screenshot del sheet con últimos 4 dígitos). Mientras Google aprueba, las transacciones pasan por Sipay normalmente — Google solo certifica la integración, no actúa de gateway.

44. **Home: tools grid (sección "Todas las utilidades") con mucho más diseño.** Las tarjetas planas con icono gris pasaron a:
    - **Cards más grandes (`rounded-2xl` + `p-4` + gap más generoso)** con borde sutil.
    - **Icon-tile coloreado por herramienta**: cada tool ahora tiene `tint` + `iconBg` (red brand, blue Word, green Excel, orange PPT, purple HTML, cyan watermark, ink PNG, etc.) — consistente con la paleta usada en las landings.
    - **Hover effects**: glow radial sutil del color del tile en la esquina superior izquierda + lift `-translate-y-0.5` + sombra profunda + icon scale 1.06 + flecha `→` que entra desde la izquierda.
    - **Header de categoría rediseñado**: el contador pasa de label gris suelta a chip pill con borde; línea separadora se desplaza al lado derecho (separa el título + chip del flujo de la página, look más editorial).
    - **Helpers de paleta** (`RED/BLUE/GREEN/ORANGE/PURPLE/INK/CYAN` + sus `_BG`) extraídos como constantes locales para mantener legible el array de tools.

43. **Home: pills del hero rediseñadas como cards en una caja, todas cableadas.** El user reportó "estos botones no funcionan" sobre los pills `Editar / Unir / Dividir / Comprimir / Convertir / Firmar` del hero (eran píldoras finas con texto+icono que solo cambiaban el `activeTab` interno sin navegar a ninguna landing salvo `Convertir`). Cambio:
    - **6 cards en grid (3×2 mobile / 6×1 desktop)** dentro de un container box con fondo en gradient `#FAFAFB → #F4F4F6`, borde sutil y shadow. Cada card es bg blanco con icon-tile en un color tinted por herramienta (rojo / azul / verde / naranja / morado / negro), label bold debajo, hover con `-translate-y-px` y shadow.
    - **Cableado al click**: `landingSlug` (si existe) → `navigate(/${lang}/${slug})`. Sin landing (Editar, Firmar) → `triggerUpload` con la tool correspondiente (mantiene el flujo de file picker).
    - **Drops** del flag `alwaysShow` (en grid 3-col mobile entran las 6) y del aria-pressed (ya no son tabs con estado activo).

42. **Home: tools grid ahora navega directo a las landings dedicadas.** Antes todos los botones del grid (Editar texto, Unir, Dividir, Rotar, Comprimir, PDF→Word, etc.) disparaban `triggerUpload(tool.tool)` → file picker → editor. Para las herramientas con landing SEO propia, la fricción extra del upload genérico tapaba el funnel específico. Cambio:
    - **`ToolDef.landingSlug?: string`** opcional en `Home.tsx`. Cuando está presente, el `onClick` navega a `/{lang}/${landingSlug}` en vez de llamar a `triggerUpload`.
    - **12 tiles cableados** con landingSlug: `merge-pdf`, `split-pdf`, `rotate-pdf`, `compress-pdf`, `watermark-pdf` (tile NUEVO en el grupo "Optimizar"), `pdf-to-word`, `pdf-to-excel`, `pdf-to-powerpoint`, `pdf-to-jpg`, `word-to-pdf`, `jpg-to-pdf`, `png-to-pdf`.
    - **Tiles sin landing** (pdf-to-png, pdf-to-html, excel-to-pdf, ppt-to-pdf, html-to-pdf, tools de edición/seguridad) mantienen el comportamiento previo de `triggerUpload`.
    - **`tool_watermark` key nuevo** en `i18n.ts` × 12 idiomas, añadido al interface `TranslationKeys` y a cada bloque de idioma justo después de `tool_compress`.

41. **Rotate + Watermark: i18n completo del UI (12 idiomas).** La iteración inicial dejó solo `heroTitle` / `heroSubtitle` traducidos; el resto del UI quedó hardcoded en inglés (preheader, dropzone, botones, labels, footer, "All PDF tools / Need a different action?", toasts). El user reportó `/es/rotate-pdf` mostrando texto en inglés. Resuelto:
    - **~43 claves nuevas en `i18n.ts` × 12 idiomas** (~516 strings nuevos):
      - 17 keys `landing_common_*` compartidas con Watermark/Rotate (y reutilizables por otras landings): `drop_here`, `select_pdf`, `change`, `pages_word`, `page_word`, `runs_locally`, `download`, `unlock_price`, `download_complete`, `file_downloaded_pre/post`, `no_installation`, `private_local`, `any_device`, `files_limit`, `all_tools_kicker`, `need_different`, `only_pdf`, `couldnt_read`.
      - 12 keys `landing_rotate_*`: `preheader`, `rotation_label`, `pages_label`, `pages_hint`, `pages_placeholder`, `button`, `loading`, `ready_title`, `card_label`, `another`, `toast_success`, `toast_error`.
      - 14 keys `landing_watermark_*`: `preheader`, `text_label`, `position_label`, `pos_diagonal/center/footer`, `opacity_label`, `button`, `loading`, `ready_title`, `another`, `toast_enter_text`, `toast_success`, `toast_error`.
    - **Helper `tr(key, fallback, vars?)`** en ambas landings: acepta un objeto `vars` para interpolar `{count}` / `{angle}` en strings traducidos (`"Rotated {count} pages by {angle}°"` → `"Se han girado 3 páginas 90°"`).
    - Pluralización mínima vía `landing_common_pages_word` / `page_word` (e.g. ES: "páginas" / "página"). ZH usa "页" en ambos casos.

40. **Rotate + Watermark: landings dedicadas con paywall.**
    - **`RotateLandingPage.tsx`** registrada en `/{lang}/rotate-pdf` (12 idiomas + redirect). Upload PDF → escoge 90 / 180 / 270 → opcional "aplicar a páginas X-Y,Z" usando el mismo `parseRange()` de Split → `PDFDocument.load()` + `page.setRotation(degrees((current + angle) % 360))` para cada página objetivo (acumula sobre la rotación actual, no la reemplaza). Output filename: `${original}-rotated-${angle}.pdf`.
    - **`WatermarkLandingPage.tsx`** registrada en `/{lang}/watermark-pdf` (12 idiomas + redirect). Upload PDF → input texto (default "CONFIDENTIAL", max 80 chars) → posición (diagonal / center / footer) → slider opacidad 10-90% → `PDFDocument.load()` + `doc.embedFont(StandardFonts.HelveticaBold)` + `page.drawText(safe, { color: rgb(0.55,0.55,0.55), opacity, rotate })` sobre TODAS las páginas. Diagonal calcula `atan2(h,w)` para que el texto cruce la página en su diagonal real (no 45° fijo). Output: `${original}-watermarked.pdf`. Nota: Helvetica es latin-only, así que strings no-Latin se sanitizan a "?" para que `drawText` no lance.
    - **i18n**: 6 claves nuevas (h1, subtitle, meta_title × rotate + watermark) traducidas a las 12 lenguas. El index signature `[key: \`landing_${string}\`]: string` del interface `TranslationKeys` ya permite añadir claves landing_* a cualquier idioma sin romper el typecheck.
    - **App.tsx**: 4 grupos de rutas nuevos (`/{lang}/rotate-pdf` × 12 + redirect, `/{lang}/watermark-pdf` × 12 + redirect) y el filtro de `ToolLanding` genérico extendido para excluir los dos slugs nuevos.

39. **Admin: bandera "cancela el DD/MM" para subs con cancelación pendiente.** Cuando el usuario cancela desde su dashboard, `cancelSubscriptionDb` setea `cancelAtPeriodEnd=true` pero deja el `status='trialing'`/`'active'` hasta que vence `currentPeriodEnd` (correcto — pagó el periodo, merece servicio hasta el final). El admin estaba mostrando esos rows como "Trial" / "Activa" sin ningún hint visual, así que parecía que no se había cancelado. Fix: `getAllSubscribedUsers()` ahora selecciona `cancelAtPeriodEnd`; en `Admin.tsx` tanto la tabla **Usuarios** como **Suscriptores** muestran un badge ámbar `⚠ cancela DD/MM` debajo del badge de estado cuando `cancelAtPeriodEnd === true`. El conteo en **Por cancelar** (Facturación) ya existía y sigue intacto.

38. **Sipay phase 3+4+5: admin queries → DB, MIT-R cron, Stripe deletion.**
    - **Migration 0020**: nueva tabla `charges` (id, userId, provider enum fastpay/gpay/apay/mit, amountCents, refundedCents, currency, sipayTransactionId/Order/MaskedCard, status enum ok/failed/refunded, errorDetail, createdAt + índices). Ledger estructurado de cada cargo que evita JSON-parsear `webhook_events.payload` en cada query del admin.
    - **`recordCharge()`** helper en `db.ts` invocado desde los 3 paths exitosos (FastPay callback, sipayGpayCharge, sipayApplePayCharge) y desde el cron de MIT-R. Los fallos también se logean con `status: "failed"` + `errorDetail`.
    - **Admin queries refactorizadas a la DB local**: `getStripeChargesList`, `refundStripeCharge`, `getStripeRevenue`, `getPastDueSubs`, `getRecentSubsWithoutPayment` — todas leen ahora de `charges` + `subscriptions` y nunca llaman a Stripe. `refundStripeCharge` ahora llama a `sipay.refundPayment` con el `sipayTransactionId` guardado. (Nombres de función mantenidos para minimizar diff en el frontend; son misnomers que ya solo tocan datos locales.)
    - **MIT-R cron**: endpoint `POST /api/cron/sipay-renew` con header `X-Cron-Secret` (env var `CRON_SECRET`). Itera `getSubsDueForRenewal()` (subs con `sipayToken`, `cancelAtPeriodEnd=false`, `status IN ('trialing','active','past_due')`, `currentPeriodEnd <= now`), llama a `createMITRecurring()` con el precio leído de `site_settings.subscription_price_eur` (default 19,99 €), extiende periodo 30 días + status=active en éxito, o flippea a `past_due` en fallo. Cada attempt loguea a `charges` + `webhook_events`. Soporta `?dry=1` para validar sin cobrar. **Hay que registrar el cron externo apuntando a este endpoint (Railway scheduled task o cualquier monitor).**
    - **Stripe deletion completa**:
      - `server/_core/stripe.ts` eliminado.
      - Webhook handler `/api/stripe/webhook` (~140 líneas) eliminado.
      - `confirmSetup`, `stripeConfig`, `createCheckoutSession` tRPC procedures eliminados.
      - `admin.coupons / createCoupon / deleteCoupon` procedures eliminados.
      - `listStripeCoupons` / `createCoupon` / `deleteCoupon` (db.ts) eliminados.
      - `upgradeTrialImmediately` refactorizada para usar `createMITRecurring` con `sipayToken` (era `stripe.subscriptions.update(trial_end:"now")`).
      - Health check probe Stripe → probe Sipay endpoint.
      - 5 vars `STRIPE_*` eliminadas de `env.ts`.
      - CSP: `js.stripe.com`, `*.stripe.com`, `api.stripe.com` quitados de script-src/frame-src/connect-src.
      - Frontend: `DashboardPaymentForm`, `DashboardStripeInline`, `StripeInlineCheckout`, `PricingPaymentForm` eliminados. Dashboard y Pricing ahora abren el `<PaywallModal>` compartido (FastPay + Apple Pay + Google Pay).
      - Imports `@stripe/react-stripe-js`, `@stripe/stripe-js`, `loadStripe` eliminados.
      - Dependencias eliminadas de `package.json`: `stripe`, `@stripe/react-stripe-js`, `@stripe/stripe-js`.
      - Columnas `stripeCustomerId` / `stripeSubscriptionId` / `stripeSessionId` mantenidas en la tabla `subscriptions` solo como histórico de las subs creadas pre-migración. Pueden droppear en una migración futura cuando todas hayan caducado.
37. **Landings dedicadas para Split y Compress (mismo patrón que Merge).**
    - **`SplitLandingPage.tsx`** registrada en `/{lang}/split-pdf` (12 idiomas + redirect sin prefijo). Sube un PDF, parsea su `getPageCount()` para mostrar el total, deja al user introducir un rango tipo `1-5,7,10-12` (comma/dash mix), `parseRange()` lo convierte en índices 0-based ordenados y filtrados a `[1, totalPages]`, `PDFDocument.copyPages(original, indices)` genera el extracto in-browser. Paywall en download igual que merge. Output filename: `${original}-pages-${range}.pdf`.
    - **`CompressLandingPage.tsx`** registrada en `/{lang}/compress-pdf` (12 idiomas + redirect). Sube PDF → `PDFDocument.load(bytes)` + `doc.save({ useObjectStreams: true })` reescribe con object-streams + content-stream deflate. Si el resultado es mayor que el original (PDFs ya optimizados) se devuelve el original sin penalizar. UI muestra `original → nuevo` con badge `-N%` cuando hay ahorro real. **Nota técnica**: pdf-lib NO re-codifica imágenes embebidas, así que escaneos pesados (50 MB de TIFFs) apenas bajan. Real image-quality compression requiere Ghostscript backend — TODO si los ahorros en producción no convencen.
    - **Estructura compartida** con `MergeLandingPage`: hero `<SquiggleUnderline>` rojo en la palabra PDF, gradient card 22px-radius con shadow profunda, grid "All PDF tools" al final con `NOW` badge en el slug activo, footer con `LogoSvg`. Cada utilidad cambia solo el icono lucide (`Scissors`, `Minimize2`, `Layers`) y los strings.
    - **App.tsx**: 6 rutas nuevas (`/{lang}/split-pdf` y `/{lang}/compress-pdf` × 12) registradas antes del catch-all genérico de `ToolLanding`, más el filtro `slug !== "split-pdf" && slug !== "compress-pdf"` en el array de slugs que sí van a ToolLanding genérico — patrón calcado del `merge-pdf` para mantener consistencia.
36. **Merge: bug del editor + landing dedicada `/merge-pdf` con multi-upload.**
    - **Bug en `PdfEditor.tsx > mergePdfs`**: el merge llamaba a `guardedDownload` inmediatamente tras `merged.save()`, así que cualquier usuario (logueado o no, premium o no) recibía paywall en cuanto seleccionaba PDFs para unir, ANTES de poder ver el resultado. Mal orden de operaciones — el usuario solo había pedido unir, no descargar. Fix: tras `merged.save()`, ahora `setPdfBytes(new Uint8Array(out))` + `setAnnotations([])` para que el PDF unido se renderice inline en el editor, y solo el botón Descargar mantiene su flujo de paywall.
    - **Landing nueva `MergeLandingPage.tsx`** registrada en `App.tsx` antes del catch-all genérico de `ToolLanding` (rutas `/{lang}/merge-pdf` × 12 idiomas + redirect `/merge-pdf` → `/en/merge-pdf`). Mismo modelo de paywall que el editor (modelo B confirmado por el user: usuario logueado paga igual). UI:
      - Multi-file PDF upload (drag + click + add-more).
      - Lista de archivos con reordenado por flechas ↑/↓ + borrar por archivo.
      - Botón "Merge N PDFs" → corre pdf-lib en el navegador (sin servidor).
      - Estado "ready" con miniatura de tarjeta roja "N PDFs · merged" + tamaño total.
      - Botón "Download merged PDF" → abre `PaywallModal` reutilizado del editor (FastPay + Apple Pay + Google Pay + 0,50 €). Tras `onPaymentSuccess` → `triggerBlobDownload` + navigate a `/payment/success?txn=...`.
    - **i18n**: el componente usa los keys existentes `landing_merge_h1/subtitle/cta/drag/meta_title` con fallbacks en inglés codeados in-line. Si el key no está en algún idioma, no se ven huecos — el fallback en inglés se muestra.
    - **PaywallModal compatibility**: el `buildPdfForUpload` callback re-escribe los bytes del PDF unido en base64 para que la modal pueda mostrar el preview, igual que `ConverterPage`.
35. **PaymentSuccess: i18n completo (12 idiomas) + extracción de strings hardcoded.**
    - **14 claves nuevas** en `client/src/lib/i18n.ts` bajo prefijo `payment_success_*`: title, subtitle, redirecting_pre, redirecting_post, order_summary, txn_id, amount, cta_edit_another, what_now, b1-b5.
    - **Traducidas en los 12 idiomas** que soporta el resto del archivo (es, en, fr, de, pt, it, nl, pl, ru, uk, ro, zh). Tradúcciones hechas a mano respetando matices: "Redirecting in **5**s..." se parte en `_pre` + `_post` para insertar `<strong>{countdown}</strong>` en el medio sin romper la traducción.
    - **`PaymentSuccess.tsx`** ya no es hardcoded en español: usa `const { t } = useLanguage()` y consulta `t.payment_success_*` con fallback al español como red de seguridad (`t.payment_success_title || "¡Pago completado!"`).
34. **Color sweep: erradicación completa del azul Stripe-era (380+ hits en 20 archivos).** Antes había islotes residuales del azul `#1565C0` (era del brand original), salpicados por todo el frontend y los emails — admin, pricing, editor, blogs, signup, cancelaciones, página 404, upload zone, etc. Repaso en bloque a la paleta ink (`#0A0A0B`) + accent (`#E63946`).
    - **Source of truth flippeada**: `client/src/lib/brand.ts` (primary/secondary/hover/gradient/light/lightBg) + `client/src/index.css` (variables `--primary`, `--ring`, `--chart-1/3/5`, `--sidebar-primary`, utility classes `.bg-indigo-brand` / `.gradient-text` / `.btn-gradient` / `.upload-zone`, etc.) — todo a rojo/ink.
    - **Mapeo aplicado vía sed batch** en 16 archivos: `#1565C0 → #E63946` (primario), `#0D47A1 → #C82F3B` (hover), `#1976D2 → #C82F3B` (gradient end), `#42A5F5 → #FF6B7A` (light), `#1A3A5C → #0A0A0B` (texto), `#1E88E5 → #E63946` (alt). RGBA: `rgba(21,101,192,*) → rgba(230,57,70,*)`, `rgba(27,94,32,*) → rgba(10,10,11,*)` (los tints "verdes" copy-paste eran azules vestidos).
    - **Tailwind classes**: `bg-blue-*`, `text-blue-*`, `border-blue-*`, `hover:bg-blue-*`, `focus:ring-blue-*`, `from/to/via-blue-*`, `*-indigo-*`, `*-sky-*` → `*-red-*` (~30 hits adicionales en Admin/Blog/TrustpilotAdmin/etc.). Conserva el sufijo numérico (e.g. `text-blue-700` → `text-red-700`).
    - **Cuidado especial**: las **paletas de colores que el usuario elige** para anotar el PDF (`PdfEditor.tsx` líneas 3648 y 4248 — `["#000000","#c62828","#1565C0","#2e7d32",...]`) son colores funcionales para el usuario, NO brand UI. El sweep las cambió por error y se restauraron a mano. La paleta de highlighter (`#FFFF00, #00FF00, #FF69B4, #87CEEB, #FFA500`) no se tocó (no usa el brand blue).
33. **Apple Pay (Sipay) integración completa.**
    - **Cert de domain-association**: el archivo en `client/public/.well-known/apple-developer-merchantid-domain-association.txt` y su versión embebida en `server/_core/applePayDomain.ts` ya son la versión de producción para `editorpdf.net` (Sipay confirmó por email del 12/06 que el cert del 11/06 sigue vigente; mismos bytes). Servido en `https://editorpdf.net/.well-known/apple-developer-merchantid-domain-association.txt`.
    - **`server/_core/sipay.ts`** — 2 helpers nuevos:
      - `validateApplePaySession({ validationURL, domain, title })` → POST `/apay/api/v1/session`. Reenvía el `validationURL` que Apple le pasa al navegador. Sipay valida con Apple usando el cert que tiene en su lado y devuelve el `merchantSession`.
      - `chargeApplePay({ amountCents, tokenApay, order, custom_01? })` → POST `/mdwr/v1/authorization` con `catcher: { type: "apay", token_apay }`. El campo `apay` (no `applepay`) y `token_apay` (no `token_apple`) son los nombres exactos que documenta Sipay en developer.sipay.es/docs/documentation/online/selling/wallets/apay.
    - **`server/_core/index.ts`** — endpoint Express `POST /api/sipay/applepay/validate-merchant` (no es tRPC porque lo llama `session.onvalidatemerchant` de Apple con fetch crudo). Reenvía a `validateApplePaySession()` y devuelve el `payload.merchantSession` al frontend para `session.completeMerchantValidation()`.
    - **`server/routers.ts`** — mutation `subscription.sipayApplePayCharge`. Valida el shape del token (`{ paymentData, paymentMethod, transactionIdentifier }`) con Zod antes de llamar a `chargeApplePay`.
    - **CSP**: `apple-pay-gateway.apple.com` + `apple-pay-gateway-cert.apple.com` añadidos a `connect-src`. El cert.apple.com es el de sandbox, el otro live — incluidos los dos para que el flujo funcione en ambos entornos sin tocar la cabecera.
    - **`PaywallModal.tsx > ApplePayButton`**: solo se renderiza si `window.ApplePaySession?.canMakePayments?.()` es true (Safari iOS / macOS WebKit). El botón usa la CSS estándar de Apple (`-webkit-appearance: -apple-pay-button` + `-apple-pay-button-type: plain` + `-apple-pay-button-style: black`) inyectada vía `<style>` (React inline style no acepta propiedades vendor-prefixed). Flujo: `new ApplePaySession(3, request)` → `onvalidatemerchant` POST a nuestro endpoint → `onpaymentauthorized` mutation a Sipay → `completePayment(STATUS_SUCCESS)` + redirect a `/payment/success?txn=...&provider=sipay-apay`. Logs `[ApplePay]` en cada paso. Fallback al `order` interno si Sipay no devuelve `transaction_id` (mismo patrón que GPay y FastPay).
    - **Layout**: Apple Pay aparece encima de Google Pay y de la fila "Tarjeta de crédito o débito". En Safari solo se ven Apple Pay + tarjeta (GPay no existe); en Chrome solo GPay + tarjeta (Apple Pay no existe). En iOS Chrome → Apple Pay aparece (iOS Chrome es WebKit), GPay también puede aparecer si el usuario tiene tarjeta vinculada a Google Pay.
32. **Google Pay end-to-end (Sipay sandbox) + PaymentSuccess cleanup.**
    - **GPay button render fix**: el componente `GooglePayButton` en `PaywallModal.tsx` se quedaba en bucle vacío porque el `useEffect` que carga `pay.js` añadía un `addEventListener('load')` sobre el `<script>` ya cargado (el evento no se vuelve a disparar), y porque un `if (!ready && scriptReady) return null` desmontaba el `<div ref={hostRef}>` antes de que el segundo efecto pudiera comprobar `isReadyToPay`. Solución: poll a `window.google.payments.api.PaymentsClient` cada 200ms con timeout de 8s + dejar el host siempre montado (oculto con `display:none` hasta que `ready` flipea a true). Añadidos logs `[GPay]` en cada paso para diagnosticar fallos en campo (AdBlock, falta de tarjeta vinculada, CSP).
    - **CSP**: añadidos `https://google.com`, `https://www.googleadservices.com`, `https://googleads.g.doubleclick.net`, `https://*.doubleclick.net` a `connect-src` e `img-src` para que el ping de conversión de Google Ads (AW-18071860641) y la lectura interna que hace `pay.js` no se bloqueen.
    - **PaymentSuccess.tsx**: paleta migrada de azul Stripe (`#1565C0`/`rgba(27,94,32,...)`) a ink (`#0A0A0B`) + accent (`#E63946`) + verde succes (`#16a34a`) para el check icon. El "Importe" ahora muestra `0,50€` (cargo real del intro, antes mostraba el precio mensual `39,90€` que confundía al usuario porque su banco solo cobra 0,50€ ese día). `INTRO_CHARGE_EUR` aislado como constante.
    - **Transaction ID fallback**: tanto el callback FastPay (`server/_core/index.ts > /api/sipay/callback/ok`) como el flujo Google Pay (`PaywallModal.tsx`) ahora caen al `order` interno cuando Sipay no echo el `transaction_id` (sandbox lo deja vacío a veces). Garantiza que Google Ads siempre tenga una clave única para deduplicar conversiones.

30. **Trial welcome email — product onboarding + small trial disclaimer at the bottom.**
    - **`sendTrialWelcomeEmail`** in `server/email.ts`: rich HTML email with brand header (ink/red), 4 sections (Edit/Convert/Organize/Protect) listing concrete features, a primary CTA "Empezar a editar" linking to `/{lang}/`, a help/reply box, and a small (10px, low-contrast `#94a3b8`) disclaimer at the very bottom that warns about the 48h auto-renew and links to `/dashboard?tab=billing` for cancellation.
    - **Multilingual** in all 12 supported languages (es, en, fr, de, pt, it, nl, pl, ru, uk, ro, zh) via a `WELCOME_STRINGS` map. Falls back to ES when an unknown lang is passed. Date format is locale-aware via `Intl`.
    - **Wired into `confirmSetup`** in `server/routers.ts`: replaces the old terse `sendSubscriptionConfirmationEmail` call. Lang detected from the request's `Accept-Language` header so the email matches the user's signup language.
    - **Preview script**: `scripts/preview-welcome-email.mjs <email> [lang]` to send a sample without paying a real trial.
29. **Contact form: i18n + ink/red palette + spam notice + reason badge + delete from admin.**
    - **`ContactModal.tsx` rewritten**: now multilingual with an inline `STRINGS` map for all 12 languages (was hard-coded Spanish, blue palette). Reason buttons store a stable English-ish key (`tech_support` / `billing` / `feature` / `bug` / `collab` / `other`) so admin badges stay consistent regardless of which language the visitor used. Colors switched from blue-700/blue-100 to ink (#0A0A0B) + accent (#E63946).
    - **Spam notice on success state**: amber callout below "Message sent!" reminding the user to check their Spam folder for our reply (translated in all 12 languages). Important because Cloudflare Email Routing-relayed mail still hits Gmail's spam filter on first delivery.
    - **Admin reason badge** (`ReasonBadge` in `Admin.tsx`): coloured pill next to the email in each row (orange = billing/high-priority, blue = tech support, green = feature, red = bug, purple = collab, grey = other). Regex matcher handles labels in all 12 languages (e.g., Italian "Fatturazione" → matches `fatur` → "Facturación" pill).
    - **Delete from admin**: trash icon in each message row + `admin.deleteMessage` mutation (audit-logged). Confirms with native `confirm()` before deleting; collapses the expanded panel afterwards.
28. **Email templates for admin replies (anti-chargeback).**
    - **Schema** (migration 0017, additive): new `email_templates` table — `id`, `name varchar(128)`, `body text`, `createdAt`, `updatedAt`. Apply via `railway run node scripts/apply-migration-0017.mjs`.
    - **Backend**: `admin.emailTemplates` (list) + `createEmailTemplate` / `updateEmailTemplate` / `deleteEmailTemplate` mutations. All audit-logged. Helpers in `server/db.ts`.
    - **Admin UI** (Mensajes tab): dropdown "📋 Insertar plantilla" above each reply textarea — selecting a template fills the textarea with the body, with `{{name}}` / `{{email}}` / `{{subject}}` substituted from the message data. Bottom of the tab has a collapsible "Plantillas de email" section to create / edit / delete templates (`TemplateForm` + `TemplateRow` components).
    - **Pre-seeded** (`scripts/seed-email-templates.mjs`, idempotent): 5 anti-chargeback canned replies in ES/EN/FR — explain the legitimate charge, link to pricing/terms/refund pages, document the double-confirmation flow (paywall text + 3D-Secure), plus a "cancel + partial refund" gesture and a "pre-chargeback last warning" template that offers a direct refund before the bank dispute resolves.
    - **Fix**: admin reply UI footer text updated from "noreply@editorpdf.net" to "support@editorpdf.net" (was stale after item 27).
27. **Email infra: editorpdf.net verified in Resend + unified From: support@editorpdf.net.**
    - **Resend**: domain `editorpdf.net` is now verified in a dedicated Resend account (eu-west-1, Ireland). DNS records added in Cloudflare: DKIM `resend._domainkey`, MX `send` → `feedback-smtp.eu-west-1.amazonses.com` (priority 10), TXT `send` → `v=spf1 include:amazonses.com ~all`, TXT `_dmarc` → `v=DMARC1; p=none;`. They use the `send.` subdomain so they coexist cleanly with the SPF Cloudflare Email Routing put on the root domain — no SPF merge needed.
    - **Cloudflare Email Routing**: receives mail at `support@editorpdf.net` → forwards to `supporteditorpdf@gmail.com`. MX records `route1/2/3.mx.cloudflare.net` on the root domain. Don't enable `Enable Receiving` in Resend — would conflict.
    - **Code**: `server/email.ts` and `server/emails.ts` now send From `EditorPDF <support@editorpdf.net>` for everything (was `noreply@editorpdf.net` + `onboarding@resend.dev` previously). Reply-To is `support@editorpdf.net` everywhere too — when the user replies, it lands in the support inbox via Cloudflare Routing.
    - **Railway**: `RESEND_API_KEY` updated to the new account's key. Verified via `railway run node scripts/test-email-send.mjs`.
    - **Diagnostic scripts**: `scripts/diagnose-resend.mjs` (lists domains + recent sends — needs a non-restricted API key) and `scripts/test-email-send.mjs <recipient>` (probes which From addresses work).
26. **Email service: password reset + admin reply to contact messages.**
    - **Password reset email**: `forgotPassword` in `server/routers.ts` no longer just console-logs the token — it now calls `sendPasswordResetEmail` (new in `server/email.ts`) which sends a styled HTML email via Resend from `noreply@editorpdf.net` with a 1-hour reset link. New `/reset-password?token=xxx` route in `App.tsx` → `client/src/pages/ResetPassword.tsx` (form with password+confirm, calls `auth.resetPassword`).
    - **Admin contact reply**: replaces the old `mailto:` link in the Mensajes tab with a textarea + "Enviar respuesta" button. New `admin.replyToMessage({id, body})` mutation calls `sendContactReplyEmail` (renders both reply + quoted original message), then stamps `repliedAt` + `replyBody` on the row. Audit-logged. Already-replied messages render as a green "Respondido" block instead of the input.
    - **Schema** (migration 0016, additive): `contact_messages.repliedAt timestamp` + `contact_messages.replyBody text`. Apply with `railway run node scripts/apply-migration-0016.mjs`.
    - **Dynamic price in legal/emails/MRR**: `getActiveMonthlyPrice()` helper in `server/db.ts` reads `subscription_price_eur` and returns `{ eur, formatted }`. Used by both email templates (`sendPaymentConfirmationEmail`, `sendSubscriptionConfirmationEmail` — `monthlyPrice` is now optional and defaults to live price), `legal.get` (interpolates `{price}` placeholder server-side before returning page content), and MRR calc (`getBillingStats` reads it once per query; `MONTHLY_PRICE_EUR_FIXED` removed entirely). One-shot data fix `scripts/fix-legal-pages-price.mjs` rewrote already-seeded legal_pages content from "19,99 EUR" → "{price}" — already executed against Railway prod DB.
25. **Admin: dynamic subscription price (A/B test ready).** New "Precio de suscripción" card in Ajustes lets the admin change the monthly price + Stripe Price ID without redeploying. Affects **only new checkouts** — existing subs keep their plan price (Stripe doesn't migrate).
    - **Backend** (`server/routers.ts`): public `site.pricing` query returns `{ priceEur, priceComma, priceDot, priceFormattedEs }` from `site_settings.subscription_price_eur` (default 19.99). `confirmSetup` and `stripeConfig` read `site_settings.active_stripe_price_id` with fallback to `ENV.stripePriceId`. `saveSetting` audit-logs changes to either pricing key (`action: "update_pricing"`).
    - **Frontend**: new hook `client/src/lib/usePricing.ts` exposes `{ price, priceEur, withPrice }` — `withPrice(str)` interpolates `{price}` placeholder. 71 strings in `i18n.ts` (`pricing_monthly_price`, `pricing_cta_monthly`, `paywall_legal_text`, `paywall_trial_limit_body`, `paywall_trial_limit_cta`, `urgency_then` × 12 langs) refactored to use the placeholder. Hardcoded €19,99 replaced in `PaywallModal.tsx`, `Pricing.tsx`, `Dashboard.tsx`, `PaymentSuccess.tsx` (gtag conversion value now uses live `priceEur`).
    - **Stripe price creation**: `scripts/create-test-price.mjs` runs against the live API key (`railway run node scripts/create-test-price.mjs`), creates/reuses an "EditorPDF Monthly" Product, then a recurring Price. Output goes into the admin UI's "Stripe Price ID" field. Initial €39,90 test price: `price_1TQlL7IO8OrdI39DNMZa7PBC`.
    - **Settings keys** (in `site_settings` table): `subscription_price_eur` (e.g. "39.90") + `active_stripe_price_id` (e.g. "price_..."). Empty string = use defaults.
