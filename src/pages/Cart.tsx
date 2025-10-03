import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { getCart, updateCartItem, removeCartItem, clearCart } from "../lib/cart";
import { useNavigate } from "react-router-dom";

type CartRow = {
  id: string;
  qty: number;
  product_id: string;
  products: { name: string; base_cost_cents: number } | null;
};

export default function Cart() {
  const nav = useNavigate();
  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = (await getCart()) as CartRow[];
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (it.products?.base_cost_cents ?? 0) * it.qty * 1.6, // same 1.6x preview logic
        0
      ),
    [items]
  );

  async function changeQty(id: string, qty: number) {
    await updateCartItem(id, Math.max(1, qty));
    await load();
  }

  async function remove(id: string) {
    await removeCartItem(id);
    await load();
  }

  async function checkoutFirst() {
    const first = items[0];
    if (!first || !first.products) return;
    nav("/checkout", { state: { productId: first.product_id, qty: first.qty } });
  }

  return (
    <Layout title="Your Cart">
      <GlassCard className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6">🧺 Your Cart</h1>

        {loading ? (
          <p className="text-center">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center">
            <p className="mb-4">Your cart is empty.</p>
            <a href="/products" className="btn-rect px-4 py-2 font-bold text-white bg-black/70 hover:bg-black">
              Browse Products
            </a>
          </div>
        ) : (
          <>
            <ul className="space-y-3 mb-6">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-3 border border-white/40 bg-white/30 px-3 py-2"
                >
                  <div className="font-bold">
                    {it.products?.name ?? "Item"} — $
                    {(((it.products?.base_cost_cents ?? 0) * 1.6) / 100).toFixed(2)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="btn-rect px-2 h-8"
                      onClick={() => changeQty(it.id, it.qty - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => changeQty(it.id, Number(e.target.value))}
                      className="w-14 text-center border"
                    />
                    <button
                      className="btn-rect px-2 h-8"
                      onClick={() => changeQty(it.id, it.qty + 1)}
                    >
                      +
                    </button>
                    <button className="btn-rect px-3 h-8" onClick={() => remove(it.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between font-bold mb-4">
              <span>Total (preview)</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={checkoutFirst}
                className="btn-rect flex-1 h-12 font-bold bg-green-600/90 hover:bg-green-600 text-white"
              >
                Checkout First Item →
              </button>
              <button
                onClick={async () => {
                  await clearCart();
                  await load();
                }}
                className="btn-rect h-12 px-4"
              >
                Clear Cart
              </button>
            </div>
            <p className="text-xs mt-3 text-white/80">
              Week-1 MVP: checkout processes one item at a time. (Multi-item checkout arrives in
              Week-2 using a server function that builds a Stripe session from all cart rows.)
            </p>
          </>
        )}
      </GlassCard>
    </Layout>
  );
}
