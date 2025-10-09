import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useCart } from "@/context/CartContext";
import { useCause } from "../context/CauseContext";

export default function Success() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  // Guard hooks to avoid runtime crashes if providers are missing
  let clearCart: () => void = () => {};
  let causeName: string | undefined;
  try {
    clearCart = useCart().clear;
  } catch {}
  try {
    const c = useCause().cause as any;
    causeName = c?.name;
  } catch {}
  const navigate = useNavigate();

  useEffect(() => {
    // Clear cart & any pending checkout selection so badges/state reset immediately.
    clearCart();
    try {
      localStorage.removeItem("ppp:cart");
      localStorage.removeItem("ppp:checkout");
    } catch {}
  }, [clearCart]);

  return (
    <Layout title="Success">
      <GlassCard className="w-full max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Payment successful</h1>
        <p className="text-gray-800">
          {causeName ? `Thanks for helping ${causeName}!` : "Thank you for your support."}
        </p>

        {sessionId && (
          <p className="mt-3 text-sm text-gray-500">Session ID: {sessionId}</p>
        )}

        <p className="mt-4 text-sm text-gray-600">What would you like to do next?</p>

        <div className="mt-6 flex gap-3 justify-center">
          <button className="btn-rect" onClick={() => window.location.assign("/")}>Back to Home</button>
          <button className="btn-rect" onClick={() => window.location.assign("/products")}>Continue shopping</button>
          <button className="btn-rect" onClick={() => window.location.assign("/causes")}>Choose another cause</button>
        </div>
      </GlassCard>
    </Layout>
  );
}
