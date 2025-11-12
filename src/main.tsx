// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { CauseProvider } from "./context/CauseContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./ui/Toast";
import { Toaster } from "sonner";

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
      <ToastProvider>
        <CauseProvider>
          <CartProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </BrowserRouter>
          </CartProvider>
        </CauseProvider>
      </ToastProvider>
      <Toaster position="bottom-right" richColors />
    </div>
  </React.StrictMode>
);
