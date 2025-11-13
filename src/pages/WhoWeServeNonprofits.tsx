import VideoBackground from "@/components/VideoBackground";
import KenzieBadge from "@/components/KenzieBadge";

export default function WhoWeServeNonprofits() {
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
            <h1 className="text-5xl font-bold text-white mb-4">Nonprofits & Clubs</h1>
            <p className="text-xl text-white/90 mb-12">Printing with purpose for your mission.</p>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Overview</h2>
              <p className="text-white/80">
                Transform supporter printing into meaningful donations for your cause. Every time someone prints 
                products supporting your nonprofit, funds automatically flow to your mission. Watch your donation 
                barometer grow as your community prints with purpose—no technical setup required.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Who We Serve</h2>
              <ul className="text-white/80 space-y-2">
                <li>501(c)(3) nonprofits</li>
                <li>Community clubs</li>
                <li>Youth organizations</li>
                <li>Faith-based groups</li>
                <li>Environmental & advocacy groups</li>
                <li>Alumni associations</li>
                <li>Animal shelters & rescues</li>
                <li>Cultural & arts organizations</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How Nonprofits Benefit</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">Automatic Donations</h3>
                  <p className="text-white/70">
                    Earn donations with every supporter purchase—no manual processing needed.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">Clear Progress Tracking</h3>
                  <p className="text-white/70">
                    Visual barometer shows real-time fundraising progress to motivate supporters.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">Easy Discovery</h3>
                  <p className="text-white/70">
                    Supporters find you via curated lists or IRS-verified search.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">Fast Selection</h3>
                  <p className="text-white/70">
                    Transparent, secure nonprofit selection process builds trust.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Popular Products</h2>
              <p className="text-white/80 mb-4">
                Support your outreach events and campaigns with professional printing:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">🏴</span>
                  <span className="text-white font-medium">Banners</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">📄</span>
                  <span className="text-white font-medium">Posters</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">✨</span>
                  <span className="text-white font-medium">Stickers</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">📋</span>
                  <span className="text-white font-medium">Flyers</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">👕</span>
                  <span className="text-white font-medium">Apparel</span>
                </div>
                <div className="bg-white/5 p-4 rounded-lg text-center">
                  <span className="text-2xl mb-2 block">🎁</span>
                  <span className="text-white font-medium">Promo Items</span>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Real-World Use Cases</h2>
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">🐾 Animal Rescue Fundraising</h3>
                  <p className="text-white/70">
                    Print adoption event posters and banners while raising funds for shelter operations.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">⛪ Faith-Based Outreach</h3>
                  <p className="text-white/70">
                    Create event flyers and community materials that fund ministry programs.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-white mb-2">📢 Advocacy Campaigns</h3>
                  <p className="text-white/70">
                    Produce campaign materials while building financial support for your cause.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How Supporters Select Your Nonprofit</h2>
              <div className="bg-white/5 p-6 rounded-xl space-y-4">
                <p className="text-white/80">
                  <strong>Step 1:</strong> Supporters choose your nonprofit from our curated list or search the IRS-verified database.
                </p>
                <p className="text-white/80">
                  <strong>Step 2:</strong> If selecting from IRS search, new entries show "Pending approval" status during verification.
                </p>
                <p className="text-white/80">
                  <strong>Step 3:</strong> Your nonprofit appears on the donation barometer, product pages, and throughout checkout.
                </p>
                <p className="text-white/80">
                  <strong>Step 4:</strong> Track donations in real-time as supporters print with purpose.
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
