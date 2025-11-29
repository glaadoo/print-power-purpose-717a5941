import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Truck, Edit, Search, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  customer_email: string | null;
  amount_total_cents: number;
  vendor_key: string | null;
  vendor_name: string | null;
  vendor_order_id: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_carrier: string | null;
  shipping_status: string | null;
  shipped_at: string | null;
}

export default function AdminOrderTracking() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    tracking_number: "",
    tracking_url: "",
    tracking_carrier: "",
    shipping_status: "pending",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  async function loadOrders() {
    try {
      setLoading(true);
      
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("shipping_status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setOrders(data || []);
    } catch (err) {
      console.error("Error loading orders:", err);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateTracking() {
    if (!editingOrder) return;

    try {
      const { data, error } = await supabase.functions.invoke('update-order-tracking', {
        body: {
          orderId: editingOrder.id,
          ...trackingForm,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tracking information updated and notification sent",
      });

      setEditingOrder(null);
      loadOrders();
    } catch (err) {
      console.error("Error updating tracking:", err);
      toast({
        title: "Error",
        description: "Failed to update tracking information",
        variant: "destructive",
      });
    }
  }

  async function fetchTrackingFromVendor(order: Order) {
    if (!order.vendor_order_id) {
      toast({
        title: "Info",
        description: "No vendor order ID available to fetch tracking",
      });
      return;
    }

    try {
      toast({
        title: "Fetching...",
        description: "Checking vendor API for tracking information",
      });

      // Call edge function to fetch tracking from vendor
      const { data, error } = await supabase.functions.invoke('update-order-tracking', {
        body: {
          orderId: order.id,
          fetchFromVendor: true,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data?.tracking_number 
          ? "Tracking information retrieved from vendor" 
          : "No tracking info available from vendor yet",
      });

      loadOrders();
    } catch (err) {
      console.error("Error fetching tracking:", err);
      toast({
        title: "Error",
        description: "Failed to fetch tracking from vendor",
        variant: "destructive",
      });
    }
  }

  function openTrackingDialog(order: Order) {
    setEditingOrder(order);
    setTrackingForm({
      tracking_number: order.tracking_number || "",
      tracking_url: order.tracking_url || "",
      tracking_carrier: order.tracking_carrier || "",
      shipping_status: order.shipping_status || "pending",
    });
  }

  function getShippingStatusBadge(status: string | null) {
    const statusColors: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      shipped: { variant: "default", label: "Shipped" },
      in_transit: { variant: "default", label: "In Transit" },
      delivered: { variant: "default", label: "Delivered" },
    };

    const config = statusColors[status || "pending"];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer_email?.toLowerCase().includes(query) ||
      order.tracking_number?.toLowerCase().includes(query)
    );
  });

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/vendor-fulfillment")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Order Tracking Management</h1>
            </div>
            <p className="text-muted-foreground">
              Manage shipping tracking information for all orders
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Order number, email, tracking..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Shipping Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Orders</CardTitle>
                <CardDescription>
                  {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <Button onClick={loadOrders} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.order_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{order.customer_email}</TableCell>
                        <TableCell>
                          {order.vendor_name || order.vendor_key || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getShippingStatusBadge(order.shipping_status)}
                        </TableCell>
                        <TableCell>
                          {order.tracking_number ? (
                            <div className="space-y-1">
                              <div className="font-mono text-sm">{order.tracking_number}</div>
                              {order.tracking_url && (
                                <Button asChild variant="link" size="sm" className="h-auto p-0">
                                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                                    Track <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No tracking</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {order.vendor_order_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchTrackingFromVendor(order)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Fetch
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openTrackingDialog(order)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Tracking Dialog */}
        <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Tracking Information</DialogTitle>
              <DialogDescription>
                Enter tracking details for order {editingOrder?.order_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shipping Status</Label>
                <Select
                  value={trackingForm.shipping_status}
                  onValueChange={(value) =>
                    setTrackingForm({ ...trackingForm, shipping_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  placeholder="1Z999AA10123456784"
                  value={trackingForm.tracking_number}
                  onChange={(e) =>
                    setTrackingForm({ ...trackingForm, tracking_number: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Carrier</Label>
                <Input
                  placeholder="UPS, FedEx, USPS, etc."
                  value={trackingForm.tracking_carrier}
                  onChange={(e) =>
                    setTrackingForm({ ...trackingForm, tracking_carrier: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Tracking URL</Label>
                <Input
                  placeholder="https://tracking.carrier.com/..."
                  value={trackingForm.tracking_url}
                  onChange={(e) =>
                    setTrackingForm({ ...trackingForm, tracking_url: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingOrder(null)}>
                  Cancel
                </Button>
                <Button onClick={updateTracking}>
                  <Truck className="h-4 w-4 mr-2" />
                  Update & Notify
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
