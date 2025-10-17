import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Search } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { toast } from "sonner";

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders");
    } else {
      setOrders(data || []);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ["Order Number", "Customer Email", "Product", "Amount", "Donation", "Cause", "Status", "Date"];
    const rows = filteredOrders.map(o => [
      o.order_number,
      o.customer_email,
      o.product_name,
      `$${(o.amount_total_cents / 100).toFixed(2)}`,
      `$${(o.donation_cents / 100).toFixed(2)}`,
      o.cause_name || "N/A",
      o.status,
      new Date(o.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  return (
    <div className="fixed inset-0 text-white">
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a href="/admin" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          ← ADMIN
        </a>
        <span className="text-sm">Orders</span>
      </header>

      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen py-12 px-4">
          <VideoBackground 
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          <div className="relative max-w-7xl mx-auto">
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-white">Orders Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        placeholder="Search by email, order number, product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant={statusFilter === "all" ? "default" : "outline"}
                      onClick={() => setStatusFilter("all")}
                      className={statusFilter !== "all" ? "bg-white/10 border-white/20 text-white" : ""}
                    >
                      All
                    </Button>
                    <Button 
                      variant={statusFilter === "completed" ? "default" : "outline"}
                      onClick={() => setStatusFilter("completed")}
                      className={statusFilter !== "completed" ? "bg-white/10 border-white/20 text-white" : ""}
                    >
                      Completed
                    </Button>
                    <Button 
                      variant={statusFilter === "pending" ? "default" : "outline"}
                      onClick={() => setStatusFilter("pending")}
                      className={statusFilter !== "pending" ? "bg-white/10 border-white/20 text-white" : ""}
                    >
                      Pending
                    </Button>
                  </div>
                  <Button onClick={exportToCSV} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-white/80">Order #</TableHead>
                        <TableHead className="text-white/80">Customer</TableHead>
                        <TableHead className="text-white/80">Product</TableHead>
                        <TableHead className="text-white/80">Amount</TableHead>
                        <TableHead className="text-white/80">Donation</TableHead>
                        <TableHead className="text-white/80">Cause</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white font-mono text-sm">{order.order_number}</TableCell>
                          <TableCell className="text-white">{order.customer_email}</TableCell>
                          <TableCell className="text-white">{order.product_name}</TableCell>
                          <TableCell className="text-white">${(order.amount_total_cents / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-white">${(order.donation_cents / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-white">{order.cause_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/70 text-sm">
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredOrders.length === 0 && (
                    <div className="text-center py-12 text-white/50">
                      No orders found
                    </div>
                  )}
                </div>
              </CardContent>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
