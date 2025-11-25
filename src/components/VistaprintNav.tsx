import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Heart, User, Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import kenzieMascot from "@/assets/kenzie-mascot.png";

export default function VistaprintNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo/Mascot + Menu */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <img 
                src={kenzieMascot} 
                alt="Print Power Purpose" 
                className="h-12 w-12 object-contain"
              />
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors ${
                  isActive("/") 
                    ? "text-blue-600" 
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                Home
              </Link>
              <Link 
                to="/products" 
                className={`text-sm font-medium transition-colors ${
                  isActive("/products") 
                    ? "text-blue-600" 
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                Products
              </Link>
              <Link 
                to="/select/nonprofit" 
                className={`text-sm font-medium transition-colors ${
                  isActive("/select/nonprofit") 
                    ? "text-blue-600" 
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                Causes
              </Link>
              <Link 
                to="/contact" 
                className={`text-sm font-medium transition-colors ${
                  isActive("/contact") 
                    ? "text-blue-600" 
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Right: Utility Items */}
          <div className="flex items-center gap-4">
            {/* Search Icon */}
            <button 
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist */}
            <button 
              onClick={() => navigate("/favorites")}
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button 
              onClick={() => navigate("/cart")}
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Account */}
            <button 
              onClick={() => navigate(isAuthenticated ? "/account" : "/auth")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              aria-label={isAuthenticated ? "Account" : "Sign In"}
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">{isAuthenticated ? "Account" : "Sign In"}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
