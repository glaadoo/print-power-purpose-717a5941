import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  BarChart3,
  AlertTriangle,
  UserPlus
} from "lucide-react";
import BulkImportDialog from "@/components/admin/BulkImportDialog";
import { checkDuplicates, type DuplicateWarning } from "@/lib/nonprofit-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Nonprofit = {
  id: string;
  name: string;
  ein?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  source?: string | null;
  irs_status?: string | null;
  approved: boolean;
  created_at: string;
  updated_at?: string;
  tags?: string[] | null;
  logo_url?: string | null;
};

export default function AdminNonprofits() {
  const navigate = useNavigate();
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, curated: 0, irs: 0, pending: 0 });
  
  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingNonprofit, setEditingNonprofit] = useState<Nonprofit | null>(null);
  
  // Add dialog
  const [addDialog, setAddDialog] = useState(false);
  const [newNonprofit, setNewNonprofit] = useState({
    name: "",
    ein: "",
    city: "",
    state: "",
    description: "",
    tags: [] as string[],
    logo_url: "",
  });

  // Sync status
  const [syncing, setSyncing] = useState(false);
  
  // Bulk import
  const [bulkImportDialog, setBulkImportDialog] = useState(false);
  
  // Duplicate warnings
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);

  useEffect(() => {
    checkAuth();
    fetchNonprofits();
    fetchStats();
  }, [sourceFilter, statusFilter, searchQuery]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "admin")) {
      toast.error("Access denied");
      navigate("/");
    }
  }

  async function fetchStats() {
    const { data, error } = await supabase
      .from("nonprofits")
      .select("source, approved");

    if (!error && data) {
      setStats({
        total: data.length,
        curated: data.filter(n => n.source === "curated").length,
        irs: data.filter(n => n.source === "irs").length,
        pending: data.filter(n => !n.approved).length,
      });
    }
  }

  async function fetchNonprofits() {
    setLoading(true);
    try {
      let query = supabase
        .from("nonprofits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      if (statusFilter === "approved") {
        query = query.eq("approved", true);
      } else if (statusFilter === "pending") {
        query = query.eq("approved", false);
      }

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,ein.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNonprofits(data || []);
    } catch (error: any) {
      toast.error("Failed to load nonprofits");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this nonprofit?")) return;

    try {
      const { error } = await supabase
        .from("nonprofits")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Nonprofit deleted");
      fetchNonprofits();
      fetchStats();
    } catch (error: any) {
      toast.error("Failed to delete nonprofit");
      console.error(error);
    }
  }

  async function handleSave() {
    if (!editingNonprofit) return;

    try {
      const { error } = await supabase
        .from("nonprofits")
        .update({
          name: editingNonprofit.name,
          ein: editingNonprofit.ein || null,
          city: editingNonprofit.city || null,
          state: editingNonprofit.state || null,
          description: editingNonprofit.description || null,
          approved: editingNonprofit.approved,
        })
        .eq("id", editingNonprofit.id);

      if (error) throw error;
      toast.success("Nonprofit updated");
      setEditDialog(false);
      setEditingNonprofit(null);
      fetchNonprofits();
      fetchStats();
    } catch (error: any) {
      toast.error("Failed to update nonprofit");
      console.error(error);
    }
  }

  async function handleAdd() {
    if (!newNonprofit.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Check for duplicates
    const warnings = await checkDuplicates(newNonprofit.name, newNonprofit.ein || undefined);
    if (warnings.length > 0) {
      setDuplicateWarnings(warnings);
      // Show warning but allow proceeding
      toast.warning(`Found ${warnings.length} potential duplicate(s). Review warnings below.`);
      return;
    }

    await insertNonprofit();
  }

  async function insertNonprofit() {
    try {
      const { error } = await supabase
        .from("nonprofits")
        .insert({
          name: newNonprofit.name,
          ein: newNonprofit.ein || null,
          city: newNonprofit.city || null,
          state: newNonprofit.state || null,
          description: newNonprofit.description || null,
          source: "curated",
          approved: true,
        });

      if (error) throw error;
      toast.success("Nonprofit added");
      setAddDialog(false);
      setNewNonprofit({ name: "", ein: "", city: "", state: "", description: "", tags: [], logo_url: "" });
      setDuplicateWarnings([]);
      fetchNonprofits();
      fetchStats();
    } catch (error: any) {
      toast.error("Failed to add nonprofit");
      console.error(error);
    }
  }

  async function handleExport() {
    try {
      const { data, error } = await supabase
        .from("nonprofits")
        .select("*")
        .eq("source", "curated");

      if (error) throw error;

      const csv = [
        "Name,EIN,City,State,Description,Approved",
        ...(data || []).map(n => 
          `"${n.name}","${n.ein || ""}","${n.city || ""}","${n.state || ""}","${n.description || ""}","${n.approved}"`
        )
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nonprofits-curated-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Exported curated nonprofits");
    } catch (error: any) {
      toast.error("Export failed");
      console.error(error);
    }
  }

  async function triggerIRSSync(quickSeed: boolean = false) {
    setSyncing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-irs-nonprofits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ quickSeed }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || "Sync failed");

      toast.success(
        `Sync complete: ${result.rowsAdded} added, ${result.rowsSkipped} skipped`
      );
      fetchNonprofits();
      fetchStats();
    } catch (error: any) {
      toast.error("IRS sync failed: " + error.message);
      console.error(error);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Nonprofit Management</h1>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => navigate("/admin/nonprofits/user-submitted")}
              variant="outline"
              size="sm"
              className="bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              User Submissions
            </Button>
            <Button
              onClick={() => navigate("/admin/nonprofit-analytics")}
              variant="outline"
              size="sm"
              className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button
              onClick={() => triggerIRSSync(true)}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Quick Sync (5k)
            </Button>
            <Button
              onClick={() => triggerIRSSync(false)}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Full IRS Sync
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
            <div className="text-sm opacity-80">Total Nonprofits</div>
            <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
            <div className="text-sm opacity-80">Curated</div>
            <div className="text-3xl font-bold text-green-400">{stats.curated.toLocaleString()}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
            <div className="text-sm opacity-80">IRS Records</div>
            <div className="text-3xl font-bold text-blue-400">{stats.irs.toLocaleString()}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
            <div className="text-sm opacity-80">Pending Approval</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.pending.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search by name or EIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/30 text-white"
              />
            </div>
            
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="curated">Curated</SelectItem>
                <SelectItem value="irs">IRS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setAddDialog(true)}
              className="bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Nonprofit
            </Button>

            <Button
              onClick={() => setBulkImportDialog(true)}
              variant="outline"
              className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>

            <Button
              onClick={handleExport}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/10 backdrop-blur rounded-lg border border-white/20 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white/60">Loading...</div>
          ) : nonprofits.length === 0 ? (
            <div className="p-8 text-center text-white/60">No nonprofits found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20 hover:bg-white/5">
                    <TableHead className="text-white/80">Name</TableHead>
                    <TableHead className="text-white/80">EIN</TableHead>
                    <TableHead className="text-white/80">Location</TableHead>
                    <TableHead className="text-white/80">Source</TableHead>
                    <TableHead className="text-white/80">Status</TableHead>
                    <TableHead className="text-white/80">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonprofits.map((nonprofit) => (
                    <TableRow key={nonprofit.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        {nonprofit.name}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {nonprofit.ein || "—"}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {[nonprofit.city, nonprofit.state].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          nonprofit.source === "curated" 
                            ? "bg-green-500/20 text-green-300" 
                            : "bg-blue-500/20 text-blue-300"
                        }`}>
                          {nonprofit.source || "curated"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {nonprofit.approved ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-yellow-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditingNonprofit(nonprofit);
                              setEditDialog(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(nonprofit.id)}
                            size="sm"
                            variant="outline"
                            className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-gray-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>Edit Nonprofit</DialogTitle>
            <DialogDescription className="text-white/60">
              Update nonprofit details
            </DialogDescription>
          </DialogHeader>
          {editingNonprofit && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingNonprofit.name}
                  onChange={(e) => setEditingNonprofit({ ...editingNonprofit, name: e.target.value })}
                  className="bg-white/10 border-white/30 text-white"
                />
              </div>
              <div>
                <Label>EIN</Label>
                <Input
                  value={editingNonprofit.ein || ""}
                  onChange={(e) => setEditingNonprofit({ ...editingNonprofit, ein: e.target.value })}
                  className="bg-white/10 border-white/30 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={editingNonprofit.city || ""}
                    onChange={(e) => setEditingNonprofit({ ...editingNonprofit, city: e.target.value })}
                    className="bg-white/10 border-white/30 text-white"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={editingNonprofit.state || ""}
                    onChange={(e) => setEditingNonprofit({ ...editingNonprofit, state: e.target.value })}
                    className="bg-white/10 border-white/30 text-white"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editingNonprofit.description || ""}
                  onChange={(e) => setEditingNonprofit({ ...editingNonprofit, description: e.target.value })}
                  className="bg-white/10 border-white/30 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="approved"
                  checked={editingNonprofit.approved}
                  onChange={(e) => setEditingNonprofit({ ...editingNonprofit, approved: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="approved">Approved</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditDialog(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="bg-gray-900 text-white border-white/20">
          <DialogHeader>
            <DialogTitle>Add New Nonprofit</DialogTitle>
            <DialogDescription className="text-white/60">
              Add a curated nonprofit to the database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {duplicateWarnings.length > 0 && (
              <Alert className="bg-yellow-500/20 border-yellow-500/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Potential duplicates found:</div>
                  {duplicateWarnings.map((warning, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-sm font-medium">{warning.message}</div>
                      <ul className="text-xs ml-4 mt-1">
                        {warning.matches.map(match => (
                          <li key={match.id}>
                            {match.name} {match.ein && `(${match.ein})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="text-sm mt-2">
                    Click "Add Anyway" to proceed despite warnings.
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label>Name *</Label>
              <Input
                value={newNonprofit.name}
                onChange={(e) => {
                  setNewNonprofit({ ...newNonprofit, name: e.target.value });
                  setDuplicateWarnings([]);
                }}
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div>
              <Label>EIN</Label>
              <Input
                value={newNonprofit.ein}
                onChange={(e) => {
                  setNewNonprofit({ ...newNonprofit, ein: e.target.value });
                  setDuplicateWarnings([]);
                }}
                className="bg-white/10 border-white/30 text-white"
                placeholder="12-3456789"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={newNonprofit.city}
                  onChange={(e) => setNewNonprofit({ ...newNonprofit, city: e.target.value })}
                  className="bg-white/10 border-white/30 text-white"
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={newNonprofit.state}
                  onChange={(e) => setNewNonprofit({ ...newNonprofit, state: e.target.value })}
                  className="bg-white/10 border-white/30 text-white"
                  placeholder="CA"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newNonprofit.description}
                onChange={(e) => setNewNonprofit({ ...newNonprofit, description: e.target.value })}
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setAddDialog(false);
              setDuplicateWarnings([]);
            }} variant="outline">
              Cancel
            </Button>
            {duplicateWarnings.length > 0 ? (
              <Button onClick={insertNonprofit} className="bg-yellow-500 hover:bg-yellow-600">
                Add Anyway
              </Button>
            ) : (
              <Button onClick={handleAdd} className="bg-green-500 hover:bg-green-600">
                Add Nonprofit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportDialog}
        onOpenChange={setBulkImportDialog}
        onSuccess={() => {
          fetchNonprofits();
          fetchStats();
        }}
      />
    </div>
  );
}
