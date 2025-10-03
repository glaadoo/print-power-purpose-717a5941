
import { ReactNode } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

export default function Layout({
  children,
  centered = true,
  showHeader = true,
}: {
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
      {showHoverHeader && (
        <div className="fixed inset-x-0 top-0 z-40 group">
          <div className="h-3 w-full" />
          <header
            className="nav-rect mx-auto translate-y-[-90%] group-hover:translate-y-0 
                       transition-transform duration-300 flex items-center justify-between px-4"
          >
            {/* Left actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => nav(-1)}
                className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg"
              >
                ← Back
              </button>
              <Link to="/" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">Home</Link>
              <Link to="/products" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">Products</Link>
              <Link to="/causes" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">Causes</Link>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <Link to="/cart" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                🧺 Cart
              </Link>
              <Link to="/donate" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                ❤️ Donate
              </Link>
            </div>
          </header>
        </div>
      )}

      <main
        className={`min-h-screen ${centered ? "grid place-items-center" : ""} px-4 ${
          showHoverHeader ? "pt-4" : ""
        }`}
      >
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
