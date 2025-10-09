
import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

export default function Layout({
  children,
  centered = true,
  showHeader = true,
  title,
}: {
  children: ReactNode;
  centered?: boolean;
  showHeader?: boolean;
  title?: string;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const { count } = useCart();

  // Optional: update document title if provided
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

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
              <Link to="/" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                Home
              </Link>
              <Link to="/products" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                Products
              </Link>
              <Link to="/causes" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                Causes
              </Link>
            </div>

            {/* Right actions */}
            <div className="relative flex items-center gap-3">
              <Link to="/cart" className="relative btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                Cart 🛒
                {count > 0 && (
                  <span
                    className="
                      absolute -top-2 -right-2
                      min-w-[22px] h-[22px] px-1
                      bg-green-600 text-white text-xs font-bold
                      rounded-full grid place-items-center
                      shadow-lg
                    "
                    aria-label={`${count} item${count === 1 ? "" : "s"} in cart`}
                  >
                    {count}
                  </span>
                )}
              </Link>

              <Link to="/donate" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                Donate ❤️
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
