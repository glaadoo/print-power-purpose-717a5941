import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Plus, Edit, Archive, Eye, Download } from "lucide-react";
import { exportToPDF } from "@/lib/pdf-export";

interface LegalDoc {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  effective_date: string;
  published_at: string | null;
  status: string;
  changelog: string | null;
  created_at: string;
}

export default function AdminLegal() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<LegalDoc | null>(null);
  
  const [formData, setFormData] = useState({
    type: "privacy",
    title: "",
    content: "",
    effective_date: "",
    changelog: "",
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    setLoading(true);
    try {
      const sessionToken = sessionStorage.getItem("admin_session");
      
      if (!sessionToken) {
        toast.error("Please log in to access this page");
        navigate("/admin");
        return;
      }

      // Verify session with admin endpoint
      const { data, error } = await supabase.functions.invoke('verify-admin-key', {
        body: { sessionToken }
      });

      if (error || !data?.valid) {
        sessionStorage.removeItem("admin_session");
        toast.error("Session expired. Please log in again.");
        navigate("/admin");
        return;
      }

      setIsAdmin(true);
      await fetchDocuments();
    } catch (error) {
      console.error("Error checking admin status:", error);
      toast.error("Failed to verify admin access");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .order("type", { ascending: true })
        .order("version", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch documents: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get the highest version for this type
      const { data: existingDocs } = await supabase
        .from("legal_documents")
        .select("version")
        .eq("type", formData.type)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = existingDocs && existingDocs.length > 0 
        ? existingDocs[0].version + 1 
        : 1;

      if (editMode && selectedDoc) {
        // Update existing document
        const { error } = await supabase
          .from("legal_documents")
          .update({
            title: formData.title,
            content: formData.content,
            effective_date: formData.effective_date,
            changelog: formData.changelog,
          })
          .eq("id", selectedDoc.id);

        if (error) throw error;
        toast.success("Document updated successfully");
      } else {
        // Create new version
        const { error } = await supabase
          .from("legal_documents")
          .insert({
            type: formData.type,
            version: nextVersion,
            title: formData.title,
            content: formData.content,
            effective_date: formData.effective_date,
            changelog: formData.changelog,
            status: "draft",
          });

        if (error) throw error;
        toast.success(`New version ${nextVersion} created as draft`);
      }

      // Reset form
      setFormData({
        type: "privacy",
        title: "",
        content: "",
        effective_date: "",
        changelog: "",
      });
      setEditMode(false);
      setSelectedDoc(null);
      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to save document: " + error.message);
    }
  };

  const handlePublish = async (doc: LegalDoc) => {
    try {
      // Archive current published version
      await supabase
        .from("legal_documents")
        .update({ status: "archived" })
        .eq("type", doc.type)
        .eq("status", "published");

      // Publish new version
      const { error } = await supabase
        .from("legal_documents")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", doc.id);

      if (error) throw error;
      
      // Send email notifications
      toast.loading("Sending notifications...", { id: "notifications" });
      
      try {
        const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
          "send-policy-notification",
          {
            body: {
              policyType: doc.type,
              policyTitle: doc.title,
              version: doc.version,
              effectiveDate: new Date(doc.effective_date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              }),
              changelog: doc.changelog,
              notifyAdmins: true,
              notifyUsers: true,
            },
          }
        );

        if (notificationError) {
          console.error("Notification error:", notificationError);
          toast.error("Published but failed to send some notifications", { id: "notifications" });
        } else {
          const { adminEmailsSent, userEmailsSent, errors } = notificationResult;
          if (errors && errors.length > 0) {
            toast.warning(
              `Published! Sent ${adminEmailsSent} admin & ${userEmailsSent} user notifications (${errors.length} failed)`,
              { id: "notifications", duration: 5000 }
            );
          } else {
            toast.success(
              `Published & notified ${adminEmailsSent} admins and ${userEmailsSent} users!`,
              { id: "notifications", duration: 5000 }
            );
          }
        }
      } catch (notifError: any) {
        console.error("Failed to send notifications:", notifError);
        toast.warning(`Published successfully, but notifications failed`, { id: "notifications" });
      }

      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to publish: " + error.message);
    }
  };

  const handleArchive = async (doc: LegalDoc) => {
    try {
      const { error } = await supabase
        .from("legal_documents")
        .update({ status: "archived" })
        .eq("id", doc.id);

      if (error) throw error;
      toast.success("Document archived");
      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to archive: " + error.message);
    }
  };

  const handleEdit = (doc: LegalDoc) => {
    setSelectedDoc(doc);
    setFormData({
      type: doc.type,
      title: doc.title,
      content: doc.content,
      effective_date: doc.effective_date,
      changelog: doc.changelog || "",
    });
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExport = async (doc: LegalDoc) => {
    const result = await exportToPDF(doc);
    if (result.success) {
      toast.success("PDF exported successfully");
    } else {
      toast.error("Failed to export PDF");
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, LegalDoc[]>);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Legal Document Manager</h1>
            <p className="text-muted-foreground mt-2">
              Create, version, and publish legal policies
            </p>
          </div>
          <Button onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        {/* Editor Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {editMode ? "Edit Document" : "Create New Version"}
            </CardTitle>
            <CardDescription>
              {editMode 
                ? "Update the selected document" 
                : "Create a new version of a legal document"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Document Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                    disabled={editMode}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="privacy">Privacy Policy</SelectItem>
                      <SelectItem value="terms">Terms of Use</SelectItem>
                      <SelectItem value="legal">Legal Notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) =>
                      setFormData({ ...formData, effective_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Privacy Policy"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Enter the full legal text..."
                  className="min-h-[300px] font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="changelog">Changelog (optional)</Label>
                <Textarea
                  id="changelog"
                  value={formData.changelog}
                  onChange={(e) =>
                    setFormData({ ...formData, changelog: e.target.value })
                  }
                  placeholder="What changed in this version?"
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  {editMode ? "Update Document" : "Create Draft"}
                </Button>
                {editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setSelectedDoc(null);
                      setFormData({
                        type: "privacy",
                        title: "",
                        content: "",
                        effective_date: "",
                        changelog: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Document Lists */}
        {Object.entries(groupedDocs).map(([type, docs]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {type === "privacy" && "Privacy Policy"}
                {type === "terms" && "Terms of Use"}
                {type === "legal" && "Legal Notice"}
              </CardTitle>
              <CardDescription>
                {docs.length} version{docs.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">v{doc.version}</span>
                        <Badge
                          variant={
                            doc.status === "published"
                              ? "default"
                              : doc.status === "draft"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {doc.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Effective: {new Date(doc.effective_date).toLocaleDateString()}
                      </p>
                      {doc.changelog && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Changes: {doc.changelog}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(`/policies/${doc.type}?version=${doc.version}`)
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {doc.status === "draft" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(doc)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePublish(doc)}
                          >
                            Publish
                          </Button>
                        </>
                      )}
                      {doc.status === "published" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(doc)}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
