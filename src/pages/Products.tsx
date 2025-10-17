// src/pages/Products.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import VideoBackground from "@/components/VideoBackground";

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
    document.title = "Products - Print Power Purpose";
    
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
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen py-8">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full px-4">
            <h2 className="text-3xl font-serif font-semibold text-center mb-8">
              Products
            </h2>

            {loading && <p className="text-center">Loading products…</p>}
            {err && (
              <div className="border border-red-400/50 bg-red-900/30 text-white p-4 rounded-xl max-w-2xl mx-auto">
                {err}
              </div>
            )}

            {!loading && !err && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {rows.map((p) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    className="aspect-square flex flex-col items-center justify-center rounded-xl bg-white/90 text-black text-center font-semibold hover:bg-white transition-colors p-4"
                  >
                    <span className="text-lg mb-2">{p.name}</span>
                    <span className="text-sm">${(p.base_cost_cents / 100).toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
