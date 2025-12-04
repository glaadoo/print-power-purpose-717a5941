import { useMemo, useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import CompactMilestoneBar from "@/components/CompactMilestoneBar";
import { X, ArrowLeft, ArrowRight, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { calculateOrderShipping, getShippingTierLabel } from "@/lib/shipping-tiers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ArtworkUpload from "@/components/ArtworkUpload";
import Footer from "@/components/Footer";

export default function Cart() {
  const { items, count, totalCents, setQty, remove, clear } = useCart();
  const nav = useNavigate();
  
  // Artwork upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingForItemId, setUploadingForItemId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    console.log('[Cart] Component mounted');
    document.title = "Cart - Print Power Purpose";
    
    return () => {
      console.log('[Cart] Component unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('[Cart] Items updated:', items.length, 'items');
    
    // Validate cart items - remove products that no longer exist
    async function validateCartItems() {
      if (items.length === 0) return;
      
      const invalidCartItemIds: string[] = [];
      
      for (const item of items) {
        const { data, error } = await supabase
          .from("products")
          .select("id")
          .eq("id", item.id)
          .maybeSingle();
        
        if (error || !data) {
          invalidCartItemIds.push(item.cartItemId);
        }
      }
      
      if (invalidCartItemIds.length > 0) {
        invalidCartItemIds.forEach(cartItemId => remove(cartItemId));
        toast.error(`${invalidCartItemIds.length} invalid product(s) removed from cart.`);
      }
    }
    
    validateCartItems();
  }, []);

  const hasItems = items.length > 0;

  // Compute per-line totals
  const detailed = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        lineCents: it.priceCents * it.quantity,
      })),
    [items]
  );

  const subtotal = totalCents;
  
  // Calculate shipping estimate
  const shippingCents = useMemo(() => {
    if (items.length === 0) return 0;
    return calculateOrderShipping(items.map(item => ({ name: item.name, category: null })));
  }, [items]);
  const shippingLabel = getShippingTierLabel(shippingCents);
  const estimatedTotal = subtotal + shippingCents;

  return (
    <div className="fixed inset-0 bg-white text-gray-900">{/* Removed z-50 to work with App animation wrapper */}
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between bg-white border-b border-gray-200 shadow-sm">
        <Button
          onClick={() => nav(-1)}
          variant="outline"
          className="border-gray-300 text-gray-900 hover:bg-gray-100"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600">
          CART
        </h1>
        <button 
          className="rounded-full px-4 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300 flex items-center gap-2 relative"
          onClick={() => nav("/products")}
          aria-label="Cart"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-semibold">{count} items</span>
            <span className="text-[10px] opacity-90">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </button>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16 pb-4 md:pb-8 lg:pb-12 bg-gray-50">
        <section className="relative min-h-[calc(100vh-4rem)]">
          <div className="relative w-full min-h-[calc(100vh-4rem)]" >
            {!hasItems ? (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="max-w-2xl w-full rounded-3xl border border-gray-200 bg-white shadow-lg p-8 text-center">
                  <p className="text-gray-600 mb-6">Your cart is empty.</p>
                  <button 
                    className="rounded-full px-8 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700"
                    onClick={() => nav("/products")}
                  >
                    Browse Products
                  </button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 z-10 p-6 md:p-8 flex flex-col">
                {/* Milestone Progress Bar */}
                <CompactMilestoneBar />
                
                <ul className="divide-y divide-gray-200 mb-6">
                  {detailed.map((it) => (
                    <li key={it.cartItemId} className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white rounded-lg px-4 mb-4 shadow-sm">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 grid place-items-center text-xs text-gray-400">
                          NO IMG
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                       <div className="font-semibold text-lg text-blue-600">{it.name}</div>
                        <div className="text-sm text-gray-600">
                          ${(it.priceCents / 100).toFixed(2)} each
                        </div>
                        
                        {/* Configuration Details */}
                        {it.configuration && Object.keys(it.configuration).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.entries(it.configuration).map(([key, value]) => (
                              <span key={key} className="mr-2 capitalize">
                                {key}: <span className="font-medium">{String(value)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Artwork Preview */}
                        {it.artworkUrl && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-700">
                                  Artwork: {it.artworkFileName || 'Uploaded'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(it.artworkUrl!, '_blank');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUploadingForItemId(it.cartItemId);
                                    setConfirmDialogOpen(true);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                                >
                                  Upload New
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 flex items-center justify-center text-xl font-semibold"
                          onClick={() => setQty(it.cartItemId, Math.max(1, it.quantity - 1))}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => setQty(it.cartItemId, Number(e.target.value || 1))}
                          className="w-14 h-10 rounded-lg bg-white border border-gray-300 text-gray-900 text-center outline-none font-semibold"
                        />

                        <button
                          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 flex items-center justify-center text-xl font-semibold"
                          onClick={() => setQty(it.cartItemId, it.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>

                        <button 
                          className="ml-2 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
                          onClick={() => remove(it.cartItemId)}
                          aria-label="Remove item"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Action buttons and Subtotal */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-center mt-8 mb-6 border-t border-gray-200 pt-6 bg-white rounded-lg px-6 py-4 shadow-sm">
                  <button
                    className="px-8 py-4 rounded-full bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 border border-gray-300 shadow w-full sm:w-auto flex items-center gap-2 justify-center"
                    onClick={() => nav("/products")}
                  >
                    <ArrowLeft size={20} />
                    Continue Shopping
                  </button>
                  
                  <div className="text-center space-y-2">
                    <div className="flex justify-between gap-8 text-gray-600 text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">${(subtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-gray-600 text-sm items-center">
                      <span className="flex items-center gap-1">
                        <Truck size={14} />
                        {shippingLabel}:
                      </span>
                      <span className="font-medium">${(shippingCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-gray-500 text-xs mb-1">Estimated Total</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${(estimatedTotal / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <button 
                      className="px-6 py-3 rounded-full bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 border border-gray-300 shadow w-full sm:w-auto"
                      onClick={clear}
                    >
                      Clear Cart
                    </button>
                    
                    <button
                      className="px-8 py-4 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow w-full sm:w-auto flex items-center gap-2 justify-center"
                      onClick={() => nav("/checkout", { state: { fromCart: true } })}
                    >
                      Checkout
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Artwork?</DialogTitle>
            <DialogDescription>
              Are you sure you want to replace the current artwork? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {/* Current Artwork Preview */}
          {uploadingForItemId && (() => {
            const currentItem = items.find(i => i.cartItemId === uploadingForItemId);
            return currentItem?.artworkUrl ? (
              <div className="my-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Current Artwork:</p>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <img 
                    src={currentItem.artworkUrl} 
                    alt="Current artwork"
                    className="w-full h-40 object-contain rounded"
                  />
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    {currentItem.artworkFileName || 'Uploaded artwork'}
                  </p>
                </div>
              </div>
            ) : null;
          })()}
          
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setUploadingForItemId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmDialogOpen(false);
                setUploadDialogOpen(true);
              }}
            >
              Yes, Replace
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Artwork Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Artwork</DialogTitle>
            <DialogDescription>
              Replace the artwork for this product. The new file will be used for production.
            </DialogDescription>
          </DialogHeader>
          {uploadingForItemId && (
            <ArtworkUpload
              productId={items.find(i => i.cartItemId === uploadingForItemId)?.id || uploadingForItemId}
              productName={items.find(i => i.cartItemId === uploadingForItemId)?.name || "Product"}
              onUploadComplete={(fileUrl, fileName) => {
                // Update cart item with new artwork
                const updatedItems = items.map(item => 
                  item.cartItemId === uploadingForItemId 
                    ? { ...item, artworkUrl: fileUrl, artworkFileName: fileName }
                    : item
                );
                
                // Update localStorage cart
                try {
                  localStorage.setItem("ppp:cart", JSON.stringify({ items: updatedItems }));
                  
                  // Show success toast
                  toast.success("Artwork uploaded successfully!", {
                    description: `${fileName} has been added to your order.`,
                  });
                  
                  // Force refresh by triggering a state update
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500); // Delay reload to show toast
                  
                } catch (e) {
                  console.error("Failed to update cart:", e);
                  toast.error("Upload failed", {
                    description: "Could not save artwork to your order. Please try again.",
                  });
                }
                
                setUploadDialogOpen(false);
                setUploadingForItemId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

