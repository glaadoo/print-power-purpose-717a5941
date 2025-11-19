import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Image, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getProductImageUrl } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  image_url?: string;
  generated_image_url?: string;
}

export default function AdminProductImages() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProduct, setCurrentProduct] = useState<string>("");
  const [stats, setStats] = useState({
    total: 0,
    withImages: 0,
    missingImages: 0,
    generated: 0,
    failed: 0,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image_url, generated_image_url")
        .order("name");

      if (error) throw error;
      
      const allProducts = data || [];
      const withImages = allProducts.filter(p => p.image_url || p.generated_image_url).length;
      const missingImages = allProducts.length - withImages;

      setProducts(allProducts);
      setStats({
        total: allProducts.length,
        withImages,
        missingImages,
        generated: 0,
        failed: 0,
      });
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function generateMissingImages() {
    const productsWithoutImages = products.filter(
      p => !p.image_url && !p.generated_image_url
    );

    if (productsWithoutImages.length === 0) {
      toast.info("All products already have images!");
      return;
    }

    await processImageGeneration(productsWithoutImages, "generated");
  }

  async function regenerateAllImages() {
    const productsWithGeneratedImages = products.filter(
      p => p.generated_image_url && !p.image_url
    );

    if (productsWithGeneratedImages.length === 0) {
      toast.info("No generated images to regenerate!");
      return;
    }

    await processImageGeneration(productsWithGeneratedImages, "regenerated");
  }

  async function processImageGeneration(productList: Product[], action: string) {
    // Generate only 10 images at a time to avoid overwhelming the system
    const BATCH_SIZE = 10;
    const batchToProcess = productList.slice(0, BATCH_SIZE);

    setGenerating(true);
    setProgress(0);
    let generated = 0;
    let failed = 0;

    for (let i = 0; i < batchToProcess.length; i++) {
      const product = batchToProcess[i];
      setCurrentProduct(product.name);
      
      try {
        console.log(`${action === "regenerated" ? "Regenerating" : "Generating"} image for: ${product.name}`);
        const imageUrl = await getProductImageUrl(product);
        
        if (imageUrl) {
          generated++;
          console.log(`✓ ${action === "regenerated" ? "Regenerated" : "Generated"} image for: ${product.name}`);
        } else {
          failed++;
          console.error(`✗ Failed to ${action === "regenerated" ? "regenerate" : "generate"} image for: ${product.name}`);
        }
      } catch (error) {
        failed++;
        console.error(`Error ${action === "regenerated" ? "regenerating" : "generating"} image for ${product.name}:`, error);
      }

      setProgress(((i + 1) / batchToProcess.length) * 100);
      setStats(prev => ({ ...prev, generated, failed }));

      // Rate limiting: wait 2 seconds between each generation
      if (i < batchToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setGenerating(false);
    setCurrentProduct("");
    
    const remaining = productList.length - batchToProcess.length;
    const actionText = action === "regenerated" ? "Regenerated" : "Generated";
    const message = `${actionText} ${generated} images. ${failed > 0 ? `${failed} failed. ` : ""}${remaining > 0 ? `${remaining} remaining.` : ""}`;
    toast.success(message);
    
    // Reload products to show updated stats
    await loadProducts();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-6 w-6" />
              Generate Product Images
            </CardTitle>
            <CardDescription>
              Automatically generate AI images for products missing images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-secondary/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">With Images</p>
                <p className="text-2xl font-bold text-green-600">{stats.withImages}</p>
              </div>
              <div className="bg-amber-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Missing Images</p>
                <p className="text-2xl font-bold text-amber-600">{stats.missingImages}</p>
              </div>
              <div className="bg-blue-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Generated</p>
                <p className="text-2xl font-bold text-blue-600">{stats.generated}</p>
              </div>
              <div className="bg-red-500/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>

            {generating && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Generating image for: {currentProduct}
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  {Math.round(progress)}% complete
                </p>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Generate missing images or regenerate existing AI-generated images. 
                Processes up to 10 products at a time with a 2-second delay between each. 
                Run multiple times for more products.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={generateMissingImages}
                disabled={generating || stats.missingImages === 0}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>Processing...</>
                ) : (
                  <>Generate Missing (up to 10 of {stats.missingImages})</>
                )}
              </Button>

              <Button
                onClick={regenerateAllImages}
                disabled={generating || stats.generated === 0}
                className="w-full"
                size="lg"
                variant="outline"
              >
                {generating ? (
                  <>Processing...</>
                ) : (
                  <>Regenerate All (up to 10 of {stats.generated})</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
