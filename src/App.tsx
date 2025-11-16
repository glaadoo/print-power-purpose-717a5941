// src/App.tsx
import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import KenzieChat from "@/components/KenzieChat";
import ChatbotWidget from "@/components/ChatbotWidget";
import ScrollToTop from "@/components/ScrollToTop";
import { StripeModeIndicator } from "@/components/StripeModeIndicator";


/** Per-route error boundary so crashes inside a page don't blank the whole app */
class RouteBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any) {
    console.error(`[RouteBoundary] Error in ${this.props.name}:`, error);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Page crashed: {this.props.name}</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p>
            <Link to="/">Go Home</Link>
          </p>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

/* ---------- Lazy imports ---------- */

function lazyPage<T extends { default: React.ComponentType<any> }>(
  label: string,
  loader: () => Promise<T>
) {
  return lazy(async () => {
    try {
      console.log(`[LazyPage] Loading page: ${label}`);
      const mod = await loader();
      console.log(`[LazyPage] Successfully loaded: ${label}`);
      return mod;
    } catch (e) {
      console.error(`[LazyPage] Failed to load ${label}:`, e);
      throw e;
    }
  });
}

const Home            = lazyPage("Home",            () => import("./pages/Home"));
const About           = lazyPage("About",           () => import("./pages/About"));
const Team            = lazyPage("Team",            () => import("./pages/Team"));
const Press           = lazyPage("Press",           () => import("./pages/Press"));
const Schools         = lazyPage("Schools",         () => import("./pages/Schools"));
const Blog            = lazyPage("Blog",            () => import("./pages/Blog"));
const FundraisingGuide = lazyPage("FundraisingGuide", () => import("./pages/FundraisingGuide"));
const Causes          = lazyPage("Causes",          () => import("./pages/Causes"));
const Donate          = lazyPage("Donate",          () => import("./pages/Donate"));
const Products        = lazyPage("Products",        () => import("./pages/Products"));
const ProductDetail   = lazyPage("ProductDetail",   () => import("./pages/ProductDetail"));
const Success         = lazyPage("Success",         () => import("./pages/Success"));
const Cancel          = lazyPage("Cancel",          () => import("./pages/Cancel"));
const SelectSchool    = lazyPage("SelectSchool",    () => import("./pages/SelectSchool"));
const SelectNonprofit = lazyPage("SelectNonprofit", () => import("./pages/SelectNonprofit"));
const PersonalMission = lazyPage("PersonalMission", () => import("./pages/PersonalMission"));
const Cart            = lazyPage("Cart",            () => import("./pages/Cart"));
const Checkout        = lazyPage("Checkout",        () => import("./pages/Checkout"));
const Auth            = lazyPage("Auth",            () => import("./pages/Auth"));
const ForgotPassword  = lazyPage("ForgotPassword",  () => import("./pages/ForgotPassword"));
const ResetPassword   = lazyPage("ResetPassword",   () => import("./pages/ResetPassword"));
const Admin           = lazyPage("Admin",           () => import("./pages/Admin"));
const Welcome         = lazyPage("Welcome",         () => import("./pages/Welcome"));
const DogDoor         = lazyPage("DogDoor",         () => import("./pages/DogDoor"));
const JotFormPayment = lazyPage("JotFormPayment", () => import("./pages/JotFormPayment"));
const Contact         = lazyPage("Contact",         () => import("./pages/Contact"));
const SystemLogs      = lazyPage("SystemLogs",      () => import("./pages/SystemLogs"));
const HelpCenter      = lazyPage("HelpCenter",      () => import("./pages/HelpCenter"));
const HelpSearchResults = lazyPage("HelpSearchResults", () => import("./pages/HelpSearchResults"));
const ProtectedRoute  = lazy(() => import("./components/ProtectedRoute"));
const PrivacyPolicy   = lazyPage("PrivacyPolicy",   () => import("./pages/PrivacyPolicy"));
const TermsOfUse      = lazyPage("TermsOfUse",      () => import("./pages/TermsOfUse"));
const LegalNotice     = lazyPage("LegalNotice",     () => import("./pages/LegalNotice"));
const Legal           = lazyPage("Legal",           () => import("./pages/Legal"));
const AdminLegal      = lazyPage("AdminLegal",      () => import("./pages/AdminLegal"));
const AdminNonprofits = lazyPage("AdminNonprofits", () => import("./pages/AdminNonprofits"));
import AdminNonprofitAnalytics from "./pages/AdminNonprofitAnalytics";
import AdminNonprofitApprovals from "./pages/AdminNonprofitApprovals";
import AdminStripeAnalytics from "./pages/AdminStripeAnalytics";
import AdminTransactions from "./pages/AdminTransactions";
const AdminProducts = lazyPage("AdminProducts", () => import("./pages/AdminProducts"));
const AdminLiveModeSetup = lazyPage("AdminLiveModeSetup", () => import("./pages/AdminLiveModeSetup"));
const NonprofitProfile = lazyPage("NonprofitProfile", () => import("./pages/NonprofitProfile"));
const SubmitNonprofit = lazyPage("SubmitNonprofit", () => import("./pages/SubmitNonprofit"));
const WhoWeServeNonprofits = lazyPage("WhoWeServeNonprofits", () => import("./pages/WhoWeServeNonprofits"));
const WhoWeServeSchools = lazyPage("WhoWeServeSchools", () => import("./pages/WhoWeServeSchools"));

/* ---------- Fallback UI ---------- */

function Loading({ label }: { label: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,.6)",
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,.2)",
        }}
      >
        Loading {label}…
      </div>
    </div>
  );
}

/* ---------- NotFound ---------- */

function NotFound() {
  const loc = useLocation();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,.6)",
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,.2)",
        }}
      >
        <h1>404 — No route matched</h1>
        <p>
          path: <code>{loc.pathname}</code>
        </p>
        <p><Link to="/">Go Home</Link></p>
      </div>
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      console.error("[App] Global error caught:", ev.error);
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      console.error("[App] Unhandled promise rejection:", ev.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const location = useLocation();

  return (
    <>
      <ScrollToTop />

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Suspense fallback={<Loading label="page" />}>
        <Routes>
          {/* Home */}
          <Route
            path="/"
            element={
              <RouteBoundary name="Home">
                <Home />
              </RouteBoundary>
            }
          />

          {/* Protected Routes - Require onboarding */}
          <Route
            path="/cart"
            element={
              <RouteBoundary name="Cart">
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />

          <Route
            path="/checkout"
            element={
              <RouteBoundary name="Checkout">
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />

          {/* Selection flows - Protected */}
          <Route
            path="/select/school"
            element={
              <RouteBoundary name="SelectSchool">
                <ProtectedRoute>
                  <SelectSchool />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/select/nonprofit"
            element={
              <RouteBoundary name="SelectNonprofit">
                <ProtectedRoute>
                  <SelectNonprofit />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/select/personal"
            element={
              <RouteBoundary name="PersonalMission">
                <ProtectedRoute>
                  <PersonalMission />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />

          {/* Existing pages */}
          <Route
            path="/about"
            element={
              <RouteBoundary name="About">
                <About />
              </RouteBoundary>
            }
          />
          <Route
            path="/team"
            element={
              <RouteBoundary name="Team">
                <Team />
              </RouteBoundary>
            }
          />
          <Route
            path="/press"
            element={
              <RouteBoundary name="Press">
                <Press />
              </RouteBoundary>
            }
          />
          <Route
            path="/schools"
            element={
              <RouteBoundary name="Schools">
                <ProtectedRoute>
                  <Schools />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/who-we-serve/nonprofits"
            element={
              <RouteBoundary name="WhoWeServeNonprofits">
                <WhoWeServeNonprofits />
              </RouteBoundary>
            }
          />
          <Route
            path="/who-we-serve/schools"
            element={
              <RouteBoundary name="WhoWeServeSchools">
                <WhoWeServeSchools />
              </RouteBoundary>
            }
          />
          <Route
            path="/blog"
            element={
              <RouteBoundary name="Blog">
                <Blog />
              </RouteBoundary>
            }
          />
          <Route
            path="/guides/fundraising"
            element={
              <RouteBoundary name="FundraisingGuide">
                <FundraisingGuide />
              </RouteBoundary>
            }
          />
          <Route
            path="/contact"
            element={
              <RouteBoundary name="Contact">
                <Contact />
              </RouteBoundary>
            }
          />
          <Route
            path="/causes"
            element={
              <RouteBoundary name="Causes">
                <ProtectedRoute>
                  <Causes />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/donate"
            element={
              <RouteBoundary name="Donate">
                <ProtectedRoute>
                  <Donate />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/products"
            element={
              <RouteBoundary name="Products">
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/products/:id"
            element={
              <RouteBoundary name="ProductDetail">
                <ProtectedRoute>
                  <ProductDetail />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/success"
            element={
              <RouteBoundary name="Success">
                <ProtectedRoute>
                  <Success />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />
          <Route
            path="/cancel"
            element={
              <RouteBoundary name="Cancel">
                <ProtectedRoute>
                  <Cancel />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />

          {/* Auth */}
          <Route
            path="/auth"
            element={
              <RouteBoundary name="Auth">
                <Auth />
              </RouteBoundary>
            }
          />

          {/* Forgot Password */}
          <Route
            path="/forgot-password"
            element={
              <RouteBoundary name="ForgotPassword">
                <ForgotPassword />
              </RouteBoundary>
            }
          />

          {/* Reset Password */}
          <Route
            path="/reset-password"
            element={
              <RouteBoundary name="ResetPassword">
                <ResetPassword />
              </RouteBoundary>
            }
          />

          {/* Dog Door - Hidden admin access */}
          <Route
            path="/dogdoor"
            element={
              <RouteBoundary name="DogDoor">
                <DogDoor />
              </RouteBoundary>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RouteBoundary name="Admin">
                <Admin />
              </RouteBoundary>
            }
          />

          {/* Welcome */}
          <Route
            path="/welcome"
            element={
              <RouteBoundary name="Welcome">
                <Welcome />
              </RouteBoundary>
            }
          />

          <Route
            path="/jotform-payment"
            element={
              <RouteBoundary name="JotFormPayment">
                <ProtectedRoute>
                  <JotFormPayment />
                </ProtectedRoute>
              </RouteBoundary>
            }
          />

          {/* System Logs */}
          <Route
            path="/system-logs"
            element={
              <RouteBoundary name="SystemLogs">
                <SystemLogs />
              </RouteBoundary>
            }
          />

          {/* Help Center */}
          <Route
            path="/help"
            element={
              <RouteBoundary name="HelpCenter">
                <HelpCenter />
              </RouteBoundary>
            }
          />

          {/* Help Search Results */}
          <Route
            path="/help/search"
            element={
              <RouteBoundary name="HelpSearchResults">
                <HelpSearchResults />
              </RouteBoundary>
            }
          />

          {/* Legal Pages */}
          <Route
            path="/policies/privacy"
            element={
              <RouteBoundary name="PrivacyPolicy">
                <PrivacyPolicy />
              </RouteBoundary>
            }
          />
          <Route
            path="/policies/terms"
            element={
              <RouteBoundary name="TermsOfUse">
                <TermsOfUse />
              </RouteBoundary>
            }
          />
          <Route
            path="/policies/legal"
            element={
              <RouteBoundary name="LegalNotice">
                <LegalNotice />
              </RouteBoundary>
            }
          />
          <Route
            path="/legal"
            element={
              <RouteBoundary name="Legal">
                <Legal />
              </RouteBoundary>
            }
          />

          {/* Admin Legal */}
          <Route
            path="/admin/legal"
            element={
              <RouteBoundary name="AdminLegal">
                <AdminLegal />
              </RouteBoundary>
            }
          />

          {/* Admin Nonprofits */}
          <Route
            path="/admin/nonprofits"
            element={
              <RouteBoundary name="AdminNonprofits">
                <AdminNonprofits />
              </RouteBoundary>
            }
          />

          {/* Admin Nonprofit Analytics */}
          <Route
            path="/admin/nonprofit-analytics"
            element={
              <RouteBoundary name="AdminNonprofitAnalytics">
                <AdminNonprofitAnalytics />
              </RouteBoundary>
            }
          />

          {/* Submit Nonprofit */}
          <Route
            path="/causes/submit"
            element={
              <RouteBoundary name="SubmitNonprofit">
                <SubmitNonprofit />
              </RouteBoundary>
            }
          />

          {/* Admin Nonprofit Approvals */}
          <Route
            path="/admin/nonprofits/approvals"
            element={
              <RouteBoundary name="AdminNonprofitApprovals">
                <AdminNonprofitApprovals />
              </RouteBoundary>
            }
          />

          {/* Admin Products */}
          <Route
            path="/admin/products"
            element={
              <RouteBoundary name="AdminProducts">
                <AdminProducts />
              </RouteBoundary>
            }
          />

          {/* Admin Live Mode Setup */}
          <Route
            path="/admin/live-setup"
            element={
              <RouteBoundary name="AdminLiveModeSetup">
                <AdminLiveModeSetup />
              </RouteBoundary>
            }
          />

          {/* Admin Stripe Analytics */}
          <Route
            path="/admin/stripe-analytics"
            element={
              <RouteBoundary name="AdminStripeAnalytics">
                <AdminStripeAnalytics />
              </RouteBoundary>
            }
          />

          {/* Admin Transactions */}
          <Route
            path="/admin/transactions"
            element={
              <RouteBoundary name="AdminTransactions">
                <AdminTransactions />
              </RouteBoundary>
            }
          />

          {/* Nonprofit Profile */}
          <Route
            path="/nonprofit/:id"
            element={
              <RouteBoundary name="NonprofitProfile">
                <NonprofitProfile />
              </RouteBoundary>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Global floating components - wrapped in error boundaries */}
      <RouteBoundary name="KenzieChat">
        <KenzieChat />
      </RouteBoundary>

      {/* Chatbot widget - show on all pages except home */}
      {location.pathname !== "/" && (
        <RouteBoundary name="ChatbotWidget">
          <ChatbotWidget />
        </RouteBoundary>
      )}

      {/* Stripe Mode Indicator - shows current API mode */}
      <RouteBoundary name="StripeModeIndicator">
        <StripeModeIndicator />
      </RouteBoundary>
    </>
  );
}
