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
  const [selectedStore, setSelectedStore] = useState<6 | 9>(9); // Default to US

  const handleSync = async (vendor: string, functionName: string, storeCode?: number) => {
    const syncKey = storeCode ? `${vendor}-${storeCode}` : vendor;
    setSyncing(syncKey);
    setSyncResults((prev) => ({ ...prev, [syncKey]: null }));
    
    try {
      const body = storeCode ? { storeCode } : undefined;
      const { data, error } = await supabase.functions.invoke(functionName, {
        body
      });
      
      if (error) throw error;
      
      setSyncResults((prev) => ({ ...prev, [syncKey]: data }));
      
      if (data?.success) {
        const storeInfo = data.store ? ` (${data.store})` : '';
        toast.success(`${vendor}${storeInfo}: Synced ${data.synced} products successfully!`);
      } else {
        toast.warning(`${vendor}: ${data?.note || "Sync completed with issues"}`);
      }
    } catch (error: any) {
      console.error(`Error syncing ${vendor}:`, error);
      toast.error(`Failed to sync ${vendor}: ${error.message}`);
      setSyncResults((prev) => ({ ...prev, [syncKey]: { success: false, error: error.message } }));
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
                {vendor.name === "SinaLite" && (
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedStore(9)}
                        variant={selectedStore === 9 ? "default" : "outline"}
                        size="sm"
                        className={selectedStore === 9 
                          ? "flex-1 bg-blue-500 hover:bg-blue-600 text-white" 
                          : "flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }
                      >
                        US Store
                      </Button>
                      <Button
                        onClick={() => setSelectedStore(6)}
                        variant={selectedStore === 6 ? "default" : "outline"}
                        size="sm"
                        className={selectedStore === 6 
                          ? "flex-1 bg-blue-500 hover:bg-blue-600 text-white" 
                          : "flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }
                      >
                        Canada Store
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={() => handleSync(
                    vendor.name, 
                    vendor.functionName,
                    vendor.name === "SinaLite" ? selectedStore : undefined
                  )}
                  disabled={syncing !== null}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                  variant="outline"
                >
                  {syncing === `${vendor.name}-${selectedStore}` || syncing === vendor.name ? (
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

                {/* Display results for current vendor/store combination */}
                {(() => {
                  const syncKey = vendor.name === "SinaLite" 
                    ? `${vendor.name}-${selectedStore}` 
                    : vendor.name;
                  const result = syncResults[syncKey];
                  
                  if (!result) return null;
                  
                  return (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${
                      result.success 
                        ? "bg-green-900/30 border border-green-500/50 text-green-100"
                        : "bg-yellow-900/30 border border-yellow-500/50 text-yellow-100"
                    }`}>
                      {result.success ? (
                        <>
                          <p className="font-semibold mb-1">✓ Sync Complete{result.store ? ` (${result.store})` : ''}</p>
                          <p>Synced {result.synced} of {result.total} products</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold mb-1">⚠ {result.note || "Sync Issues"}</p>
                          {result.details && <p className="text-xs mt-1 opacity-90">{result.details}</p>}
                          {result.error && <p className="text-xs mt-1 opacity-75">Error: {result.error}</p>}
                        </>
                      )}
                    </div>
                  );
                })()}
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
