import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlusCircle, Send, ChevronDown, ChevronUp } from "lucide-react";

interface SubmitNonprofitFormProps {
  onSuccess?: () => void;
}

export default function SubmitNonprofitForm({ onSuccess }: SubmitNonprofitFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ein: "",
    city: "",
    state: "",
    description: "",
    website_url: "",
    contact_email: "",
    submitted_by_email: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Please enter the nonprofit name");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("user_submitted_nonprofits")
        .insert({
          name: formData.name.trim(),
          ein: formData.ein.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          description: formData.description.trim() || null,
          website_url: formData.website_url.trim() || null,
          contact_email: formData.contact_email.trim() || null,
          submitted_by_email: formData.submitted_by_email.trim() || user?.email || null,
          submitted_by_user_id: user?.id || null,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Thank you! Your nonprofit submission is under review.", {
        description: "We'll notify you once it's approved."
      });

      // Reset form
      setFormData({
        name: "",
        ein: "",
        city: "",
        state: "",
        description: "",
        website_url: "",
        contact_email: "",
        submitted_by_email: "",
      });
      setIsExpanded(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting nonprofit:", error);
      toast.error("Failed to submit nonprofit", {
        description: error.message || "Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <PlusCircle className="h-6 w-6 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">Can't find your nonprofit?</h3>
            <p className="text-sm text-muted-foreground">Submit it for review and we'll add it to our list</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nonprofit Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter nonprofit name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ein">EIN (Tax ID)</Label>
              <Input
                id="ein"
                name="ein"
                value={formData.ein}
                onChange={handleChange}
                placeholder="XX-XXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                name="website_url"
                type="url"
                value={formData.website_url}
                onChange={handleChange}
                placeholder="https://example.org"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Nonprofit Contact Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleChange}
                placeholder="contact@nonprofit.org"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell us about this nonprofit and their mission..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submitted_by_email">Your Email (for updates)</Label>
            <Input
              id="submitted_by_email"
              name="submitted_by_email"
              type="email"
              value={formData.submitted_by_email}
              onChange={handleChange}
              placeholder="your@email.com"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </>
            )}
          </Button>
        </form>
      )}
    </Card>
  );
}
