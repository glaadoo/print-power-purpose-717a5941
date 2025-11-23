import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RefreshCw, Download, Search, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import VideoBackground from "@/components/VideoBackground";
import { toast } from "sonner";

interface AccessLog {
  id: string;
  attempt_time: string;
  path: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  reason: string;
  provided_key: string | null;
  user_email: string | null;
  user_id: string | null;
  notes: string | null;
}

export default function AdminAccessLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed">("all");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_access_logs")
        .select("*")
        .order("attempt_time", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading access logs:", error);
      toast.error("Failed to load access logs");
    } finally {
      setLoading(false);
    }
  };

  const exportLogsToCSV = () => {
    const headers = [
      "Timestamp",
      "Path",
      "Success",
      "Reason",
      "IP Address",
      "User Agent",
      "User Email",
      "Notes"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(log =>
        [
          new Date(log.attempt_time).toISOString(),
          log.path,
          log.success ? "Success" : "Failed",
          log.reason,
          log.ip_address || "N/A",
          log.user_agent || "N/A",
          log.user_email || "N/A",
          log.notes || ""
        ].map(field => `"${field}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-access-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  const filteredLogs = logs.filter(log => {
    // Filter by status
    if (filterStatus === "success" && !log.success) return false;
    if (filterStatus === "failed" && log.success) return false;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.path.toLowerCase().includes(term) ||
        log.reason.toLowerCase().includes(term) ||
        log.ip_address?.toLowerCase().includes(term) ||
        log.user_email?.toLowerCase().includes(term) ||
        log.user_agent?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const successCount = logs.filter(l => l.success).length;
  const failedCount = logs.filter(l => !l.success).length;

  return (
    <>
      <VideoBackground 
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
        overlay={<div className="absolute inset-0 bg-black/70" />}
      />
      <div className="min-h-screen p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/admin")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Admin
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">Admin Access Logs</h1>
                <p className="text-white/70">Monitor all admin page access attempts</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadLogs} variant="outline" className="gap-2" disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={exportLogsToCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-full">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Total Attempts</p>
                  <p className="text-2xl font-bold text-white">{logs.length}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Successful Access</p>
                  <p className="text-2xl font-bold text-white">{successCount}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Failed Attempts</p>
                  <p className="text-2xl font-bold text-white">{failedCount}</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Filters */}
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  placeholder="Search by path, IP, email, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "success" ? "default" : "outline"}
                  onClick={() => setFilterStatus("success")}
                >
                  Success
                </Button>
                <Button
                  variant={filterStatus === "failed" ? "default" : "outline"}
                  onClick={() => setFilterStatus("failed")}
                >
                  Failed
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Logs Table */}
          <GlassCard className="p-6">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="text-center py-12 text-white/70">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                  Loading logs...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-white/70">
                  No access logs found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/70">Timestamp</TableHead>
                      <TableHead className="text-white/70">Path</TableHead>
                      <TableHead className="text-white/70">Status</TableHead>
                      <TableHead className="text-white/70">Reason</TableHead>
                      <TableHead className="text-white/70">IP Address</TableHead>
                      <TableHead className="text-white/70">User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="border-white/10">
                        <TableCell className="text-white/90 font-mono text-xs">
                          {new Date(log.attempt_time).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-white/90 font-mono text-xs">
                          {log.path}
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              <XCircle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-white/70 text-sm">
                          {log.reason}
                        </TableCell>
                        <TableCell className="text-white/70 font-mono text-xs">
                          {log.ip_address || "N/A"}
                        </TableCell>
                        <TableCell className="text-white/70 text-sm">
                          {log.user_email || "Anonymous"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
