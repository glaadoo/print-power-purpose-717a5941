import { useEffect, useState } from "react";
import SelectedCauseBanner from "../components/SelectedCauseBanner";
import { supabase } from "@/integrations/supabase/client";

type Product = { 
  id: string; 
  name: string; 
  base_cost_cents: number 
};

export default function Products() {
  const [items, setItems] = useState<Product[] | null>(null);
  
  useEffect(() => { 
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data || []));
  }, []);
  
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <SelectedCauseBanner />
      <h1 className="text-2xl font-bold mb-4 text-foreground">Products</h1>
      
      {!items && (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded bg-muted animate-pulse" />
          ))}
        </div>
      )}
      
      {items && (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map(p => (
            <a 
              key={p.id} 
              href={`/products/${p.id}`} 
              className="border border-border rounded p-4 bg-card hover:shadow focus:ring-2 focus:ring-ring transition-shadow"
            >
              <div className="font-medium text-foreground">{p.name}</div>
              <div className="text-sm text-muted-foreground">
                Base: ${(p.base_cost_cents / 100).toFixed(2)}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
