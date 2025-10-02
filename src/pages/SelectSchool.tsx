import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useCause } from "../context/CauseContext";

const SCHOOLS = [
  "Lincoln High School",
  "Roosevelt STEM Academy",
  "Westview Senior Class",
  "Hillside Elementary PTA",
];

export default function SelectSchool() {
  const { setCause } = useCause();

  function choose(name: string) {
    setCause({ id: "school-custom", name, summary: "School printing project" });
    window.location.href = "/products";
  }

  return (
    <Layout title="Choose a School">
      <GlassCard>
        <h1 className="text-2xl font-bold mb-4">Choose your school</h1>
        <div className="grid gap-3">
          {SCHOOLS.map((s) => (
            <button
              key={s}
              onClick={() => choose(s)}
              className="w-full text-left glass card-padding hover:shadow-lg focus:ring-2"
            >
              {s}
            </button>
          ))}
        </div>
      </GlassCard>
    </Layout>
  );
}