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
  </React.StrictMode>
);
