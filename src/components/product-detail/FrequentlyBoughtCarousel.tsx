import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import useEmblaCarousel from "embla-carousel-react";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  base_cost_cents: number;
  price_override_cents?: number | null;
  image_url?: string | null;
  category?: string | null;
  pricing_data?: any;
  vendor?: string | null;
  vendor_product_id?: string | null;
  subcategory?: string | null;
};

type FrequentlyBoughtCarouselProps = {
  products: ProductRow[];
};

export default function FrequentlyBoughtCarousel({ products }: FrequentlyBoughtCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    slidesToScroll: 1,
  });

  if (products.length === 0) {
    return null;
  }

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <section className="py-12 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Frequently Bought Together
          </h2>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              className="rounded-full bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              className="rounded-full bg-white hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0"
              >
                <ProductCard 
                  product={product}
                  categorySlug={product.category?.toLowerCase().replace(/\s+/g, '-') || undefined}
                  subcategorySlug={product.subcategory?.toLowerCase().replace(/\s+/g, '-') || undefined}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
