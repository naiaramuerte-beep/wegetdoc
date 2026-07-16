/* =============================================================
   EditorPDF App — Routes & Top-level layout
   Deep Navy Pro design system + i18n routing
   ============================================================= */

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PresenceTracker from "./components/PresenceTracker";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { PdfFileProvider } from "./contexts/PdfFileContext";
import { LANGUAGES, detectLangFromBrowser } from "./lib/i18n";
import { useFeatureFlags } from "./hooks/useFeatureFlags";
import Home from "./pages/Home";
import { isFastDoc } from "./lib/brand";
import { TOOL_LANDINGS } from "./pages/ToolLanding";

// Lazy-loaded pages — only downloaded when the user navigates to them
const EditorPage = lazy(() => import("./pages/EditorPage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Tools = lazy(() => import("./pages/Tools"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const InternalTest = lazy(() => import("./pages/InternalTest"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const CancelSubscription = lazy(() => import("./pages/CancelSubscription"));
const CookieBanner = lazy(() => import("./components/CookieBanner"));
const AnnouncementBanner = lazy(() => import("./components/AnnouncementBanner"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ToolLanding = lazy(() => import("./pages/ToolLanding"));
const ConverterPage = lazy(() => import("./pages/ConverterPage"));
const PdfConverterHub = lazy(() => import("./pages/PdfConverterHub"));
const ConverterHubPage = lazy(() => import("./pages/ConverterHubPage"));
const MergeLandingPage = lazy(() => import("./pages/MergeLandingPage"));
const SplitLandingPage = lazy(() => import("./pages/SplitLandingPage"));
const CompressLandingPage = lazy(() => import("./pages/CompressLandingPage"));
const RotateLandingPage = lazy(() => import("./pages/RotateLandingPage"));
const WatermarkLandingPage = lazy(() => import("./pages/WatermarkLandingPage"));
const AdLandingPage = lazy(() => import("./pages/AdLanding"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Slugs that route to the standalone PDF→X converter (not the editor).
// Each maps to a CloudConvert target format.
const CONVERTER_ROUTES: Record<string, "docx" | "xlsx" | "pptx" | "jpg"> = {
  "pdf-to-word":       "docx",
  "pdf-to-excel":      "xlsx",
  "pdf-to-powerpoint": "pptx",
  "pdf-to-jpg":        "jpg",
};

// Generic /pdf-converter landing — visitors arriving from broad keywords
// don't know which target format they want, so we show a picker hub
// instead of an upload form.
const HUB_SLUG = "pdf-converter";

// Dedicated HEIC→PDF landing (/heic-to-pdf) — renders the converter hub
// pre-focused on HEIC→PDF with SEO copy. (PDF→HEIC is intentionally NOT
// offered: no service encodes HEIC, an Apple/HEVC-licensed format.)
const HEIC_SEO: Record<string, { h1: string; sub: string }> = {
  en: { h1: "Convert HEIC to PDF", sub: "Turn iPhone HEIC photos into a PDF in seconds." },
  es: { h1: "Convertir HEIC a PDF", sub: "Convierte fotos HEIC del iPhone en un PDF en segundos." },
  fr: { h1: "Convertir HEIC en PDF", sub: "Transformez vos photos HEIC d'iPhone en PDF en quelques secondes." },
  de: { h1: "HEIC in PDF umwandeln", sub: "Verwandle iPhone-HEIC-Fotos in Sekunden in ein PDF." },
  pt: { h1: "Converter HEIC para PDF", sub: "Transforme fotos HEIC do iPhone num PDF em segundos." },
  it: { h1: "Converti HEIC in PDF", sub: "Trasforma le foto HEIC dell'iPhone in un PDF in pochi secondi." },
  nl: { h1: "HEIC naar PDF converteren", sub: "Zet iPhone HEIC-foto's in seconden om naar een PDF." },
  pl: { h1: "Konwertuj HEIC na PDF", sub: "Zamień zdjęcia HEIC z iPhone'a na PDF w kilka sekund." },
  ru: { h1: "Конвертировать HEIC в PDF", sub: "Превратите HEIC-фото с iPhone в PDF за секунды." },
  uk: { h1: "Конвертувати HEIC у PDF", sub: "Перетворіть HEIC-фото з iPhone на PDF за секунди." },
  ro: { h1: "Convertește HEIC în PDF", sub: "Transformă pozele HEIC de pe iPhone într-un PDF în câteva secunde." },
  zh: { h1: "将 HEIC 转换为 PDF", sub: "几秒钟内将 iPhone 的 HEIC 照片转换为 PDF。" },
};
import { AD_PAGES } from "./pages/AdLanding";
const LandingTest = lazy(() => import("./pages/LandingTest"));

function LazyFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAFAFA]">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg width="56" height="56" viewBox="0 0 512 512" fill="none" aria-hidden="true">
          <rect x="48" y="48" width="416" height="416" rx="112" fill="#0A0A0B" />
          <path
            d="M176 180v152M176 180h82a50 50 0 010 100h-82"
            stroke="white" strokeWidth="34"
            strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx="342" cy="348" r="32" fill="#E63946" />
        </svg>
        <div
          className="absolute inset-[-4px] rounded-full animate-spin"
          style={{ border: "3px solid #F1F1F4", borderTopColor: "#E63946", animationDuration: "1.2s" }}
        />
      </div>
      <div className="font-extrabold text-[13px] tracking-[-0.02em] leading-none">
        <span className="text-[#0A0A0B]">editorpdf</span>
        <span className="text-[#E63946]">.net</span>
      </div>
    </div>
  );
}

// Redirect root "/" to language-prefixed URL based on browser language
function RootRedirect() {
  const lang = detectLangFromBrowser();
  return <Redirect to={`/${lang}`} />;
}

function Router() {
  const { converterEnabled, blogEnabled } = useFeatureFlags();
  return (
    <Switch>
      {/* Root redirect to browser language */}
      <Route path="/" component={RootRedirect} />

      {/* Language-prefixed routes — one block per lang */}
      {LANGUAGES.map(({ code }) => (
        <Route key={code} path={`/${code}`} component={() => <Home />} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-editor`} path={`/${code}/editor`} component={EditorPage} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-pricing`} path={`/${code}/pricing`} component={Pricing} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-tools`} path={`/${code}/tools`} component={Tools} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-dashboard`} path={`/${code}/dashboard`} component={Dashboard} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-admin`} path={`/${code}/admin`} component={Admin} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-payment`} path={`/${code}/payment/success`} component={PaymentSuccess} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-privacy`} path={`/${code}/privacy`} component={() => <LegalPage slug="privacy" />} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-terms`} path={`/${code}/terms`} component={() => <LegalPage slug="terms" />} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-cookies`} path={`/${code}/cookies`} component={() => <LegalPage slug="cookies" />} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-legal`} path={`/${code}/legal`} component={() => <LegalPage slug="legal" />} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-gdpr`} path={`/${code}/gdpr`} component={() => <LegalPage slug="gdpr" />} />
      ))}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-refund`} path={`/${code}/refund`} component={() => <LegalPage slug="refund" />} />
      ))}

      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-cancel`} path={`/${code}/cancelar-suscripcion`} component={CancelSubscription} />
      ))}

      {/* Blog routes — language-prefixed, gated by flag_blog_enabled */}
      {!isFastDoc && blogEnabled && LANGUAGES.map(({ code }) => (
        <Route key={`${code}-blog`} path={`/${code}/blog`} component={Blog} />
      ))}
      {!isFastDoc && blogEnabled && LANGUAGES.map(({ code }) => (
        <Route key={`${code}-blog-post`} path={`/${code}/blog/:slug`} component={BlogPost} />
      ))}

      {/* Blog legacy routes */}
      {!isFastDoc && blogEnabled && <Route path="/blog" component={() => <Redirect to="/es/blog" />} />}
      {!isFastDoc && blogEnabled && <Route path="/blog/:slug" component={({ params }) => <Redirect to={`/es/blog/${params.slug}`} />} />}

      {/* Generic PDF converter hub — gated by flag_converter_enabled */}
      {converterEnabled && LANGUAGES.map(({ code }) => (
        <Route key={`${code}-conv-hub`} path={`/${code}/${HUB_SLUG}`} component={PdfConverterHub} />
      ))}
      {converterEnabled && <Route path={`/${HUB_SLUG}`} component={() => <Redirect to={`/en/${HUB_SLUG}`} />} />}

      {/* Standalone converter pages (PDF → X) — gated by flag_converter_enabled */}
      {converterEnabled && LANGUAGES.map(({ code }) =>
        Object.entries(CONVERTER_ROUTES).map(([slug, target]) => (
          <Route key={`${code}-conv-${slug}`} path={`/${code}/${slug}`} component={() => <ConverterPage key={slug} target={target} />} />
        ))
      )}
      {converterEnabled && Object.keys(CONVERTER_ROUTES).map(slug => (
        <Route key={`conv-redirect-${slug}`} path={`/${slug}`} component={() => <Redirect to={`/en/${slug}`} />} />
      ))}

      {/* Dedicated PDF-utility landings — each one overrides the generic
          ToolLanding because it needs a tool-specific UI (multi-file picker
          for merge, page-range input for split, optimize stats for compress)
          that the Home-as-tool-landing wrapper can't accommodate. */}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-merge-pdf`} path={`/${code}/merge-pdf`} component={MergeLandingPage} />
      ))}
      <Route path="/merge-pdf" component={() => <Redirect to="/en/merge-pdf" />} />
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-split-pdf`} path={`/${code}/split-pdf`} component={SplitLandingPage} />
      ))}
      <Route path="/split-pdf" component={() => <Redirect to="/en/split-pdf" />} />
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-compress-pdf`} path={`/${code}/compress-pdf`} component={CompressLandingPage} />
      ))}
      <Route path="/compress-pdf" component={() => <Redirect to="/en/compress-pdf" />} />
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-rotate-pdf`} path={`/${code}/rotate-pdf`} component={RotateLandingPage} />
      ))}
      <Route path="/rotate-pdf" component={() => <Redirect to="/en/rotate-pdf" />} />
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-watermark-pdf`} path={`/${code}/watermark-pdf`} component={WatermarkLandingPage} />
      ))}
      <Route path="/watermark-pdf" component={() => <Redirect to="/en/watermark-pdf" />} />

      {/* Unified converter hub — upload + auto-detect + all conversions */}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-convert`} path={`/${code}/convert`} component={() => <ConverterHubPage />} />
      ))}
      <Route path="/convert" component={() => <Redirect to="/en/convert" />} />

      {/* Dedicated HEIC→PDF landing */}
      {LANGUAGES.map(({ code }) => {
        const seo = HEIC_SEO[code] ?? HEIC_SEO.en;
        return (
          <Route
            key={`${code}-heic-pdf`}
            path={`/${code}/heic-to-pdf`}
            component={() => <ConverterHubPage preselectId="heic-pdf" seoH1={seo.h1} seoSub={seo.sub} />}
          />
        );
      })}
      <Route path="/heic-to-pdf" component={() => <Redirect to="/en/heic-to-pdf" />} />

      {/* Tool landing pages — language-prefixed (skips slugs handled by ConverterPage / hub / dedicated utility landings above) */}
      {LANGUAGES.map(({ code }) =>
        TOOL_LANDINGS.filter(tool => !(tool.slug in CONVERTER_ROUTES) && tool.slug !== HUB_SLUG && tool.slug !== "merge-pdf" && tool.slug !== "split-pdf" && tool.slug !== "compress-pdf" && tool.slug !== "rotate-pdf" && tool.slug !== "watermark-pdf").map(tool => (
          <Route key={`${code}-${tool.slug}`} path={`/${code}/${tool.slug}`} component={() => <ToolLanding tool={tool} />} />
        ))
      )}

      {/* Tool landing redirects without lang prefix */}
      {TOOL_LANDINGS.filter(tool => !(tool.slug in CONVERTER_ROUTES) && tool.slug !== HUB_SLUG && tool.slug !== "merge-pdf" && tool.slug !== "split-pdf" && tool.slug !== "compress-pdf" && tool.slug !== "rotate-pdf" && tool.slug !== "watermark-pdf").map(tool => (
        <Route key={`redirect-${tool.slug}`} path={`/${tool.slug}`} component={() => <Redirect to={`/en/${tool.slug}`} />} />
      ))}

      {/* Test landing page */}
      {LANGUAGES.map(({ code }) => (
        <Route key={`${code}-landing-test`} path={`/${code}/prueba-nueva-landing`} component={LandingTest} />
      ))}

      {/* Google Ads CPA landing pages — language-prefixed */}
      {LANGUAGES.map(({ code }) =>
        AD_PAGES.map(page => (
          <Route key={`${code}-ad-${page.slug}`} path={`/${code}/${page.slug}`} component={() => <AdLandingPage page={page} />} />
        ))
      )}
      {/* Google Ads CPA landing pages — no lang prefix */}
      {AD_PAGES.map(page => (
        <Route key={`ad-redirect-${page.slug}`} path={`/${page.slug}`} component={() => <Redirect to={`/en/${page.slug}`} />} />
      ))}

      {/* Legacy routes without lang prefix — redirect to /es/ */}
      <Route path="/editor" component={() => <Redirect to="/es/editor" />} />
      <Route path="/pricing" component={() => <Redirect to="/es/pricing" />} />
      <Route path="/precios" component={() => <Redirect to="/es/pricing" />} />
      <Route path="/tools" component={() => <Redirect to="/es/tools" />} />
      <Route path="/dashboard" component={() => <Redirect to="/es/dashboard" />} />
      <Route path="/admin" component={() => <Redirect to="/es/admin" />} />
      <Route path="/privacy" component={() => <Redirect to="/es/privacy" />} />
      <Route path="/terms" component={() => <Redirect to="/es/terms" />} />
      <Route path="/cookies" component={() => <Redirect to="/es/cookies" />} />
      <Route path="/legal" component={() => <Redirect to="/es/legal" />} />
      <Route path="/gdpr" component={() => <Redirect to="/es/gdpr" />} />
      <Route path="/refund" component={() => <Redirect to="/es/refund" />} />
      <Route path="/payment/success" component={() => <Redirect to="/es/payment/success" />} />
      <Route path="/cancelar-suscripcion" component={() => <Redirect to="/es/cancelar-suscripcion" />} />
      <Route path="/internal-test" component={InternalTest} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/reset-password" component={ResetPassword} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <PdfFileProvider>
            <TooltipProvider>
              <Toaster position="top-center" duration={2000} style={{ top: "60px" }} />
              <PresenceTracker />
              <Suspense fallback={null}>
                <AnnouncementBanner />
              </Suspense>
              <Suspense fallback={<LazyFallback />}>
                <Router />
              </Suspense>
              {!isFastDoc && <CookieBanner />}
            </TooltipProvider>
          </PdfFileProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
