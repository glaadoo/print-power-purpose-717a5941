import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface FloatingCheckoutBarProps {
  productName: string;
  quantity: number;
  subtotalCents: number;
  donationCents: number;
}

export default function FloatingCheckoutBar({
  productName,
  quantity,
  subtotalCents,
  donationCents,
}: FloatingCheckoutBarProps) {
  const navigate = useNavigate();
  const totalCents = subtotalCents + donationCents;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/95 to-primary-glow/95 backdrop-blur-lg border-t border-white/20 shadow-elegant">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Order Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-6">
              <div className="hidden sm:block">
                <div className="text-xs text-white/80 uppercase tracking-wide">Order Summary</div>
                <div className="font-semibold text-white truncate">{productName}</div>
              </div>
              
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-white/80">Qty: </span>
                  <span className="font-semibold text-white">{quantity}</span>
                </div>
                <div>
                  <span className="text-white/80">Subtotal: </span>
                  <span className="font-semibold text-white">${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                {donationCents > 0 && (
                  <div>
                    <span className="text-white/80">Donation: </span>
                    <span className="font-semibold text-white">${(donationCents / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total & Action */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-white/80 uppercase tracking-wide">Total</div>
              <div className="text-2xl font-bold text-white">
                ${(totalCents / 100).toFixed(2)}
              </div>
            </div>
            
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-3 rounded-full bg-white text-black font-bold text-lg hover:bg-white/90 transition-all shadow-lg hover:shadow-glow"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
