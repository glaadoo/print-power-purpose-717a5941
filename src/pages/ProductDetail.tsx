// src/pages/ProductDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import Layout from "../components/Layout";
import { supabase } from "@/integrations/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  base_cost_cents: number;
  description?: string | null;
};

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Fetch product by ID from Supabase
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) setErr(error.message);
      else setProduct(data as ProductRow);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <Layout title="Product">
        <GlassCard>
          <p className="text-center">Loading product…</p>
        </GlassCard>
      </Layout>
    );
  }

  if (err || !product) {
    return (
      <Layout title="Product">
        <GlassCard>
          <p className="text-center text-red-600">
            {err || "Product not found"}
          </p>
        </GlassCard>
      </Layout>
    );
  }

  const price = product.base_cost_cents / 100;

  return (
    <Layout title={product.name}>
      <GlassCard className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4">{product.name}</h1>
        <p className="text-center mb-4">Price: ${price.toFixed(2)}</p>

        <div className="flex flex-col gap-3 items-center">
          <label className="font-bold">Quantity</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="border px-3 py-2 w-24 text-center"
          />

          <button
            onClick={() => alert(`Added ${qty} ${product.name}(s) to cart`)}
            className="btn-rect px-4 py-2 font-bold text-white bg-green-600 hover:bg-green-700"
          >
            Add to Cart
          </button>

          <button
            onClick={() => nav("/checkout", { state: { productId: product.id, qty } })}
            className="btn-rect px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            Checkout
          </button>
        </div>
      </GlassCard>
    </Layout>
  );
}
