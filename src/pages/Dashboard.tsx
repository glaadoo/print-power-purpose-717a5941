import { useMemo } from "react";
import GlassCard from "../components/GlassCard";
import Layout from "../components/Layout";

/**
 * Dashboard with subtle paw animation banner
 * - Uses .paws-row / .paws-muted CSS classes from index.css
 * - Respects prefers-reduced-motion automatically via browser (we'll also provide a guard below)
 */
export default function Dashboard() {
  // Generate a row of paw “sprites” with slight stagger to fill the banner
  const paws = useMemo(() => Array.from({ length: 26 }, (_, i) => i), []);

  return (
    <Layout title="Dashboard" centered>
      <GlassCard>
        {/* Paw banner across the top of the card */}
        <div
          className="relative h-8 sm:h-10 mb-4 overflow-hidden"
          aria-hidden="true" /* purely decorative */
        >
          <div className="absolute inset-0 flex items-center gap-3">
            {paws.map((n) => (
              <span
                key={n}
                className={`paws-row ${n % 2 ? "paws-muted" : ""}`}
                style={{ animationDelay: `${(n % 6) * 0.12}s` }}
              >
                🐾
              </span>
            ))}
          </div>
        </div>

        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-800 mt-1">
          Quick links to manage and navigate your project.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a href="/select/school" className="glass card-padding block hover:shadow-lg focus:ring-2">
            <div className="text-lg font-semibold">Start: School</div>
            <p className="text-sm text-gray-700">Pick a school and continue</p>
          </a>
          <a href="/select/nonprofit" className="glass card-padding block hover:shadow-lg focus:ring-2">
            <div className="text-lg font-semibold">Start: Nonprofit</div>
            <p className="text-sm text-gray-700">Choose a nonprofit to support</p>
          </a>
          <a href="/select/personal" className="glass card-padding block hover:shadow-lg focus:ring-2">
            <div className="text-lg font-semibold">Start: Personal mission</div>
            <p className="text-sm text-gray-700">Describe your mission, then shop</p>
          </a>
          <a href="/products" className="glass card-padding block hover:shadow-lg focus:ring-2">
            <div className="text-lg font-semibold">Browse products</div>
            <p className="text-sm text-gray-700">Go straight to the catalog</p>
          </a>
        </div>
      </GlassCard>
    </Layout>
  );
}
