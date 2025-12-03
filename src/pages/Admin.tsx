import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trash2, KeyRound, RefreshCw, Download, Search, Upload,
  AlertCircle, CheckCircle, X, ArrowLeft, Check,
  Clock, Send, DollarSign, ShoppingCart, Heart, TrendingUp, LogOut, Activity, FileText, CreditCard, Package
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import VideoUpload from "@/components/VideoUpload";
import BulkImportDialog from "@/components/admin/BulkImportDialog";
import SchoolBulkImportDialog from "@/components/admin/SchoolBulkImportDialog";
import WhoWeServeEditor from "@/components/admin/WhoWeServeEditor";
import { StripeModeToggle } from "@/components/admin/StripeModeToggle";
import ProductPriceManager from "@/components/admin/ProductPriceManager";

export default function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [schoolBulkImportOpen, setSchoolBulkImportOpen] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState("");

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

  // useEffect to check session/passcode on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Initialize adminPasscode from sessionStorage first
      const storedPasscode = sessionStorage.getItem("admin_passcode");
      if (storedPasscode) {
        setAdminPasscode(storedPasscode);
      }

      // Get passcode from URL
      const params = new URLSearchParams(window.location.search);
      const passcode = params.get('key');
      
      // First try passcode if provided
      if (passcode) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-admin-passcode', {
            body: { passcode, path: window.location.pathname }
          });

          if (!error && data?.valid) {
            console.log("[Admin] Passcode verified, sessionToken:", data.sessionToken ? 'YES' : 'NO');
            setIsAuthenticated(true);
            // Store passcode in sessionStorage for subsequent checks
            sessionStorage.setItem("admin_passcode", passcode);
            setAdminPasscode(passcode);
            // Store session token for admin API calls
            if (data.sessionToken) {
              console.log("[Admin] Storing sessionToken:", data.sessionToken.substring(0, 8) + '...');
              sessionStorage.setItem("admin_session", data.sessionToken);
            }
            loadAllData();
            setCheckingAuth(false);
            return;
          }
        } catch (err) {
          console.error('Passcode verification failed:', err);
        }
      }

      // Then check if there's a stored passcode
      if (storedPasscode) {
        try {
          const { data, error } = await supabase.functions.invoke('verify-admin-passcode', {
            body: { passcode: storedPasscode, path: window.location.pathname }
          });

          if (!error && data?.valid) {
            setIsAuthenticated(true);
            // Store session token for admin API calls
            if (data.sessionToken) {
              sessionStorage.setItem("admin_session", data.sessionToken);
            }
            loadAllData();
            setCheckingAuth(false);
            return;
          } else {
            sessionStorage.removeItem("admin_passcode");
            setAdminPasscode("");
          }
        } catch (err) {
          console.error('Stored passcode verification failed:', err);
          sessionStorage.removeItem("admin_passcode");
          setAdminPasscode("");
        }
      }

      // Finally, check old session token system for backwards compatibility
      const sessionToken = sessionStorage.getItem("admin_session");
      if (sessionToken) {
        verifySession(sessionToken);
      } else {
        // No valid auth, show login UI instead of redirecting away
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Real-time subscription for pending nonprofits
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from("nonprofits")
        .select("*", { count: "exact", head: true })
        .eq("approved", false);
      setPendingCount(count || 0);
    };

    fetchPendingCount();

    const channel = supabase
      .channel("nonprofit-pending-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nonprofits",
          filter: "approved=eq.false"
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

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
    try {
      const sessionToken = sessionStorage.getItem("admin_session");
      console.log("[Admin] loadAllData - sessionToken from storage:", sessionToken ? sessionToken.substring(0, 8) + '...' : 'NULL');
      if (!sessionToken) {
        toast.error("Session expired. Please log in again.");
        setIsAuthenticated(false);
        return;
      }

      // Fetch admin stats from edge function using service role
      console.log("[Admin] Calling admin-stats with sessionToken");
      const { data: stats, error } = await supabase.functions.invoke('admin-stats', {
        body: { sessionToken }
      });
      console.log("[Admin] admin-stats response:", error ? 'ERROR' : 'SUCCESS', error);

      if (error) {
        console.error('Failed to load admin stats:', error);
        toast.error("Failed to load data");
        return;
      }

      // Set all data with fallback to empty arrays
      setOrders(stats?.orders || []);
      setDonations(stats?.donations || []);
      setCauses(stats?.causes || []);
      // Products is just a count in stats, keep empty array
      setProducts([]);
      // StoryRequests is just a count in stats, keep empty array
      setStoryRequests([]);

      console.log('Admin Stats Loaded:');
      console.log('Orders:', stats?.orders?.length || 0, 'Total Revenue:', stats?.totalRevenue);
      console.log('Donations:', stats?.donations?.length || 0, 'Total Donations:', stats?.totalDonations);

      // Load other data directly
      const [schoolsRes, nonprofitsRes, errorLogsRes] = await Promise.all([
        supabase.from("schools").select("*").order("created_at", { ascending: false }),
        supabase.from("nonprofits").select("*").order("created_at", { ascending: false }),
        supabase.from("error_logs").select("*").order("timestamp", { ascending: false }).limit(50)
      ]);

      if (schoolsRes.data) setSchools(schoolsRes.data);
      if (nonprofitsRes.data) setNonprofits(nonprofitsRes.data);
      if (errorLogsRes.data) setErrorLogs(errorLogsRes.data);
    } catch (err) {
      console.error('Error loading admin data:', err);
      toast.error("Failed to load admin data");
    }
  };

  // CRUD and other handlers

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
    
    const sessionToken = sessionStorage.getItem("admin_session");
    if (!sessionToken) {
      toast.error("Session expired. Please log in again.");
      setIsAuthenticated(false);
      return;
    }
    
    const { data, error } = await supabase.functions.invoke('bulk-import-nonprofits', {
      body: { nonprofits: [{ name: nonprofitName, approved: true }], sessionToken }
    });

    if (error || !data?.success) {
      toast.error("Failed to add nonprofit: " + (error?.message || data?.error || 'Unknown error'));
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

  const exportOrdersToCSV = () => {
    const filteredOrders = orders.filter(order => {
      const matchesSearch = 
        order.customer_email?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.order_number?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.product_name?.toLowerCase().includes(orderSearchTerm.toLowerCase());
      const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });

    const headers = ["Order Number", "Customer Email", "Product", "Amount", "Printing + Purpose", "Cause", "Status", "Date"];
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
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Admin Access</h1>
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
                  className="w-full bg-white text-black hover:bg-white/90 font-semibold py-6 rounded-2xl"
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
    <div className="admin-dark-theme fixed inset-0 w-screen h-screen overflow-hidden flex flex-col">
      <VideoBackground 
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
        overlay={<div className="absolute inset-0 bg-black/70" />}
      />
      
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <h1 className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          ADMIN
        </h1>

        <Button 
          variant="outline" 
          size="sm"
          onClick={handleLogout}
          className="rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20 absolute right-4"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </header>

      {/* Main Content */}
      <div className="relative flex-1 overflow-y-auto pt-16">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white">Dashboard Overview</h2>
              <p className="text-white/70">Manage your Print Power Purpose platform</p>
            </div>
            <div className="flex gap-2">
              <Link to="/admin/nonprofits">
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 relative">
                  <Heart className="h-4 w-4" />
                  Nonprofits
                  {pendingCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-1 bg-red-500 text-white text-xs font-bold border-2 border-background">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to="/admin/legal">
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <FileText className="h-4 w-4" />
                  Legal Docs
                </Button>
              </Link>
              <Link to="/admin/pricing">
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </Button>
              </Link>
              <Link to="/admin/settings">
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <KeyRound className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Link to="/admin/access-logs">
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <Activity className="h-4 w-4" />
                  Access Logs
                </Button>
              </Link>
              <Link to="/system-logs">
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <Activity className="h-4 w-4" />
                  System Logs
                </Button>
              </Link>
              <Link to="/admin/vendor-fulfillment">
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <Package className="h-4 w-4" />
                  Vendor Orders
                </Button>
              </Link>
            </div>
          </div>

          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="bg-white/5 border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-white/80" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Total Revenue</h3>
              </div>
              <div className="text-3xl font-serif font-bold text-white">
                ${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </GlassCard>

            <GlassCard className="bg-white/5 border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <Heart className="h-5 w-5 text-white/80" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Total Donations</h3>
              </div>
              <div className="text-3xl font-serif font-bold text-white">
                ${(totalDonations / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </GlassCard>

            <GlassCard className="bg-white/5 border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart className="h-5 w-5 text-white/80" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Total Orders</h3>
              </div>
              <div className="text-3xl font-serif font-bold text-white">
                {orders.length}
              </div>
            </GlassCard>

            <GlassCard className="bg-white/5 border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-white/80" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Active Causes</h3>
              </div>
              <div className="text-3xl font-serif font-bold text-white">
                {activeCauses}
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="dashboard" className="space-y-6">
            <div className="flex justify-center">
              <TabsList className="bg-[#5a5a5a] p-1 rounded-full inline-flex gap-1">
                <TabsTrigger 
                  value="dashboard" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="products" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="prices"
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Product Configuration
                </TabsTrigger>
                <TabsTrigger 
                  value="causes" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Causes
                </TabsTrigger>
                <TabsTrigger 
                  value="schools" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Schools
                </TabsTrigger>
                <TabsTrigger 
                  value="nonprofits" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Nonprofits
                </TabsTrigger>
                <TabsTrigger 
                  value="orders" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="donations" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Printing + Purpose
                </TabsTrigger>
                <TabsTrigger 
                  value="errors" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Error Logs
                </TabsTrigger>
                <TabsTrigger 
                  value="stories" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Story Requests
                </TabsTrigger>
                <TabsTrigger 
                  value="sync" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Sync
                </TabsTrigger>
                <TabsTrigger 
                  value="videos" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Videos
                </TabsTrigger>
                <TabsTrigger 
                  value="pages" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Pages
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-black text-white/80 transition-all"
                >
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="bg-white/5 border-white/20">
                  <h3 className="text-xl font-serif font-bold text-white mb-4">Donations by Cause</h3>
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
                </GlassCard>

                <GlassCard className="bg-white/5 border-white/20">
                  <h3 className="text-xl font-serif font-bold text-white mb-4">Orders by Week</h3>
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
                </GlassCard>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="bg-white/5 border-white/20">
                  <h3 className="text-xl font-serif font-bold text-white mb-4">Revenue Breakdown</h3>
                  <div className="space-y-4 text-white">
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/80">Product Sales</span>
                      <span className="font-semibold">${((totalRevenue - totalDonations) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/80">Total Donations</span>
                      <span className="font-semibold">${(totalDonations / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-white/80 font-bold">Total Revenue</span>
                      <span className="font-bold text-lg">${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </GlassCard>

                <div onClick={() => navigate("/admin/stripe-analytics")} className="cursor-pointer">
                  <GlassCard className="bg-white/5 border-white/20 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-serif font-bold text-white">Stripe Analytics</h3>
                      <CreditCard className="h-6 w-6 text-white/60" />
                    </div>
                    <p className="text-white/70 mb-4">
                      View detailed payment analytics including revenue trends, failed payments, and top customers
                    </p>
                    <div className="flex items-center text-white/80 hover:text-white transition-colors">
                      <span className="text-sm font-medium">View Dashboard</span>
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </GlassCard>
                </div>

                <div onClick={() => navigate("/admin/transactions")} className="cursor-pointer">
                  <GlassCard className="bg-white/5 border-white/20 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-serif font-bold text-white">Transaction Dashboard</h3>
                      <Activity className="h-6 w-6 text-white/60" />
                    </div>
                    <p className="text-white/70 mb-4">
                      View and compare test vs live transactions separately with detailed statistics
                    </p>
                    <div className="flex items-center text-white/80 hover:text-white transition-colors">
                      <span className="text-sm font-medium">View Transactions</span>
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard className="bg-white/5 border-white/20">
                  <h3 className="text-xl font-serif font-bold text-white mb-4">Cause Progress</h3>
                  <div className="space-y-3">
                    {causes.slice(0, 5).map(cause => {
                      const progress = cause.goal_cents > 0 ? (cause.raised_cents / cause.goal_cents) * 100 : 0;
                      return (
                        <div key={cause.id} className="text-white">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white/80">{cause.name}</span>
                            <span className="font-semibold">{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-white rounded-full h-2 transition-all"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </div>
            </TabsContent>

            <TabsContent value="products">
              <GlassCard className="bg-white/5 border-white/20">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Add New Product</h2>
                <form onSubmit={handleAddProduct} className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="productName" className="text-white">Name</Label>
                    <Input id="productName" value={productName} onChange={e => setProductName(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="productCost" className="text-white">Cost (USD)</Label>
                    <Input id="productCost" type="number" min="0" step="0.01" value={productCost} onChange={e => setProductCost(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="productCategory" className="text-white">Category</Label>
                    <Input id="productCategory" value={productCategory} onChange={e => setProductCategory(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="productImage" className="text-white">Image URL</Label>
                    <Input id="productImage" value={productImage} onChange={e => setProductImage(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="productVendorId" className="text-white">Vendor ID</Label>
                    <Input id="productVendorId" value={productVendorId} onChange={e => setProductVendorId(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <Button type="submit" className="bg-white text-black hover:bg-white/90">Add Product</Button>
                </form>
              </GlassCard>

              <GlassCard className="bg-white/5 border-white/20 mt-6">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Products List</h2>
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Name</TableHead>
                        <TableHead className="text-white/80">Cost</TableHead>
                        <TableHead className="text-white/80">Category</TableHead>
                        <TableHead className="text-white/80">Vendor</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map(product => (
                        <TableRow key={product.id}>
                          <TableCell className="text-white">{product.name}</TableCell>
                          <TableCell className="text-white">${(product.base_cost_cents / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-white">{product.category || "-"}</TableCell>
                          <TableCell className="text-white">{product.vendor}</TableCell>
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
              </GlassCard>
            </TabsContent>

            <TabsContent value="prices">
              <ProductPriceManager />
            </TabsContent>

            <TabsContent value="causes">
              <GlassCard className="bg-white/5 border-white/20">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Add New Cause</h2>
                <form onSubmit={handleAddCause} className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="causeName" className="text-white">Name</Label>
                    <Input id="causeName" value={causeName} onChange={e => setCauseName(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="causeGoal" className="text-white">Goal (USD)</Label>
                    <Input id="causeGoal" type="number" min="0" step="0.01" value={causeGoal} onChange={e => setCauseGoal(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="causeSummary" className="text-white">Summary</Label>
                    <Textarea id="causeSummary" value={causeSummary} onChange={e => setCauseSummary(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="causeImage" className="text-white">Image URL</Label>
                    <Input id="causeImage" value={causeImage} onChange={e => setCauseImage(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <Button type="submit" className="bg-white text-black hover:bg-white/90">Add Cause</Button>
                </form>
              </GlassCard>

              <GlassCard className="bg-white/5 border-white/20 mt-6">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Causes List</h2>
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Name</TableHead>
                        <TableHead className="text-white/80">Goal</TableHead>
                        <TableHead className="text-white/80">Raised</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {causes.map(cause => (
                        <TableRow key={cause.id}>
                          <TableCell className="text-white">{cause.name}</TableCell>
                          <TableCell className="text-white">${(cause.goal_cents / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-white">${(cause.raised_cents / 100).toFixed(2)}</TableCell>
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
              </GlassCard>
            </TabsContent>

            <TabsContent value="schools">
              <GlassCard className="bg-white/5 border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-serif font-semibold text-white">Add New School</h2>
                  <Button
                    variant="outline"
                    onClick={() => setSchoolBulkImportOpen(true)}
                    className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Upload className="h-4 w-4" />
                    Import School Data
                  </Button>
                </div>
                <form onSubmit={handleAddSchool} className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="schoolName" className="text-white">Name</Label>
                    <Input id="schoolName" value={schoolName} onChange={e => setSchoolName(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <Button type="submit" className="bg-white text-black hover:bg-white/90">Add School</Button>
                </form>
              </GlassCard>

              <GlassCard className="bg-white/5 border-white/20 mt-6">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Schools List</h2>
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Name</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schools.map(school => (
                        <TableRow key={school.id}>
                          <TableCell className="text-white">{school.name}</TableCell>
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
              </GlassCard>

              <SchoolBulkImportDialog 
                open={schoolBulkImportOpen} 
                onOpenChange={setSchoolBulkImportOpen}
                onSuccess={loadAllData}
                adminPasscode={adminPasscode}
              />
            </TabsContent>

            <TabsContent value="nonprofits">
              <GlassCard className="bg-white/5 border-white/20">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Add New Nonprofit</h2>
                <form onSubmit={handleAddNonprofit} className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="nonprofitName" className="text-white">Name</Label>
                    <Input id="nonprofitName" value={nonprofitName} onChange={e => setNonprofitName(e.target.value)} required className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <Button type="submit" className="bg-white text-black hover:bg-white/90">Add Nonprofit</Button>
                </form>
              </GlassCard>

              <GlassCard className="bg-white/5 border-white/20 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-serif font-semibold text-white">Import IRS Nonprofit Data</h2>
                </div>
                <p className="text-white/70 mb-4">
                  Upload processed IRS Publication 78 data (pipe-delimited TXT or CSV format) to bulk import nonprofit organizations. 
                  The file should contain columns: EIN, Legal Name, City, State.
                </p>
                <Button 
                  onClick={() => setBulkImportOpen(true)}
                  className="bg-white text-black hover:bg-white/90 gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload IRS Data File
                </Button>
              </GlassCard>

              <GlassCard className="bg-white/5 border-white/20 mt-6">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Nonprofits List ({nonprofits.length})</h2>
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Name</TableHead>
                        <TableHead className="text-white/80">EIN</TableHead>
                        <TableHead className="text-white/80">Location</TableHead>
                        <TableHead className="text-white/80">Source</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonprofits.map(np => (
                        <TableRow key={np.id}>
                          <TableCell className="text-white">{np.name}</TableCell>
                          <TableCell className="text-white/70 text-xs">{np.ein || 'N/A'}</TableCell>
                          <TableCell className="text-white/70 text-xs">
                            {np.city && np.state ? `${np.city}, ${np.state}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={np.source === 'irs' ? 'default' : 'secondary'} className="text-xs">
                              {np.source || 'curated'}
                            </Badge>
                          </TableCell>
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
              </GlassCard>

              <BulkImportDialog 
                open={bulkImportOpen} 
                onOpenChange={setBulkImportOpen}
                onSuccess={loadAllData}
              />
            </TabsContent>

            <TabsContent value="orders">
              <GlassCard className="bg-white/5 border-white/20">
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      placeholder="Search orders..."
                      value={orderSearchTerm}
                      onChange={e => setOrderSearchTerm(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <select
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value)}
                    className="border rounded px-3 py-2 bg-white/10 border-white/20 text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Button onClick={exportOrdersToCSV} className="flex items-center gap-2 bg-white text-black hover:bg-white/90">
                    <Download size={16} /> Export CSV
                  </Button>
                </div>

                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Order #</TableHead>
                        <TableHead className="text-white/80">Customer Email</TableHead>
                        <TableHead className="text-white/80">Product</TableHead>
                        <TableHead className="text-white/80">Amount</TableHead>
                        <TableHead className="text-white/80">Donation</TableHead>
                        <TableHead className="text-white/80">Cause</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="text-white">{order.order_number}</TableCell>
                          <TableCell className="text-white">{order.customer_email}</TableCell>
                          <TableCell className="text-white">{order.product_name}</TableCell>
                          <TableCell className="text-white">${(order.amount_total_cents / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-white">${(order.donation_cents / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-white">{order.cause_name || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "completed" ? "default" : order.status === "pending" ? "secondary" : "destructive"}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </GlassCard>
            </TabsContent>

            <TabsContent value="donations">
              <GlassCard className="bg-white/5 border-white/20">
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      placeholder="Search Printing + Purpose..."
                      value={donationSearchTerm}
                      onChange={e => setDonationSearchTerm(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <select
                    value={donationCauseFilter}
                    onChange={e => setDonationCauseFilter(e.target.value)}
                    className="border rounded px-3 py-2 bg-white/10 border-white/20 text-white"
                  >
                    <option value="all">All Causes</option>
                    {causes.map(cause => (
                      <option key={cause.id} value={cause.id}>{cause.name}</option>
                    ))}
                  </select>
                  <Button onClick={exportDonationsToCSV} className="flex items-center gap-2 bg-white text-black hover:bg-white/90">
                    <Download size={16} /> Export CSV
                  </Button>
                </div>

                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Customer Email</TableHead>
                        <TableHead className="text-white/80">Amount</TableHead>
                        <TableHead className="text-white/80">Cause</TableHead>
                        <TableHead className="text-white/80">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDonations.map(donation => (
                        <TableRow key={donation.id}>
                          <TableCell className="text-white">{donation.customer_email}</TableCell>
                          <TableCell className="text-white">${(donation.amount_cents / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-white">{causes.find(c => c.id === donation.cause_id)?.name || "N/A"}</TableCell>
                          <TableCell className="text-white">{new Date(donation.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </GlassCard>
            </TabsContent>

            <TabsContent value="errors">
              <GlassCard className="bg-white/5 border-white/20">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Error Logs</h2>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Timestamp</TableHead>
                        <TableHead className="text-white/80">Message</TableHead>
                        <TableHead className="text-white/80">Resolved</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorLogs.map(error => (
                        <TableRow key={error.id}>
                          <TableCell className="text-white">{new Date(error.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="text-white">{error.message}</TableCell>
                          <TableCell>
                            {error.resolved ? (
                              <CheckCircle className="text-green-500" />
                            ) : (
                              <AlertCircle className="text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            {!error.resolved && (
                              <Button size="sm" onClick={() => handleMarkErrorResolved(error.id)} className="flex items-center gap-1 bg-white text-black hover:bg-white/90">
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
              </GlassCard>
            </TabsContent>

            <TabsContent value="stories">
              <GlassCard className="bg-white/5 border-white/20">
                <h2 className="text-2xl font-serif font-semibold text-white mb-4">Story Requests</h2>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/80">Customer Email</TableHead>
                        <TableHead className="text-white/80">Story</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80">Updated At</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storyRequests.map(story => (
                        <TableRow key={story.id}>
                          <TableCell className="text-white">{story.customer_email}</TableCell>
                          <TableCell className="text-white">{story.story_text}</TableCell>
                          <TableCell>
                            <Badge variant={
                              story.status === "approved" ? "default" :
                              story.status === "pending" ? "secondary" :
                              "destructive"
                            }>
                              {story.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{new Date(story.updated_at).toLocaleString()}</TableCell>
                          <TableCell className="flex gap-2">
                            {story.status !== "approved" && (
                              <Button size="sm" onClick={() => handleUpdateStoryStatus(story.id, "approved")} className="flex items-center gap-1 bg-white text-black hover:bg-white/90">
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
              </GlassCard>
            </TabsContent>

            <TabsContent value="sync">
              <GlassCard className="bg-white/5 border-white/20">
                <div className="space-y-6 max-w-md">
                  <h2 className="text-2xl font-serif font-semibold text-white mb-4">Sync Products</h2>
                  
                  <div className="mb-6">
                    <Button 
                      onClick={() => navigate("/admin/products")} 
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Open Product Sync Management
                    </Button>
                    <p className="text-white/60 text-sm mt-2">
                      Manage all vendor product syncs in one place with detailed logs and controls
                    </p>
                  </div>

                  <div className="mb-6">
                    <Button 
                      onClick={() => navigate("/admin/product-images")} 
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Generate Product Images
                    </Button>
                    <p className="text-white/60 text-sm mt-2">
                      Generate AI images for products missing images with rate limiting
                    </p>
                  </div>

                  <div className="mb-6">
                    <Button 
                      onClick={() => navigate("/admin/orders")}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      View Orders
                    </Button>
                    <p className="text-white/60 text-sm mt-2">
                      View order details with pricing breakdowns and vendor references
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Button onClick={syncSinaLite} disabled={syncing.sinalite} className="flex items-center gap-2 bg-white text-black hover:bg-white/90">
                      <RefreshCw size={16} className={syncing.sinalite ? "animate-spin" : ""} /> Sync SinaLite
                    </Button>
                    {syncResults.sinalite && (
                      <span className={syncResults.sinalite.success ? "text-green-400" : "text-red-400"}>
                        {syncResults.sinalite.message}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Button onClick={syncScalablePress} disabled={syncing.scalablepress} className="flex items-center gap-2 bg-white text-black hover:bg-white/90">
                      <RefreshCw size={16} className={syncing.scalablepress ? "animate-spin" : ""} /> Sync Scalable Press
                    </Button>
                    {syncResults.scalablepress && (
                      <span className={syncResults.scalablepress.success ? "text-green-400" : "text-red-400"}>
                        {syncResults.scalablepress.message}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Button onClick={syncPsRestful} disabled={syncing.psrestful} className="flex items-center gap-2 bg-white text-black hover:bg-white/90">
                      <RefreshCw size={16} className={syncing.psrestful ? "animate-spin" : ""} /> Sync PsRestful
                    </Button>
                    {syncResults.psrestful && (
                      <span className={syncResults.psrestful.success ? "text-green-400" : "text-red-400"}>
                        {syncResults.psrestful.message}
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </TabsContent>

            <TabsContent value="videos">
              <GlassCard className="bg-white/5 border-white/20">
                <h2 className="text-2xl font-serif font-semibold text-white mb-6">Video Management</h2>
                <VideoUpload />
              </GlassCard>
            </TabsContent>

            <TabsContent value="pages">
              <WhoWeServeEditor />
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-6">
                <GlassCard className="bg-white/5 border-white/20">
                  <h2 className="text-2xl font-serif font-semibold text-white mb-6">Payment Settings</h2>
                  <StripeModeToggle />
                </GlassCard>

                <GlassCard className="bg-white/5 border-white/20">
                  <h2 className="text-2xl font-serif font-semibold text-white mb-4">Production Setup</h2>
                  <p className="text-white/70 mb-4">
                    Configure all LIVE mode credentials before switching to production
                  </p>
                  <Button 
                    onClick={() => navigate("/admin/live-setup")} 
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Live Mode Setup Checklist
                  </Button>
                </GlassCard>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
