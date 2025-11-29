import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Heart, User, Menu, ChevronDown, Package, MessageCircle, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import kenzieMascot from "@/assets/kenzie-mascot.png";

export default function VistaprintNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingUserName, setLoadingUserName] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const productsMenuRef = useRef<HTMLDivElement>(null);
  
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      
      // Fetch user profile if authenticated
      if (session?.user) {
        setLoadingUserName(true);
        supabase
          .from('profiles')
          .select('first_name')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            setLoadingUserName(false);
            if (data?.first_name) {
              setUserName(data.first_name);
            }
          });
      } else {
        setUserName(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      
      // Fetch user profile on auth state change
      if (session?.user) {
        setLoadingUserName(true);
        setTimeout(() => {
          supabase
            .from('profiles')
            .select('first_name')
            .eq('id', session.user.id)
            .maybeSingle()
            .then(({ data }) => {
              setLoadingUserName(false);
              if (data?.first_name) {
                setUserName(data.first_name);
              }
            });
        }, 0);
      } else {
        setUserName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (productsMenuRef.current && !productsMenuRef.current.contains(event.target as Node)) {
        setProductsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
              
              {/* Products Dropdown */}
              <div className="relative" ref={productsMenuRef}>
                <button 
                  onClick={() => setProductsMenuOpen(!productsMenuOpen)}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    isActive("/products") || location.pathname.startsWith("/product/")
                      ? "text-blue-600" 
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Products
                  <ChevronDown className={`w-4 h-4 transition-transform ${productsMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Products Dropdown Menu */}
                {productsMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        navigate("/products");
                        setProductsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      All Products
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Categories
                    </div>
                    <button
                      onClick={() => {
                        navigate("/products");
                        setProductsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Business Cards
                    </button>
                    <button
                      onClick={() => {
                        navigate("/products");
                        setProductsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Flyers & Brochures
                    </button>
                    <button
                      onClick={() => {
                        navigate("/products");
                        setProductsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Signs & Banners
                    </button>
                    <button
                      onClick={() => {
                        navigate("/products");
                        setProductsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Apparel
                    </button>
                    <button
                      onClick={() => {
                        navigate("/products");
                        setProductsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Promotional Items
                    </button>
                  </div>
                )}
              </div>
              
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
            {/* Wishlist - Hidden on home page */}
            {!isHomePage && (
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
            )}

            {/* Cart - Hidden on home page */}
            {!isHomePage && (
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
            )}

            {/* Account with Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="Account menu"
              >
                <div className="relative">
                  <User className="w-5 h-5" />
                  {loadingUserName && (
                    <Loader2 className="w-3 h-3 absolute -top-1 -right-1 text-blue-600 animate-spin" />
                  )}
                </div>
                <span className="hidden sm:inline">
                  {loadingUserName ? (
                    <span className="inline-block h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse bg-[length:200%_100%]" style={{ animation: 'shimmer 1.5s infinite' }} />
                  ) : (
                    isAuthenticated && userName ? `Hi, ${userName}` : isAuthenticated ? "Account" : "Sign In"
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  {/* Chat with Kenzie - Available to everyone */}
                  <button
                    onClick={() => {
                      if (window.kenzieOpenChat) {
                        window.kenzieOpenChat();
                      } else {
                        window.dispatchEvent(new CustomEvent("kenzie-open-chat"));
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat with Kenzie
                  </button>
                  
                  <div className="border-t border-gray-200 my-2"></div>
                  
                  {!isAuthenticated ? (
                    <button
                      onClick={() => {
                        navigate("/auth");
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                    >
                      Sign In
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          navigate("/orders");
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        My Orders
                      </button>
                      <button
                        onClick={() => {
                          navigate("/favorites");
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        My Favorites
                      </button>
                      <div className="border-t border-gray-200 my-2"></div>
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setMenuOpen(false);
                          navigate("/");
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
