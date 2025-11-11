import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import useToggle from "@/hooks/useToggle";
import MenuOverlay from "@/components/MenuOverlay";
import { supabase } from "@/integrations/supabase/client";
import { useCause } from "@/context/CauseContext";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface School {
  id: string;
  name: string;
  created_at: string;
}

export default function Schools() {
  const nav = useNavigate();
  const menu = useToggle(false);
  const { setCause } = useCause();
  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Schools & Teams - Print Power Purpose";
    loadSchools();
  }, []);

  async function loadSchools() {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error loading schools:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (school: School) => {
    setCause({
      id: school.id,
      name: school.name,
      summary: "School fundraising program"
    });
    nav("/products");
  };

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
            <div className="text-center mb-12">
              <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md mb-6">
                Schools & Teams
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
                Support your school or team with custom products. A portion of every sale helps fund your programs and activities.
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-8 max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search schools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 bg-background/95 backdrop-blur-md"
              />
            </div>

            {/* Schools Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {search ? `No schools found matching "${search}"` : "No schools available yet."}
                </p>
                <button
                  onClick={() => nav("/contact")}
                  className="text-primary hover:underline"
                >
                  Contact us to add your school
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredSchools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSelect(school)}
                    className="bg-background/95 backdrop-blur-md rounded-xl border border-border/20 shadow-lg p-6 text-left hover:border-primary/50 hover:shadow-xl transition-all"
                  >
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {school.name}
                    </h3>
                    <p className="text-sm text-primary font-medium">
                      Click to shop and support →
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Info Section */}
            <div className="mt-12 bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                How It Works
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong className="text-foreground">1. Select Your School:</strong> Choose your school or team from the list above.
                </p>
                <p>
                  <strong className="text-foreground">2. Shop Products:</strong> Browse our custom apparel and promotional items.
                </p>
                <p>
                  <strong className="text-foreground">3. Make Impact:</strong> A portion of every purchase goes directly to your selected school or team.
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-border/20">
                <p className="text-sm text-muted-foreground">
                  Don't see your school listed?{" "}
                  <button onClick={() => nav("/contact")} className="text-primary hover:underline">
                    Contact us
                  </button>{" "}
                  to get started.
                </p>
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
