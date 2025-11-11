import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import useToggle from "@/hooks/useToggle";
import MenuOverlay from "@/components/MenuOverlay";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FundraisingGuide() {
  const nav = useNavigate();
  const menu = useToggle(false);

  useEffect(() => {
    document.title = "Fundraising Guide - Print Power Purpose";
  }, []);

  const sections = [
    {
      id: "getting-started",
      title: "Getting Started with Custom Merchandise Fundraising",
      content: "Custom merchandise fundraising is one of the most effective ways to raise money while building community. Products like t-shirts, hoodies, and tote bags create lasting value beyond the donation. Start by identifying your audience, setting clear goals, and choosing products that align with your mission."
    },
    {
      id: "choosing-products",
      title: "Choosing the Right Products",
      content: "Select items your supporters will actually use. T-shirts and hoodies are always popular, but consider your audience. Sports teams might prefer performance wear, while nonprofits focused on sustainability might choose eco-friendly tote bags. Quality matters—people are more likely to wear and promote products they love."
    },
    {
      id: "design-tips",
      title: "Design Best Practices",
      content: "Keep designs simple and meaningful. Include your organization's name or logo prominently. Use 2-3 colors maximum for cost efficiency. Consider both front and back designs. Make sure text is readable from a distance. If you need help, our design team can assist in creating compelling artwork."
    },
    {
      id: "pricing-strategy",
      title: "Pricing Your Products",
      content: "Balance affordability with profitability. Research similar products in your market. Consider offering bundle deals (buy 2, get discount). Remember to account for all costs including shipping. Transparency about how much goes to your cause builds trust. We recommend a 40-60% markup on cost."
    },
    {
      id: "marketing",
      title: "Marketing Your Campaign",
      content: "Use all available channels: email, social media, in-person events. Create urgency with limited-time offers. Share stories about your mission and how funds will be used. Use photos of real people wearing your products. Partner with local influencers or ambassadors to expand reach."
    },
    {
      id: "social-media",
      title: "Social Media Strategy",
      content: "Post consistently leading up to and during your campaign. Use behind-the-scenes content to build excitement. Create shareable graphics with campaign details. Encourage supporters to post photos wearing your products. Use relevant hashtags and tag your organization. Run a photo contest for engagement."
    },
    {
      id: "event-sales",
      title: "Selling at Events",
      content: "Events are perfect for merchandise sales. Set up an attractive display with good lighting. Offer multiple sizes and payment options. Have team members wearing the products. Create a sense of urgency ('Only 20 left!'). Collect emails for future campaigns."
    },
    {
      id: "online-sales",
      title: "Online Sales Platform",
      content: "Make purchasing easy with a simple checkout process. Include clear product photos and size charts. Offer secure payment options. Provide estimated delivery dates. Send order confirmations immediately. Keep customers updated on shipping status."
    },
    {
      id: "bulk-orders",
      title: "Managing Bulk Orders",
      content: "Pre-orders reduce financial risk and ensure you order the right quantities. Set a minimum order threshold. Clearly communicate deadlines. Over-order by 10-15% for popular sizes. Keep extra inventory for future sales or replacements."
    },
    {
      id: "timeline",
      title: "Campaign Timeline",
      content: "Plan for 6-8 weeks total. Week 1-2: Design and approval. Week 3-4: Marketing launch. Week 4-5: Sales push. Week 6: Order deadline. Week 7-8: Production and delivery. Build in buffer time for unexpected delays. Communicate timeline clearly to supporters."
    },
    {
      id: "measuring-success",
      title: "Measuring Success",
      content: "Track sales daily, not just totals. Monitor which products and sizes sell best. Measure engagement on different marketing channels. Survey customers about their experience. Calculate your actual fundraising percentage. Document lessons learned for next campaign."
    },
    {
      id: "common-mistakes",
      title: "Common Mistakes to Avoid",
      content: "Don't order too much inventory upfront—use pre-orders. Don't skip quality control—bad products hurt your brand. Don't forget shipping costs in pricing. Don't wait until the last minute to market. Don't ignore customer service—respond promptly to inquiries."
    }
  ];

  return (
    <div className="min-h-screen text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 px-4 md:px-6 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <button onClick={() => nav(-1)} className="text-sm hover:opacity-80 transition-opacity">
          ← Back
        </button>
        <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
        <button onClick={menu.on} className="text-sm hover:opacity-80 transition-opacity">
          Menu
        </button>
      </header>

      {/* Main content */}
      <div className="pt-14 min-h-screen overflow-y-auto scroll-smooth pb-24">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          parallaxVh={8}
          overlay={<div className="absolute inset-0 bg-black/50" />}
          className="fixed inset-0 -z-10"
        />

        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-16">
              <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md mb-6">
                Complete Fundraising Guide
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                Everything you need to know to run a successful custom merchandise fundraising campaign.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              <div className="bg-background/95 backdrop-blur-md rounded-xl border border-border/20 p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">40-60%</div>
                <div className="text-sm text-muted-foreground">Typical Profit Margin</div>
              </div>
              <div className="bg-background/95 backdrop-blur-md rounded-xl border border-border/20 p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">6-8 weeks</div>
                <div className="text-sm text-muted-foreground">Average Campaign Length</div>
              </div>
              <div className="bg-background/95 backdrop-blur-md rounded-xl border border-border/20 p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">$5K+</div>
                <div className="text-sm text-muted-foreground">Typical Campaign Raises</div>
              </div>
            </div>

            {/* Guide Content */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6 md:p-8 mb-12">
              <Accordion type="single" collapsible className="space-y-2">
                {sections.map((section, index) => (
                  <AccordionItem key={section.id} value={section.id} className="border-b border-border/50">
                    <AccordionTrigger className="text-left text-base md:text-lg font-medium text-foreground hover:text-primary transition-colors py-4">
                      <span className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        {section.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-4 pl-11">
                      {section.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* CTA */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Ready to Start Your Campaign?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                We're here to help you every step of the way. From design to fulfillment, our team has the expertise to make your fundraiser a success.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => nav('/products')}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Browse Products
                </button>
                <button
                  onClick={() => nav('/contact')}
                  className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                >
                  Contact Our Team
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Menu Overlay */}
      <MenuOverlay
        open={menu.open}
        onClose={menu.off}
        items={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Products", href: "/products" },
          { label: "Causes", href: "/causes" },
          { label: "Contact", href: "/contact" },
        ]}
      />
    </div>
  );
}
