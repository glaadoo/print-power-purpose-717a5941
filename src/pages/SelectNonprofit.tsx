import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useNavigate } from "react-router-dom";

const NONPROFITS = [
  "Red Cross Local Chapter",
  "Community Food Bank",
  "Neighborhood Animal Rescue",
  "Green Earth Society",
];

export default function SelectNonprofit() {
  const nav = useNavigate();

  function choose(name: string) {
    localStorage.setItem(
      "selectedCause",
      JSON.stringify({ type: "nonprofit", name })
    );
    nav("/products");
  }

  return (
    <Layout title="Choose your nonprofit">
      <GlassCard className="w-full max-w-3xl mx-auto">
        <h2 className="text-2xl font-extrabold text-center mb-6 text-white drop-shadow-lg">
          Choose your nonprofit
        </h2>

        <div className="flex flex-col gap-3">
          {NONPROFITS.map((n) => (
            <button
              key={n}
              onClick={() => choose(n)}
              className="btn-rect text-lg font-bold"
            >
              {n}
            </button>
          ))}
        </div>
      </GlassCard>
    </Layout>
  );
}
