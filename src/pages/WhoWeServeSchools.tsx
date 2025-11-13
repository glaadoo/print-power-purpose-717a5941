import VideoBackground from "@/components/VideoBackground";
import KenzieBadge from "@/components/KenzieBadge";

export default function WhoWeServeSchools() {
  return (
    <div className="relative min-h-screen">
      <VideoBackground 
        srcMp4="/video/hero-background.mp4"
        parallaxVh={0}
      />
      <div className="fixed inset-0 bg-black/50 z-0" />

      <div className="relative z-10 min-h-screen max-w-5xl mx-auto">
        <div className="min-h-screen bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-y-auto px-6 md:px-10 pt-32 pb-32 relative">
          
          <article className="prose prose-invert max-w-none">
            <h1 className="text-5xl font-bold text-white mb-4">Schools & Teams</h1>
            <p className="text-xl text-white/90 mb-12">Purposeful printing for students, teachers, and athletes.</p>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Overview</h2>
              <p className="text-white/80">
                Turn everyday printing into meaningful support for your school or team. When supporters print what 
                they need, funds automatically flow to your cause. Parents, students, and alumni contribute 
                effortlessly—no fundraising pressure, just purposeful printing that makes a difference.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Who We Serve</h2>
              <ul className="text-white/80 space-y-2">
                <li>K–12 schools</li>
                <li>Colleges & universities</li>
                <li>PTA/PTO groups</li>
                <li>Student clubs & academic teams</li>
                <li>Sports teams (all levels)</li>
                <li>Arts & theater programs</li>
                <li>Band & music programs</li>
                <li>STEM clubs & robotics teams</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How Schools Benefit</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">Fund Essential Needs</h3>
                  <p className="text-white/70">
                    Support uniforms, travel expenses, classroom supplies, and equipment.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">Track Progress Together</h3>
                  <p className="text-white/70">
                    Visual barometer motivates the community by showing real-time fundraising impact.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">Easy for Families</h3>
                  <p className="text-white/70">
                    Parents and supporters contribute naturally while getting needed printing services.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">No Upfront Costs</h3>
                  <p className="text-white/70">
                    Zero setup fees or technical requirements—start fundraising immediately.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Popular Products</h2>
              <p className="text-white/80 mb-4">
                Everything schools and teams need for events, games, and daily activities:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">🏴</span>
                  <span className="text-white font-medium">Banners & Posters</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">📋</span>
                  <span className="text-white font-medium">Event Flyers</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">✨</span>
                  <span className="text-white font-medium">Stickers</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">🎓</span>
                  <span className="text-white font-medium">Senior Night Posters</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">👕</span>
                  <span className="text-white font-medium">Team Apparel</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">📚</span>
                  <span className="text-white font-medium">School Essentials</span>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Real-World Examples</h2>
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">🏀 Sports Teams Raising for Equipment</h3>
                  <p className="text-white/70">
                    Print game day banners and team posters while funding new uniforms and travel expenses.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">📚 PTA Supporting Teachers</h3>
                  <p className="text-white/70">
                    Create event materials and school communications that fund classroom supplies.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">🔬 Academic Clubs Promoting Events</h3>
                  <p className="text-white/70">
                    Design competition posters and promotional materials while building program funding.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How Supporters Select Your School or Team</h2>
              <div className="bg-white/5 p-6 rounded-xl space-y-4">
                <p className="text-white/80">
                  <strong>Step 1:</strong> Supporters choose your school or team from our curated list or IRS-verified search.
                </p>
                <p className="text-white/80">
                  <strong>Step 2:</strong> Your organization appears prominently throughout their shopping experience.
                </p>
                <p className="text-white/80">
                  <strong>Step 3:</strong> Supporters see your donation barometer and fundraising progress at checkout.
                </p>
                <p className="text-white/80">
                  <strong>Step 4:</strong> Watch your barometer grow as the community prints with purpose.
                </p>
              </div>
            </section>

          </article>

          <KenzieBadge />

        </div>
      </div>
    </div>
  );
}
