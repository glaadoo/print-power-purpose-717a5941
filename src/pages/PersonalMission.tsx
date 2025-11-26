import { useCause } from "../context/CauseContext";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function PersonalMission() {
  const { setCause } = useCause();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    document.title = "Personal Mission - Print Power Purpose";
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    navigate("/causes");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center bg-white border-b border-gray-200">
        <Link
          to="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </Link>
      </header>

      {/* Content */}
      <div className="py-12 px-4">
        <section className="min-h-screen flex items-center justify-center">
          <div className="w-full max-w-3xl mx-auto">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-lg p-6 md:p-8">
              <h2 className="text-3xl font-serif font-semibold text-center mb-8 text-blue-600">
                Tell Us About Your Mission
              </h2>

              <form onSubmit={submit} className="space-y-6">
                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">Mission Title *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl bg-white border border-gray-300 text-gray-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Fundraiser for robotics team"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">Short Description (optional)</label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl bg-white border border-gray-300 text-gray-900 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What are you printing and why?"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    className="rounded-full px-8 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
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
