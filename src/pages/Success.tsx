import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useCause } from "../context/CauseContext";

export default function Success() {
  const { cause } = useCause();

  return (
    <Layout title="Success">
      <GlassCard className="text-center">
        <h1 className="text-2xl font-bold">Payment successful</h1>
        <p className="mt-2 text-gray-800">
          {cause ? `Thanks for helping ${cause.name}!` : "Thanks for your support!"}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="/products" className="px-4 py-2 rounded bg-black text-white focus:ring-2">
            Back to products
          </a>
          <a href="/causes" className="px-4 py-2 rounded border border-white/40 bg-white/20 backdrop-blur focus:ring-2">
            See more causes
          </a>
        </div>
      </GlassCard>
    </Layout>
  );
}
