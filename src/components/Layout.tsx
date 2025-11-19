
import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import MascotHeader from "./MascotHeader";

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
  const [session, setSession] = useState<Session | null>(null);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Optional: update document title if provided
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out");
    } else {
      toast.success("Logged out successfully");
      nav("/auth");
    }
  };

  const isHome = loc.pathname === "/";
  const showHoverHeader = showHeader && !isHome;

  return (
    <div className="relative">
      {showHeader && <MascotHeader />}
      
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

              {session ? (
                <button
                  onClick={handleLogout}
                  className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg flex items-center gap-2"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <Link to="/auth" className="btn-rect px-3 h-9 font-bold text-white drop-shadow-lg">
                  Login
                </Link>
              )}
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
