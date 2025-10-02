import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useCause } from "../context/CauseContext";

const NONPROFITS = [
  "Neighborhood Library Friends",
  "Community Soccer Club",
  "River Cleanup Alliance",
  "Meals & Smiles Outreach",
];

export default function SelectNonprofit() {
  const { setCause } = useCause();

  function choose(name: string) {
    setCause({ id: "nonprofit-custom", name, summary: "Nonprofit printing project" });
    window.location.href = "/products";
  }

  return (
    <Layout title="Choose a Nonprofit">
      <GlassCard>
        <h1 className="text-2xl font-bold mb-4">Choose your nonprofit</h1>
        <div className="grid gap-3">
          {NONPROFITS.map((n) => (
            <button
              key={n}
              onClick={() => choose(n)}
              className="w-full text-left glass card-padding hover:shadow-lg focus:ring-2"
            >
              {n}
            </button>
          ))}
        </div>
      </GlassCard>
    </Layout>
  );
}
