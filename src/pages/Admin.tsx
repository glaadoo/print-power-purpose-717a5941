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
  Clock, Send, DollarSign, ShoppingCart, Heart, TrendingUp, LogOut
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
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
    // Verify existing session on mount
    const sessionToken = sessionStorage.getItem("admin_session");
    if (sessionToken) {
      verifySession(sessionToken);
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const verifySession = async (sessionToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-key', {
        body: { sessionToken }
      });

      if (error || !data?.valid) {
        sessionStorage.removeItem("admin_session");
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        loadAllData();
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      sessionStorage.removeItem("admin_session");
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-key', {
        body: { key: adminKey }
      });

      if (error || !data?.valid) {
        toast.error("Invalid admin key");
        setAdminKey("");
      } else {
        // Store session token (not the key)
        sessionStorage.setItem("admin_session", data.sessionToken);
        setIsAuthenticated(true);
        loadAllData();
        toast.success("Access granted");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
      setAdminKey("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_session");
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
    navigate("/");
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

  // Checking auth
  if (checkingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

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
                <KeyRound className="w-12 h-12 mx-auto text-white mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
                <p className="text-white/70">Enter your admin key to access the panel</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="adminKey" className="text-white mb-2 block">Admin Key</Label>
                  <Input
                    id="adminKey"
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter admin key"
                    required
                    autoFocus
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-white/90"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Access Admin Panel"}
                </Button>
              </form>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Main admin panel content
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <VideoBackground 
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
      />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-primary">Admin Panel</h1>
          <Button variant="destructive" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut size={18} /> Logout
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="causes">Causes</TabsTrigger>
            <TabsTrigger value="schools">Schools</TabsTrigger>
            <TabsTrigger value="nonprofits">Nonprofits</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
            <TabsTrigger value="stories">Story Requests</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Revenue</CardTitle>
                  <CardDescription>From all orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${(totalRevenue / 100).toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Donations</CardTitle>
                  <CardDescription>Donations received</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${(totalDonations / 100).toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Causes</CardTitle>
                  <CardDescription>Causes with raised funds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{activeCauses}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Donations by Cause</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={donationsByCause}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {donationsByCause.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orders by Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ordersByWeek}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" name="Orders" />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="productName">Name</Label>
                  <Input id="productName" value={productName} onChange={e => setProductName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="productCost">Cost (USD)</Label>
                  <Input id="productCost" type="number" min="0" step="0.01" value={productCost} onChange={e => setProductCost(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="productCategory">Category</Label>
                  <Input id="productCategory" value={productCategory} onChange={e => setProductCategory(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="productImage">Image URL</Label>
                  <Input id="productImage" value={productImage} onChange={e => setProductImage(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="productVendorId">Vendor ID</Label>
                  <Input id="productVendorId" value={productVendorId} onChange={e => setProductVendorId(e.target.value)} />
                </div>
                <Button type="submit">Add Product</Button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Products List</h2>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>${(product.base_cost_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell>{product.vendor}</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product.id)} className="flex items-center gap-1">
                            <Trash2 size={16} /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="causes">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Add New Cause</h2>
              <form onSubmit={handleAddCause} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="causeName">Name</Label>
                  <Input id="causeName" value={causeName} onChange={e => setCauseName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="causeGoal">Goal (USD)</Label>
                  <Input id="causeGoal" type="number" min="0" step="0.01" value={causeGoal} onChange={e => setCauseGoal(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="causeSummary">Summary</Label>
                  <Textarea id="causeSummary" value={causeSummary} onChange={e => setCauseSummary(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="causeImage">Image URL</Label>
                  <Input id="causeImage" value={causeImage} onChange={e => setCauseImage(e.target.value)} />
                </div>
                <Button type="submit">Add Cause</Button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Causes List</h2>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Goal</TableHead>
                      <TableHead>Raised</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {causes.map(cause => (
                      <TableRow key={cause.id}>
                        <TableCell>{cause.name}</TableCell>
                        <TableCell>${(cause.goal_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>${(cause.raised_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCause(cause.id)} className="flex items-center gap-1">
                            <Trash2 size={16} /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="schools">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Add New School</h2>
              <form onSubmit={handleAddSchool} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="schoolName">Name</Label>
                  <Input id="schoolName" value={schoolName} onChange={e => setSchoolName(e.target.value)} required />
                </div>
                <Button type="submit">Add School</Button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Schools List</h2>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map(school => (
                      <TableRow key={school.id}>
                        <TableCell>{school.name}</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteSchool(school.id)} className="flex items-center gap-1">
                            <Trash2 size={16} /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="nonprofits">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Add New Nonprofit</h2>
              <form onSubmit={handleAddNonprofit} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="nonprofitName">Name</Label>
                  <Input id="nonprofitName" value={nonprofitName} onChange={e => setNonprofitName(e.target.value)} required />
                </div>
                <Button type="submit">Add Nonprofit</Button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Nonprofits List</h2>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonprofits.map(np => (
                      <TableRow key={np.id}>
                        <TableCell>{np.name}</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteNonprofit(np.id)} className="flex items-center gap-1">
                            <Trash2 size={16} /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button onClick={exportOrdersToCSV} className="flex items-center gap-2">
                <Download size={16} /> Export CSV
              </Button>
            </div>

            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer Email</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Donation</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>{order.order_number}</TableCell>
                      <TableCell>{order.customer_email}</TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell>${(order.amount_total_cents / 100).toFixed(2)}</TableCell>
                      <TableCell>${(order.donation_cents / 100).toFixed(2)}</TableCell>
                      <TableCell>{order.cause_name || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === "completed" ? "default" : order.status === "pending" ? "secondary" : "destructive"}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="donations">
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search donations..."
                  value={donationSearchTerm}
                  onChange={e => setDonationSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={donationCauseFilter}
                onChange={e => setDonationCauseFilter(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="all">All Causes</option>
                {causes.map(cause => (
                  <option key={cause.id} value={cause.id}>{cause.name}</option>
                ))}
              </select>
              <Button onClick={exportDonationsToCSV} className="flex items-center gap-2">
                <Download size={16} /> Export CSV
              </Button>
            </div>

            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Email</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.map(donation => (
                    <TableRow key={donation.id}>
                      <TableCell>{donation.customer_email}</TableCell>
                      <TableCell>${(donation.amount_cents / 100).toFixed(2)}</TableCell>
                      <TableCell>{causes.find(c => c.id === donation.cause_id)?.name || "N/A"}</TableCell>
                      <TableCell>{new Date(donation.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="errors">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Error Logs</h2>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorLogs.map(error => (
                      <TableRow key={error.id}>
                        <TableCell>{new Date(error.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{error.message}</TableCell>
                        <TableCell>
                          {error.resolved ? (
                            <CheckCircle className="text-green-500" />
                          ) : (
                            <AlertCircle className="text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="flex gap-2">
                          {!error.resolved && (
                            <Button size="sm" onClick={() => handleMarkErrorResolved(error.id)} className="flex items-center gap-1">
                              <Check size={16} /> Mark Resolved
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteErrorLog(error.id)} className="flex items-center gap-1">
                            <Trash2 size={16} /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="stories">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Story Requests</h2>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Email</TableHead>
                      <TableHead>Story</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storyRequests.map(story => (
                      <TableRow key={story.id}>
                        <TableCell>{story.customer_email}</TableCell>
                        <TableCell>{story.story_text}</TableCell>
                        <TableCell>
                          <Badge variant={
                            story.status === "approved" ? "default" :
                            story.status === "pending" ? "secondary" :
                            "destructive"
                          }>
                            {story.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(story.updated_at).toLocaleString()}</TableCell>
                        <TableCell className="flex gap-2">
                          {story.status !== "approved" && (
                            <Button size="sm" onClick={() => handleUpdateStoryStatus(story.id, "approved")} className="flex items-center gap-1">
                              <Check size={16} /> Approve
                            </Button>
                          )}
                          {story.status !== "rejected" && (
                            <Button variant="destructive" size="sm" onClick={() => handleUpdateStoryStatus(story.id, "rejected")} className="flex items-center gap-1">
                              <X size={16} /> Reject
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="sync">
            <div className="space-y-6 max-w-md">
              <h2 className="text-2xl font-semibold mb-4">Sync Products</h2>

              <div className="flex items-center justify-between gap-4">
                <Button onClick={syncSinaLite} disabled={syncing.sinalite} className="flex items-center gap-2">
                  <RefreshCw size={16} className={syncing.sinalite ? "animate-spin" : ""} /> Sync SinaLite
                </Button>
                {syncResults.sinalite && (
                  <span className={syncResults.sinalite.success ? "text-green-600" : "text-red-600"}>
                    {syncResults.sinalite.message}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <Button onClick={syncScalablePress} disabled={syncing.scalablepress} className="flex items-center gap-2">
                  <RefreshCw size={16} className={syncing.scalablepress ? "animate-spin" : ""} /> Sync Scalable Press
                </Button>
                {syncResults.scalablepress && (
                  <span className={syncResults.scalablepress.success ? "text-green-600" : "text-red-600"}>
                    {syncResults.scalablepress.message}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <Button onClick={syncPsRestful} disabled={syncing.psrestful} className="flex items-center gap-2">
                  <RefreshCw size={16} className={syncing.psrestful ? "animate-spin" : ""} /> Sync PsRestful
                </Button>
                {syncResults.psrestful && (
                  <span className={syncResults.psrestful.success ? "text-green-600" : "text-red-600"}>
                    {syncResults.psrestful.message}
                  </span>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
