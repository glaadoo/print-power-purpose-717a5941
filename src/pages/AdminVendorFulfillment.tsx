import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Download, CheckCircle, Mail, FileText, Truck, Edit, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import AdminAnalyticsCharts from "@/components/admin/AdminAnalyticsCharts";

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  customer_email: string | null;
  amount_total_cents: number;
  vendor_key: string | null;
  vendor_name: string | null;
  vendor_status: string | null;
  vendor_order_id: string | null;
  vendor_exported_at: string | null;
  vendor_error_message: string | null;
  items: any[];
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_carrier: string | null;
  shipping_status: string | null;
  shipped_at: string | null;
}

export default function AdminVendorFulfillment() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    tracking_number: "",
    tracking_url: "",
    tracking_carrier: "",
    shipping_status: "pending",
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ordersPerPage = 20;
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [statusFilter, vendorFilter, currentPage]);

  async function loadOrders() {
    try {
      setLoading(true);
      
      // Build query with filters
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("vendor_status", statusFilter);
      }

      if (vendorFilter !== "all") {
        query = query.eq("vendor_key", vendorFilter);
      }

      // Apply pagination
      const from = (currentPage - 1) * ordersPerPage;
      const to = from + ordersPerPage - 1;
      
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      
      setOrders(data || []);
      setTotalCount(count || 0);
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

  async function markAsExported(orderId: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          vendor_status: "exported_manual",
          vendor_exported_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order marked as exported",
      });

      loadOrders();
    } catch (err) {
      console.error("Error marking as exported:", err);
      toast({
        title: "Error",
        description: "Failed to mark order as exported",
        variant: "destructive",
      });
    }
  }

  async function downloadCSV() {
    try {
      const ordersToExport = orders.filter(
        (o) => statusFilter === "all" || o.vendor_status === statusFilter
      );

      if (ordersToExport.length === 0) {
        toast({
          title: "No orders",
          description: "No orders available to export",
        });
        return;
      }

      // Build CSV content
      const headers = [
        "Order Number",
        "Customer Email",
        "Customer Name",
        "Total Amount",
        "Vendor",
        "Status",
        "Product Name",
        "Quantity",
        "Shipping Address",
        "Phone",
        "Created At",
      ];

      const rows = ordersToExport.map((order) => {
        const firstItem = order.items?.[0] || {};
        const shippingAddr = firstItem.shipping_address || {};
        
        return [
          order.order_number,
          order.customer_email || "",
          `${shippingAddr.first_name || ""} ${shippingAddr.last_name || ""}`,
          (order.amount_total_cents / 100).toFixed(2),
          order.vendor_name || order.vendor_key || "",
          order.vendor_status || "",
          firstItem.product_name || "",
          firstItem.quantity || 1,
          `${shippingAddr.line1 || ""}, ${shippingAddr.city || ""}, ${shippingAddr.state || ""} ${shippingAddr.postal_code || ""}`,
          shippingAddr.phone || "",
          new Date(order.created_at).toLocaleDateString(),
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map(cell => `"${cell}"`).join(",")),
      ].join("\\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Exported ${ordersToExport.length} orders to CSV`,
      });
    } catch (err) {
      console.error("Error downloading CSV:", err);
      toast({
        title: "Error",
        description: "Failed to download CSV",
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

  async function updateTracking() {
    if (!editingOrder) return;

    try {
      // Call edge function to update tracking
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

  function getStatusBadge(status: string | null) {
    const statusColors: Record<string, string> = {
      pending: "secondary",
      submitted: "default",
      emailed_vendor: "default",
      pending_manual: "secondary",
      exported_manual: "default",
      error: "destructive",
    };

    return (
      <Badge variant={statusColors[status || "pending"] as any}>
        {status || "pending"}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / ordersPerPage);

  if (showAnalytics) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Revenue and donation trends over time
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowAnalytics(false)}>
              Back to Orders
            </Button>
          </div>
          <AdminAnalyticsCharts />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vendor Fulfillment</h1>
            <p className="text-muted-foreground mt-2">
              Manage order fulfillment across all vendors
            </p>
          </div>
          <Button onClick={() => setShowAnalytics(true)} variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>

        {/* Fulfillment Mode Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fulfillment Options
            </CardTitle>
            <CardDescription>
              Current mode is controlled by VENDOR_FULFILLMENT_MODE environment variable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Option 1: AUTO_API
                </h3>
                <p className="text-sm text-muted-foreground">
                  Automatically submit orders to vendor APIs after payment success. Orders show as "submitted".
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Option 2: EMAIL_VENDOR
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send order details to vendor via email. Orders show as "emailed_vendor".
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Download className="h-4 w-4 text-orange-600" />
                  Option 3: MANUAL_EXPORT
                </h3>
                <p className="text-sm text-muted-foreground">
                  Queue orders for manual CSV export. Orders show as "pending_manual" until exported.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-6">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pending_manual">Pending Manual</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="emailed_vendor">Emailed Vendor</SelectItem>
                  <SelectItem value="exported_manual">Exported Manual</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  <SelectItem value="sinalite">SinaLite</SelectItem>
                  <SelectItem value="scalablepress">Scalable Press</SelectItem>
                  <SelectItem value="psrestful">PSRestful</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={downloadCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>

            {/* Orders Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shipping</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.customer_email || "N/A"}</TableCell>
                      <TableCell>
                        {order.vendor_name || order.vendor_key || "N/A"}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.vendor_status)}</TableCell>
                      <TableCell>
                        <Badge variant={order.shipping_status === 'delivered' ? 'default' : 'secondary'}>
                          {order.shipping_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.tracking_number ? (
                          <div className="flex flex-col gap-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {order.tracking_number}
                            </code>
                            {order.tracking_carrier && (
                              <span className="text-xs text-muted-foreground">
                                {order.tracking_carrier}
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        ${(order.amount_total_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={editingOrder?.id === order.id} onOpenChange={(open) => !open && setEditingOrder(null)}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openTrackingDialog(order)}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Tracking
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Update Tracking Info</DialogTitle>
                                <DialogDescription>
                                  Order {order.order_number} - Customer will receive email notification
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Shipping Status</Label>
                                  <Select
                                    value={trackingForm.shipping_status}
                                    onValueChange={(val) => setTrackingForm({ ...trackingForm, shipping_status: val })}
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
                                <div>
                                  <Label>Tracking Number</Label>
                                  <Input
                                    value={trackingForm.tracking_number}
                                    onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                                    placeholder="e.g., 1Z999AA10123456784"
                                  />
                                </div>
                                <div>
                                  <Label>Tracking URL</Label>
                                  <Input
                                    value={trackingForm.tracking_url}
                                    onChange={(e) => setTrackingForm({ ...trackingForm, tracking_url: e.target.value })}
                                    placeholder="https://..."
                                  />
                                </div>
                                <div>
                                  <Label>Carrier</Label>
                                  <Input
                                    value={trackingForm.tracking_carrier}
                                    onChange={(e) => setTrackingForm({ ...trackingForm, tracking_carrier: e.target.value })}
                                    placeholder="e.g., UPS, FedEx, USPS"
                                  />
                                </div>
                                <Button onClick={updateTracking} className="w-full">
                                  Update & Send Notification
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {order.vendor_status === "pending_manual" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsExported(order.id)}
                            >
                              Mark Exported
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ordersPerPage) + 1} to{" "}
                  {Math.min(currentPage * ordersPerPage, totalCount)} of {totalCount} orders
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}