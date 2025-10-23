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
import { toast } from "sonner";
import { Trash2, KeyRound, RefreshCw, Menu, AlertCircle, CheckCircle, X } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [products, setProducts] = useState<any[]>([]);
  const [causes, setCauses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [nonprofits, setNonprofits] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);

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

  useEffect(() => {
    // Check authentication with proper Supabase Auth
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/admin-login');
        return;
      }

      setUserId(session.user.id);

      // Verify admin role from database
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        toast.error("Error verifying admin access");
        navigate('/admin-login');
        return;
      }

      if (!roles) {
        toast.error("You don't have admin access");
        navigate('/admin-login');
        return;
      }

      setIsAdmin(true);
      loadData();
      setLoading(false);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        navigate('/admin-login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate('/admin-login');
  };

  const loadData = async () => {
    const [productsRes, causesRes, schoolsRes, nonprofitsRes, errorLogsRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("causes").select("*").order("created_at", { ascending: false }),
      supabase.from("schools").select("*").order("created_at", { ascending: false }),
      supabase.from("nonprofits").select("*").order("created_at", { ascending: false }),
      supabase.from("error_logs").select("*").order("timestamp", { ascending: false }).limit(50)
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (causesRes.data) setCauses(causesRes.data);
    if (schoolsRes.data) setSchools(schoolsRes.data);
    if (nonprofitsRes.data) setNonprofits(nonprofitsRes.data);
    if (errorLogsRes.data) setErrorLogs(errorLogsRes.data);
  };


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
      loadData();
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
      loadData();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      loadData();
    }
  };

  const handleDeleteCause = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cause?")) return;

    const { error } = await supabase.from("causes").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete cause");
    } else {
      toast.success("Cause deleted");
      loadData();
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
      loadData();
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm("Are you sure you want to delete this school?")) return;

    const { error } = await supabase.from("schools").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete school");
    } else {
      toast.success("School deleted");
      loadData();
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
      loadData();
    }
  };

  const handleDeleteNonprofit = async (id: string) => {
    if (!confirm("Are you sure you want to delete this nonprofit?")) return;

    const { error } = await supabase.from("nonprofits").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete nonprofit");
    } else {
      toast.success("Nonprofit deleted");
      loadData();
    }
  };

  const handleMarkErrorResolved = async (id: string) => {
    const { error } = await supabase.from("error_logs").update({ resolved: true }).eq("id", id);
    
    if (error) {
      toast.error("Failed to update error log");
    } else {
      toast.success("Error marked as resolved");
      loadData();
    }
  };

  const handleDeleteErrorLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this error log?")) return;

    const { error } = await supabase.from("error_logs").delete().eq("id", id);
    
    if (error) {
      toast.error("Failed to delete error log");
    } else {
      toast.success("Error log deleted");
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect to login
  }

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
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="bg-white/95 backdrop-blur w-80 border-white/20">
                      <SheetHeader>
                        <SheetTitle className="text-foreground">Admin Menu</SheetTitle>
                        <SheetDescription className="text-muted-foreground">Quick access to admin tools</SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <Button 
                          onClick={() => navigate("/admin/orders")}
                          variant="outline" 
                          className="w-full justify-start bg-white border-gray-200 text-foreground hover:bg-gray-50" 
                          size="lg"
                        >
                          📦 Orders
                        </Button>
                        <Button 
                          onClick={() => navigate("/admin/donations")}
                          variant="outline" 
                          className="w-full justify-start bg-white border-gray-200 text-foreground hover:bg-gray-50" 
                          size="lg"
                        >
                          💝 Donations
                        </Button>
                        <Button 
                          onClick={() => navigate("/admin/analytics")}
                          variant="outline" 
                          className="w-full justify-start bg-white border-gray-200 text-foreground hover:bg-gray-50" 
                          size="lg"
                        >
                          📊 Analytics
                        </Button>
                        <Button 
                          onClick={() => navigate("/admin/story-requests")}
                          variant="outline" 
                          className="w-full justify-start bg-white border-gray-200 text-foreground hover:bg-gray-50" 
                          size="lg"
                        >
                          📖 Story Requests
                        </Button>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="outline" className="w-full justify-start bg-white border-gray-200 text-foreground hover:bg-gray-50" size="lg">
                              <AlertCircle className="mr-2 h-5 w-5" />
                              Error Logs
                              {errorLogs.filter(log => !log.resolved).length > 0 && (
                                <Badge variant="destructive" className="ml-auto">
                                  {errorLogs.filter(log => !log.resolved).length}
                                </Badge>
                              )}
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="right" className="bg-white/95 backdrop-blur w-full sm:max-w-3xl overflow-y-auto border-white/20">
                            <SheetHeader>
                              <SheetTitle className="text-foreground">Error Logs</SheetTitle>
                              <SheetDescription className="text-muted-foreground">Track and manage application errors</SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-4">
                              {errorLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                  <p>No errors logged</p>
                                </div>
                              ) : (
                                errorLogs.map((log) => (
                                  <Card key={log.id} className={`${log.resolved ? 'bg-muted/50' : 'bg-destructive/10 border-destructive/20'}`}>
                                    <CardContent className="pt-6">
                                      <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Badge variant={log.resolved ? "secondary" : "destructive"}>
                                              {log.resolved ? "Resolved" : "Active"}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                          </div>
                                          <p className="font-semibold text-sm text-foreground">{log.error_message}</p>
                                          {log.file_name && (
                                            <p className="text-xs text-muted-foreground">
                                              File: {log.file_name}
                                            </p>
                                          )}
                                          {log.page_url && (
                                            <p className="text-xs text-muted-foreground">
                                              Page: {log.page_url}
                                            </p>
                                          )}
                                          {log.error_stack && (
                                            <details className="mt-2">
                                              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                                View Stack Trace
                                              </summary>
                                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto text-foreground">
                                                {log.error_stack}
                                              </pre>
                                            </details>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          {!log.resolved && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleMarkErrorResolved(log.id)}
                                            >
                                              <CheckCircle className="h-4 w-4" />
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteErrorLog(log.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </SheetContent>
                        </Sheet>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
                </div>
                <Button onClick={handleLogout} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </GlassCard>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div onClick={() => navigate("/admin/orders")} className="cursor-pointer hover:scale-105 transition-transform">
                <GlassCard className="p-6">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">📦</div>
                    <h3 className="text-xl font-bold text-white">Orders</h3>
                    <p className="text-white/70 text-sm">View and manage all orders</p>
                  </div>
                </GlassCard>
              </div>

              <div onClick={() => navigate("/admin/donations")} className="cursor-pointer hover:scale-105 transition-transform">
                <GlassCard className="p-6">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">💝</div>
                    <h3 className="text-xl font-bold text-white">Donations</h3>
                    <p className="text-white/70 text-sm">Track donations and totals</p>
                  </div>
                </GlassCard>
              </div>

              <div onClick={() => navigate("/admin/analytics")} className="cursor-pointer hover:scale-105 transition-transform">
                <GlassCard className="p-6">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">📊</div>
                    <h3 className="text-xl font-bold text-white">Analytics</h3>
                    <p className="text-white/70 text-sm">Charts, metrics, and insights</p>
                  </div>
                </GlassCard>
              </div>

              <div onClick={() => navigate("/admin/story-requests")} className="cursor-pointer hover:scale-105 transition-transform">
                <GlassCard className="p-6">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">📖</div>
                    <h3 className="text-xl font-bold text-white">Story Requests</h3>
                    <p className="text-white/70 text-sm">$777 milestone tracking</p>
                  </div>
                </GlassCard>
              </div>
            </div>

            <GlassCard>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate("/admin/sync")}
                size="lg"
                className="w-full md:w-auto"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync Products from Vendors
              </Button>
              <p className="text-sm text-white/70">
                Sync products from SinaLite, Scalable Press, and PsRestful APIs
              </p>
            </div>
            </GlassCard>

            <GlassCard>
              <Tabs defaultValue="products" className="space-y-6">
                <TabsList className="grid w-full max-w-4xl grid-cols-4 bg-white/10">
                  <TabsTrigger value="products" className="data-[state=active]:bg-white/20 text-white">Products</TabsTrigger>
                  <TabsTrigger value="causes" className="data-[state=active]:bg-white/20 text-white">Causes</TabsTrigger>
                  <TabsTrigger value="schools" className="data-[state=active]:bg-white/20 text-white">Schools</TabsTrigger>
                  <TabsTrigger value="nonprofits" className="data-[state=active]:bg-white/20 text-white">Nonprofits</TabsTrigger>
                </TabsList>

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
                </TabsContent>

                <TabsContent value="schools" className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Add New School</CardTitle>
                      <CardDescription className="text-white/70">Add a school option for users to select</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddSchool} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="school-name" className="text-white">School Name *</Label>
                          <Input
                            id="school-name"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="e.g., Lincoln High School"
                            required
                          />
                        </div>
                        <Button type="submit">Add School</Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">All Schools</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10">
                            <TableHead className="text-white/90">Name</TableHead>
                            <TableHead className="text-white/90">Created</TableHead>
                            <TableHead className="text-white/90">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schools.map((school) => (
                            <TableRow key={school.id} className="border-white/10">
                              <TableCell className="text-white">{school.name}</TableCell>
                              <TableCell className="text-white/70">{new Date(school.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteSchool(school.id)}
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

                <TabsContent value="nonprofits" className="space-y-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Add New Nonprofit</CardTitle>
                      <CardDescription className="text-white/70">Add a nonprofit option for users to select</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddNonprofit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nonprofit-name" className="text-white">Nonprofit Name *</Label>
                          <Input
                            id="nonprofit-name"
                            value={nonprofitName}
                            onChange={(e) => setNonprofitName(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="e.g., Red Cross Local Chapter"
                            required
                          />
                        </div>
                        <Button type="submit">Add Nonprofit</Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">All Nonprofits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10">
                            <TableHead className="text-white/90">Name</TableHead>
                            <TableHead className="text-white/90">Created</TableHead>
                            <TableHead className="text-white/90">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nonprofits.map((nonprofit) => (
                            <TableRow key={nonprofit.id} className="border-white/10">
                              <TableCell className="text-white">{nonprofit.name}</TableCell>
                              <TableCell className="text-white/70">{new Date(nonprofit.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteNonprofit(nonprofit.id)}
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
              </Tabs>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
