// src/App.tsx
import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import KenzieChat from "@/components/KenzieChat";
import FloatingCartBar from "@/components/FloatingCartBar";


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
    console.error(`[RouteBoundary] ${this.props.name} crashed:`, error);
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
      const mod = await loader();
      return mod;
    } catch (e) {
      console.error(`Failed to load ${label}`, e);
      throw e;
    }
  });
}

const Home            = lazyPage("Home",            () => import("./pages/Home"));
const Kenzie          = lazyPage("Kenzie",          () => import("./pages/Kenzie"));
const About           = lazyPage("About",           () => import("./pages/About"));
const Causes          = lazyPage("Causes",          () => import("./pages/Causes"));
const Products        = lazyPage("Products",        () => import("./pages/Products"));
const ProductDetail   = lazyPage("ProductDetail",   () => import("./pages/ProductDetail"));
const Success         = lazyPage("Success",         () => import("./pages/Success"));
const Cancel          = lazyPage("Cancel",          () => import("./pages/Cancel"));
const Dashboard       = lazyPage("Dashboard",       () => import("./pages/Dashboard"));
const SelectSchool    = lazyPage("SelectSchool",    () => import("./pages/SelectSchool"));
const SelectNonprofit = lazyPage("SelectNonprofit", () => import("./pages/SelectNonprofit"));
const PersonalMission = lazyPage("PersonalMission", () => import("./pages/PersonalMission"));
const Cart            = lazyPage("Cart",            () => import("./pages/Cart"));
const Checkout        = lazyPage("Checkout",        () => import("./pages/Checkout"));
const Auth            = lazyPage("Auth",            () => import("./pages/Auth"));
const AdminLogin      = lazyPage("AdminLogin",      () => import("./pages/AdminLogin"));
const Admin           = lazyPage("Admin",           () => import("./pages/Admin"));
const AdminSync       = lazyPage("AdminSync",       () => import("./pages/AdminSync"));
const AdminOrders     = lazyPage("AdminOrders",     () => import("./pages/AdminOrders"));
const AdminDonations  = lazyPage("AdminDonations",  () => import("./pages/AdminDonations"));
const AdminAnalytics  = lazyPage("AdminAnalytics",  () => import("./pages/AdminAnalytics"));
const AdminStoryRequests = lazyPage("AdminStoryRequests", () => import("./pages/AdminStoryRequests"));
const Welcome         = lazyPage("Welcome",         () => import("./pages/Welcome"));

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
      console.error("Application error:", ev.message, ev.error);
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", ev.reason);
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

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <RouteBoundary name="Dashboard">
                <Dashboard />
              </RouteBoundary>
            }
          />

          {/* Cart */}
          <Route
            path="/cart"
            element={
              <RouteBoundary name="Cart">
                <Cart />
              </RouteBoundary>
            }
          />

          {/* Checkout (NEW) */}
          <Route
            path="/checkout"
            element={
              <RouteBoundary name="Checkout">
                <Checkout />
              </RouteBoundary>
            }
          />

          {/* Selection flows */}
          <Route
            path="/select/school"
            element={
              <RouteBoundary name="SelectSchool">
                <SelectSchool />
              </RouteBoundary>
            }
          />
          <Route
            path="/select/nonprofit"
            element={
              <RouteBoundary name="SelectNonprofit">
                <SelectNonprofit />
              </RouteBoundary>
            }
          />
          <Route
            path="/select/personal"
            element={
              <RouteBoundary name="PersonalMission">
                <PersonalMission />
              </RouteBoundary>
            }
          />

          {/* Existing pages */}
          <Route
            path="/kenzie"
            element={
              <RouteBoundary name="Kenzie">
                <Kenzie />
              </RouteBoundary>
            }
          />
          <Route
            path="/about"
            element={
              <RouteBoundary name="About">
                <About />
              </RouteBoundary>
            }
          />
          <Route
            path="/causes"
            element={
              <RouteBoundary name="Causes">
                <Causes />
              </RouteBoundary>
            }
          />
          <Route
            path="/products"
            element={
              <RouteBoundary name="Products">
                <Products />
              </RouteBoundary>
            }
          />
          <Route
            path="/products/:id"
            element={
              <RouteBoundary name="ProductDetail">
                <ProductDetail />
              </RouteBoundary>
            }
          />
          <Route
            path="/success"
            element={
              <RouteBoundary name="Success">
                <Success />
              </RouteBoundary>
            }
          />
          <Route
            path="/cancel"
            element={
              <RouteBoundary name="Cancel">
                <Cancel />
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

          {/* Admin Login */}
          <Route
            path="/admin-login"
            element={
              <RouteBoundary name="AdminLogin">
                <AdminLogin />
              </RouteBoundary>
            }
          />
          <Route
            path="/admin/login"
            element={
              <RouteBoundary name="AdminLoginAlias1">
                <AdminLogin />
              </RouteBoundary>
            }
          />
          <Route
            path="/login/admin"
            element={
              <RouteBoundary name="AdminLoginAlias2">
                <AdminLogin />
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

          {/* Admin Sync */}
          <Route
            path="/admin/sync"
            element={
              <RouteBoundary name="AdminSync">
                <AdminSync />
              </RouteBoundary>
            }
          />

          {/* Admin Orders */}
          <Route
            path="/admin/orders"
            element={
              <RouteBoundary name="AdminOrders">
                <AdminOrders />
              </RouteBoundary>
            }
          />

          {/* Admin Donations */}
          <Route
            path="/admin/donations"
            element={
              <RouteBoundary name="AdminDonations">
                <AdminDonations />
              </RouteBoundary>
            }
          />

          {/* Admin Analytics */}
          <Route
            path="/admin/analytics"
            element={
              <RouteBoundary name="AdminAnalytics">
                <AdminAnalytics />
              </RouteBoundary>
            }
          />

          {/* Admin Story Requests */}
          <Route
            path="/admin/story-requests"
            element={
              <RouteBoundary name="AdminStoryRequests">
                <AdminStoryRequests />
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

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Global floating components - wrapped in error boundaries */}
      <RouteBoundary name="FloatingCartBar">
        <FloatingCartBar />
      </RouteBoundary>
      <RouteBoundary name="KenzieChat">
        <KenzieChat />
      </RouteBoundary>
    </>
  );
}
