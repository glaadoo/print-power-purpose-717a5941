import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Twitter, Facebook, Linkedin, Copy, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { MilestoneTier } from "@/lib/milestone-tiers";

interface MilestoneAchievementBadgeProps {
  tier: MilestoneTier;
  totalDonated: string;
  userName?: string;
}

export default function MilestoneAchievementBadge({ 
  tier,
  totalDonated, 
  userName 
}: MilestoneAchievementBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const shareText = `🎉 I just reached the ${tier.name} milestone on Print Power Purpose! I've donated ${totalDonated} to support amazing nonprofits. Join me in making a difference! #PrintPowerPurpose #GivingBack`;
  const shareUrl = window.location.origin;

  const handleDownload = async () => {
    if (!badgeRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(badgeRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `ppp-${tier.id}-milestone-badge.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Badge downloaded successfully!");
    } catch (error) {
      console.error("Error downloading badge:", error);
      toast.error("Failed to download badge");
    } finally {
      setIsDownloading(false);
    }
  };

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareOnInstagram = async () => {
    // Instagram doesn't have a web share API, so we download the badge and instruct user
    if (!badgeRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(badgeRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `ppp-${tier.id}-milestone-badge.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Badge downloaded! Share it on Instagram Stories or your feed.", {
        duration: 5000,
      });
    } catch (error) {
      console.error("Error downloading badge:", error);
      toast.error("Failed to download badge for Instagram");
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${tier.colors.bg} ${tier.colors.border} border ${tier.colors.text}`}
        >
          <span>{tier.icon}</span>
          <span>{tier.name}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{tier.icon}</span>
            {tier.name} Achievement
          </DialogTitle>
        </DialogHeader>
        
        {/* Badge Preview */}
        <div className="flex justify-center p-4">
          <div
            ref={badgeRef}
            className={`relative w-72 h-72 bg-gradient-to-br ${tier.colors.gradient} rounded-3xl p-1 shadow-2xl`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tier.colors.gradient} rounded-3xl blur-xl opacity-50`} />
            <div className="relative h-full w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-[22px] flex flex-col items-center justify-center p-6 text-center">
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-2 h-2 bg-white/50 rounded-full animate-pulse" />
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
              <div className="absolute bottom-4 right-4 w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: "1.5s" }} />
              
              {/* Star decoration */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-3 -right-3 text-4xl"
              >
                ⭐
              </motion.div>
              
              {/* Badge content */}
              <div className="text-6xl mb-2">{tier.icon}</div>
              <h3 className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${tier.colors.primary} mb-1`}>
                {tier.title}
              </h3>
              <p className="text-white/80 text-sm mb-3">{tier.name}</p>
              
              <div className={`w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-2`} />
              
              <p className="text-white font-semibold text-lg">{totalDonated}</p>
              <p className="text-white/60 text-xs">Total Donated</p>
              
              {userName && (
                <p className="text-white/70 text-sm mt-3 font-medium">{userName}</p>
              )}
              
              <div className="absolute bottom-3 w-full text-center">
                <p className="text-white/40 text-[10px] tracking-wider">PRINT POWER PURPOSE</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading}
            className={`w-full gap-2 bg-gradient-to-r ${tier.colors.primary} hover:opacity-90`}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download Badge"}
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              Share
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={shareOnTwitter}
              className="hover:bg-sky-500/10 hover:border-sky-500/50 hover:text-sky-500"
              title="Share on X (Twitter)"
            >
              <Twitter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={shareOnFacebook}
              className="hover:bg-blue-600/10 hover:border-blue-600/50 hover:text-blue-600"
              title="Share on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={shareOnInstagram}
              disabled={isDownloading}
              className="hover:bg-pink-500/10 hover:border-pink-500/50 hover:text-pink-500"
              title="Download for Instagram"
            >
              <Instagram className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={shareOnLinkedIn}
              className="hover:bg-blue-700/10 hover:border-blue-700/50 hover:text-blue-700"
              title="Share on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="hover:bg-gray-500/10 hover:border-gray-500/50"
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
