import { useEffect, useState } from "react";
import SelectedCauseBanner from "../components/SelectedCauseBanner";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";

type Product = { id:string; name:string; base_cost_cents:number };

export default function Products() {
  const [items, setItems] = useState<Product[]|null>(null);
  useEffect(()=>{ fetch("/api/catalog/products").then(r=>r.json()).then(d=>setItems(d.products||[])); },[]);

  return (
    <Layout title="Products" centered={false}>
      <div className="grid place-items-center">
        <div className="w-full max-w-5xl">
          <GlassCard>
            <SelectedCauseBanner />
            <h1 className="text-2xl font-bold mb-4">Products</h1>

            {!items && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({length:6}).map((_,i)=><div key={i} className="h-28 rounded bg-white/40 animate-pulse" />)}
            </div>}

            {items && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(p=>(
                  <a key={p.id} href={`/products/${p.id}`} className="glass card-padding block hover:shadow-lg focus:ring-2">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-800">Base: ${(p.base_cost_cents/100).toFixed(2)}</div>
                  </a>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
}
