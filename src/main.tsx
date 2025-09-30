import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { CauseProvider } from "./context/CauseContext";
import { ToastProvider } from "./ui/Toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="min-h-screen bg-[#f5f0e6]">
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
