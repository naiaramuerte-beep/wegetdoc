/* =============================================================
   PDFPro App — Routes & Top-level layout
   Deep Navy Pro design system + i18n routing
   ============================================================= */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
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

      {/* Legacy routes without lang prefix — redirect to /es/ */}
      <Route path="/pricing" component={() => <Redirect to="/es/pricing" />} />
      <Route path="/precios" component={() => <Redirect to="/es/pricing" />} />
      <Route path="/tools" component={() => <Redirect to="/es/tools" />} />
      <Route path="/dashboard" component={() => <Redirect to="/es/dashboard" />} />
      <Route path="/admin" component={() => <Redirect to="/es/admin" />} />
      <Route path="/privacy" component={() => <Redirect to="/es/privacy" />} />
      <Route path="/terms" component={() => <Redirect to="/es/terms" />} />
      <Route path="/cookies" component={() => <Redirect to="/es/cookies" />} />
      <Route path="/legal" component={() => <Redirect to="/es/legal" />} />
      <Route path="/payment/success" component={() => <Redirect to="/es/payment/success" />} />
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
          <TooltipProvider>
            <Toaster position="top-right" />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
