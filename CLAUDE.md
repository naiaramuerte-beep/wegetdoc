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
3. `confirmSetup` sets the saved card as default, creates a **Subscription** with `STRIPE_PRICE_ID` (19.99€/month) and `trial_end` 30 days out (first monthly charge delayed since intro was already paid)
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
7. **Stripe payment flow rewrite:** Replaced SetupIntent (0€) with real Subscription using STRIPE_INTRO_PRICE_ID (0.50€) so 3D Secure shows the actual charge amount. confirmSetup now creates a schedule from the existing subscription to transition to monthly.
