import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VistaprintNav from "@/components/VistaprintNav";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    id: "orders",
    question: "How do I track my order?",
    answer: "Once your order ships, you'll receive a tracking number via email. You can use this to track your package through the carrier's website. If you have an account, you can also view order status in your account dashboard."
  },
  {
    id: "shipping",
    question: "What are the shipping options?",
    answer: "We offer standard shipping (5-7 business days) and expedited shipping (2-3 business days). Shipping costs are calculated at checkout based on your location and selected method."
  },
  {
    id: "returns",
    question: "What is your return policy?",
    answer: "We accept returns within 30 days of delivery for items in original condition. Custom or personalized items cannot be returned unless defective. Contact our support team to initiate a return."
  },
  {
    id: "causes",
    question: "How do donations to causes work?",
    answer: "When you purchase products, a portion of proceeds goes to the cause you select during checkout. You can choose from various nonprofits and schools. We send quarterly reports showing the total impact."
  },
  {
    id: "custom",
    question: "Can I customize products?",
    answer: "Yes! Many of our products can be customized with your own designs, text, or logos. Look for the 'Customize' option on product pages. Our design team can also help create custom artwork for bulk orders."
  },
  {
    id: "bulk",
    question: "Do you offer bulk or wholesale pricing?",
    answer: "Yes, we offer discounts for bulk orders of 50+ items. Contact us at support@printpowerpurpose.com with your requirements, and we'll provide a custom quote."
  },
  {
    id: "payment",
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, and Apple Pay. All transactions are securely processed through Stripe."
  },
  {
    id: "quality",
    question: "What if I receive a defective item?",
    answer: "We stand behind our quality. If you receive a defective or damaged item, contact us within 7 days of delivery with photos. We'll send a replacement or issue a full refund at no cost to you."
  },
  {
    id: "international",
    question: "Do you ship internationally?",
    answer: "Currently, we ship within the United States only. We're working on expanding international shipping. Sign up for our newsletter to be notified when international shipping becomes available."
  },
  {
    id: "account",
    question: "How do I create an account?",
    answer: "Click 'Sign In' in the top menu, then select 'Sign Up'. You can create an account with your email or use Google sign-in. Having an account lets you track orders, save favorites, and checkout faster."
  }
];

export default function HelpCenter() {
  const nav = useNavigate();

  useEffect(() => {
    document.title = "Help Center - Print Power Purpose";
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Video Background */}
      <VideoBackground
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
        parallaxVh={8}
        overlay={<div className="absolute inset-0 bg-black/50" />}
        className="fixed inset-0 -z-10"
      />

      {/* Navigation */}
      <VistaprintNav />

      {/* Main Content */}
      <main className="flex-1 pt-8 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
              How can we help you today?
            </h1>
            <p className="text-lg text-white/90 drop-shadow">
              Find answers to frequently asked questions below
            </p>
          </div>

          {/* FAQ Card */}
          <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="border-b border-border/50">
                  <AccordionTrigger className="text-left text-base md:text-lg font-medium text-foreground hover:text-primary transition-colors py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            {/* Contact CTA */}
            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <p className="text-muted-foreground mb-4">
                Still have questions?
              </p>
              <button
                onClick={() => nav('/contact')}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
