import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Send } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { toast } from "sonner";

export default function AdminStoryRequests() {
  const [storyRequests, setStoryRequests] = useState<any[]>([]);
  const [causes, setCauses] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [requestsRes, causesRes] = await Promise.all([
      supabase.from("story_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("causes").select("*")
    ]);

    if (requestsRes.data) setStoryRequests(requestsRes.data);
    if (causesRes.data) setCauses(causesRes.data);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("story_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      loadData();
    }
  };

  return (
    <div className="fixed inset-0 text-white">
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a href="/admin" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          ← ADMIN
        </a>
        <span className="text-sm">Story Requests</span>
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
                <CardTitle className="text-white">Story Requests ($777 Milestones)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-white/80">Cause</TableHead>
                        <TableHead className="text-white/80">Amount Raised</TableHead>
                        <TableHead className="text-white/80">Contact Email</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80">Reached At</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storyRequests.map((request) => {
                        const cause = causes.find(c => c.id === request.cause_id);
                        return (
                          <TableRow key={request.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white font-medium">
                              {cause?.name || "Unknown Cause"}
                            </TableCell>
                            <TableCell className="text-white">
                              ${cause ? (cause.raised_cents / 100).toFixed(2) : "0.00"}
                            </TableCell>
                            <TableCell className="text-white">{request.contact_email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  request.status === "completed" ? "default" :
                                  request.status === "in_progress" ? "secondary" :
                                  "outline"
                                }
                                className={
                                  request.status === "pending" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : ""
                                }
                              >
                                {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                {request.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {request.status === "in_progress" && <Send className="h-3 w-3 mr-1" />}
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white/70 text-sm">
                              {new Date(request.reached_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {request.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateStatus(request.id, "in_progress")}
                                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                  >
                                    Start
                                  </Button>
                                )}
                                {request.status === "in_progress" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(request.id, "completed")}
                                  >
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {storyRequests.length === 0 && (
                    <div className="text-center py-12 text-white/50">
                      No story requests yet. Requests are created when causes reach $777.
                    </div>
                  )}
                </div>

                {storyRequests.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-2">📋 Next Steps for Story Requests:</h3>
                    <ol className="text-white/80 text-sm space-y-1 list-decimal list-inside">
                      <li>Contact the nonprofit/school for their story</li>
                      <li>Request photos and testimonials</li>
                      <li>Prepare content for Pressmaster.ai</li>
                      <li>Mark as completed when published</li>
                    </ol>
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
