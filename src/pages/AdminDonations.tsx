import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { toast } from "sonner";

export default function AdminDonations() {
  const [donations, setDonations] = useState<any[]>([]);
  const [causes, setCauses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [causeFilter, setCauseFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [donationsRes, causesRes] = await Promise.all([
      supabase.from("donations").select("*").order("created_at", { ascending: false }),
      supabase.from("causes").select("*")
    ]);

    if (donationsRes.data) setDonations(donationsRes.data);
    if (causesRes.data) setCauses(causesRes.data);
  };

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = 
      donation.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCause = causeFilter === "all" || donation.cause_id === causeFilter;
    
    return matchesSearch && matchesCause;
  });

  const totalDonations = filteredDonations.reduce((sum, d) => sum + d.amount_cents, 0);

  const exportToCSV = () => {
    const headers = ["Customer Email", "Amount", "Cause ID", "Date"];
    const rows = filteredDonations.map(d => [
      d.customer_email,
      `$${(d.amount_cents / 100).toFixed(2)}`,
      d.cause_id || "N/A",
      new Date(d.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  return (
    <div className="fixed inset-0 text-white">
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a href="/admin" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          ← ADMIN
        </a>
        <span className="text-sm">Donations</span>
      </header>

      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen py-12 px-4">
          <VideoBackground 
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          <div className="relative max-w-7xl mx-auto space-y-6">
            <GlassCard className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{filteredDonations.length}</div>
                  <div className="text-white/70 text-sm">Total Donations</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">${(totalDonations / 100).toFixed(2)}</div>
                  <div className="text-white/70 text-sm">Total Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">${filteredDonations.length > 0 ? (totalDonations / filteredDonations.length / 100).toFixed(2) : "0.00"}</div>
                  <div className="text-white/70 text-sm">Average Donation</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <CardHeader>
                <CardTitle className="text-white">Donations Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        placeholder="Search by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                  <select
                    value={causeFilter}
                    onChange={(e) => setCauseFilter(e.target.value)}
                    className="px-4 py-2 rounded-md bg-white/10 border border-white/20 text-white"
                  >
                    <option value="all">All Causes</option>
                    {causes.map(cause => (
                      <option key={cause.id} value={cause.id}>{cause.name}</option>
                    ))}
                  </select>
                  <Button onClick={exportToCSV} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-white/80">Customer Email</TableHead>
                        <TableHead className="text-white/80">Amount</TableHead>
                        <TableHead className="text-white/80">Cause</TableHead>
                        <TableHead className="text-white/80">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDonations.map((donation) => {
                        const cause = causes.find(c => c.id === donation.cause_id);
                        return (
                          <TableRow key={donation.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white">{donation.customer_email}</TableCell>
                            <TableCell className="text-white font-semibold">${(donation.amount_cents / 100).toFixed(2)}</TableCell>
                            <TableCell className="text-white">{cause?.name || "—"}</TableCell>
                            <TableCell className="text-white/70 text-sm">
                              {new Date(donation.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredDonations.length === 0 && (
                    <div className="text-center py-12 text-white/50">
                      No donations found
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
