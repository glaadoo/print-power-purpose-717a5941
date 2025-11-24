import { useState, useRef, MouseEvent } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageZoomProps {
  src: string;
  alt: string;
  onError?: () => void;
}

export default function ImageZoom({ src, alt, onError }: ImageZoomProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
  };

  return (
    <>
      <div 
        ref={imageRef}
        className="relative aspect-square rounded-xl overflow-hidden bg-muted border border-border group cursor-zoom-in"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Main Image */}
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={onError}
        />

        {/* Zoom Overlay on Hover */}
        {isZooming && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `url(${src})`,
              backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
              backgroundSize: '200%',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        {/* Zoom Icon Indicator */}
        <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ZoomIn className="w-5 h-5 text-foreground" />
        </div>

        {/* Hover Hint */}
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-xs font-medium text-foreground">Click to enlarge</p>
        </div>
      </div>

      {/* Full Screen Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <Button
              onClick={() => setIsModalOpen(false)}
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 z-50 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Zoomed Image */}
            <img 
              src={src} 
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg animate-scale-in"
              onError={onError}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
