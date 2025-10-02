import { ReactNode } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

export default function Layout({
  title,
  children,
  centered = true,
  showHeader = true, // set false on Home if you like
}: {
  title?: string;
  children: ReactNode;
  centered?: boolean;
  showHeader?: boolean;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  const showHoverHeader = showHeader && !isHome;

  return (
    <div className="relative">
      {/* Hover-reveal header (not on Home) */}
      {showHoverHeader && (
        <div className="fixed inset-x-0 top-0 z-40 group pointer-events-none">
          <div className="h-3 w-full" />
          <header
            className="
              mx-auto w-[95%] sm:w-[90%] max-w-6xl
              translate-y-[-90%] group-hover:translate-y-0 transition-transform duration-300
              glass card-padding flex items-center justify-between pointer-events-auto
              bg-white/35 backdrop-blur-xl
            "
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => nav(-1)}
                className="px-3 py-1.5 rounded-md border border-white/40 bg-white/30 hover:bg-white/40 focus:ring-2"
              >
                ← Back
              </button>
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-md border border-white/40 bg-white/30 hover:bg-white/40 focus:ring-2"
              >
                Dashboard
              </Link>
            </div>
            <Link to="/" className="text-lg font-semibold">Print Power Purpose</Link>
          </header>
        </div>
      )}

      {/* Main: full-screen center. Add a tiny top padding so a revealed header doesn't overlap. */}
      <main className={`min-h-screen grid place-items-center px-4 ${showHoverHeader ? "pt-4" : ""}`}>
        {/* Width guard; children (GlassCard) will sit centered like an island */}
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
