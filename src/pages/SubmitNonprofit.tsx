import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import GlassCard from "@/components/GlassCard";

export default function SubmitNonprofit() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ein: "",
    city: "",
    state: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nonprofit name is required");
      return;
    }

    setSubmitting(true);
    try {
      // Check for exact EIN match
      if (formData.ein) {
        const { data: existing } = await supabase
          .from('nonprofits')
          .select('id, name, approved')
          .eq('ein', formData.ein)
          .maybeSingle();

        if (existing) {
          if (existing.approved) {
            toast.error(`This nonprofit (${existing.name}) already exists and is approved.`);
            setSubmitting(false);
            return;
          } else {
            toast.warning(`This nonprofit is already pending approval.`);
            setSubmitting(false);
            return;
          }
        }
      }

      // Check for similar names
      const { data: similar } = await supabase
        .from('nonprofits')
        .select('id, name')
        .ilike('name', `%${formData.name}%`)
        .limit(3);

      if (similar && similar.length > 0) {
        const similarNames = similar.map(s => s.name).join(', ');
        toast.warning(`Similar nonprofits found: ${similarNames}. Proceeding with submission.`);
      }

      // Insert as pending approval
      const { error } = await supabase
        .from('nonprofits')
        .insert({
          name: formData.name,
          ein: formData.ein || null,
          city: formData.city || null,
          state: formData.state || null,
          description: formData.description || null,
          source: 'curated',
          approved: false,
        });

      if (error) throw error;

      toast.success("Nonprofit submitted for review! Admins will review shortly.");
      navigate("/causes");
    } catch (error: any) {
      toast.error("Submission failed: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button
            onClick={() => navigate("/causes")}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Causes
          </Button>
          <h1 className="text-3xl font-bold mb-2">Submit a Nonprofit</h1>
          <p className="text-white/60">
            Can't find your nonprofit? Submit it for admin review and approval.
          </p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-white">
                Nonprofit Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/10 border-white/30 text-white mt-2"
                placeholder="Enter full nonprofit name"
                required
              />
            </div>

            <div>
              <Label htmlFor="ein" className="text-white">
                EIN (Tax ID)
              </Label>
              <Input
                id="ein"
                value={formData.ein}
                onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                className="bg-white/10 border-white/30 text-white mt-2"
                placeholder="XX-XXXXXXX"
              />
              <p className="text-xs text-white/50 mt-1">Format: 12-3456789</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-white">
                  City
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-white/10 border-white/30 text-white mt-2"
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-white">
                  State
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="bg-white/10 border-white/30 text-white mt-2"
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-white">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white/10 border-white/30 text-white mt-2 min-h-[100px]"
                placeholder="Brief description of the nonprofit's mission"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => navigate("/causes")}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-green-500 hover:bg-green-600"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          </form>
        </GlassCard>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-white/80">
            <strong>Note:</strong> All submissions are reviewed by our team to ensure legitimacy.
            You'll be able to select this nonprofit once it's approved.
          </p>
        </div>
      </div>
    </div>
  );
}
