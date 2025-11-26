import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;             // product id
  name: string;
  priceCents: number;     // per-unit price in cents
  quantity: number;
  imageUrl?: string | null;
  currency?: string | null; // 'USD' etc.
  configuration?: Record<string, any>; // Product configuration (size, color, etc.)
  artworkUrl?: string | null; // Uploaded artwork file URL
  artworkFileName?: string | null; // Uploaded artwork file name
};

type CartState = {
  items: CartItem[];
};

type CartAPI = {
  items: CartItem[];
  count: number;                 // total quantity
  totalCents: number;            // subtotal (no shipping/tax here)
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
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

  // Clear cart only on explicit logout (not on mount/refresh)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only clear cart when user explicitly signs out
      if (event === 'SIGNED_OUT') {
        setState({ items: [] });
        try {
          localStorage.removeItem(LS_KEY);
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
  function add(item: Omit<CartItem, "quantity">, qty = 1) {
    setState((s) => {
      const i = s.items.findIndex((x) => x.id === item.id);
      if (i === -1) {
        return { items: [...s.items, { ...item, quantity: Math.max(1, qty) }] };
      }
      const next = [...s.items];
      next[i] = { ...next[i], quantity: Math.max(1, next[i].quantity + qty) };
      return { items: next };
    });
  }

  function setQty(productId: string, qty: number) {
    setState((s) => {
      const next = s.items.map((it) =>
        it.id === productId ? { ...it, quantity: Math.max(0, Math.floor(qty)) } : it
      ).filter((it) => it.quantity > 0);
      return { items: next };
    });
  }

  function remove(productId: string) {
    setState((s) => ({ items: s.items.filter((it) => it.id !== productId) }));
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
