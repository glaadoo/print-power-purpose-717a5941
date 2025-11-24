import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  onError?: () => void;
  onLoad?: () => void;
}

export default function BlurImage({ 
  src, 
  alt, 
  className, 
  loading = "lazy",
  onError,
  onLoad 
}: BlurImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");

  useEffect(() => {
    // Reset when src changes
    setImageLoaded(false);
    setImageSrc("");

    // Create a new image to preload
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
      onLoad?.();
    };
    
    img.onerror = () => {
      onError?.();
    };

    img.src = src;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onError, onLoad]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Blur placeholder - shown while loading */}
      <div
        className={cn(
          "absolute inset-0 bg-muted transition-opacity duration-500",
          imageLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(20px)",
          transform: "scale(1.1)", // Slightly scale up to hide blur edges
        }}
      />

      {/* Actual image */}
      <img
        src={imageSrc || src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        loading={loading}
        decoding="async"
      />

      {/* Loading shimmer effect */}
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
    </div>
  );
}
