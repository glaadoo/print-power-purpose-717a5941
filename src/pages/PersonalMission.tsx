import { useCause } from "../context/CauseContext";
import { useState, useEffect } from "react";
import VideoBackground from "@/components/VideoBackground";

export default function PersonalMission() {
  const { setCause } = useCause();
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    document.title = "Personal Mission - Print Power Purpose";
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    window.location.href = "/causes";
  }

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-3xl mx-auto">
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8">
              <h2 className="text-3xl font-serif font-semibold text-center mb-8">
                Tell Us About Your Mission
              </h2>

              <form onSubmit={submit} className="space-y-6">
                <div>
                  <label className="text-sm opacity-90 block mb-2">Mission Title *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl bg-white/90 text-black px-3 py-2 outline-none focus:ring-2 focus:ring-white/40"
                    placeholder="e.g., Fundraiser for robotics team"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm opacity-90 block mb-2">Short Description (optional)</label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl bg-white/90 text-black px-3 py-2 outline-none focus:ring-2 focus:ring-white/40"
                    placeholder="What are you printing and why?"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    className="rounded-full px-8 py-3 bg-white text-black font-semibold hover:bg-white/90"
                  >
                    Continue to Products
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
