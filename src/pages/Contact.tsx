import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import GlassCard from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setIsSuccess(false);
    try {
      // Store contact inquiry in database
      const { error } = await supabase.from("contact_inquiries").insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Thank you! We'll get back to you soon.");
      form.reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Failed to submit. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <GlassCard className="backdrop-blur-md bg-white/5">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Contact Form */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Contact Us
              </h1>
              <p className="text-white/80 mb-6">
                Have questions? We'd love to hear from you. Send us a message
                and we'll respond as soon as possible.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {isSuccess && (
                    <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-white">
                      <p className="font-semibold">✓ Message sent successfully!</p>
                      <p className="text-sm text-white/80 mt-1">
                        We'll get back to you as soon as possible.
                      </p>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Your name"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Email *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your@email.com"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="(555) 123-4567"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Message *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="How can we help you?"
                            rows={5}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-white text-gray-900 hover:bg-white/90 font-semibold"
                    >
                      Send Message
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Back
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Right: Contact Info */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Get in Touch
                </h2>
                <div className="space-y-4 text-white/90">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 mt-1 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-white">Phone</p>
                      <a
                        href="tel:+15551234567"
                        className="hover:text-white transition-colors"
                      >
                        (555) 123-4567
                      </a>
                      <p className="text-sm text-white/70 mt-1">
                        Monday - Friday, 9AM - 5PM EST
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 mt-1 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-white">Email</p>
                      <a
                        href="mailto:support@printpowerpurpose.com"
                        className="hover:text-white transition-colors"
                      >
                        support@printpowerpurpose.com
                      </a>
                      <p className="text-sm text-white/70 mt-1">
                        We'll respond within 24 hours
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <a
                    href="/causes"
                    className="block text-white/80 hover:text-white transition-colors"
                  >
                    → Browse Causes
                  </a>
                  <a
                    href="/products"
                    className="block text-white/80 hover:text-white transition-colors"
                  >
                    → View Products
                  </a>
                  <a
                    href="/about"
                    className="block text-white/80 hover:text-white transition-colors"
                  >
                    → About Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
