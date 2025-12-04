import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VistaprintNav from "@/components/VistaprintNav";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PageContent {
  h1: string;
  subtitle: string;
  overview: string;
  who_we_serve: string[];
  benefits: Array<{ title: string; description: string }>;
  products: string[];
  use_cases: Array<{ title: string; description: string }>;
  selection_steps: string[];
}

export default function WhoWeServeNonprofits() {
  const nav = useNavigate();
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Who We Serve - Nonprofits | Print Power Purpose";
    
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from("who_we_serve_pages")
          .select("content")
          .eq("page_slug", "nonprofits")
          .single();

        if (error) throw error;
        if (data) setContent(data.content as PageContent);
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <VistaprintNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading content...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <VistaprintNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 max-w-md">
            <p className="text-center text-gray-600">Content not available</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VistaprintNav />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white border-b border-gray-200 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            {content.h1}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            {content.subtitle}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Overview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
            <p className="text-gray-600 leading-relaxed">{content.overview}</p>
          </div>

          {/* Who We Serve */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Who We Serve</h2>
            <ul className="space-y-2">
              {content.who_we_serve.map((item, i) => (
                <li key={i} className="text-gray-600 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How Nonprofits Benefit</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {content.benefits.map((benefit, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Products */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Products</h2>
            <p className="text-gray-600 mb-4">
              Support your outreach events and campaigns with professional printing:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {content.products.map((product, i) => (
                <div key={i} className="bg-gray-50 px-4 py-3 rounded-lg text-center">
                  <span className="text-gray-900 text-sm font-medium">{product}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Real-World Use Cases</h2>
            <div className="space-y-4">
              {content.use_cases.map((useCase, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{useCase.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Selection Steps */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How Supporters Select Your Nonprofit</h2>
            <div className="space-y-4">
              {content.selection_steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-gray-600 pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of nonprofits already benefiting from Print Power Purpose.
            </p>
            <button
              onClick={() => nav('/select/nonprofit')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Find Your Nonprofit
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
