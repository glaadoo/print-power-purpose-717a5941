import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { priceFromBase } from "../lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const { cause } = useCause();
  const { push } = useToast();

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setProduct(data));
  }, [id]);

  async function buy() {
    if (!cause) { 
      push({ title: "Pick a cause first", body: "Kenzie can help you choose." }); 
      window.location.href = "/kenzie"; 
      return; 
    }
    
    setLoading(true);
    
    // This will call the Stripe edge function (to be created)
    const res = await fetch('/api/checkout/session', {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: id, qty, causeId: cause.id })
    });
    
    const data = await res.json();
    setLoading(false);
    
    if (data.url) {
      window.location.href = data.url;
    } else {
      push({ title: "Checkout error", body: data.error || "Please try again." });
    }
  }

  if (!product) return <main className="p-6 text-foreground">Loading…</main>;
  
  const unit = priceFromBase(product.base_cost_cents);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Est. price: ${(unit / 100).toFixed(2)}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button 
          onClick={() => setQty(q => Math.max(1, q - 1))} 
          className="w-8 h-8 border border-border rounded bg-card hover:bg-secondary"
        >
          -
        </button>
        <input 
          value={qty} 
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} 
          className="w-14 text-center border border-border rounded py-1 bg-card" 
          aria-label="Quantity" 
        />
        <button 
          onClick={() => setQty(q => q + 1)} 
          className="w-8 h-8 border border-border rounded bg-card hover:bg-secondary"
        >
          +
        </button>
      </div>

      <button 
        onClick={buy} 
        disabled={loading} 
        className="mt-6 w-full rounded bg-primary text-primary-foreground py-2 disabled:opacity-60 hover:opacity-90 focus:ring-2 focus:ring-ring transition-opacity"
      >
        {loading ? "Starting checkout…" : "Buy Now (Stripe Test)"}
      </button>
    </main>
  );
}
