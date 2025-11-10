import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
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
}

export default function LegalNotice() {
  const [searchParams] = useSearchParams();
  const requestedVersion = searchParams.get("version");
  
  const [document, setDocument] = useState<LegalDoc | null>(null);
  const [versions, setVersions] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    fetchDocument();
    fetchVersions();
  }, [requestedVersion]);

  const fetchDocument = async () => {
    try {
      let query = supabase
        .from("legal_documents")
        .select("*")
        .eq("type", "legal");

      if (requestedVersion) {
        query = query.eq("version", parseInt(requestedVersion));
      } else {
        query = query.eq("status", "published");
      }

      const { data, error } = await query
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setDocument(data);
    } catch (error: any) {
      toast.error("Failed to load legal notice");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("id, version, effective_date, published_at, changelog, type, title, content, status")
        .eq("type", "legal")
        .eq("status", "published")
        .order("version", { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      console.error("Failed to fetch versions:", error);
    }
  };

  const handleExport = async () => {
    if (!document) return;
    const result = await exportToPDF(document);
    if (result.success) {
      toast.success("PDF downloaded successfully");
    } else {
      toast.error("Failed to export PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading legal notice...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Legal notice not available
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{document.title}</h1>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline">Version {document.version}</Badge>
                    <span>
                      Effective: {new Date(document.effective_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Version Selector */}
              {versions.length > 1 && (
                <div className="mt-4 border-t pt-4">
                  <button
                    onClick={() => setShowVersions(!showVersions)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showVersions ? "rotate-180" : ""
                      }`}
                    />
                    View previous versions ({versions.length - 1} available)
                  </button>
                  
                  {showVersions && (
                    <div className="mt-3 space-y-2">
                      {versions.map((v) => (
                        <a
                          key={v.id}
                          href={`/policies/legal?version=${v.version}`}
                          className="block p-3 rounded border hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">Version {v.version}</span>
                              {v.version === document.version && (
                                <Badge variant="default" className="ml-2">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(v.effective_date).toLocaleDateString()}
                            </span>
                          </div>
                          {v.changelog && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {v.changelog}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                {document.content}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
              <p>
                Last updated: {document.published_at 
                  ? new Date(document.published_at).toLocaleDateString()
                  : new Date(document.effective_date).toLocaleDateString()}
              </p>
              <p className="mt-2">
                Questions about our legal policies? <a href="/contact" className="text-primary hover:underline">Contact us</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
