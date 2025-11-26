import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Search, Shuffle, Filter, X, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCause } from "@/context/CauseContext";
import { supabase } from "@/integrations/supabase/client";
import VistaprintNav from "@/components/VistaprintNav";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Nonprofit = {
  id: string;
  name: string;
  ein?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  source?: string | null;
  irs_status?: string | null;
  tags?: string[] | null;
  logo_url?: string | null;
  total_raised_cents?: number;
  supporter_count?: number;
  created_at?: string;
};

export default function SelectNonprofit() {
  const nav = useNavigate();
  const { setNonprofit, nonprofit } = useCause();
  const [searchParams] = useSearchParams();
  const flow = searchParams.get("flow");
  const { toast } = useToast();

  const [allNonprofits, setAllNonprofits] = useState<Nonprofit[]>([]);
  const [randomNonprofits, setRandomNonprofits] = useState<Nonprofit[]>([]);
  const [loading, setLoading] = useState(true);
  const [shuffling, setShuffling] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedNonprofit, setSelectedNonprofit] = useState<Nonprofit | null>(nonprofit);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter states
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique values for filters
  const uniqueStates = useMemo(() => {
    const states = allNonprofits
      .map(np => np.state)
      .filter((state): state is string => Boolean(state))
      .filter((state, index, self) => self.indexOf(state) === index)
      .sort();
    return states;
  }, [allNonprofits]);

  const uniqueCities = useMemo(() => {
    const cities = allNonprofits
      .filter(np => !selectedState || np.state === selectedState)
      .map(np => np.city)
      .filter((city): city is string => Boolean(city))
      .filter((city, index, self) => self.indexOf(city) === index)
      .sort();
    return cities;
  }, [allNonprofits, selectedState]);

  const uniqueTags = useMemo(() => {
    const allTags = allNonprofits
      .flatMap(np => np.tags || [])
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .sort();
    return allTags;
  }, [allNonprofits]);

  // Get top fundraisers (top 3 with actual funds raised)
  const topFundraisers = useMemo(() => {
    return [...allNonprofits]
      .filter(np => (np.total_raised_cents || 0) > 0)
      .sort((a, b) => (b.total_raised_cents || 0) - (a.total_raised_cents || 0))
      .slice(0, 3);
  }, [allNonprofits]);

  // Get top 5 by supporter count for "Rising Fundraiser" badge
  const topRisingFundraisers = useMemo(() => {
    return [...allNonprofits]
      .filter(np => (np.supporter_count || 0) > 0)
      .sort((a, b) => (b.supporter_count || 0) - (a.supporter_count || 0))
      .slice(0, 5)
      .map(np => np.id);
  }, [allNonprofits]);

  // Check if nonprofit is newly added (last 30 days)
  const isNewlyAdded = (createdAt: string) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(createdAt) > thirtyDaysAgo;
  };

  // Check if nonprofit is a top fundraiser
  const isTopFundraiser = (nonprofitId: string) => {
    return topFundraisers.some(nf => nf.id === nonprofitId);
  };

  // Check if nonprofit is a top rising fundraiser (top 5 by supporters)
  const isTopRisingFundraiser = (nonprofitId: string) => {
    return topRisingFundraisers.includes(nonprofitId);
  };

  // Apply filters
  const displayedNonprofits = useMemo(() => {
    let filtered = searchQuery.trim()
      ? allNonprofits.filter((np) => {
          const query = searchQuery.toLowerCase();
          const name = np.name?.toLowerCase() || "";
          const ein = np.ein?.toLowerCase() || "";
          const city = np.city?.toLowerCase() || "";
          const state = np.state?.toLowerCase() || "";
          const description = np.description?.toLowerCase() || "";
          return name.includes(query) || ein.includes(query) || city.includes(query) || state.includes(query) || description.includes(query);
        })
      : randomNonprofits;

    // Apply state filter
    if (selectedState) {
      filtered = filtered.filter(np => np.state === selectedState);
    }

    // Apply city filter
    if (selectedCity) {
      filtered = filtered.filter(np => np.city === selectedCity);
    }

    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter(np => np.tags?.includes(selectedTag));
    }

    return filtered;
  }, [searchQuery, allNonprofits, randomNonprofits, selectedState, selectedCity, selectedTag]);

  const hasActiveFilters = selectedState || selectedCity || selectedTag;

  function clearFilters() {
    setSelectedState("");
    setSelectedCity("");
    setSelectedTag("");
  }

  useEffect(() => {
    document.title = "Choose Your Nonprofit - Print Power Purpose";
    
    let alive = true;
    (async () => {
      try {
        // Fetch all nonprofits with impact metrics
        const { data: nonprofitsData, error: nonprofitsError } = await supabase
          .from("nonprofits")
          .select("id, name, ein, city, state, description, source, irs_status, tags, logo_url, created_at")
          .eq("approved", true)
          .order("name", { ascending: true });

        if (nonprofitsError) throw nonprofitsError;

        // Fetch nonprofit metrics using database function (bypasses RLS)
        const { data: metricsData, error: metricsError } = await supabase
          .rpc("get_nonprofit_metrics");

        console.log("[SelectNonprofit] Metrics result:", { metricsData, metricsError });

        if (metricsError) {
          console.error("[SelectNonprofit] Metrics query failed:", metricsError);
        }

        // Build metrics map from function results
        const metricsMap = new Map<string, { total_raised_cents: number; supporter_count: number }>();
        
        if (metricsData) {
          metricsData.forEach((metric: any) => {
            metricsMap.set(metric.nonprofit_id, {
              total_raised_cents: Number(metric.total_raised_cents) || 0,
              supporter_count: Number(metric.supporter_count) || 0,
            });
          });
        }

        // Merge metrics with nonprofits
        // Convert UUID to string for map lookup since orders.nonprofit_id is text
        const nonprofitsWithMetrics = (nonprofitsData || []).map(np => ({
          ...np,
          total_raised_cents: metricsMap.get(String(np.id))?.total_raised_cents || 0,
          supporter_count: metricsMap.get(String(np.id))?.supporter_count || 0,
        }));

        if (alive) setAllNonprofits(nonprofitsWithMetrics);

        // Get 10 random for initial display
        const shuffled = [...nonprofitsWithMetrics].sort(() => Math.random() - 0.5).slice(0, 10);
        if (alive) setRandomNonprofits(shuffled);
        
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load nonprofits");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function handleNonprofitSelect(np: Nonprofit) {
    setSelectedNonprofit(np);
    setNonprofit(np);
  }

  function handleContinue() {
    if (!selectedNonprofit) return;

    if (flow === "donation") {
      nav("/donate");
    } else {
      nav("/products");
    }
  }

  async function handleShuffle() {
    setShuffling(true);
    try {
      // Use existing allNonprofits data (which already has metrics)
      const shuffled = [...allNonprofits].sort(() => Math.random() - 0.5).slice(0, 10);
      setRandomNonprofits(shuffled);
      
      toast({
        title: "Nonprofits shuffled!",
        description: "Showing 10 new random nonprofits",
      });
    } catch (error) {
      console.error("Shuffle error:", error);
      toast({
        title: "Shuffle failed",
        description: "Could not load new nonprofits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShuffling(false);
    }
  }

  const body = loading ? (
    <div className="text-center text-muted-foreground py-8">
      <p>Loading nonprofits…</p>
    </div>
  ) : err ? (
    <div className="text-center text-destructive py-8">
      <p>{err}</p>
    </div>
  ) : (
    <>
      {/* Top Fundraisers Featured Section */}
      {topFundraisers.length > 0 && !searchQuery.trim() && !hasActiveFilters && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-primary">Top Fundraisers</h2>
            </div>
            <p className="text-sm text-muted-foreground">Most funds raised</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topFundraisers.map((np, index) => {
              const isSelected = selectedNonprofit?.id === np.id;
              return (
                <Card
                  key={np.id}
                  onClick={() => handleNonprofitSelect(np)}
                  className={`
                    relative cursor-pointer p-6 transition-all hover:shadow-xl
                    ${isSelected
                      ? "border-primary ring-2 ring-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                    }
                  `}
                >
                  {/* Ranking Badge */}
                  <div className="absolute -top-3 left-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
                    #{index + 1} Top Fundraiser
                  </div>

                  <div className="flex flex-col items-center text-center mt-3">
                    {/* Logo */}
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden border-2 border-primary/20">
                      {np.logo_url ? (
                        <img 
                          src={np.logo_url} 
                          alt={`${np.name} logo`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-bold text-2xl">
                          {np.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
                      {np.name}
                    </h3>

                    {/* Location */}
                    {(np.city || np.state) && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {[np.city, np.state].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {/* Raised Amount - Prominent Display */}
                    <div className="mb-4 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 w-full">
                      <p className="text-xs text-muted-foreground mb-1">Total Raised</p>
                      <p className="text-3xl font-bold text-primary">
                        ${((np.total_raised_cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>

                    {/* Supporter Count */}
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                      <span className="font-semibold text-foreground">{(np.supporter_count || 0).toLocaleString()}</span>
                      <span>supporters</span>
                    </div>

                    {/* Select Button */}
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      className="w-full rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNonprofitSelect(np);
                      }}
                    >
                      {isSelected ? "Selected" : "Select Nonprofit"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Search bar and filters */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a Nonprofit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>

        {/* Filter Toggle and Controls */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 rounded-full">
                {[selectedState, selectedCity, selectedTag].filter(Boolean).length}
              </Badge>
            )}
          </Button>

          {!searchQuery.trim() && !hasActiveFilters && (
            <Button
              onClick={handleShuffle}
              disabled={shuffling}
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
            >
              <Shuffle className={`h-4 w-4 ${shuffling ? 'animate-spin' : ''}`} />
              {shuffling ? 'Shuffling...' : 'Shuffle'}
            </Button>
          )}

          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="gap-2 rounded-full text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
            <div>
              <label className="text-sm font-medium mb-2 block">State</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState && uniqueCities.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedState ? "All Cities" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {uniqueTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Results count */}
        {(searchQuery.trim() || hasActiveFilters) && (
          <p className="text-sm text-muted-foreground text-center">
            Found {displayedNonprofits.length} nonprofit{displayedNonprofits.length !== 1 ? 's' : ''}
          </p>
        )}
        
        {/* Nonprofit count display */}
        <div className="text-sm text-gray-600 text-center">
          Showing <span className="font-semibold text-gray-900">{displayedNonprofits.length}</span> out of{" "}
          <span className="font-semibold text-gray-900">{allNonprofits.length}</span> nonprofits
        </div>
      </div>

      {/* Nonprofits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedNonprofits.map((np) => {
          const isSelected = selectedNonprofit?.id === np.id;

          return (
            <Card
              key={np.id}
              onClick={() => handleNonprofitSelect(np)}
              className={`
                cursor-pointer p-6 flex flex-col transition-all hover:shadow-lg relative
                ${
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                }
              `}
            >
              {/* Featured Badges */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 max-w-[140px]">
                {isTopFundraiser(np.id) && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-md flex items-center gap-1 text-xs">
                    <TrendingUp className="w-3 h-3" />
                    Top Fundraiser
                  </Badge>
                )}
                {isTopRisingFundraiser(np.id) && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md flex items-center gap-1 text-xs">
                    <TrendingUp className="w-3 h-3" />
                    Top Rising
                  </Badge>
                )}
                {np.created_at && isNewlyAdded(np.created_at) && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-md flex items-center gap-1 text-xs">
                    <Sparkles className="w-3 h-3" />
                    New
                  </Badge>
                )}
              </div>

              {/* Logo and Title - with padding to avoid badge overlap */}
              <div className="flex items-center gap-3 mb-3 pr-36">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-primary/20">
                  {np.logo_url ? (
                    <img 
                      src={np.logo_url} 
                      alt={`${np.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-bold text-lg">
                      {np.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-primary line-clamp-2 flex-1">
                  {np.name}
                </h3>
              </div>

              {np.ein && (
                <p className="text-sm text-muted-foreground mb-1">
                  EIN: {np.ein}
                </p>
              )}

              {(np.city || np.state) && (
                <p className="text-sm text-muted-foreground mb-4">
                  {[np.city, np.state].filter(Boolean).join(", ")}
                </p>
              )}

              {np.description && (
                <p className="text-sm text-foreground mb-4 line-clamp-3 flex-grow">
                  {np.description}
                </p>
              )}

              {/* Impact Metrics */}
              <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Raised</p>
                    <p className="text-lg font-bold text-primary">
                      ${((np.total_raised_cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Supporters</p>
                    <p className="text-lg font-bold text-primary">
                      {(np.supporter_count || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Select Button */}
              <Button
                variant={isSelected ? "default" : "outline"}
                className="w-full mt-auto rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNonprofitSelect(np);
                }}
              >
                {isSelected ? "Selected" : "Select Nonprofit"}
              </Button>
            </Card>
          );
        })}
        {displayedNonprofits.length === 0 && searchQuery.trim() && (
          <div className="col-span-full text-center py-12">
            <p className="text-lg text-foreground">
              No nonprofits found for "{searchQuery}"
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try a different search term
            </p>
          </div>
        )}
      </div>

      {selectedNonprofit && (
        <div className="flex justify-center mt-12">
          <Button onClick={handleContinue} size="lg" className="px-8 rounded-full">
            Continue with {selectedNonprofit.name}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <VistaprintNav />

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Page Header */}
        <div className="mb-12">
          <Button onClick={() => nav(-1)} variant="ghost" className="mb-6" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">
              Select a Nonprofit
            </h1>
            <p className="text-muted-foreground">
              Choose a nonprofit organization to support with your purchase
            </p>
          </div>
        </div>

        {body}
      </main>
    </div>
  );
}
