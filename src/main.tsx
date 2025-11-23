// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { CauseProvider } from "./context/CauseContext";
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { Toaster } from "sonner";
import DebugPageIndicator from "./components/DebugPageIndicator";
import { initPricePrefetch } from "./lib/price-prefetch";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CauseProvider>
      <CartProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
              <DebugPageIndicator />
            </ErrorBoundary>
          </BrowserRouter>
        </FavoritesProvider>
      </CartProvider>
    </CauseProvider>
    <Toaster position="bottom-right" richColors />
  </React.StrictMode>
);

// Initialize background price prefetching after 2 seconds
initPricePrefetch(2000);
