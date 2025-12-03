import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";

interface RevenueData {
  date: string;
  revenue: number;
  donations: number;
  orders: number;
}

export default function AdminAnalyticsCharts() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalDonations: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Check if we have cached data that's less than 5 minutes old
      const cacheKey = "admin-analytics-cache";
      const cacheTimestampKey = "admin-analytics-timestamp";
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(cacheTimestampKey);

      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - timestamp < fiveMinutes) {
          const parsed = JSON.parse(cachedData);
          setRevenueData(parsed.revenueData);
          setTotalStats(parsed.totalStats);
          setLoading(false);
          return;
        }
      }

      // Fetch last 30 days of orders
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("created_at, amount_total_cents, donation_cents, status")
        .gte("created_at", thirtyDaysAgo)
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (ordersError) throw ordersError;

      // Process data by date
      const dateMap = new Map<string, RevenueData>();

      // Initialize all dates in the last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        dateMap.set(date, {
          date: format(subDays(new Date(), i), "MMM dd"),
          revenue: 0,
          donations: 0,
          orders: 0,
        });
      }

      // Aggregate orders by date
      let totalRevenue = 0;
      let totalDonations = 0;
      let totalOrders = 0;

      ordersData?.forEach((order) => {
        const date = format(parseISO(order.created_at), "yyyy-MM-dd");
        const existing = dateMap.get(date);

        if (existing) {
          existing.revenue += order.amount_total_cents / 100;
          existing.donations += order.donation_cents / 100;
          existing.orders += 1;

          totalRevenue += order.amount_total_cents / 100;
          totalDonations += order.donation_cents / 100;
          totalOrders += 1;
        }
      });

      const chartData = Array.from(dateMap.values());

      const stats = {
        totalRevenue,
        totalDonations,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      };

      setRevenueData(chartData);
      setTotalStats(stats);

      // Cache the results
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ revenueData: chartData, totalStats: stats })
      );
      localStorage.setItem(cacheTimestampKey, Date.now().toString());
    } catch (err) {
      console.error("Error loading analytics:", err);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalStats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Printing + Purpose</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalStats.totalDonations.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalStats.avgOrderValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Printing + Purpose Trend</CardTitle>
          <CardDescription>Last 30 days revenue and Printing + Purpose amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="donations"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                name="Printing + Purpose"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Order Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Order Volume</CardTitle>
          <CardDescription>Daily order count for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--primary))" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
