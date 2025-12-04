import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VistaprintNav from "@/components/VistaprintNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function About() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "About | Print Power Purpose";
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VistaprintNav />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white border-b border-gray-200 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Why Donors Trust Messy Progress Over Polished Success
          </h1>
          <div className="w-24 h-1 bg-blue-600 mx-auto"></div>
        </div>
      </section>

      {/* Article Content */}
      <main className="flex-1 py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-10 space-y-6 text-gray-700 leading-relaxed text-lg">
            <p className="text-xl font-semibold text-gray-900">
              Only 20% of donors give again after their first gift.
            </p>

            <p>
              That statistic reveals something most nonprofits still don't want to admit: the relationship model is fundamentally broken.
            </p>

            <p>
              I've watched organizations spend millions on acquisition while ignoring why people leave. They optimize email subject lines. They A/B test donation buttons. They hire consultants to improve conversion rates.
            </p>

            <p>
              But they never ask the harder question: why do 80% of donors disappear after writing that first check?
            </p>

            <p>
              The answer isn't complicated. Traditional charities talk at donors, not with them.
            </p>

            <p>
              Every interaction follows the same script. Thank you for your gift. Here's your tax receipt. See you next year when we ask again.
            </p>

            <p>
              There's no conversation. No feedback loop. No invitation to participate beyond opening your wallet.
            </p>

            <p>
              The entire relationship architecture is built on a transactional foundation that was outdated before social media existed.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">
              The Control Problem
            </h2>

            <p>
              Most nonprofits operate with a legacy communications model: slow, polished, top-down.
            </p>

            <p>
              They send quarterly newsletters that took three rounds of legal review. Annual reports designed by agencies. Carefully staged success photos that show beneficiaries smiling at exactly the right angle.
            </p>

            <p>
              Everything goes through multiple approval layers. Every word gets scrutinized. Every image gets vetted.
            </p>

            <p>
              The problem isn't the content quality. It's the underlying assumption that control equals credibility.
            </p>

            <p>
              Organizations believe that if they show anything less than perfect, donors will lose confidence. So they wait until projects are complete. Until outcomes are measurable. Until the story has a clean beginning, middle, and end.
            </p>

            <p>
              Real-time transparency feels risky because it requires vulnerability. Sharing not just wins, but stumbles, questions, and in-progress work.
            </p>

            <p className="text-xl font-semibold text-gray-900">
              But here's what organizations miss: the messy middle is exactly where trust gets built.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">
              What Co-Creation Actually Looks Like
            </h2>

            <p>
              Charity: water's monthly donor community, The Spring, proves the model works.
            </p>

            <p>
              Instead of asking for recurring donations and disappearing, they bring supporters behind the scenes. Field reports from the ground. Video updates from local partners showing real challenges. Livestreams from project sites where you can see wells being drilled in real time.
            </p>

            <p>
              They share the setbacks. The unexpected geological challenges that force teams to drill deeper. The community concerns that require design changes. The weather delays that push timelines back.
            </p>

            <p>
              Donors aren't just watching impact happen. They feel part of the journey.
            </p>

            <p>
              The Spring community grew to 62,000 members generating nearly $20 million in annual recurring revenue. Not because charity: water had the slickest marketing. Because they invited people into the actual work.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">
              Why Authenticity Beats Polish
            </h2>

            <p>
              Today's donors grew up in a world where authenticity beats perfection.
            </p>

            <p>
              Social media, open reviews, and behind-the-scenes content trained people to spot spin and crave realness.
            </p>

            <p>
              When nonprofits only share polished success stories, it feels distant. Sometimes suspicious.
            </p>

            <p>
              But when they show the messy middle, the challenges and pivots and learning moments, donors see honesty.
            </p>

            <p className="text-xl font-semibold text-gray-900">
              Organizations with proven transparency seals average 62% more in donor contributions. That's not correlation. That's donors voting with their wallets for organizations willing to be real.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-4">
              The Uncomfortable Truth
            </h2>

            <p>
              Control and credibility can't coexist anymore.
            </p>

            <p>
              Nonprofits that cling to top-down authority will lose trust. The future of philanthropy belongs to those willing to surrender ownership of the narrative.
            </p>

            <p>
              Impact will be co-authored in public.
            </p>

            <p>
              New donor retention rates dropped to 18.5% in 2023. Repeat donor retention sits at 58.2%. The gap between those numbers tells you everything about the value of genuine relationship versus transactional interaction.
            </p>

            <p className="text-xl font-semibold text-gray-900">
              The winners will be the ones who embrace the fundamental shift: donors aren't funding subjects anymore. They're mission partners.
            </p>

            <p className="text-2xl font-bold text-gray-900 text-center mt-8">
              But messy and authentic beats polished and distant. Every time.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Make an Impact?
            </h2>
            <p className="text-gray-600 mb-6">
              Join us in creating meaningful change through every purchase.
            </p>
            <Button
              onClick={() => navigate("/products")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3"
            >
              Shop With Purpose
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
