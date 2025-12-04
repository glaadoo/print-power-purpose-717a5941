import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;             // product id
  cartItemId: string;     // unique cart item id (productId + configuration hash)
  name: string;
  priceCents: number;     // per-unit price in cents
  quantity: number;
  imageUrl?: string | null;
  currency?: string | null; // 'USD' etc.
  configuration?: Record<string, any>; // Product configuration (size, color, etc.)
  artworkUrl?: string | null; // Uploaded artwork file URL
  artworkFileName?: string | null; // Uploaded artwork file name
};

// Generate a unique cart item ID from product ID and configuration
function generateCartItemId(productId: string, configuration?: Record<string, any>): string {
  if (!configuration || Object.keys(configuration).length === 0) {
    return productId;
  }
  // Sort keys for consistent hashing
  const sortedKeys = Object.keys(configuration).sort();
  const configString = sortedKeys.map(k => `${k}:${configuration[k]}`).join('|');
  return `${productId}::${configString}`;
}

type CartState = {
  items: CartItem[];
};

type CartAPI = {
  items: CartItem[];
  count: number;                 // total quantity
  totalCents: number;            // subtotal (no shipping/tax here)
  add: (item: Omit<CartItem, "quantity" | "cartItemId">, qty?: number) => void;
  setQty: (cartItemId: string, qty: number) => void;
  remove: (cartItemId: string) => void;
  clear: () => void;
};

const LS_KEY = "ppp:cart";
const CartCtx = createContext<CartAPI | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { items: [] };
    } catch {
      return { items: [] };
    }
  });

  // Clear cart and ppp_access only on explicit logout (not on mount/refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only clear cart and access when user explicitly signs out
      if (event === 'SIGNED_OUT') {
        setState({ items: [] });
        try {
          localStorage.removeItem(LS_KEY);
          // PPP SECURITY: Clear onboarding access flag on sign out
          localStorage.removeItem("ppp_access");
        } catch {}
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // derived
  const count = useMemo(
    () => state.items.reduce((sum, it) => sum + it.quantity, 0),
    [state.items]
  );

  const totalCents = useMemo(
    () => state.items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0),
    [state.items]
  );

  // actions
  function add(item: Omit<CartItem, "quantity" | "cartItemId">, qty = 1) {
    setState((s) => {
      // Generate unique cart item ID based on product ID + configuration
      const cartItemId = generateCartItemId(item.id, item.configuration);
      
      // Find existing item by cartItemId (not just product ID)
      const i = s.items.findIndex((x) => x.cartItemId === cartItemId);
      if (i === -1) {
        // New unique configuration - add as new item
        return { items: [...s.items, { ...item, cartItemId, quantity: Math.max(1, qty) }] };
      }
      // Same configuration exists - update quantity
      const next = [...s.items];
      next[i] = { ...next[i], quantity: Math.max(1, next[i].quantity + qty) };
      return { items: next };
    });
  }

  function setQty(cartItemId: string, qty: number) {
    setState((s) => {
      const next = s.items.map((it) =>
        it.cartItemId === cartItemId ? { ...it, quantity: Math.max(0, Math.floor(qty)) } : it
      ).filter((it) => it.quantity > 0);
      return { items: next };
    });
  }

  function remove(cartItemId: string) {
    setState((s) => ({ items: s.items.filter((it) => it.cartItemId !== cartItemId) }));
  }

  function clear() {
    setState({ items: [] });
  }

  const api: CartAPI = { items: state.items, count, totalCents, add, setQty, remove, clear };

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
