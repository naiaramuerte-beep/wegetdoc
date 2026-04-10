/* =============================================================
   EditorPDF App — Routes & Top-level layout
   Deep Navy Pro design system + i18n routing
   ============================================================= */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { PdfFileProvider } from "./contexts/PdfFileContext";
import { LANGUAGES, detectLangFromBrowser } from "./lib/i18n";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Tools from "./pages/Tools";
import PaymentSuccess from "./pages/PaymentSuccess";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import LegalPage from "./pages/LegalPage";
import EditorPage from "./pages/EditorPage";
import CancelSubscription from "./pages/CancelSubscription";
import CookieBanner from "./components/CookieBanner";
import { isFastDoc } from "./lib/brand";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ToolLanding, { TOOL_LANDINGS } from "./pages/ToolLanding";

// Redirect root "/" to language-prefixed URL based on browser language
function RootRedirect() {
  const lang = detectLangFromBrowser();
  return <Redirect to={`/${lang}`} />;
}

function Router() {
  return (
    <Switch>
      {/* Root redirect to browser language */}
      <Route path="/" component={RootRedirect} />

      {/* Language-prefixed routes — one block per lang */}
      {LANGUAGES.map(({ code }) => (
        <Route key={code} path={`/${code}`} component={Home} />
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

      {/* Blog routes — language-prefixed */}
      {!isFastDoc && LANGUAGES.map(({ code }) => (
        <Route key={`${code}-blog`} path={`/${code}/blog`} component={Blog} />
      ))}
      {!isFastDoc && LANGUAGES.map(({ code }) => (
        <Route key={`${code}-blog-post`} path={`/${code}/blog/:slug`} component={BlogPost} />
      ))}

      {/* Blog legacy routes */}
      {!isFastDoc && <Route path="/blog" component={() => <Redirect to="/es/blog" />} />}
      {!isFastDoc && <Route path="/blog/:slug" component={({ params }) => <Redirect to={`/es/blog/${params.slug}`} />} />}

      {/* Tool landing pages — language-prefixed */}
      {LANGUAGES.map(({ code }) =>
        TOOL_LANDINGS.map(tool => (
          <Route key={`${code}-${tool.slug}`} path={`/${code}/${tool.slug}/online`} component={() => <ToolLanding tool={tool} />} />
        ))
      )}

      {/* Tool landing redirects without lang prefix */}
      {TOOL_LANDINGS.map(tool => (
        <Route key={`redirect-${tool.slug}`} path={`/${tool.slug}/online`} component={() => <Redirect to={`/en/${tool.slug}/online`} />} />
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
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

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
              <Toaster position="top-right" duration={3000} />
              <Router />
              {!isFastDoc && <CookieBanner />}
            </TooltipProvider>
          </PdfFileProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
