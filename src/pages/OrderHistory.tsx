import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Heart,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Truck,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  name: string;
  quantity: number;
  priceCents: number;
  imageUrl?: string;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  amount_total_cents: number;
  donation_cents: number;
  subtotal_cents: number;
  status: string;
  items: OrderItem[];
  cause_name?: string;
  nonprofit_name?: string;
  customer_email: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  tracking_carrier?: string | null;
  shipping_status?: string | null;
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Order History | Print Power Purpose";
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setError("Please sign in to view your order history");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", user.email)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setOrders((data as Order[]) || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Unable to load order history");
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-white border-gray-200">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-600">Order History</h1>
              <p className="text-gray-600">
                {orders.length === 0
                  ? "No orders yet"
                  : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <Card className="p-12 text-center bg-white border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              No Orders Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start shopping to see your order history here
            </p>
            <Button onClick={() => navigate("/products")} className="bg-blue-600 text-white hover:bg-blue-700">
              Browse Products
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const orderDate = new Date(order.created_at);

              return (
                <Card key={order.id} className="overflow-hidden bg-white border-gray-200">
                  {/* Order Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleOrderExpanded(order.id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-blue-600">
                            {order.order_number}
                          </h3>
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(orderDate, "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}
                          </div>
                          {(order.cause_name || order.nonprofit_name) && (
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {order.nonprofit_name || order.cause_name}
                            </div>
                          )}
                          {order.tracking_number && (
                            <div className="flex items-center gap-1">
                              <Truck className="w-4 h-4" />
                              {order.shipping_status || 'Shipped'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600 mb-1">Total</div>
                          <div className="text-2xl font-bold text-gray-900">
                            ${(order.amount_total_cents / 100).toFixed(2)}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Order Details */}
                  {isExpanded && (
                    <>
                      <Separator className="bg-gray-200" />
                      <div className="p-6 bg-gray-50">
                        {/* Tracking Info */}
                        {order.tracking_number ? (
                          <div className="mb-6">
                            <h4 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              Tracking Information
                            </h4>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              {order.tracking_carrier && (
                                <p className="text-sm text-gray-600 mb-1">
                                  Carrier: <span className="font-medium text-gray-900">{order.tracking_carrier}</span>
                                </p>
                              )}
                              <p className="text-sm text-gray-600 mb-1">
                                Status: <span className="font-medium text-gray-900">{order.shipping_status || 'Shipped'}</span>
                              </p>
                              <p className="text-sm text-gray-600 mb-3">
                                Tracking: <code className="font-mono text-gray-900">{order.tracking_number}</code>
                              </p>
                              {order.tracking_url && (
                                <Button asChild variant="outline" size="sm" className="w-full">
                                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                                    Track Package <ExternalLink className="w-4 h-4 ml-2" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-6">
                            <h4 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              Shipping Status
                            </h4>
                            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                              <p className="text-sm text-gray-700">
                                Your order is being processed. Tracking will appear here once your package ships.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Items List */}
                        {order.items && order.items.length > 0 && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              Order Items
                            </h4>
                            <div className="space-y-3">
                              {order.items.map((item: OrderItem, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-start p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex gap-3 flex-1">
                                    {item.imageUrl && (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-16 h-16 object-cover rounded-md border border-gray-200"
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium text-gray-900">{item.name}</p>
                                      <p className="text-sm text-gray-600">
                                        Quantity: {item.quantity}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="font-semibold text-gray-900">
                                    ${((item.priceCents || 0) / 100).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Order Totals */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <h4 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Order Summary
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-gray-600">
                              <span>Subtotal</span>
                              <span>${((order.subtotal_cents || 0) / 100).toFixed(2)}</span>
                            </div>
                            
                            {order.donation_cents > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-4 h-4" />
                                  Donation
                                </span>
                                <span>${(order.donation_cents / 100).toFixed(2)}</span>
                              </div>
                            )}

                            <Separator className="bg-gray-200" />
                            
                            <div className="flex justify-between text-lg font-bold text-gray-900">
                              <span>Total</span>
                              <span>${(order.amount_total_cents / 100).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
