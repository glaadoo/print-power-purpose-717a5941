import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, DollarSign, Package, TrendingUp } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  customer_email: string | null;
  product_name: string | null;
  amount_total_cents: number;
  donation_cents: number;
  quantity: number;
  status: string;
  payment_mode: string;
  currency: string;
}

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  averageOrder: number;
}

export default function AdminTransactions() {
  const [testOrders, setTestOrders] = useState<Order[]>([]);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [testStats, setTestStats] = useState<Stats>({ totalRevenue: 0, totalOrders: 0, averageOrder: 0 });
  const [liveStats, setLiveStats] = useState<Stats>({ totalRevenue: 0, totalOrders: 0, averageOrder: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("test");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      // Fetch test mode orders
      const { data: testData, error: testError } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_mode", "test")
        .order("created_at", { ascending: false })
        .limit(50);

      if (testError) throw testError;

      // Fetch live mode orders
      const { data: liveData, error: liveError } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_mode", "live")
        .order("created_at", { ascending: false })
        .limit(50);

      if (liveError) throw liveError;

      setTestOrders(testData || []);
      setLiveOrders(liveData || []);

      // Calculate stats for test mode
      const testRevenue = (testData || []).reduce((sum, order) => sum + order.amount_total_cents, 0);
      setTestStats({
        totalRevenue: testRevenue,
        totalOrders: testData?.length || 0,
        averageOrder: testData?.length ? testRevenue / testData.length : 0,
      });

      // Calculate stats for live mode
      const liveRevenue = (liveData || []).reduce((sum, order) => sum + order.amount_total_cents, 0);
      setLiveStats({
        totalRevenue: liveRevenue,
        totalOrders: liveData?.length || 0,
        averageOrder: liveData?.length ? liveRevenue / liveData.length : 0,
      });
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatsCards = ({ stats, mode }: { stats: Stats; mode: "test" | "live" }) => (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
          <Badge variant={mode === "live" ? "destructive" : "secondary"} className="mt-2">
            {mode === "live" ? "Live" : "Test"}
          </Badge>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
          <p className="text-xs text-muted-foreground mt-2">Last 50 orders</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Average Order</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.averageOrder)}</div>
          <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
        </CardContent>
      </Card>
    </div>
  );

  const OrdersTable = ({ orders }: { orders: Order[] }) => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-white/5">
            <TableHead className="text-white">Order #</TableHead>
            <TableHead className="text-white">Date</TableHead>
            <TableHead className="text-white">Customer</TableHead>
            <TableHead className="text-white">Product</TableHead>
            <TableHead className="text-white text-right">Amount</TableHead>
            <TableHead className="text-white text-right">Donation</TableHead>
            <TableHead className="text-white">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{order.order_number}</TableCell>
                <TableCell className="text-white/70">{formatDate(order.created_at)}</TableCell>
                <TableCell className="text-white/70">{order.customer_email || "N/A"}</TableCell>
                <TableCell className="text-white/70">
                  {order.product_name || "Unknown"}
                  <span className="text-xs text-muted-foreground ml-2">×{order.quantity}</span>
                </TableCell>
                <TableCell className="text-right text-white font-medium">
                  {formatCurrency(order.amount_total_cents)}
                </TableCell>
                <TableCell className="text-right text-white/70">
                  {order.donation_cents > 0 ? formatCurrency(order.donation_cents) : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                    {order.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Transaction Dashboard</h1>
          <p className="text-white/70">View and manage test and live transactions</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur border border-white/20">
            <TabsTrigger value="test" className="data-[state=active]:bg-white/20 text-white">
              Test Mode
              <Badge variant="secondary" className="ml-2">{testOrders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-white/20 text-white">
              Live Mode
              <Badge variant="destructive" className="ml-2">{liveOrders.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Test Environment
                </CardTitle>
                <CardDescription className="text-white/70">
                  Sandbox transactions using test credentials - no real money involved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatsCards stats={testStats} mode="test" />
                <OrdersTable orders={testOrders} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Live Environment
                </CardTitle>
                <CardDescription className="text-white/70">
                  Real transactions with actual payments - handle with care
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatsCards stats={liveStats} mode="live" />
                <OrdersTable orders={liveOrders} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
