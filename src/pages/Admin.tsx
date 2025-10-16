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
import { Trash2, KeyRound } from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<any[]>([]);
  const [causes, setCauses] = useState<any[]>([]);

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

  useEffect(() => {
    // Check if already authenticated in session storage
    const storedAuth = sessionStorage.getItem("admin_authenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
      loadData();
    }
    setLoading(false);
  }, []);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verify admin key against backend
    const { data, error } = await supabase.functions.invoke("verify-admin-key", {
      body: { key: adminKey }
    });

    if (error || !data?.valid) {
      toast.error("Invalid admin key");
      return;
    }

    sessionStorage.setItem("admin_authenticated", "true");
    setIsAuthenticated(true);
    setAdminKey("");
    loadData();
    toast.success("Access granted");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    toast.success("Logged out");
  };

  const loadData = async () => {
    const [productsRes, causesRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("causes").select("*").order("created_at", { ascending: false })
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (causesRes.data) setCauses(causesRes.data);
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Admin Access
            </CardTitle>
            <CardDescription>Enter admin key to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleKeySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-key">Admin Key</Label>
                <Input
                  id="admin-key"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Access Admin Panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            <KeyRound className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <Button 
              onClick={() => navigate("/admin/sync")}
              size="lg"
              className="w-full md:w-auto"
            >
              Sync Products from Vendors
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Sync products from SinaLite, Scalable Press, and PsRestful APIs
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="causes">Causes</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
                <CardDescription>Fill in the details to add a new product</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-name">Product Name *</Label>
                      <Input
                        id="product-name"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-cost">Price (USD) *</Label>
                      <Input
                        id="product-cost"
                        type="number"
                        step="0.01"
                        value={productCost}
                        onChange={(e) => setProductCost(e.target.value)}
                        placeholder="29.99"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-category">Category</Label>
                      <Input
                        id="product-category"
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-vendor-id">Vendor ID *</Label>
                      <Input
                        id="product-vendor-id"
                        value={productVendorId}
                        onChange={(e) => setProductVendorId(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-image">Image URL</Label>
                    <Input
                      id="product-image"
                      type="url"
                      value={productImage}
                      onChange={(e) => setProductImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <Button type="submit">Add Product</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>${(product.base_cost_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>{product.category || "—"}</TableCell>
                        <TableCell>{product.vendor_id}</TableCell>
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
            <Card>
              <CardHeader>
                <CardTitle>Add New Cause</CardTitle>
                <CardDescription>Fill in the details to add a new cause</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCause} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cause-name">Cause Name *</Label>
                      <Input
                        id="cause-name"
                        value={causeName}
                        onChange={(e) => setCauseName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cause-goal">Goal Amount (USD) *</Label>
                      <Input
                        id="cause-goal"
                        type="number"
                        step="0.01"
                        value={causeGoal}
                        onChange={(e) => setCauseGoal(e.target.value)}
                        placeholder="10000"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cause-summary">Summary</Label>
                    <Textarea
                      id="cause-summary"
                      value={causeSummary}
                      onChange={(e) => setCauseSummary(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cause-image">Image URL</Label>
                    <Input
                      id="cause-image"
                      type="url"
                      value={causeImage}
                      onChange={(e) => setCauseImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <Button type="submit">Add Cause</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Causes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Goal</TableHead>
                      <TableHead>Raised</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {causes.map((cause) => (
                      <TableRow key={cause.id}>
                        <TableCell>{cause.name}</TableCell>
                        <TableCell>${(cause.goal_cents / 100).toFixed(2)}</TableCell>
                        <TableCell>${(cause.raised_cents / 100).toFixed(2)}</TableCell>
                        <TableCell className="max-w-xs truncate">{cause.summary || "—"}</TableCell>
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
        </Tabs>
      </div>
    </div>
  );
}
