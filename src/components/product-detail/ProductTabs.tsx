import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductReviews from "@/components/ProductReviews";
import ReviewForm from "@/components/ReviewForm";

type ProductTabsProps = {
  product: {
    id: string;
    name: string;
    description?: string | null;
    vendor?: string | null;
  };
  reviewsKey: number;
  onReviewSubmit: () => void;
};

export default function ProductTabs({ product, reviewsKey, onReviewSubmit }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState("description");

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-gray-200 bg-transparent rounded-none h-auto p-0">
          <TabsTrigger
            value="description"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4 text-base font-medium"
          >
            Description
          </TabsTrigger>
          <TabsTrigger
            value="features"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4 text-base font-medium"
          >
            Features
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4 text-base font-medium"
          >
            Specifications
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4 text-base font-medium"
          >
            Reviews
          </TabsTrigger>
          <TabsTrigger
            value="faqs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-4 text-base font-medium"
          >
            FAQs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="py-8">
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Product Description</h3>
            {product.description ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            ) : (
              <p className="text-gray-500 italic">No description available for this product.</p>
            )}

            <div className="mt-8 space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Key Benefits</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>High-quality printing and materials</li>
                <li>Custom design support</li>
                <li>Fast production and shipping</li>
                <li>Professional finish</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="features" className="py-8">
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Product Features</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Material Quality</h4>
                  <p className="text-gray-700">Premium materials ensure durability and professional appearance.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Printing Technology</h4>
                  <p className="text-gray-700">State-of-the-art printing for vibrant, accurate colors.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Customization</h4>
                  <p className="text-gray-700">Full customization options to match your brand and vision.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Finishing Options</h4>
                  <p className="text-gray-700">Multiple finishing options available for the perfect look.</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="specs" className="py-8">
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Specifications</h3>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <dl className="grid md:grid-cols-2 gap-4">
                <div className="border-b border-gray-200 pb-3">
                  <dt className="font-semibold text-gray-900 mb-1">Vendor</dt>
                  <dd className="text-gray-700 capitalize">{product.vendor || 'Not specified'}</dd>
                </div>
                <div className="border-b border-gray-200 pb-3">
                  <dt className="font-semibold text-gray-900 mb-1">Product Type</dt>
                  <dd className="text-gray-700">Custom Printing</dd>
                </div>
                <div className="border-b border-gray-200 pb-3">
                  <dt className="font-semibold text-gray-900 mb-1">Printing Method</dt>
                  <dd className="text-gray-700">Digital / Offset</dd>
                </div>
                <div className="border-b border-gray-200 pb-3">
                  <dt className="font-semibold text-gray-900 mb-1">Production Time</dt>
                  <dd className="text-gray-700">5-7 business days</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-600">
                * Specifications may vary based on selected options and configurations.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="py-8" id="reviews-section">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Reviews</h3>
              <ProductReviews key={reviewsKey} productId={product.id} />
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Write a Review</h3>
              <ReviewForm productId={product.id} onReviewSubmitted={onReviewSubmit} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faqs" className="py-8">
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">What file formats do you accept?</h4>
                <p className="text-gray-700">
                  We accept PDF, PNG, JPG, AI, EPS, and PSD files. For best results, we recommend using high-resolution PDF or PNG files.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">How long does production take?</h4>
                <p className="text-gray-700">
                  Standard production time is 5-7 business days after artwork approval. Express options may be available for rush orders.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Can I see a proof before printing?</h4>
                <p className="text-gray-700">
                  Yes! We provide digital proofs for all orders. You'll receive a proof for approval before we begin production.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">What if I need help with my design?</h4>
                <p className="text-gray-700">
                  Our design team is here to help! Contact us and we can assist with design adjustments or create a custom design for you.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Do you offer bulk discounts?</h4>
                <p className="text-gray-700">
                  Yes! Larger quantities typically receive better per-unit pricing. Check the quantity selector to see pricing at different quantities.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
