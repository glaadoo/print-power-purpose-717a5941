import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { priceFromBase } from "../lib/utils";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const { cause } = useCause();
  const { push } = useToast();

  useEffect(()=>{
    fetch("/api/catalog/products").then(r=>r.json()).then(d=>{
      setProduct((d.products||[]).find((p:any)=>p.id===id));
    });
  },[id]);

  async function buy() {
    if (!cause) { push({title:"Pick a cause first", body:"Choose a cause in Kenzie."}); window.location.href="/kenzie"; return; }
    setLoading(true);
    const res = await fetch("/api/checkout/session", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ productId: id, qty, causeId: cause.id })
    });
    const data = await res.json();
    setLoading(false);
    if (data.url) window.location.href = data.url;
    else push({title:"Checkout error", body:data.error || "Please try again."});
  }

  if (!product) return <Layout title="Product"><GlassCard>Loading…</GlassCard></Layout>;
  const unit = priceFromBase(product.base_cost_cents);

  return (
    <Layout title="Product">
      <GlassCard>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-sm text-gray-800 mt-1">Est. price: ${(unit/100).toFixed(2)}</p>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-9 h-9 border border-white/40 bg-white/20 rounded hover:bg-white/30">-</button>
          <input value={qty} onChange={e=>setQty(Math.max(1, parseInt(e.target.value)||1))}
                 className="w-16 text-center border border-white/40 rounded py-2 bg-white/20 backdrop-blur" aria-label="Quantity" />
          <button onClick={()=>setQty(q=>q+1)} className="w-9 h-9 border border-white/40 bg-white/20 rounded hover:bg-white/30">+</button>
        </div>

        <button onClick={buy} disabled={loading}
                className="mt-6 w-full rounded bg-black text-white py-2 disabled:opacity-60 focus:ring-2">
          {loading ? "Starting checkout…" : "Buy Now (Stripe Test)"}
        </button>
      </GlassCard>
    </Layout>
  );
}
