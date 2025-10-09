import { useMemo } from "react";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const { items, totalCents, setQty, remove, clear } = useCart();
  const nav = useNavigate();

  const hasItems = items.length > 0;

  // Optional: compute per-line totals if you want to display them later
  const detailed = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        lineCents: it.priceCents * it.quantity,
      })),
    [items]
  );

  return (
    <Layout title="Cart">
      <GlassCard className="w-full max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2">Your Cart</h1>

        {!hasItems ? (
          <div className="text-center py-8">
            <p className="opacity-80 mb-4">Your cart is empty.</p>
            <button className="btn-rect" onClick={() => nav("/products")}>
              Browse products
            </button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-white/30 mb-4">
              {detailed.map((it) => (
                <li key={it.id} className="py-3 flex items-center gap-3">
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className="w-12 h-12 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-white/20 grid place-items-center text-xs tracking-wide">
                      NO IMG
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{it.name}</div>
                    <div className="text-sm opacity-80">
                      ${(it.priceCents / 100).toFixed(2)} each
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="btn-rect px-2 h-9"
                      onClick={() => setQty(it.id, Math.max(1, it.quantity - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => setQty(it.id, Number(e.target.value || 1))}
                      className="w-16 input-rect bg-white/30 text-black text-center h-9"
                    />

                    <button
                      className="btn-rect px-2 h-9"
                      onClick={() => setQty(it.id, it.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>

                    <button className="btn-rect h-9" onClick={() => remove(it.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-center mb-4">
              <button className="btn-rect opacity-80" onClick={clear}>
                Clear cart
              </button>
              <div className="text-right">
                <div className="opacity-80 text-sm">Subtotal</div>
                <div className="text-xl font-extrabold">
                  ${(totalCents / 100).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="btn-rect flex-1"
                onClick={() => nav("/products")}
              >
                Continue shopping
              </button>
              <button
                className="btn-rect flex-1 bg-green-600/90 hover:bg-green-600 text-white font-bold"
                onClick={() => nav("/checkout", { state: inferCheckoutState(items) })}
              >
                Continue to checkout →
              </button>
            </div>
          </>
        )}
      </GlassCard>
    </Layout>
  );
}

// If you add one product type at a time, infer a default checkout state
function inferCheckoutState(items: ReturnType<typeof useCart>["items"]) {
  if (!items.length) return {};
  const first = items[0];
  return {
    productId: first.id,
    qty: first.quantity,
    // causeId is selected elsewhere (e.g., on the causes page or from localStorage)
  };
}
