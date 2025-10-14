// src/App.tsx
import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";


/* ---------- Debug helpers ---------- */

function DebugBar() {
  const loc = useLocation();
  useEffect(() => {
    console.log("[Router] location changed:", loc.pathname + loc.search + loc.hash);
  }, [loc]);
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        zIndex: 9999,
        background: "rgba(0,0,0,.75)",
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 8,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
      }}
    >
      path: <strong>{loc.pathname}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{loc.search}{loc.hash}</span>
    </div>
  );
}

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
    console.log(`[Lazy] start loading ${label}`);
    try {
      const mod = await loader();
      console.log(`[Lazy] loaded ${label}`);
      return mod;
    } catch (e) {
      console.error(`[Lazy] FAILED to load ${label}`, e);
      throw e;
    }
  });
}

const Home            = lazyPage("Home",            () => import("./pages/Home"));
const Kenzie          = lazyPage("Kenzie",          () => import("./pages/Kenzie"));
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
const Admin           = lazyPage("Admin",           () => import("./pages/Admin"));

/* ---------- Fallback UI ---------- */

function Loading({ label }: { label: string }) {
  console.log(`[Suspense] show fallback for ${label}`);
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
  console.warn("[Router] 404 NotFound for path:", loc.pathname);
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
      console.error("[window.onerror]", ev.message, ev.error);
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      console.error("[window.onunhandledrejection]", ev.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    console.log("[App] mounted");
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <>
      <DebugBar />

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

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RouteBoundary name="Admin">
                <Admin />
              </RouteBoundary>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {/* Mount once, globally */}
      <KenzieChat />
    </>
  );
}
