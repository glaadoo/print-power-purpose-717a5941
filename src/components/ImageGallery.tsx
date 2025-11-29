import { useState, useRef, MouseEvent, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BlurImage from "@/components/BlurImage";

interface ImageGalleryProps {
  images: Array<{ url: string; label?: string }>;
  alt: string;
  onError?: () => void;
  selectedIndex?: number;
}

export default function ImageGallery({ images, alt, onError, selectedIndex }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sync with external selectedIndex when it changes
  useEffect(() => {
    if (selectedIndex !== undefined && selectedIndex >= 0 && selectedIndex < images.length) {
      setCurrentIndex(selectedIndex);
    }
  }, [selectedIndex, images.length]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex]?.url || images[0]?.url;

  // Preload current, previous, and next images for smooth navigation
  useEffect(() => {
    const preloadImages = () => {
      const indicesToPreload = [
        currentIndex,
        currentIndex - 1 >= 0 ? currentIndex - 1 : images.length - 1,
        currentIndex + 1 < images.length ? currentIndex + 1 : 0,
      ];

      indicesToPreload.forEach((index) => {
        const img = new Image();
        img.src = images[index]?.url;
      });
    };

    if (images.length > 0) {
      preloadImages();
    }
  }, [currentIndex, images]);

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

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <div 
          ref={imageRef}
          className="relative aspect-square rounded-xl overflow-hidden bg-muted border border-border group cursor-zoom-in"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsModalOpen(true)}
        >
          <BlurImage
            src={currentImage}
            alt={alt}
            className="w-full h-full transition-transform duration-300 group-hover:scale-105"
            loading="eager"
            onError={onError}
          />

          {/* Zoom Overlay on Hover */}
          {isZooming && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `url(${currentImage})`,
                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                backgroundSize: '200%',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}

          {/* Navigation Arrows (only if multiple images) */}
          {images.length > 1 && (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs font-medium text-foreground">
                  {currentIndex + 1} / {images.length}
                </p>
              </div>
            </>
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

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={cn(
                  "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200",
                  currentIndex === index
                    ? "border-primary ring-2 ring-primary/30 scale-105"
                    : "border-border hover:border-primary/50 hover:scale-105"
                )}
              >
                <BlurImage
                  src={image.url}
                  alt={image.label || `${alt} - View ${index + 1}`}
                  className="w-full h-full"
                  loading={index < 3 ? "eager" : "lazy"}
                />
                {currentIndex === index && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
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

            {/* Navigation in Modal */}
            {images.length > 1 && (
              <>
                <Button
                  onClick={goToPrevious}
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={goToNext}
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>

                {/* Image Counter in Modal */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2">
                  <p className="text-sm font-medium text-foreground">
                    {currentIndex + 1} / {images.length}
                  </p>
                </div>
              </>
            )}

            {/* Zoomed Image */}
            <BlurImage
              src={currentImage}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg animate-scale-in"
              loading="eager"
              onError={onError}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
