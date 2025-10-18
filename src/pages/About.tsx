import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import MenuOverlay from "@/components/MenuOverlay";
import useToggle from "@/hooks/useToggle";
import { Button } from "@/components/ui/button";

export default function About() {
  const menu = useToggle();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "About | Print Power Purpose";
  }, []);

  return (
    <div className="relative min-h-screen">
      <VideoBackground srcMp4="/IMG_4805.jpeg" />
      
      {/* Top Floating Bar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-7xl">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-white hover:opacity-80 transition-opacity">
            Print Power Purpose
          </a>
          <button
            onClick={menu.toggle}
            className="text-white hover:opacity-80 transition-opacity"
            aria-label="Toggle menu"
          >
            <div className="w-6 h-0.5 bg-white mb-1.5"></div>
            <div className="w-6 h-0.5 bg-white mb-1.5"></div>
            <div className="w-6 h-0.5 bg-white"></div>
          </button>
        </div>
      </header>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-7xl">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 flex items-center justify-center">
          <Button
            onClick={() => navigate("/products")}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-8 py-2 rounded-full transition-all"
          >
            Shop With Purpose
          </Button>
        </div>
      </div>

      {/* Article Content */}
      <main className="relative z-10 pt-32 pb-32 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <GlassCard className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Donors Trust Messy Progress Over Polished Success
            </h1>
            <div className="w-24 h-1 bg-white/60 mx-auto"></div>
          </GlassCard>

          {/* Article Body */}
          <GlassCard className="space-y-6 text-white/90 leading-relaxed">
            <p className="text-xl font-semibold text-white">
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

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">
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

            <p>
              What if a project hits delays? What if community feedback forces a pivot? What if the initial approach doesn't work and you need to try something different?
            </p>

            <p>
              The instinct is to hide those moments. Polish them away. Present only the sanitized version where everything went according to plan.
            </p>

            <p>
              The barrier isn't technology or budget. It's the fear of showing the messy middle.
            </p>

            <p className="text-xl font-semibold text-white">
              But here's what organizations miss: the messy middle is exactly where trust gets built.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">
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
              When a project succeeds, it's a shared victory. When obstacles emerge, supporters understand the context instead of feeling deceived.
            </p>

            <p>
              That transparency turns donors into stakeholders, not sponsors. The emotional investment drives loyalty and deeper giving.
            </p>

            <p>
              The Spring community grew to 62,000 members generating nearly $20 million in annual recurring revenue. Not because charity: water had the slickest marketing. Because they invited people into the actual work.
            </p>

            <p>
              Co-creation means donors give feedback that shapes future projects. They ask questions that get real answers. They see their specific contributions tracked to GPS coordinates of completed wells.
            </p>

            <p>
              The relationship becomes reciprocal instead of extractive.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">
              Why Authenticity Beats Polish
            </h2>

            <p>
              Today's donors grew up in a world where authenticity beats perfection.
            </p>

            <p>
              Social media, open reviews, and behind-the-scenes content trained people to spot spin and crave realness.
            </p>

            <p>
              We've all seen the Instagram posts showing the pristine final product next to the chaotic process that created it. We know restaurants have off nights. We know products have bugs. We know projects have complications.
            </p>

            <p>
              Pretending otherwise doesn't build confidence. It triggers skepticism.
            </p>

            <p>
              When nonprofits only share polished success stories, it feels distant. Sometimes suspicious.
            </p>

            <p>
              The donor starts wondering: what aren't they telling me? If everything always goes perfectly, either they're lying or they're not taking on hard enough problems.
            </p>

            <p>
              But when they show the messy middle, the challenges and pivots and learning moments, donors see honesty.
            </p>

            <p>
              A water project that hit unexpected rock formations and required three additional drilling attempts tells a more compelling story than one that went smoothly. Because it's believable.
            </p>

            <p>
              Trust is built in those vulnerable, unfinished spaces.
            </p>

            <p>
              The organization that says "we tried this approach and it didn't work, so here's what we're doing differently" earns more credibility than the one claiming flawless execution.
            </p>

            <p className="text-xl font-semibold text-white">
              Organizations with proven transparency seals average 62% more in donor contributions. That's not correlation. That's donors voting with their wallets for organizations willing to be real.
            </p>

            <p>
              The data confirms what donor behavior already shows: transparency isn't a risk to fundraising. It's a competitive advantage.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">
              The Participation Shift
            </h2>

            <p>
              Something bigger is happening beneath these trends.
            </p>

            <p>
              Donors don't just want to give anymore. They want to co-own the story.
            </p>

            <p>
              This shift reflects broader cultural changes around participation and ownership. People expect to influence the products they buy, the content they consume, the communities they join.
            </p>

            <p>
              Why would philanthropy be different?
            </p>

            <p>
              They expect real-time visibility. They treat impact like a shared project rather than a charitable favor.
            </p>

            <p>
              The old model positioned donors as benevolent outsiders writing checks to help less fortunate people. The new model positions them as collaborators in addressing shared challenges.
            </p>

            <p>
              Nearly 40% of philanthropic collaboratives now use participatory processes for grantmaking decisions. That represents a fundamental power shift.
            </p>

            <p>
              Decision-making authority is moving from foundation boards to community members with lived experience. From professional philanthropists to the people actually affected by the issues.
            </p>

            <p>
              Nonprofits will need to evolve from hierarchical organizations into participatory ecosystems.
            </p>

            <p>
              Supporters won't just fund decisions. They'll shape them through transparent feedback loops, shared dashboards, and open governance models that treat donors, staff, and beneficiaries as collaborators in designing the mission.
            </p>

            <p>
              This means rethinking organizational structures that were built for a different era. Boards that include community voices. Funding decisions informed by beneficiary input. Strategy shaped by donor feedback.
            </p>

            <p>
              The $68 trillion wealth transfer from Baby Boomers to Millennials and Gen Z over the next 30 years will accelerate this trend. Younger donors expect participation as a baseline, not a bonus feature.
            </p>

            <p>
              Organizations that don't adapt will find themselves competing for a shrinking pool of donors comfortable with the old transactional model.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">
              The Risk Nobody Talks About
            </h2>

            <p>
              There's a danger in this vision that needs naming.
            </p>

            <p>
              The biggest risk is mistaking inclusion for consensus.
            </p>

            <p>
              When every voice has a say, decision-making can stall. The original mission can blur under competing perspectives.
            </p>

            <p>
              I've seen organizations try to implement participatory models and end up paralyzed. Every decision becomes a negotiation. Every strategy gets diluted to accommodate all viewpoints. Progress slows to a crawl.
            </p>

            <p>
              Without clear guardrails and trusted facilitators, transparency turns into noise. Collaboration becomes chaos.
            </p>

            <p>
              The solution isn't less participation. It's better structure around participation.
            </p>

            <p>
              Organizations need frameworks that distinguish between decisions where input genuinely improves outcomes and decisions where too many voices create gridlock.
            </p>

            <p>
              They need facilitators who can synthesize diverse perspectives without letting the loudest voices dominate. Who can identify genuine consensus versus forced compromise that satisfies no one.
            </p>

            <p>
              They need clear mission boundaries that define what's open for collaborative shaping and what's non-negotiable core purpose.
            </p>

            <p>
              The organizations that succeed won't be the ones that give everyone equal vote on everything. They'll be the ones that create structures for meaningful participation while protecting mission clarity.
            </p>

            <p>
              Participatory doesn't mean directionless. Co-creation doesn't mean committee-driven mediocrity.
            </p>

            <p>
              The best models combine genuine stakeholder input with clear decision-making authority and accountability.
            </p>

            <h2 className="text-3xl font-bold text-white mt-12 mb-4">
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
              That's uncomfortable for organizations built on carefully managed messaging. Decades of institutional practice have trained nonprofits to control information flow, manage perceptions, and present unified fronts.
            </p>

            <p>
              But donor behavior is already moving in this direction.
            </p>

            <p>
              New donor retention rates dropped to 18.5% in 2023. Repeat donor retention sits at 58.2%. The gap between those numbers tells you everything about the value of genuine relationship versus transactional interaction.
            </p>

            <p>
              Organizations that build real connections retain supporters. Organizations that treat donors as ATMs watch them leave.
            </p>

            <p>
              The technology exists to enable participatory models. Platforms can track individual contributions to specific outcomes. Dashboards can provide real-time project updates. Automated systems can share micro-updates without overwhelming staff.
            </p>

            <p>
              The question isn't whether to adapt. It's whether you'll lead the transition or get left behind by it.
            </p>

            <p>
              Some organizations will resist until declining donations force their hand. Others will experiment cautiously, testing transparency in controlled ways.
            </p>

            <p className="text-xl font-semibold text-white">
              The winners will be the ones who embrace the fundamental shift: donors aren't funding subjects anymore. They're mission partners.
            </p>

            <p>
              That requires letting go of control. Accepting that impact stories will be messier and more complex than the polished versions you're used to sharing.
            </p>

            <p className="text-2xl font-bold text-white text-center mt-8">
              But messy and authentic beats polished and distant. Every time.
            </p>
          </GlassCard>

        </div>
      </main>

      <MenuOverlay open={menu.open} onClose={menu.off} />
    </div>
  );
}
