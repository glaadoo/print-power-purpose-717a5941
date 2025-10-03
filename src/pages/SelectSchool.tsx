import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useNavigate } from "react-router-dom";

const SCHOOLS = [
  "Lincoln High School",
  "Roosevelt STEM Academy",
  "Westview Senior Class",
  "Hillside Elementary PTA",
];

export default function SelectSchool() {
  const nav = useNavigate();

  function choose(name: string) {
    // Persist selected cause for later pages (Products, banner, etc.)
    localStorage.setItem(
      "selectedCause",
      JSON.stringify({ type: "school", name })
    );
    nav("/products"); // go to catalog
  }

  return (
    <Layout title="Choose your school">
      <GlassCard className="w-full max-w-3xl mx-auto">
        <h2 className="text-2xl font-extrabold text-center mb-6 text-white drop-shadow-lg">
          Choose your school
        </h2>

        <div className="flex flex-col gap-3">
          {SCHOOLS.map((s) => (
            <button
              key={s}
              onClick={() => choose(s)}
              className="btn-rect text-lg font-bold"
            >
              {s}
            </button>
          ))}
        </div>
      </GlassCard>
    </Layout>
  );
}
