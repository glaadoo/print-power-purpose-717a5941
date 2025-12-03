import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, TrendingUp, MapPin, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type NonprofitStats = {
  id: string;
  name: string;
  donationCount: number;
  totalCents: number;
  city?: string;
  state?: string;
};

type StateStats = {
  state: string;
  count: number;
  totalCents: number;
};

export default function AdminNonprofitAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topNonprofits, setTopNonprofits] = useState<NonprofitStats[]>([]);
  const [stateDistribution, setStateDistribution] = useState<StateStats[]>([]);
  const [totalDonations, setTotalDonations] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchAnalytics();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "admin")) {
      toast.error("Access denied");
      navigate("/");
    }
  }

  async function fetchAnalytics() {
    setLoading(true);
    try {
      // Get top nonprofits by donation count
      const { data: donations, error: donError } = await supabase
        .from("donations")
        .select("nonprofit_id, nonprofit_name, amount_cents, nonprofit_ein");

      if (donError) throw donError;

      // Aggregate by nonprofit
      const nonprofitMap = new Map<string, NonprofitStats>();
      let total = 0;

      donations?.forEach(don => {
        if (!don.nonprofit_id) return;
        total += don.amount_cents;
        
        const existing = nonprofitMap.get(don.nonprofit_id);
        if (existing) {
          existing.donationCount++;
          existing.totalCents += don.amount_cents;
        } else {
          nonprofitMap.set(don.nonprofit_id, {
            id: don.nonprofit_id,
            name: don.nonprofit_name || 'Unknown',
            donationCount: 1,
            totalCents: don.amount_cents,
          });
        }
      });

      const topList = Array.from(nonprofitMap.values())
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 10);

      // Get state distribution
      const { data: nonprofits, error: npError } = await supabase
        .from("nonprofits")
        .select("id, state");

      if (npError) throw npError;

      const stateMap = new Map<string, StateStats>();
      nonprofits?.forEach(np => {
        if (!np.state) return;
        
        const donationsForNP = donations?.filter(d => d.nonprofit_id === np.id) || [];
        const totalForState = donationsForNP.reduce((sum, d) => sum + d.amount_cents, 0);
        
        const existing = stateMap.get(np.state);
        if (existing) {
          existing.count++;
          existing.totalCents += totalForState;
        } else {
          stateMap.set(np.state, {
            state: np.state,
            count: 1,
            totalCents: totalForState,
          });
        }
      });

      const stateList = Array.from(stateMap.values())
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 10);

      setTopNonprofits(topList);
      setStateDistribution(stateList);
      setTotalDonations(total);
    } catch (error: any) {
      toast.error("Failed to load analytics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/admin/nonprofits")}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Nonprofit Analytics</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/60">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total Nonprofit Printing + Purpose
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-400">
                  ${(totalDonations / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            {/* Top Nonprofits */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top 10 Nonprofits by Printing + Purpose
                </CardTitle>
                <CardDescription className="text-white/60">
                  Ranked by total Printing + Purpose amount
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topNonprofits.length === 0 ? (
                  <div className="text-white/60 text-center py-4">No Printing + Purpose data yet</div>
                ) : (
                  <div className="space-y-3">
                    {topNonprofits.map((np, idx) => (
                      <div
                        key={np.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-white/40 w-8">#{idx + 1}</div>
                          <div>
                            <div className="font-semibold text-white">{np.name}</div>
                            <div className="text-sm text-white/60">{np.donationCount} contributions</div>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-green-400">
                          ${(np.totalCents / 100).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top 10 States by Nonprofit Printing + Purpose
                </CardTitle>
                <CardDescription className="text-white/60">
                  Geographic distribution of Printing + Purpose contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stateDistribution.length === 0 ? (
                  <div className="text-white/60 text-center py-4">No state data available</div>
                ) : (
                  <div className="space-y-3">
                    {stateDistribution.map(state => (
                      <div
                        key={state.state}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div>
                          <div className="font-semibold text-white">{state.state}</div>
                          <div className="text-sm text-white/60">{state.count} nonprofits</div>
                        </div>
                        <div className="text-xl font-bold text-blue-400">
                          ${(state.totalCents / 100).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
