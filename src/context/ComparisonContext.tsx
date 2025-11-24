import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ComparisonProduct = {
  id: string;
  name: string;
  description?: string | null;
  base_cost_cents: number;
  image_url?: string | null;
  category?: string | null;
  vendor?: string | null;
  pricing_data?: any;
};

type ComparisonState = {
  products: ComparisonProduct[];
};

type ComparisonAPI = {
  products: ComparisonProduct[];
  count: number;
  add: (product: ComparisonProduct) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isInComparison: (productId: string) => boolean;
  canAddMore: boolean;
};

const LS_KEY = "ppp:comparison";
const MAX_PRODUCTS = 4;

const ComparisonCtx = createContext<ComparisonAPI | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComparisonState>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { products: [] };
    } catch {
      return { products: [] };
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const count = state.products.length;
  const canAddMore = count < MAX_PRODUCTS;

  function add(product: ComparisonProduct) {
    setState((s) => {
      // Check if already exists
      if (s.products.some((p) => p.id === product.id)) {
        return s;
      }
      // Check max limit
      if (s.products.length >= MAX_PRODUCTS) {
        return s;
      }
      return { products: [...s.products, product] };
    });
  }

  function remove(productId: string) {
    setState((s) => ({
      products: s.products.filter((p) => p.id !== productId),
    }));
  }

  function clear() {
    setState({ products: [] });
  }

  function isInComparison(productId: string): boolean {
    return state.products.some((p) => p.id === productId);
  }

  const api: ComparisonAPI = {
    products: state.products,
    count,
    add,
    remove,
    clear,
    isInComparison,
    canAddMore,
  };

  return <ComparisonCtx.Provider value={api}>{children}</ComparisonCtx.Provider>;
}

export function useComparison() {
  const ctx = useContext(ComparisonCtx);
  if (!ctx) throw new Error("useComparison must be used inside <ComparisonProvider>");
  return ctx;
}
