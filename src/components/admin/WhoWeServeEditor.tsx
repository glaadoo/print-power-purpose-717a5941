import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PageContent {
  h1: string;
  subtitle: string;
  overview: string;
  who_we_serve: string[];
  benefits: Array<{ title: string; description: string }>;
  products: string[];
  use_cases: Array<{ title: string; description: string }>;
  selection_steps: string[];
}

export default function WhoWeServeEditor() {
  const [nonprofitsContent, setNonprofitsContent] = useState<PageContent | null>(null);
  const [schoolsContent, setSchoolsContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("who_we_serve_pages")
        .select("*");

      if (error) throw error;

      const nonprofits = data?.find((p) => p.page_slug === "nonprofits");
      const schools = data?.find((p) => p.page_slug === "schools");

      if (nonprofits) setNonprofitsContent(nonprofits.content as PageContent);
      if (schools) setSchoolsContent(schools.content as PageContent);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to load page content");
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async (pageSlug: "nonprofits" | "schools", content: PageContent) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("who_we_serve_pages")
        .update({ content })
        .eq("page_slug", pageSlug);

      if (error) throw error;

      toast.success(`${pageSlug === "nonprofits" ? "Nonprofits" : "Schools"} page updated successfully`);
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="bg-background text-foreground">
      <CardHeader>
        <CardTitle>Who We Serve Pages Editor</CardTitle>
        <CardDescription>
          Edit the content for the Nonprofits and Schools landing pages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="nonprofits">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nonprofits">Nonprofits & Clubs</TabsTrigger>
            <TabsTrigger value="schools">Schools & Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="nonprofits" className="space-y-4">
            {nonprofitsContent && (
              <PageEditor
                content={nonprofitsContent}
                onChange={setNonprofitsContent}
                onSave={() => saveContent("nonprofits", nonprofitsContent)}
                saving={saving}
              />
            )}
          </TabsContent>

          <TabsContent value="schools" className="space-y-4">
            {schoolsContent && (
              <PageEditor
                content={schoolsContent}
                onChange={setSchoolsContent}
                onSave={() => saveContent("schools", schoolsContent)}
                saving={saving}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PageEditor({
  content,
  onChange,
  onSave,
  saving,
}: {
  content: PageContent;
  onChange: (content: PageContent) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="h1">Page Title (H1)</Label>
        <Input
          id="h1"
          value={content.h1}
          onChange={(e) => onChange({ ...content, h1: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input
          id="subtitle"
          value={content.subtitle}
          onChange={(e) => onChange({ ...content, subtitle: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="overview">Overview</Label>
        <Textarea
          id="overview"
          value={content.overview}
          onChange={(e) => onChange({ ...content, overview: e.target.value })}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Who We Serve (one per line)</Label>
        <Textarea
          value={content.who_we_serve.join("\n")}
          onChange={(e) =>
            onChange({ ...content, who_we_serve: e.target.value.split("\n").filter(Boolean) })
          }
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label>Products (one per line)</Label>
        <Textarea
          value={content.products.join("\n")}
          onChange={(e) =>
            onChange({ ...content, products: e.target.value.split("\n").filter(Boolean) })
          }
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label>Benefits (JSON format)</Label>
        <Textarea
          value={JSON.stringify(content.benefits, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ ...content, benefits: parsed });
            } catch (err) {
              // Invalid JSON, don't update
            }
          }}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Use Cases (JSON format)</Label>
        <Textarea
          value={JSON.stringify(content.use_cases, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ ...content, use_cases: parsed });
            } catch (err) {
              // Invalid JSON, don't update
            }
          }}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Selection Steps (one per line)</Label>
        <Textarea
          value={content.selection_steps.join("\n")}
          onChange={(e) =>
            onChange({ ...content, selection_steps: e.target.value.split("\n").filter(Boolean) })
          }
          rows={6}
        />
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );
}
