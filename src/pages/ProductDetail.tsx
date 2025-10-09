import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import Layout from "../components/Layout";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  currency?: string | null;          // e.g., "USD"
  priceCents?: number | null;        // optional final price
  base_cost_cents: number;           // used to derive price if priceCents missing
};

const priceFromBase = (base?: number | null) =>
  Math.max(100, Math.round((Number(base) || 0) * 1.6)); // same preview calc used elsewhere

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add } = useCart();

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

  const unitCents =
    Number(product.priceCents || 0) > 0
      ? Number(product.priceCents)
      : priceFromBase(product.base_cost_cents);

  const unitPrice = unitCents / 100;

  function handleAddToCart() {
    add(
      {
        id: product.id,
        name: product.name,
        priceCents: unitCents,
        imageUrl: product.imageUrl,
        currency: product.currency || "USD",
      },
      Math.max(1, Number(qty))
    );
  }

  return (
    <Layout title={product.name}>
      <GlassCard className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4">{product.name}</h1>
        <p className="text-center mb-2">Price: ${unitPrice.toFixed(2)}</p>
        {product.description && (
          <p className="text-center text-white/90 mb-4">{product.description}</p>
        )}

        <div className="flex flex-col gap-3 items-center">
          <label className="font-bold">Quantity</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
            className="input-rect bg-white/30 text-black w-24 text-center"
          />

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={handleAddToCart}
              className="btn-rect flex-1 font-bold bg-green-600/90 hover:bg-green-600 text-white"
            >
              Add to cart
            </button>

            <button
              onClick={() =>
                nav("/checkout", { state: { productId: product.id, qty } })
              }
              className="btn-rect flex-1 font-bold bg-blue-600/90 hover:bg-blue-600 text-white"
            >
              Checkout
            </button>
          </div>

          <button
            onClick={() => nav("/products")}
            className="btn-rect mt-2 opacity-90"
          >
            ← Back to products
          </button>
        </div>
      </GlassCard>
    </Layout>
  );
}
