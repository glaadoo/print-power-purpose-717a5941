import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, 
  ExternalLink, Mail, Globe, Building2, Clock
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserSubmittedNonprofit = {
  id: string;
  name: string;
  ein?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  website_url?: string;
  contact_email?: string;
  submitted_by_email?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
};

export default function AdminUserSubmittedNonprofits() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<UserSubmittedNonprofit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  
  // Modal states
  const [detailModal, setDetailModal] = useState<UserSubmittedNonprofit | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchSubmissions();

    // Set up realtime subscription for new submissions
    const channel = supabase
      .channel('user-submitted-nonprofits')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_submitted_nonprofits'
        },
        (payload) => {
          const newSubmission = payload.new as UserSubmittedNonprofit;
          setSubmissions((prev) => [newSubmission, ...prev]);
          toast.info(`New nonprofit submission: ${newSubmission.name}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("user_submitted_nonprofits")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      toast.error("Failed to load submissions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: UserSubmittedNonprofit) => {
    setProcessing(true);
    try {
      // 1. Add to main nonprofits table
      const { error: insertError } = await supabase
        .from("nonprofits")
        .insert({
          name: submission.name,
          ein: submission.ein,
          city: submission.city,
          state: submission.state,
          country: submission.country || 'US',
          description: submission.description,
          source: 'user_submitted',
          approved: true
        });

      if (insertError) throw insertError;

      // 2. Update submission status
      const { error: updateError } = await supabase
        .from("user_submitted_nonprofits")
        .update({ 
          status: "approved", 
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", submission.id);

      if (updateError) throw updateError;

      toast.success("Nonprofit approved and added to main list!");
      setSubmissions(submissions.map(s => 
        s.id === submission.id ? { ...s, status: "approved" } : s
      ));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(submission.id);
        return next;
      });
      setDetailModal(null);
      setAdminNotes("");
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
        .from("user_submitted_nonprofits")
        .update({ 
          status: "rejected",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Submission rejected");
      setSubmissions(submissions.map(s => 
        s.id === id ? { ...s, status: "rejected" } : s
      ));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDetailModal(null);
      setAdminNotes("");
    } catch (error: any) {
      toast.error("Rejection failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selected.size === 0) {
      toast.error("No submissions selected");
      return;
    }

    setProcessing(true);
    try {
      const selectedSubmissions = submissions.filter(s => selected.has(s.id));
      
      // Insert all into main nonprofits table
      const nonprofitsToInsert = selectedSubmissions.map(s => ({
        name: s.name,
        ein: s.ein,
        city: s.city,
        state: s.state,
        country: s.country || 'US',
        description: s.description,
        source: 'user_submitted',
        approved: true
      }));

      const { error: insertError } = await supabase
        .from("nonprofits")
        .insert(nonprofitsToInsert);

      if (insertError) throw insertError;

      // Update all submission statuses
      const ids = Array.from(selected);
      const { error: updateError } = await supabase
        .from("user_submitted_nonprofits")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString()
        })
        .in("id", ids);

      if (updateError) throw updateError;

      toast.success(`Approved ${selected.size} submission(s)!`);
      setSubmissions(submissions.map(s => 
        selected.has(s.id) ? { ...s, status: "approved" } : s
      ));
      setSelected(new Set());
    } catch (error: any) {
      toast.error("Batch approval failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (selected.size === 0) {
      toast.error("No submissions selected");
      return;
    }

    setProcessing(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("user_submitted_nonprofits")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString()
        })
        .in("id", ids);

      if (error) throw error;

      toast.success(`Rejected ${selected.size} submission(s)`);
      setSubmissions(submissions.map(s => 
        selected.has(s.id) ? { ...s, status: "rejected" } : s
      ));
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
    const pendingOnly = submissions.filter(s => s.status === "pending");
    if (selected.size === pendingOnly.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingOnly.map((n) => n.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="border-green-500 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-red-500 text-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = submissions.filter(s => s.status === "pending").length;

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
          <h1 className="text-3xl font-bold mb-2">User-Submitted Nonprofits</h1>
          <p className="text-white/60">
            Review nonprofits submitted by users who couldn't find their organization
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="text-sm">
            {submissions.length} submission(s)
          </Badge>
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
            <div className="text-center py-8">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-white/40 mb-4" />
              <p className="text-lg text-white/60">No submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white">
                      <Checkbox
                        checked={selected.size === submissions.filter(s => s.status === "pending").length && submissions.filter(s => s.status === "pending").length > 0}
                        onCheckedChange={toggleSelectAll}
                        disabled={submissions.filter(s => s.status === "pending").length === 0}
                      />
                    </TableHead>
                    <TableHead className="text-white">Organization</TableHead>
                    <TableHead className="text-white">Location</TableHead>
                    <TableHead className="text-white">Contact</TableHead>
                    <TableHead className="text-white">Submitted By</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id} className="border-white/10">
                      <TableCell>
                        <Checkbox
                          checked={selected.has(submission.id)}
                          onCheckedChange={() => toggleSelect(submission.id)}
                          disabled={submission.status !== "pending"}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-white/60" />
                          <div>
                            <div>{submission.name}</div>
                            {submission.ein && (
                              <div className="text-xs text-white/60">EIN: {submission.ein}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/80">
                        {submission.city && submission.state
                          ? `${submission.city}, ${submission.state}`
                          : submission.state || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {submission.contact_email && (
                            <a 
                              href={`mailto:${submission.contact_email}`}
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              {submission.contact_email}
                            </a>
                          )}
                          {submission.website_url && (
                            <a 
                              href={submission.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/80 text-sm">
                        {submission.submitted_by_email || "Anonymous"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(submission.status)}
                      </TableCell>
                      <TableCell className="text-white/80 text-sm">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDetailModal(submission);
                              setAdminNotes(submission.admin_notes || "");
                            }}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          {submission.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(submission)}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(submission.id)}
                                disabled={processing}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Detail Modal */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="bg-gray-900 text-white border-white/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {detailModal?.name}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Submitted {detailModal && new Date(detailModal.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {detailModal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60">EIN</label>
                  <p>{detailModal.ein || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm text-white/60">Location</label>
                  <p>
                    {[detailModal.city, detailModal.state, detailModal.country]
                      .filter(Boolean)
                      .join(", ") || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-white/60">Contact Email</label>
                  <p>{detailModal.contact_email || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm text-white/60">Website</label>
                  {detailModal.website_url ? (
                    <a 
                      href={detailModal.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {detailModal.website_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p>Not provided</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60">Description</label>
                <p className="mt-1 text-white/90">{detailModal.description || "No description provided"}</p>
              </div>

              <div>
                <label className="text-sm text-white/60">Submitted By</label>
                <p>{detailModal.submitted_by_email || "Anonymous"}</p>
              </div>

              <div>
                <label className="text-sm text-white/60">Status</label>
                <div className="mt-1">{getStatusBadge(detailModal.status)}</div>
              </div>

              {detailModal.status === "pending" && (
                <div>
                  <label className="text-sm text-white/60">Admin Notes (optional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this submission..."
                    className="mt-1 bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {detailModal?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(detailModal.id)}
                  disabled={processing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(detailModal)}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Add to List
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
