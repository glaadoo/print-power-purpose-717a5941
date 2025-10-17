import { useMemo, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";

export default function Cart() {
  const { items, totalCents, setQty, remove, clear } = useCart();
  const nav = useNavigate();

  useEffect(() => {
    document.title = "Cart - Print Power Purpose";
  }, []);

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
            <h2 className="text-3xl font-serif font-semibold text-center mb-8">Your Cart</h2>

            {!hasItems ? (
              <div className="max-w-2xl mx-auto rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-8 text-center">
                <p className="opacity-90 mb-6">Your cart is empty.</p>
                <button 
                  className="rounded-full px-8 py-3 bg-white text-black font-semibold hover:bg-white/90"
                  onClick={() => nav("/products")}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8">
                <ul className="divide-y divide-white/20 mb-6">
                  {detailed.map((it) => (
                    <li key={it.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white/20 grid place-items-center text-xs">
                          NO IMG
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg">{it.name}</div>
                        <div className="text-sm opacity-80">
                          ${(it.priceCents / 100).toFixed(2)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
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
                          className="w-16 h-8 rounded-lg bg-white/90 text-black text-center outline-none"
                        />

                        <button
                          className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
                          onClick={() => setQty(it.id, it.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>

                        <button 
                          className="ml-2 px-4 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold"
                          onClick={() => remove(it.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-white/20 gap-4">
                  <button 
                    className="px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold"
                    onClick={clear}
                  >
                    Clear Cart
                  </button>
                  <div className="text-right">
                    <div className="opacity-80 text-sm">Subtotal</div>
                    <div className="text-2xl font-bold">
                      ${(totalCents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    className="flex-1 rounded-full px-6 py-3 bg-white/20 hover:bg-white/30 font-semibold"
                    onClick={() => nav("/products")}
                  >
                    Continue Shopping
                  </button>
                  <button
                    className="flex-1 rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90"
                    onClick={() => nav("/checkout", { state: inferCheckoutState(items) })}
                  >
                    Checkout →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
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
