// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { CauseProvider } from "./context/CauseContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "sonner";
import DebugPageIndicator from "./components/DebugPageIndicator";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Background image layer (fixed, behind everything) - lazy loaded */}
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        backgroundImage: 'url("/IMG_4805.jpeg")',
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        willChange: "transform",
      }}
    />

    {/* App content layer */}
    <div style={{ position: "relative", zIndex: 1 }}>
      <CauseProvider>
        <CartProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
              <DebugPageIndicator />
            </ErrorBoundary>
          </BrowserRouter>
        </CartProvider>
      </CauseProvider>
      <Toaster position="bottom-right" richColors />
    </div>
  </React.StrictMode>
);
