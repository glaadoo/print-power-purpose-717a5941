// src/pages/Products.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import Layout from "../components/Layout";
// Prefer alias if configured; otherwise use relative path:
// import { supabase } from "../integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  base_cost_cents: number;
  image_url?: string | null;
};

export default function Products() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setErr(error.message);
      else setRows((data as ProductRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    // Layout centers the content like an "island" and shows the header on non-home routes
    <Layout title="Products" /* header is shown by default on non-home pages */>
      <GlassCard className="w-full max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Products</h1>

        {loading && <p className="text-center">Loading products…</p>}
        {err && (
          <div className="border border-red-400 bg-red-50/70 text-red-900 p-3">
            {err}
          </div>
        )}

        {!loading && !err && (
          <div className="grid gap-4">
            {rows.map((p) => (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                className="block px-4 py-3 border border-white/30 bg-white/40 text-center 
                           font-bold text-black hover:bg-white/60 transition"
              >
                {p.name} — ${(p.base_cost_cents / 100).toFixed(2)}
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </Layout>
  );
}
