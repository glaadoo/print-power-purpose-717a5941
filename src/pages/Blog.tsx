import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import useToggle from "@/hooks/useToggle";
import MenuOverlay from "@/components/MenuOverlay";

export default function Blog() {
  const nav = useNavigate();
  const menu = useToggle(false);

  useEffect(() => {
    document.title = "Blog - Print Power Purpose";
  }, []);

  const posts = [
    {
      id: 1,
      title: "10 Creative Fundraising Ideas for Nonprofits in 2024",
      excerpt: "Discover innovative ways to engage donors and raise funds through custom merchandise, events, and digital campaigns.",
      date: "March 15, 2024",
      category: "Fundraising",
      readTime: "5 min read"
    },
    {
      id: 2,
      title: "How Custom Apparel Builds Team Spirit and Brand Recognition",
      excerpt: "Learn why custom t-shirts, hoodies, and accessories are essential for creating a cohesive team identity.",
      date: "March 10, 2024",
      category: "Branding",
      readTime: "4 min read"
    },
    {
      id: 3,
      title: "The Impact of Social Enterprise: Profit Meets Purpose",
      excerpt: "Explore how businesses can create positive social change while maintaining sustainable revenue models.",
      date: "March 5, 2024",
      category: "Social Impact",
      readTime: "6 min read"
    },
    {
      id: 4,
      title: "School Fundraiser Success: Best Practices and Real Stories",
      excerpt: "Case studies from schools that raised thousands through custom merchandise campaigns.",
      date: "February 28, 2024",
      category: "Education",
      readTime: "7 min read"
    },
    {
      id: 5,
      title: "Sustainable Printing: Our Commitment to the Environment",
      excerpt: "Behind the scenes of our eco-friendly production processes and sustainable material sourcing.",
      date: "February 20, 2024",
      category: "Sustainability",
      readTime: "5 min read"
    },
    {
      id: 6,
      title: "Design Tips: Creating Memorable Custom Products",
      excerpt: "Professional advice for designing apparel and promo items that people actually want to wear and use.",
      date: "February 15, 2024",
      category: "Design",
      readTime: "8 min read"
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
          <div className="max-w-5xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-16">
              <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md mb-6">
                Blog & Insights
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                Stories, tips, and inspiration for fundraising, social impact, and custom merchandise.
              </p>
            </div>

            {/* Featured Post */}
            <div className="mb-12 bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl overflow-hidden">
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-4">
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                    Featured
                  </span>
                  <span className="text-sm text-muted-foreground">{posts[0].date}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
                  {posts[0].title}
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  {posts[0].excerpt}
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>{posts[0].category}</span>
                  <span>{posts[0].readTime}</span>
                </div>
                <button className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Read Article
                </button>
              </div>
            </div>

            {/* Recent Posts Grid */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Recent Posts</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {posts.slice(1).map((post) => (
                  <div key={post.id} className="bg-background/95 backdrop-blur-md rounded-xl border border-border/20 shadow-lg p-6 hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-medium text-primary">{post.category}</span>
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{post.readTime}</span>
                      <button className="text-primary hover:underline text-sm font-medium">
                        Read More →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter CTA */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8 text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Subscribe to Our Newsletter
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Get the latest fundraising tips, success stories, and product updates delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg bg-secondary/10 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors whitespace-nowrap">
                  Subscribe
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
