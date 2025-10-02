import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useCause } from "../context/CauseContext";
import { useState } from "react";

export default function PersonalMission() {
  const { setCause } = useCause();
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCause({ id: "personal-mission", name: title.trim(), summary: about.trim() || "Personal mission" });
    window.location.href = "/products";
  }

  return (
    <Layout title="Personal Mission">
      <GlassCard>
        <h1 className="text-2xl font-bold mb-4">Tell us about your mission</h1>
        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Mission title</span>
            <input
              value={title}
              onChange={(e)=>setTitle(e.target.value)}
              className="rounded-md border border-white/40 bg-white/20 backdrop-blur px-3 py-2 focus:ring-2"
              placeholder="e.g., Fundraiser for robotics team"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Short description (optional)</span>
            <textarea
              value={about}
              onChange={(e)=>setAbout(e.target.value)}
              rows={4}
              className="rounded-md border border-white/40 bg-white/20 backdrop-blur px-3 py-2 focus:ring-2"
              placeholder="What are you printing and why?"
            />
          </label>
          <button type="submit" className="mt-2 w-full rounded bg-black text-white py-2 focus:ring-2">
            Continue to products
          </button>
        </form>
      </GlassCard>
    </Layout>
  );
}
