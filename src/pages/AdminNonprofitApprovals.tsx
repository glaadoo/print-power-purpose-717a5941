import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PendingNonprofit = {
  id: string;
  name: string;
  ein?: string;
  city?: string;
  state?: string;
  description?: string;
  created_at: string;
  source: string;
};

export default function AdminNonprofitApprovals() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingNonprofit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPending();

    // Set up realtime subscription for new submissions
    const channel = supabase
      .channel('nonprofit-submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nonprofits',
          filter: 'approved=eq.false'
        },
        (payload) => {
          const newNonprofit = payload.new as PendingNonprofit;
          setPending((prev) => [newNonprofit, ...prev]);
          toast.info(`New nonprofit submission: ${newNonprofit.name}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("nonprofits")
        .select("*")
        .eq("approved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPending(data || []);
    } catch (error: any) {
      toast.error("Failed to load pending submissions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("nonprofits")
        .update({ approved: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Nonprofit approved!");
      setPending(pending.filter((n) => n.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error: any) {
      toast.error("Approval failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("nonprofits")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Nonprofit rejected and removed");
      setPending(pending.filter((n) => n.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error: any) {
      toast.error("Rejection failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selected.size === 0) {
      toast.error("No nonprofits selected");
      return;
    }

    setProcessing(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("nonprofits")
        .update({ approved: true, updated_at: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;

      toast.success(`Approved ${selected.size} nonprofit(s)!`);
      setPending(pending.filter((n) => !selected.has(n.id)));
      setSelected(new Set());
    } catch (error: any) {
      toast.error("Batch approval failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selected.size === 0) {
      toast.error("No nonprofits selected");
      return;
    }

    setProcessing(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("nonprofits")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast.success(`Rejected and removed ${selected.size} nonprofit(s)`);
      setPending(pending.filter((n) => !selected.has(n.id)));
      setSelected(new Set());
    } catch (error: any) {
      toast.error("Batch rejection failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((n) => n.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button
            onClick={() => navigate("/admin/nonprofits")}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Nonprofits
          </Button>
          <h1 className="text-3xl font-bold mb-2">Nonprofit Approval Queue</h1>
          <p className="text-white/60">
            Review and approve pending nonprofit submissions
          </p>
        </div>

        {/* Batch Actions */}
        {selected.size > 0 && (
          <div className="mb-4 flex gap-3">
            <Button
              onClick={handleBatchApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve Selected ({selected.size})
            </Button>
            <Button
              onClick={handleBatchReject}
              disabled={processing}
              variant="destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject Selected ({selected.size})
            </Button>
          </div>
        )}

        <GlassCard>
          {loading ? (
            <div className="text-center py-8">Loading pending submissions...</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-white/40 mb-4" />
              <p className="text-lg text-white/60">No pending submissions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white">
                      <Checkbox
                        checked={selected.size === pending.length && pending.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">EIN</TableHead>
                    <TableHead className="text-white">Location</TableHead>
                    <TableHead className="text-white">Source</TableHead>
                    <TableHead className="text-white">Submitted</TableHead>
                    <TableHead className="text-white text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((nonprofit) => (
                    <TableRow key={nonprofit.id} className="border-white/10">
                      <TableCell>
                        <Checkbox
                          checked={selected.has(nonprofit.id)}
                          onCheckedChange={() => toggleSelect(nonprofit.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {nonprofit.name}
                        {nonprofit.description && (
                          <div className="text-xs text-white/60 mt-1">
                            {nonprofit.description.substring(0, 80)}...
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {nonprofit.ein || "N/A"}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {nonprofit.city && nonprofit.state
                          ? `${nonprofit.city}, ${nonprofit.state}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/30 text-white">
                          {nonprofit.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/80">
                        {new Date(nonprofit.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(nonprofit.id)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(nonprofit.id)}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
