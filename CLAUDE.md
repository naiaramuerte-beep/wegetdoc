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
