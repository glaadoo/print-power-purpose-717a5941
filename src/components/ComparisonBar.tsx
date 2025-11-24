import { useState } from "react";
import { useComparison } from "@/context/ComparisonContext";
import { Button } from "@/components/ui/button";
import { X, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ComparisonModal from "./ComparisonModal";

export default function ComparisonBar() {
  const { products, count, remove, clear } = useComparison();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  if (count === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/95 to-primary-foreground/95 backdrop-blur-lg border-t border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Product thumbnails */}
            <div className="flex items-center gap-3 flex-1 overflow-x-auto">
              <div className="flex items-center gap-2 text-white font-semibold whitespace-nowrap">
                <Scale className="w-5 h-5" />
                <span>Compare ({count}/4)</span>
              </div>
              
              <div className="flex gap-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="relative flex-shrink-0 group"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 border border-white/20">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40">
                          <Scale className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => remove(product.id)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove ${product.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowModal(true)}
                disabled={count < 2}
                className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold"
              >
                Compare Now
              </Button>
              <Button
                onClick={clear}
                variant="ghost"
                className="text-white hover:bg-white/10 rounded-full"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {showModal && (
        <ComparisonModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
