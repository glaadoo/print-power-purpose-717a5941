import { useEffect } from "react";
import VistaprintNav from "@/components/VistaprintNav";
import Footer from "@/components/Footer";

export default function Blog() {
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
    <div className="min-h-screen bg-white flex flex-col">
      <VistaprintNav />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white border-b border-gray-200 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Blog & Insights
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Stories, tips, and inspiration for fundraising, social impact, and custom merchandise.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Featured Post */}
          <div className="mb-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  Featured
                </span>
                <span className="text-sm text-gray-500">{posts[0].date}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {posts[0].title}
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                {posts[0].excerpt}
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span>{posts[0].category}</span>
                <span>{posts[0].readTime}</span>
              </div>
              <button className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                Read Article
              </button>
            </div>
          </div>

          {/* Recent Posts Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Posts</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {posts.slice(1).map((post) => (
                <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium text-blue-600">{post.category}</span>
                    <span className="text-xs text-gray-500">{post.date}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{post.readTime}</span>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Read More →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter CTA */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              Get the latest fundraising tips, success stories, and product updates delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
