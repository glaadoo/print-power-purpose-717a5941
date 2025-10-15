import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Session } from "@supabase/supabase-js";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncResult {
  vendor: string;
  status: SyncStatus;
  synced?: number;
  total?: number;
  error?: string;
}

export default function AdminSync() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({
    sinalite: { vendor: "SinaLite", status: "idle" },
    scalablepress: { vendor: "Scalable Press", status: "idle" },
    psrestful: { vendor: "PsRestful", status: "idle" },
  });

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAdminRole(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    
    if (!session) {
      navigate("/auth");
      return;
    }

    await checkAdminRole(session.user.id);
    setLoading(false);
  };

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !data) {
      toast.error("Access denied. Admin role required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const syncVendor = async (vendorKey: string, functionName: string) => {
    setSyncResults(prev => ({
      ...prev,
      [vendorKey]: { ...prev[vendorKey], status: "syncing" }
    }));

    try {
      const { data, error } = await supabase.functions.invoke(functionName);

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSyncResults(prev => ({
        ...prev,
        [vendorKey]: {
          ...prev[vendorKey],
          status: "success",
          synced: data.synced,
          total: data.total
        }
      }));

      const vendorName = syncResults[vendorKey].vendor;
      toast.success(`${vendorName}: Synced ${data.synced}/${data.total} products`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      
      setSyncResults(prev => ({
        ...prev,
        [vendorKey]: {
          ...prev[vendorKey],
          status: "error",
          error: errorMessage
        }
      }));

      const vendorName = syncResults[vendorKey].vendor;
      toast.error(`${vendorName}: ${errorMessage}`);
    }
  };

  const syncAll = async () => {
    await Promise.all([
      syncVendor("sinalite", "sync-sinalite"),
      syncVendor("scalablepress", "sync-scalablepress"),
      syncVendor("psrestful", "sync-psrestful"),
    ]);
  };

  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case "syncing":
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Product Sync Dashboard</h1>
            <p className="text-muted-foreground mt-2">Sync products from vendor APIs</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/admin")} variant="outline">
              Back to Admin
            </Button>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sync All Vendors</CardTitle>
            <CardDescription>
              Sync products from all vendor APIs at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={syncAll}
              disabled={Object.values(syncResults).some(r => r.status === "syncing")}
              size="lg"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Sync All Products
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SinaLite</CardTitle>
                {getStatusIcon(syncResults.sinalite.status)}
              </div>
              <CardDescription>Print products catalog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncResults.sinalite.status === "success" && (
                <div className="text-sm">
                  <div className="font-medium text-green-600">
                    ✓ Synced {syncResults.sinalite.synced} of {syncResults.sinalite.total} products
                  </div>
                </div>
              )}
              {syncResults.sinalite.status === "error" && (
                <div className="text-sm text-red-600">
                  {syncResults.sinalite.error}
                </div>
              )}
              <Button 
                onClick={() => syncVendor("sinalite", "sync-sinalite")}
                disabled={syncResults.sinalite.status === "syncing"}
                className="w-full"
              >
                {syncResults.sinalite.status === "syncing" ? "Syncing..." : "Sync SinaLite"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scalable Press</CardTitle>
                {getStatusIcon(syncResults.scalablepress.status)}
              </div>
              <CardDescription>Apparel catalog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncResults.scalablepress.status === "success" && (
                <div className="text-sm">
                  <div className="font-medium text-green-600">
                    ✓ Synced {syncResults.scalablepress.synced} of {syncResults.scalablepress.total} products
                  </div>
                </div>
              )}
              {syncResults.scalablepress.status === "error" && (
                <div className="text-sm text-red-600">
                  {syncResults.scalablepress.error}
                </div>
              )}
              <Button 
                onClick={() => syncVendor("scalablepress", "sync-scalablepress")}
                disabled={syncResults.scalablepress.status === "syncing"}
                className="w-full"
              >
                {syncResults.scalablepress.status === "syncing" ? "Syncing..." : "Sync Scalable Press"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>PsRestful</CardTitle>
                {getStatusIcon(syncResults.psrestful.status)}
              </div>
              <CardDescription>Promo products catalog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncResults.psrestful.status === "success" && (
                <div className="text-sm">
                  <div className="font-medium text-green-600">
                    ✓ Synced {syncResults.psrestful.synced} of {syncResults.psrestful.total} products
                  </div>
                </div>
              )}
              {syncResults.psrestful.status === "error" && (
                <div className="text-sm text-red-600">
                  {syncResults.psrestful.error}
                </div>
              )}
              <Button 
                onClick={() => syncVendor("psrestful", "sync-psrestful")}
                disabled={syncResults.psrestful.status === "syncing"}
                className="w-full"
              >
                {syncResults.psrestful.status === "syncing" ? "Syncing..." : "Sync PsRestful"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h3 className="font-semibold mb-1">1. Configure API Keys</h3>
              <p className="text-muted-foreground">
                Add these secrets via the Backend dashboard:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li><code>SINALITE_API_KEY</code> - Your SinaLite API key</li>
                <li><code>SCALABLEPRESS_API_KEY</code> - Your Scalable Press API key</li>
                <li><code>PSRESTFUL_API_KEY</code> - Your PsRestful API key</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">2. Run Product Sync</h3>
              <p className="text-muted-foreground">
                Click "Sync All Products" or sync individual vendors using the buttons above.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">3. Products Auto-Update</h3>
              <p className="text-muted-foreground">
                Products are automatically available on the Products page after syncing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
