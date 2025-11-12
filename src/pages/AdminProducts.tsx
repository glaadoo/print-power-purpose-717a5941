import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminProducts() {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, any>>({});

  const handleSync = async (vendor: string, functionName: string) => {
    setSyncing(vendor);
    setSyncResults((prev) => ({ ...prev, [vendor]: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;
      
      setSyncResults((prev) => ({ ...prev, [vendor]: data }));
      
      if (data?.success) {
        toast.success(`${vendor}: Synced ${data.synced} products successfully!`);
      } else {
        toast.warning(`${vendor}: ${data?.note || "Sync completed with issues"}`);
      }
    } catch (error: any) {
      console.error(`Error syncing ${vendor}:`, error);
      toast.error(`Failed to sync ${vendor}: ${error.message}`);
      setSyncResults((prev) => ({ ...prev, [vendor]: { success: false, error: error.message } }));
    } finally {
      setSyncing(null);
    }
  };

  const vendors = [
    {
      name: "SinaLite",
      description: "Print products and promotional items",
      functionName: "sync-sinalite",
      color: "border-blue-500/50 bg-blue-500/10"
    },
    {
      name: "Scalable Press",
      description: "Custom apparel and merchandise",
      functionName: "sync-scalablepress",
      color: "border-purple-500/50 bg-purple-500/10"
    },
    {
      name: "PsRestful",
      description: "Additional print products",
      functionName: "sync-psrestful",
      color: "border-green-500/50 bg-green-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Product Sync Management</h1>
            <p className="text-white/60 mt-1">Sync products from vendor APIs</p>
          </div>
        </div>

        {/* Vendor Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <Card key={vendor.name} className={`${vendor.color} border backdrop-blur-sm`}>
              <CardHeader>
                <CardTitle className="text-white">{vendor.name}</CardTitle>
                <CardDescription className="text-white/70">{vendor.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleSync(vendor.name, vendor.functionName)}
                  disabled={syncing !== null}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                  variant="outline"
                >
                  {syncing === vendor.name ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Sync Products
                    </>
                  )}
                </Button>

                {syncResults[vendor.name] && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    syncResults[vendor.name].success 
                      ? "bg-green-900/30 border border-green-500/50 text-green-100"
                      : "bg-yellow-900/30 border border-yellow-500/50 text-yellow-100"
                  }`}>
                    {syncResults[vendor.name].success ? (
                      <div>
                        <div className="font-semibold">✓ Success</div>
                        <div>Synced {syncResults[vendor.name].synced} of {syncResults[vendor.name].total} products</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold">⚠ Configuration Needed</div>
                        <div className="mt-1">{syncResults[vendor.name].note}</div>
                        {syncResults[vendor.name].authUrl && (
                          <div className="mt-1 text-xs opacity-80">Auth URL: {syncResults[vendor.name].authUrl}</div>
                        )}
                        {Array.isArray(syncResults[vendor.name].attempts) && (
                          <details className="mt-2 text-xs opacity-80">
                            <summary className="cursor-pointer">Auth attempts</summary>
                            <ul className="list-disc list-inside space-y-1 mt-1">
                              {syncResults[vendor.name].attempts.map((a: string, i: number) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {syncResults[vendor.name].preview && (
                          <details className="mt-2 text-xs opacity-75">
                            <summary className="cursor-pointer">View API response</summary>
                            <pre className="mt-1 p-2 bg-black/30 rounded overflow-x-auto">
                              {syncResults[vendor.name].preview}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="mt-8 border-white/20 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">About Product Syncing</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80">
            <ul className="space-y-2 list-disc list-inside">
              <li>Products are fetched from vendor APIs and stored in the database</li>
              <li>Existing products are updated; new products are added</li>
              <li>Each vendor has unique product IDs to prevent conflicts</li>
              <li>Syncs can be triggered manually or scheduled via cron jobs</li>
              <li>All product fields (name, description, price, category, images) are synced</li>
            </ul>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 flex gap-4">
          <Button
            onClick={() => navigate("/products")}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            View Products Page
          </Button>
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
