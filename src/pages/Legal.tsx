import { Link } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { FileText, Scale, Shield } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Legal() {
  return (
    <div className="min-h-screen relative text-white">
      <VideoBackground
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
        parallaxVh={12}
        overlay={<div className="absolute inset-0 bg-black/50" />}
      />

      <div className="relative min-h-screen pt-24 pb-20 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="relative" padding="p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-12">
              <Scale className="w-16 h-16 mx-auto mb-4 text-white/80" />
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Legal Overview
              </h1>
              <p className="text-lg text-white/80">
                Your rights and our commitments at Print Power Purpose
              </p>
            </div>

            {/* TL;DR Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold mb-6 text-white">TL;DR</h2>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/20">
                  <Shield className="w-6 h-6 flex-shrink-0 text-white/70" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Data Privacy</h3>
                    <p className="text-sm text-white/70">
                      We collect only what we need to provide our services. We never sell your data
                      to third parties. You have full control over your information.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/20">
                  <FileText className="w-6 h-6 flex-shrink-0 text-white/70" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Fair Use</h3>
                    <p className="text-sm text-white/70">
                      Use our site lawfully and respectfully. No abuse, scraping, or fraudulent
                      activity. We reserve the right to suspend accounts that violate our terms.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/20">
                  <Scale className="w-6 h-6 flex-shrink-0 text-white/70" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Your Rights</h3>
                    <p className="text-sm text-white/70">
                      You can access, correct, or delete your data at any time. Contact us at{" "}
                      <a
                        href="mailto:privacy@printpowerpurpose.com"
                        className="underline hover:text-white"
                      >
                        privacy@printpowerpurpose.com
                      </a>{" "}
                      for requests.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold mb-6 text-white">Full Documents</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  to="/policies/privacy"
                  className="block p-6 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 transition-colors group"
                >
                  <Shield className="w-8 h-8 mb-3 text-white/70 group-hover:text-white transition-colors" />
                  <h3 className="text-lg font-semibold text-white mb-2">Privacy Policy</h3>
                  <p className="text-sm text-white/70">
                    Complete details on how we collect, use, and protect your data.
                  </p>
                  <div className="mt-4 text-sm text-white/60 group-hover:text-white/80 transition-colors">
                    Read full policy →
                  </div>
                </Link>

                <Link
                  to="/policies/terms"
                  className="block p-6 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 transition-colors group"
                >
                  <FileText className="w-8 h-8 mb-3 text-white/70 group-hover:text-white transition-colors" />
                  <h3 className="text-lg font-semibold text-white mb-2">Terms of Use</h3>
                  <p className="text-sm text-white/70">
                    The rules and guidelines for using Print Power Purpose services.
                  </p>
                  <div className="mt-4 text-sm text-white/60 group-hover:text-white/80 transition-colors">
                    Read full terms →
                  </div>
                </Link>
              </div>
            </div>

            {/* FAQ */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold mb-6 text-white">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem
                  value="item-1"
                  className="border border-white/20 rounded-lg bg-white/5 px-4"
                >
                  <AccordionTrigger className="text-white hover:text-white/80">
                    How is my data handled?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    We collect only essential information needed to process orders and provide
                    services. All data is encrypted in transit and at rest. We use industry-standard
                    security measures and never sell your personal information to third parties.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="item-2"
                  className="border border-white/20 rounded-lg bg-white/5 px-4"
                >
                  <AccordionTrigger className="text-white hover:text-white/80">
                    Can I request deletion of my data?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    Yes. You have the right to request deletion of your personal data at any time.
                    Email us at{" "}
                    <a
                      href="mailto:privacy@printpowerpurpose.com"
                      className="underline hover:text-white"
                    >
                      privacy@printpowerpurpose.com
                    </a>{" "}
                    with your request. We'll process it within 30 days, subject to legal retention
                    requirements.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="item-3"
                  className="border border-white/20 rounded-lg bg-white/5 px-4"
                >
                  <AccordionTrigger className="text-white hover:text-white/80">
                    Are donations refundable?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    Donations are generally non-refundable as they are processed immediately to
                    support the selected cause. However, if you believe there was an error, contact
                    us at{" "}
                    <a href="mailto:support@printpowerpurpose.com" className="underline hover:text-white">
                      support@printpowerpurpose.com
                    </a>{" "}
                    within 48 hours and we'll review your case.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="item-4"
                  className="border border-white/20 rounded-lg bg-white/5 px-4"
                >
                  <AccordionTrigger className="text-white hover:text-white/80">
                    Where are the full terms?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    Complete legal documents are available above. Our{" "}
                    <Link to="/policies/privacy" className="underline hover:text-white">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link to="/policies/terms" className="underline hover:text-white">
                      Terms of Use
                    </Link>{" "}
                    contain all the details, including version history and PDF download options.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-white/20 text-center text-sm text-white/60">
              <p className="mb-2">
                Have questions?{" "}
                <a href="/contact" className="text-white hover:underline">
                  Contact us
                </a>
              </p>
              <p className="text-xs">© {new Date().getFullYear()} Print Power Purpose</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
