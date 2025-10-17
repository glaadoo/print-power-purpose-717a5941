import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { DollarSign, ShoppingCart, Heart, TrendingUp } from "lucide-react";

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [causes, setCauses] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ordersRes, donationsRes, causesRes] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("donations").select("*"),
      supabase.from("causes").select("*")
    ]);

    if (ordersRes.data) setOrders(ordersRes.data);
    if (donationsRes.data) setDonations(donationsRes.data);
    if (causesRes.data) setCauses(causesRes.data);
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.amount_total_cents, 0);
  const totalDonations = donations.reduce((sum, d) => sum + d.amount_cents, 0);
  const activeCauses = causes.filter(c => c.raised_cents > 0).length;

  // Group donations by cause
  const donationsByCause = causes.map(cause => ({
    name: cause.name,
    value: donations.filter(d => d.cause_id === cause.id).reduce((sum, d) => sum + d.amount_cents, 0) / 100,
    raised: cause.raised_cents / 100,
    goal: cause.goal_cents / 100
  })).filter(c => c.raised > 0).sort((a, b) => b.raised - a.raised);

  // Group orders by week
  const ordersByWeek = orders.reduce((acc: any, order) => {
    const week = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = acc.find((w: any) => w.week === week);
    if (existing) {
      existing.count += 1;
      existing.revenue += order.amount_total_cents / 100;
    } else {
      acc.push({ week, count: 1, revenue: order.amount_total_cents / 100 });
    }
    return acc;
  }, []).slice(-8);

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  return (
    <div className="fixed inset-0 text-white">
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a href="/admin" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          ← ADMIN
        </a>
        <span className="text-sm">Analytics</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{orders.length}</div>
                    <div className="text-white/70 text-sm">Total Orders</div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">${(totalRevenue / 100).toFixed(2)}</div>
                    <div className="text-white/70 text-sm">Total Revenue</div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">${(totalDonations / 100).toFixed(2)}</div>
                    <div className="text-white/70 text-sm">Total Donations</div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{activeCauses}</div>
                    <div className="text-white/70 text-sm">Active Causes</div>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard>
                <CardHeader>
                  <CardTitle className="text-white">Orders & Revenue by Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ordersByWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="week" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue ($)" />
                      <Bar dataKey="count" fill="#ec4899" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </GlassCard>

              <GlassCard>
                <CardHeader>
                  <CardTitle className="text-white">Top Causes by Donations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={donationsByCause}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: $${entry.raised.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="raised"
                      >
                        {donationsByCause.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </GlassCard>
            </div>

            <GlassCard>
              <CardHeader>
                <CardTitle className="text-white">Cause Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {causes.sort((a, b) => b.raised_cents - a.raised_cents).map((cause) => {
                  const progress = Math.min((cause.raised_cents / cause.goal_cents) * 100, 100);
                  const reached777 = cause.raised_cents >= 77700;
                  
                  return (
                    <div key={cause.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{cause.name}</span>
                          {reached777 && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                              $777 Reached 🎉
                            </span>
                          )}
                        </div>
                        <span className="text-white/70 text-sm">
                          ${(cause.raised_cents / 100).toFixed(2)} / ${(cause.goal_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {causes.length === 0 && (
                  <div className="text-center py-8 text-white/50">
                    No causes yet
                  </div>
                )}
              </CardContent>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
