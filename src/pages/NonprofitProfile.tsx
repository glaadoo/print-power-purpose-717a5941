import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Globe, DollarSign, Users, TrendingUp } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Nonprofit = {
  id: string;
  name: string;
  ein?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  tags?: string[];
  logo_url?: string;
  impact_metrics?: Record<string, any>;
  source: string;
};

type DonationStats = {
  total_amount: number;
  donation_count: number;
  recent_donations: Array<{
    amount_cents: number;
    created_at: string;
    customer_email?: string;
  }>;
};

export default function NonprofitProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nonprofit, setNonprofit] = useState<Nonprofit | null>(null);
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchNonprofit();
      fetchDonationStats();
    }
  }, [id]);

  const fetchNonprofit = async () => {
    try {
      const { data, error } = await supabase
        .from("nonprofits")
        .select("*")
        .eq("id", id)
        .eq("approved", true)
        .single();

      if (error) throw error;
      setNonprofit(data);
    } catch (error: any) {
      toast.error("Failed to load nonprofit: " + error.message);
      navigate("/causes");
    }
  };

  const fetchDonationStats = async () => {
    try {
      // Get total donations and count
      const { data: donations, error } = await supabase
        .from("donations")
        .select("amount_cents, created_at, customer_email")
        .eq("nonprofit_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const total = donations?.reduce((sum, d) => sum + d.amount_cents, 0) || 0;
      const recent = donations?.slice(0, 10) || [];

      setStats({
        total_amount: total,
        donation_count: donations?.length || 0,
        recent_donations: recent,
      });
    } catch (error: any) {
      console.error("Failed to load donation stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <p>Loading nonprofit profile...</p>
      </div>
    );
  }

  if (!nonprofit) {
    return null;
  }

  const impactMetrics = nonprofit.impact_metrics || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate("/causes")}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Causes
        </Button>

        {/* Header Section */}
        <GlassCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {nonprofit.logo_url && (
              <img
                src={nonprofit.logo_url}
                alt={`${nonprofit.name} logo`}
                className="w-24 h-24 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{nonprofit.name}</h1>
                  {nonprofit.ein && (
                    <p className="text-white/60 text-sm">EIN: {nonprofit.ein}</p>
                  )}
                </div>
                <Badge variant="outline" className="border-white/30 text-white">
                  {nonprofit.source === "irs" ? "IRS Verified" : "Curated"}
                </Badge>
              </div>

              {(nonprofit.city || nonprofit.state) && (
                <div className="flex items-center gap-2 text-white/80 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {nonprofit.city && nonprofit.state
                      ? `${nonprofit.city}, ${nonprofit.state}`
                      : nonprofit.city || nonprofit.state}
                    {nonprofit.country && nonprofit.country !== "US" && `, ${nonprofit.country}`}
                  </span>
                </div>
              )}

              {nonprofit.tags && nonprofit.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {nonprofit.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white/20">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {nonprofit.description && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <h2 className="text-xl font-semibold mb-3">About</h2>
              <p className="text-white/80 leading-relaxed">{nonprofit.description}</p>
            </div>
          )}
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                ${((stats?.total_amount || 0) / 100).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                {stats?.donation_count || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Average Gift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                $
                {stats?.donation_count
                  ? ((stats.total_amount / stats.donation_count) / 100).toFixed(2)
                  : "0.00"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Impact Metrics */}
        {Object.keys(impactMetrics).length > 0 && (
          <GlassCard className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Impact Metrics</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(impactMetrics).map(([key, value]) => (
                <div key={key} className="p-4 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-sm capitalize mb-1">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-2xl font-bold text-white">{String(value)}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Recent Donations */}
        {stats && stats.recent_donations.length > 0 && (
          <GlassCard>
            <h2 className="text-2xl font-bold mb-4">Recent Donations</h2>
            <div className="space-y-3">
              {stats.recent_donations.map((donation, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-white">
                      ${(donation.amount_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-white/60">
                      {new Date(donation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {donation.customer_email && (
                    <p className="text-sm text-white/60">{donation.customer_email}</p>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
