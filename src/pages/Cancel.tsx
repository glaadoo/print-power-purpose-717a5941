import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";

export default function Cancel() {
  return (
    <Layout title="Payment cancelled">
      <GlassCard className="text-center">
        <h1 className="text-2xl font-bold">Payment cancelled</h1>
        <p className="mt-2 text-gray-800">
          No charge was made. You can pick another product or try again.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="/products" className="px-4 py-2 rounded bg-black text-white focus:ring-2">
            Back to products
          </a>
          <a href="/kenzie" className="px-4 py-2 rounded border border-white/40 bg-white/20 backdrop-blur focus:ring-2">
            Choose a cause
          </a>
        </div>
      </GlassCard>
    </Layout>
  );
}
