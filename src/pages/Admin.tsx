import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trash2, KeyRound, RefreshCw, Download, Search,
  AlertCircle, CheckCircle, X, ArrowLeft, Check,
  Clock, Send, DollarSign, ShoppingCart, Heart, TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [causes, setCauses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [nonprofits, setNonprofits] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [storyRequests, setStoryRequests] = useState<any[]>([]);

  // Product form
  const [productName, setProductName] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productVendor, setProductVendor] = useState("mock");
  const [productVendorId, setProductVendorId] = useState("");

  // Cause form
  const [causeName, setCauseName] = useState("");
  const [causeGoal, setCauseGoal] = useState("");
  const [causeSummary, setCauseSummary] = useState("");
  const [causeImage, setCauseImage] = useState("");

  // School form
  const [schoolName, setSchoolName] = useState("");

  // Nonprofit form
  const [nonprofitName, setNonprofitName] = useState("");

  // Orders filters
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Donations filters
  const [donationSearchTerm, setDonationSearchTerm] = useState("");
  const [donationCauseFilter, setDonationCauseFilter] = useState("all");

  // Sync states
  const [syncing, setSyncing] = useState({
    sinalite: false,
    scalablepress: false,
    psrestful: false
  });
  const [syncResults, setSyncResults] = useState<Record<string, { success: boolean; message: string } | null>>({
    sinalite: null,
    scalablepress: null,
    psrestful: null
  });

  useEffect(() => {
    const storedKey = sessionStorage.getItem("admin_key");
    if (storedKey) {
      verifyKey(storedKey);
    }
  }, []);

  const verifyKey = async (key: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-admin-key", {
        body: { key }
      });

      if (error) throw error;

      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_key", key);
        loadAllData();
      } else {
        toast.error("Invalid admin key");
        sessionStorage.removeItem("admin_key");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
      sessionStorage.removeItem("admin_key");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyKey(adminKey);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_key");
    setIsAuthenticated(false);
    setAdminKey("");
    toast.success("Logged out");
  };

  const loadAllData = async () => {
    const [
      productsRes, causesRes, schoolsRes, nonprofitsRes, errorLogsRes,
      ordersRes, donationsRes, storyRequestsRes
    ] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("causes").select("*").order("created_at", { ascending: false }),
      supabase.from("schools").select("*").order("created_at", { ascending: false }),
      supabase.from("nonprofits").select("*").order("created_at", { ascending: false }),
      supabase.from("error_logs").select("*").order("timestamp", { ascending: false }).limit(50),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("donations").select("*").order("created_at", { ascending: false }),
      supabase.from("story_requests").select("*").order("created_at", { ascending: false })
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (causesRes.data) setCauses(causesRes.data);
    if (schoolsRes.data) setSchools(schoolsRes.data);
    if (nonprofitsRes.data) setNonprofits(nonprofitsRes.data);
    if (errorLogsRes.data) setErrorLogs(errorLogsRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    if (donationsRes.data) setDonations(donationsRes.data);
    if (storyRequestsRes.data) setStoryRequests(storyRequestsRes.data);
  };

  // CRUD Operations
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("products").insert({
      name: productName,
      base_cost_cents: parseInt(productCost) * 100,
      category: productCategory || null,
      image_url: productImage || null,
      vendor: productVendor,
      vendor_id: productVendorId
    });

    if (error) {
      toast.error("Failed to add product: " + error.message);
    } else {
      toast.success("Product added successfully!");
      setProductName("");
      setProductCost("");
      setProductCategory("");
      setProductImage("");
      setProductVendorId("");
      loadAllData();
    }
  };

  const handleAddCause = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("causes").insert({
      name: causeName,
      goal_cents: parseInt(causeGoal) * 100,
      summary: causeSummary || null,
      image_url: causeImage || null
    });

    if (error) {
      toast.error("Failed to add cause: " + error.message);
    } else {
      toast.success("Cause added successfully!");
      setCauseName("");
      setCauseGoal("");
      setCauseSummary("");
      setCauseImage("");
      loadAllData();
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("schools").insert({
      name: schoolName
    });

    if (error) {
      toast.error("Failed to add school: " + error.message);
    } else {
      toast.success("School added successfully!");
      setSchoolName("");
      loadAllData();
    }
  };

  const handleAddNonprofit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("nonprofits").insert({
      name: nonprofitName
    });

    if (error) {
      toast.error("Failed to add nonprofit: " + error.message);
    } else {
      toast.success("Nonprofit added successfully!");
      setNonprofitName("");
      loadAllData();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Failed to delete product");
    else { toast.success("Product deleted"); loadAllData(); }
  };

  const handleDeleteCause = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cause?")) return;
    const { error } = await supabase.from("causes").delete().eq("id", id);
    if (error) toast.error("Failed to delete cause");
    else { toast.success("Cause deleted"); loadAllData(); }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm("Are you sure you want to delete this school?")) return;
    const { error } = await supabase.from("schools").delete().eq("id", id);
    if (error) toast.error("Failed to delete school");
    else { toast.success("School deleted"); loadAllData(); }
  };

  const handleDeleteNonprofit = async (id: string) => {
    if (!confirm("Are you sure you want to delete this nonprofit?")) return;
    const { error } = await supabase.from("nonprofits").delete().eq("id", id);
    if (error) toast.error("Failed to delete nonprofit");
    else { toast.success("Nonprofit deleted"); loadAllData(); }
  };

  const handleMarkErrorResolved = async (id: string) => {
    const { error } = await supabase.from("error_logs").update({ resolved: true }).eq("id", id);
    if (error) toast.error("Failed to update error log");
    else { toast.success("Error marked as resolved"); loadAllData(); }
  };

  const handleDeleteErrorLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this error log?")) return;
    const { error } = await supabase.from("error_logs").delete().eq("id", id);
    if (error) toast.error("Failed to delete error log");
    else { toast.success("Error log deleted"); loadAllData(); }
  };

  const handleUpdateStoryStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("story_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Failed to update status");
    else { toast.success("Status updated"); loadAllData(); }
  };

  // Sync functions
  const syncSinaLite = async () => {
    setSyncing(prev => ({ ...prev, sinalite: true }));
    try {
      const { data, error } = await supabase.functions.invoke('sync-sinalite');
      if (error) throw error;
      setSyncResults(prev => ({ ...prev, sinalite: { success: true, message: data.message || 'Sync completed successfully' } }));
      toast.success('SinaLite products synced successfully');
      loadAllData();
    } catch (error: any) {
      setSyncResults(prev => ({ ...prev, sinalite: { success: false, message: error.message || 'Sync failed' } }));
      toast.error('Failed to sync SinaLite products');
    } finally {
      setSyncing(prev => ({ ...prev, sinalite: false }));
    }
  };

  const syncScalablePress = async () => {
    setSyncing(prev => ({ ...prev, scalablepress: true }));
    try {
      const { data, error } = await supabase.functions.invoke('sync-scalablepress');
      if (error) throw error;
      setSyncResults(prev => ({ ...prev, scalablepress: { success: true, message: data.message || 'Sync completed successfully' } }));
      toast.success('Scalable Press products synced successfully');
      loadAllData();
    } catch (error: any) {
      setSyncResults(prev => ({ ...prev, scalablepress: { success: false, message: error.message || 'Sync failed' } }));
      toast.error('Failed to sync Scalable Press products');
    } finally {
      setSyncing(prev => ({ ...prev, scalablepress: false }));
    }
  };

  const syncPsRestful = async () => {
    setSyncing(prev => ({ ...prev, psrestful: true }));
    try {
      const { data, error } = await supabase.functions.invoke('sync-psrestful');
      if (error) throw error;
      setSyncResults(prev => ({ ...prev, psrestful: { success: true, message: data.message || 'Sync completed successfully' } }));
      toast.success('PsRestful products synced successfully');
      loadAllData();
    } catch (error: any) {
      setSyncResults(prev => ({ ...prev, psrestful: { success: false, message: error.message || 'Sync failed' } }));
      toast.error('Failed to sync PsRestful products');
    } finally {
      setSyncing(prev => ({ ...prev, psrestful: false }));
    }
  };

  // Export functions
  const exportOrdersToCSV = () => {
    const filteredOrders = orders.filter(order => {
      const matchesSearch = 
        order.customer_email?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.order_number?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.product_name?.toLowerCase().includes(orderSearchTerm.toLowerCase());
      const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });

    const headers = ["Order Number", "Customer Email", "Product", "Amount", "Donation", "Cause", "Status", "Date"];
    const rows = filteredOrders.map(o => [
      o.order_number, o.customer_email, o.product_name,
      `$${(o.amount_total_cents / 100).toFixed(2)}`,
      `$${(o.donation_cents / 100).toFixed(2)}`,
      o.cause_name || "N/A", o.status,
      new Date(o.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  const exportDonationsToCSV = () => {
    const filteredDonations = donations.filter(donation => {
      const matchesSearch = donation.customer_email?.toLowerCase().includes(donationSearchTerm.toLowerCase());
      const matchesCause = donationCauseFilter === "all" || donation.cause_id === donationCauseFilter;
      return matchesSearch && matchesCause;
    });

    const headers = ["Customer Email", "Amount", "Cause ID", "Date"];
    const rows = filteredDonations.map(d => [
      d.customer_email,
      `$${(d.amount_cents / 100).toFixed(2)}`,
      d.cause_id || "N/A",
      new Date(d.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  // Analytics calculations
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount_total_cents, 0);
  const totalDonations = donations.reduce((sum, d) => sum + d.amount_cents, 0);
  const activeCauses = causes.filter(c => c.raised_cents > 0).length;

  const donationsByCause = causes.map(cause => ({
    name: cause.name,
    value: donations.filter(d => d.cause_id === cause.id).reduce((sum, d) => sum + d.amount_cents, 0) / 100,
    raised: cause.raised_cents / 100,
    goal: cause.goal_cents / 100
  })).filter(c => c.raised > 0).sort((a, b) => b.raised - a.raised);

  const ordersByWeek = orders.reduce((acc: any, order) => {
    const week = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = acc.find((w: any) => w.week === week);
    if (existing) {
      existing.count += 1;
      existing.revenue += order.amount_total_cents / 100;
    } else {
      acc.push({ week, count: 1, revenue: order.amount_total_cents / 100 });
    }
    return acc;
  }, []).slice(-8);

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  // Filter functions
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_email?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(orderSearchTerm.toLowerCase());
    const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.customer_email?.toLowerCase().includes(donationSearchTerm.toLowerCase());
    const matchesCause = donationCauseFilter === "all" || donation.cause_id === donationCauseFilter;
    return matchesSearch && matchesCause;
  });

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 text-white">
        <VideoBackground 
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/60" />}
        />
        
        <div className="relative h-full flex items-center justify-center px-4">
          <GlassCard className="w-full max-w-md">
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
                <p className="text-white/70">Enter your admin key to continue</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-key" className="text-white mb-2 block">Admin Key</Label>
                  <Input
                    id="admin-key"
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter admin key"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Login"}
                </Button>
              </form>
              
              <Button 
                onClick={() => navigate("/")} 
                variant="outline" 
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Back to Home
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="fixed inset-0 text-white">
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase" aria-label="Print Power Purpose Home">
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen py-12 px-4">
          <VideoBackground 
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />
          
          <div className="relative max-w-7xl mx-auto space-y-6">
            <GlassCard>
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
                <Button onClick={handleLogout} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8 bg-white/10">
                  <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/20 text-white">Dashboard</TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-white/20 text-white">Analytics</TabsTrigger>
                  <TabsTrigger value="orders" className="data-[state=active]:bg-white/20 text-white">Orders</TabsTrigger>
                  <TabsTrigger value="donations" className="data-[state=active]:bg-white/20 text-white">Donations</TabsTrigger>
                  <TabsTrigger value="stories" className="data-[state=active]:bg-white/20 text-white">Stories</TabsTrigger>
                  <TabsTrigger value="sync" className="data-[state=active]:bg-white/20 text-white">Sync</TabsTrigger>
                  <TabsTrigger value="products" className="data-[state=active]:bg-white/20 text-white">Products</TabsTrigger>
                  <TabsTrigger value="causes" className="data-[state=active]:bg-white/20 text-white">Causes</TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <div className="text-4xl">📦</div>
                          <div className="text-2xl font-bold text-white">{products.length}</div>
                          <div className="text-white/70 text-sm">Total Products</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <div className="text-4xl">🎯</div>
                          <div className="text-2xl font-bold text-white">{causes.length}</div>
                          <div className="text-white/70 text-sm">Total Causes</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <div className="text-4xl">🏫</div>
                          <div className="text-2xl font-bold text-white">{schools.length}</div>
                          <div className="text-white/70 text-sm">Total Schools</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <div className="text-4xl">🤝</div>
                          <div className="text-2xl font-bold text-white">{nonprofits.length}</div>
                          <div className="text-white/70 text-sm">Total Nonprofits</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <div className="text-4xl">📋</div>
                          <div className="text-2xl font-bold text-white">{orders.length}</div>
                          <div className="text-white/70 text-sm">Total Orders</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <div className="text-4xl">💝</div>
                          <div className="text-2xl font-bold text-white">{donations.length}</div>
                          <div className="text-white/70 text-sm">Total Donations</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Error Logs */}
                  {errorLogs.filter(log => !log.resolved).length > 0 && (
                    <Card className="bg-red-500/10 border-red-500/20">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          Unresolved Errors ({errorLogs.filter(log => !log.resolved).length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64">
                          <div className="space-y-4">
                            {errorLogs.filter(log => !log.resolved).map((log) => (
                              <Card key={log.id} className="bg-destructive/10 border-destructive/20">
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="destructive">Active</Badge>
                                        <span className="text-xs text-white/50">
                                          {new Date(log.timestamp).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="font-semibold text-sm text-white">{log.error_message}</p>
                                      {log.file_name && <p className="text-xs text-white/50">File: {log.file_name}</p>}
                                      {log.page_url && <p className="text-xs text-white/50">Page: {log.page_url}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" onClick={() => handleMarkErrorResolved(log.id)}>
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleDeleteErrorLog(log.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-lg">
                            <ShoppingCart className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">{orders.length}</div>
                            <div className="text-white/70 text-sm">Total Orders</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-lg">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">${(totalRevenue / 100).toFixed(2)}</div>
                            <div className="text-white/70 text-sm">Total Revenue</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-lg">
                            <Heart className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">${(totalDonations / 100).toFixed(2)}</div>
                            <div className="text-white/70 text-sm">Total Donations</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/10 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">{activeCauses}</div>
                            <div className="text-white/70 text-sm">Active Causes</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Orders & Revenue by Week</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={ordersByWeek}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="week" stroke="#fff" />
                            <YAxis stroke="#fff" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                              labelStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue ($)" />
                            <Bar dataKey="count" fill="#ec4899" name="Orders" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Top Causes by Donations</CardTitle>
                      </CardHeader>
                      <CardContent className="px-2">
                        <ResponsiveContainer width="100%" height={400}>
                          <PieChart>
                            <Pie
                              data={donationsByCause}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={(entry) => `${entry.name}: $${entry.raised.toFixed(2)}`}
                              outerRadius={70}
                              fill="#8884d8"
                              dataKey="raised"
                            >
                              {donationsByCause.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Cause Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {causes.sort((a, b) => b.raised_cents - a.raised_cents).map((cause) => {
                        const progress = Math.min((cause.raised_cents / cause.goal_cents) * 100, 100);
                        const reached777 = cause.raised_cents >= 77700;
                        
                        return (
                          <div key={cause.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{cause.name}</span>
                                {reached777 && (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                    $777 Reached 🎉
                                  </span>
                                )}
                              </div>
                              <span className="text-white/70 text-sm">
                                ${(cause.raised_cents / 100).toFixed(2)} / ${(cause.goal_cents / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Orders Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-64">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                            <Input
                              placeholder="Search by email, order number, product..."
                              value={orderSearchTerm}
                              onChange={(e) => setOrderSearchTerm(e.target.value)}
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant={orderStatusFilter === "all" ? "default" : "outline"}
                            onClick={() => setOrderStatusFilter("all")}
                            className={orderStatusFilter !== "all" ? "bg-white/10 border-white/20 text-white" : ""}
                          >
                            All
                          </Button>
                          <Button 
                            variant={orderStatusFilter === "completed" ? "default" : "outline"}
                            onClick={() => setOrderStatusFilter("completed")}
                            className={orderStatusFilter !== "completed" ? "bg-white/10 border-white/20 text-white" : ""}
                          >
                            Completed
                          </Button>
                          <Button 
                            variant={orderStatusFilter === "pending" ? "default" : "outline"}
                            onClick={() => setOrderStatusFilter("pending")}
                            className={orderStatusFilter !== "pending" ? "bg-white/10 border-white/20 text-white" : ""}
                          >
                            Pending
                          </Button>
                        </div>
                        <Button onClick={exportOrdersToCSV} className="gap-2">
                          <Download className="h-4 w-4" />
                          Export CSV
                        </Button>
                      </div>

                      <div className="bg-white/5 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                              <TableHead className="text-white/80">Order #</TableHead>
                              <TableHead className="text-white/80">Customer</TableHead>
                              <TableHead className="text-white/80">Product</TableHead>
                              <TableHead className="text-white/80">Amount</TableHead>
                              <TableHead className="text-white/80">Donation</TableHead>
                              <TableHead className="text-white/80">Cause</TableHead>
                              <TableHead className="text-white/80">Status</TableHead>
                              <TableHead className="text-white/80">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOrders.map((order) => (
                              <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                                <TableCell className="text-white font-mono text-sm">{order.order_number}</TableCell>
                                <TableCell className="text-white">{order.customer_email}</TableCell>
                                <TableCell className="text-white">{order.product_name}</TableCell>
                                <TableCell className="text-white">${(order.amount_total_cents / 100).toFixed(2)}</TableCell>
                                <TableCell className="text-white">${(order.donation_cents / 100).toFixed(2)}</TableCell>
                                <TableCell className="text-white">{order.cause_name || "—"}</TableCell>
                                <TableCell>
                                  <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-white/70 text-sm">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {filteredOrders.length === 0 && (
                          <div className="text-center py-12 text-white/50">
                            No orders found
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Donations Tab */}
                <TabsContent value="donations" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white">{filteredDonations.length}</div>
                          <div className="text-white/70 text-sm">Total Donations</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white">
                            ${(filteredDonations.reduce((sum, d) => sum + d.amount_cents, 0) / 100).toFixed(2)}
                          </div>
                          <div className="text-white/70 text-sm">Total Amount</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white">
                            ${filteredDonations.length > 0 ? (filteredDonations.reduce((sum, d) => sum + d.amount_cents, 0) / filteredDonations.length / 100).toFixed(2) : "0.00"}
                          </div>
                          <div className="text-white/70 text-sm">Average Donation</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Donations Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-64">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                            <Input
                              placeholder="Search by email..."
                              value={donationSearchTerm}
                              onChange={(e) => setDonationSearchTerm(e.target.value)}
                              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            />
                          </div>
                        </div>
                        <select
                          value={donationCauseFilter}
                          onChange={(e) => setDonationCauseFilter(e.target.value)}
                          className="px-4 py-2 rounded-md bg-white/10 border border-white/20 text-white"
                        >
                          <option value="all">All Causes</option>
                          {causes.map(cause => (
                            <option key={cause.id} value={cause.id}>{cause.name}</option>
                          ))}
                        </select>
                        <Button onClick={exportDonationsToCSV} className="gap-2">
                          <Download className="h-4 w-4" />
                          Export CSV
                        </Button>
                      </div>

                      <div className="bg-white/5 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                              <TableHead className="text-white/80">Customer Email</TableHead>
                              <TableHead className="text-white/80">Amount</TableHead>
                              <TableHead className="text-white/80">Cause</TableHead>
                              <TableHead className="text-white/80">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredDonations.map((donation) => {
                              const cause = causes.find(c => c.id === donation.cause_id);
                              return (
                                <TableRow key={donation.id} className="border-white/10 hover:bg-white/5">
                                  <TableCell className="text-white">{donation.customer_email}</TableCell>
                                  <TableCell className="text-white font-semibold">${(donation.amount_cents / 100).toFixed(2)}</TableCell>
                                  <TableCell className="text-white">{cause?.name || "—"}</TableCell>
                                  <TableCell className="text-white/70 text-sm">
                                    {new Date(donation.created_at).toLocaleDateString()}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {filteredDonations.length === 0 && (
                          <div className="text-center py-12 text-white/50">
                            No donations found
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Story Requests Tab */}
                <TabsContent value="stories" className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Story Requests ($777 Milestones)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-white/5 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                              <TableHead className="text-white/80">Cause</TableHead>
                              <TableHead className="text-white/80">Amount Raised</TableHead>
                              <TableHead className="text-white/80">Contact Email</TableHead>
                              <TableHead className="text-white/80">Status</TableHead>
                              <TableHead className="text-white/80">Reached At</TableHead>
                              <TableHead className="text-white/80">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {storyRequests.map((request) => {
                              const cause = causes.find(c => c.id === request.cause_id);
                              return (
                                <TableRow key={request.id} className="border-white/10 hover:bg-white/5">
                                  <TableCell className="text-white font-medium">
                                    {cause?.name || "Unknown Cause"}
                                  </TableCell>
                                  <TableCell className="text-white">
                                    ${cause ? (cause.raised_cents / 100).toFixed(2) : "0.00"}
                                  </TableCell>
                                  <TableCell className="text-white">{request.contact_email}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={
                                        request.status === "completed" ? "default" :
                                        request.status === "in_progress" ? "secondary" :
                                        "outline"
                                      }
                                      className={
                                        request.status === "pending" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : ""
                                      }
                                    >
                                      {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                      {request.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                      {request.status === "in_progress" && <Send className="h-3 w-3 mr-1" />}
                                      {request.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-white/70 text-sm">
                                    {new Date(request.reached_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      {request.status === "pending" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUpdateStoryStatus(request.id, "in_progress")}
                                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                        >
                                          Start
                                        </Button>
                                      )}
                                      {request.status === "in_progress" && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateStoryStatus(request.id, "completed")}
                                        >
                                          Complete
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {storyRequests.length === 0 && (
                          <div className="text-center py-12 text-white/50">
                            No story requests yet. Requests are created when causes reach $777.
                          </div>
                        )}
                      </div>

                      {storyRequests.length > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <h3 className="text-white font-medium mb-2">📋 Next Steps for Story Requests:</h3>
                          <ol className="text-white/80 text-sm space-y-1 list-decimal list-inside">
                            <li>Contact the nonprofit/school for their story</li>
                            <li>Request photos and testimonials</li>
                            <li>Prepare content for Pressmaster.ai</li>
                            <li>Mark as completed when published</li>
                          </ol>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sync Tab */}
                <TabsContent value="sync" className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">SinaLite Products</CardTitle>
                      <CardDescription className="text-white/70">Sync products from SinaLite API</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        onClick={syncSinaLite}
                        disabled={syncing.sinalite}
                        className="w-full"
                      >
                        {syncing.sinalite ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync SinaLite
                          </>
                        )}
                      </Button>
                      {syncResults.sinalite && (
                        <div className={`p-4 rounded-lg ${syncResults.sinalite.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                          <div className="flex items-center gap-2 text-white">
                            {syncResults.sinalite.success ? (
                              <Check className="h-5 w-5 text-green-400" />
                            ) : (
                              <X className="h-5 w-5 text-red-400" />
                            )}
                            <span className="font-medium">{syncResults.sinalite.message}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Scalable Press Products</CardTitle>
                      <CardDescription className="text-white/70">Sync products from Scalable Press API</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        onClick={syncScalablePress}
                        disabled={syncing.scalablepress}
                        className="w-full"
                      >
                        {syncing.scalablepress ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync Scalable Press
                          </>
                        )}
                      </Button>
                      {syncResults.scalablepress && (
                        <div className={`p-4 rounded-lg ${syncResults.scalablepress.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                          <div className="flex items-center gap-2 text-white">
                            {syncResults.scalablepress.success ? (
                              <Check className="h-5 w-5 text-green-400" />
                            ) : (
                              <X className="h-5 w-5 text-red-400" />
                            )}
                            <span className="font-medium">{syncResults.scalablepress.message}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">PsRestful Products</CardTitle>
                      <CardDescription className="text-white/70">Sync products from PsRestful API</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        onClick={syncPsRestful}
                        disabled={syncing.psrestful}
                        className="w-full"
                      >
                        {syncing.psrestful ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync PsRestful
                          </>
                        )}
                      </Button>
                      {syncResults.psrestful && (
                        <div className={`p-4 rounded-lg ${syncResults.psrestful.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                          <div className="flex items-center gap-2 text-white">
                            {syncResults.psrestful.success ? (
                              <Check className="h-5 w-5 text-green-400" />
                            ) : (
                              <X className="h-5 w-5 text-red-400" />
                            )}
                            <span className="font-medium">{syncResults.psrestful.message}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Products Tab */}
                <TabsContent value="products" className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Add New Product</CardTitle>
                      <CardDescription className="text-white/70">Fill in the details to add a new product</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddProduct} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product-name" className="text-white">Product Name *</Label>
                            <Input
                              id="product-name"
                              value={productName}
                              onChange={(e) => setProductName(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-cost" className="text-white">Price (USD) *</Label>
                            <Input
                              id="product-cost"
                              type="number"
                              step="0.01"
                              value={productCost}
                              onChange={(e) => setProductCost(e.target.value)}
                              placeholder="29.99"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-category" className="text-white">Category</Label>
                            <Input
                              id="product-category"
                              value={productCategory}
                              onChange={(e) => setProductCategory(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-vendor-id" className="text-white">Vendor ID *</Label>
                            <Input
                              id="product-vendor-id"
                              value={productVendorId}
                              onChange={(e) => setProductVendorId(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="product-image" className="text-white">Image URL</Label>
                          <Input
                            id="product-image"
                            type="url"
                            value={productImage}
                            onChange={(e) => setProductImage(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                        </div>
                        <Button type="submit">Add Product</Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">All Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10">
                            <TableHead className="text-white/90">Name</TableHead>
                            <TableHead className="text-white/90">Price</TableHead>
                            <TableHead className="text-white/90">Category</TableHead>
                            <TableHead className="text-white/90">Vendor ID</TableHead>
                            <TableHead className="text-white/90">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product.id} className="border-white/10">
                              <TableCell className="text-white">{product.name}</TableCell>
                              <TableCell className="text-white">${(product.base_cost_cents / 100).toFixed(2)}</TableCell>
                              <TableCell className="text-white/70">{product.category || "—"}</TableCell>
                              <TableCell className="text-white/70">{product.vendor_id}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Causes Tab */}
                <TabsContent value="causes" className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Add New Cause</CardTitle>
                      <CardDescription className="text-white/70">Fill in the details to add a new cause</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddCause} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cause-name" className="text-white">Cause Name *</Label>
                            <Input
                              id="cause-name"
                              value={causeName}
                              onChange={(e) => setCauseName(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cause-goal" className="text-white">Goal Amount (USD) *</Label>
                            <Input
                              id="cause-goal"
                              type="number"
                              step="0.01"
                              value={causeGoal}
                              onChange={(e) => setCauseGoal(e.target.value)}
                              placeholder="10000"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cause-summary" className="text-white">Summary</Label>
                          <Textarea
                            id="cause-summary"
                            value={causeSummary}
                            onChange={(e) => setCauseSummary(e.target.value)}
                            rows={3}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cause-image" className="text-white">Image URL</Label>
                          <Input
                            id="cause-image"
                            type="url"
                            value={causeImage}
                            onChange={(e) => setCauseImage(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="school-name" className="text-white">Add School</Label>
                          <div className="flex gap-2">
                            <Input
                              id="school-name"
                              value={schoolName}
                              onChange={(e) => setSchoolName(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              placeholder="e.g., Lincoln High School"
                            />
                            <Button type="button" onClick={handleAddSchool}>Add</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nonprofit-name" className="text-white">Add Nonprofit</Label>
                          <div className="flex gap-2">
                            <Input
                              id="nonprofit-name"
                              value={nonprofitName}
                              onChange={(e) => setNonprofitName(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              placeholder="e.g., Local Food Bank"
                            />
                            <Button type="button" onClick={handleAddNonprofit}>Add</Button>
                          </div>
                        </div>
                        <Button type="submit">Add Cause</Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">All Causes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10">
                            <TableHead className="text-white/90">Name</TableHead>
                            <TableHead className="text-white/90">Goal</TableHead>
                            <TableHead className="text-white/90">Raised</TableHead>
                            <TableHead className="text-white/90">Summary</TableHead>
                            <TableHead className="text-white/90">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {causes.map((cause) => (
                            <TableRow key={cause.id} className="border-white/10">
                              <TableCell className="text-white">{cause.name}</TableCell>
                              <TableCell className="text-white">${(cause.goal_cents / 100).toFixed(2)}</TableCell>
                              <TableCell className="text-white">${(cause.raised_cents / 100).toFixed(2)}</TableCell>
                              <TableCell className="text-white/70 max-w-xs truncate">{cause.summary || "—"}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCause(cause.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Schools ({schools.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {schools.map((school) => (
                              <div key={school.id} className="flex justify-between items-center p-2 bg-white/5 rounded">
                                <span className="text-white">{school.name}</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteSchool(school.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Nonprofits ({nonprofits.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {nonprofits.map((nonprofit) => (
                              <div key={nonprofit.id} className="flex justify-between items-center p-2 bg-white/5 rounded">
                                <span className="text-white">{nonprofit.name}</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteNonprofit(nonprofit.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
