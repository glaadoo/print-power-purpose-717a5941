import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { Link } from "react-router-dom";

export default function Cancel() {
  return (
    <Layout title="Payment cancelled">
      <GlassCard className="text-center">
        <h1 className="text-2xl font-bold mb-2">Payment cancelled</h1>
        <p className="text-gray-800">
          No charge was made. You can try again or choose a different product.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/checkout"
            className="btn-rect bg-green-600/90 hover:bg-green-600 text-white"
          >
            Try again
          </Link>

          <Link
            to="/products"
            className="btn-rect border border-white/40 bg-white/20 backdrop-blur hover:bg-white/30"
          >
            Back to products
          </Link>

          <Link
            to="/kenzie"
            className="btn-rect border border-white/40 bg-white/20 backdrop-blur hover:bg-white/30"
          >
            Choose a cause
          </Link>
        </div>
      </GlassCard>
    </Layout>
  );
}

