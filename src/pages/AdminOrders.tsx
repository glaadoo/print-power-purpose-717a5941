import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pricing-utils";
import { Loader2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  amount_total_cents: number;
  donation_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  customer_email: string | null;
  nonprofit_name: string | null;
  nonprofit_ein: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  sinalite_order_id: string | null;
  items: any[];
  payment_mode: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-2">
            View order details, pricing breakdowns, and vendor references
          </p>
        </div>

        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-foreground">
                      {order.order_number}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={order.status === "paid" ? "default" : "secondary"}
                    >
                      {order.status}
                    </Badge>
                    <Badge variant="outline">
                      {order.payment_mode?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-foreground">{order.customer_email || "N/A"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-semibold text-foreground">
                      {formatCurrency(order.amount_total_cents)}
                    </p>
                  </div>
                  {order.nonprofit_name && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Nonprofit</p>
                      <p className="text-foreground">
                        {order.nonprofit_name}
                        {order.nonprofit_ein && (
                          <span className="text-xs text-muted-foreground ml-2">
                            EIN: {order.nonprofit_ein}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {order.sinalite_order_id && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">SinaLite Order</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {order.sinalite_order_id}
                      </code>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Order Details & Pricing Breakdown
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status & Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedOrder.status === "paid" ? "default" : "secondary"}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created</p>
                  <p className="text-foreground">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                {selectedOrder.paid_at && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Paid</p>
                    <p className="text-foreground">{new Date(selectedOrder.paid_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted border border-border">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-foreground">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(item.line_subtotal)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Base Price:</span>{" "}
                            <span className="text-foreground">{formatCurrency(item.base_price_per_unit)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Markup %:</span>{" "}
                            <span className="text-foreground">{item.markup_percent}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fixed Markup:</span>{" "}
                            <span className="text-foreground">{formatCurrency(item.markup_fixed_per_unit)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Final Price:</span>{" "}
                            <span className="text-foreground font-medium">
                              {formatCurrency(item.final_price_per_unit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal_cents)}</span>
                </div>
                {selectedOrder.tax_cents > 0 && (
                  <div className="flex justify-between text-foreground">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedOrder.tax_cents)}</span>
                  </div>
                )}
                {selectedOrder.donation_cents > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Donation:</span>
                    <span>{formatCurrency(selectedOrder.donation_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-foreground border-t border-border pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.amount_total_cents)}</span>
                </div>
              </div>

              {/* Admin References */}
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="font-semibold text-foreground">Admin References</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Stripe Session:</span>
                    <code className="ml-2 text-xs bg-muted px-2 py-1 rounded text-foreground">
                      {selectedOrder.stripe_session_id}
                    </code>
                  </div>
                  {selectedOrder.stripe_payment_intent_id && (
                    <div>
                      <span className="text-muted-foreground">Payment Intent:</span>
                      <code className="ml-2 text-xs bg-muted px-2 py-1 rounded text-foreground">
                        {selectedOrder.stripe_payment_intent_id}
                      </code>
                    </div>
                  )}
                  {selectedOrder.sinalite_order_id && (
                    <div>
                      <span className="text-muted-foreground">SinaLite Order:</span>
                      <code className="ml-2 text-xs bg-muted px-2 py-1 rounded text-foreground">
                        {selectedOrder.sinalite_order_id}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
