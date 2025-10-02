import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { CauseProvider } from "./context/CauseContext";
import { ToastProvider } from "./ui/Toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Background image layer (fixed, no blur, behind everything) */}
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,                          // sits underneath
        backgroundImage: 'url("/IMG_4805.jpeg")', // comes from /public
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"       // subtle parallax
      }}
    />

    {/* App content layer */}
    <div style={{ position: "relative", zIndex: 1 }}>
      <ToastProvider>
        <CauseProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CauseProvider>
      </ToastProvider>
    </div>
  </React.StrictMode>
);
