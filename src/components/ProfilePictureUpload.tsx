import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, X, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface ProfilePictureUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (url: string) => void;
}

export default function ProfilePictureUpload({
  userId,
  currentAvatarUrl,
  onAvatarUpdated,
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scale, setScale] = useState([1]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Load image for cropping
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setSelectedImage(e.target?.result as string);
        setScale([1]);
        setPosition({ x: 0, y: 0 });
        setShowCropper(true);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setScale([1]);
  };

  const cropAndUpload = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    setUploading(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to process image");
      setUploading(false);
      return;
    }

    // Output size (256x256 for avatars)
    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Clear canvas
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const img = imageRef.current;
    const currentScale = scale[0];
    
    // Calculate dimensions to fit image in preview area (200x200)
    const previewSize = 200;
    const imgAspect = img.width / img.height;
    let drawWidth, drawHeight;
    
    if (imgAspect > 1) {
      drawHeight = previewSize * currentScale;
      drawWidth = drawHeight * imgAspect;
    } else {
      drawWidth = previewSize * currentScale;
      drawHeight = drawWidth / imgAspect;
    }

    // Scale up for output
    const scaleFactor = outputSize / previewSize;
    drawWidth *= scaleFactor;
    drawHeight *= scaleFactor;

    // Calculate position with offset
    const offsetX = (outputSize - drawWidth) / 2 + position.x * scaleFactor;
    const offsetY = (outputSize - drawHeight) / 2 + position.y * scaleFactor;

    // Draw image
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Convert to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast.error("Failed to process image");
          setUploading(false);
          return;
        }

        try {
          // Generate unique filename
          const fileExt = "png";
          const fileName = `${userId}/${Date.now()}.${fileExt}`;

          // Delete old avatar if exists
          if (currentAvatarUrl) {
            const oldPath = currentAvatarUrl.split("/avatars/")[1];
            if (oldPath) {
              await supabase.storage.from("avatars").remove([oldPath]);
            }
          }

          // Upload new avatar
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, blob, {
              contentType: "image/png",
              upsert: true,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast.error("Failed to upload image");
            setUploading(false);
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

          // Update profile with new avatar URL
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: urlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Profile update error:", updateError);
            toast.error("Failed to update profile");
            setUploading(false);
            return;
          }

          onAvatarUpdated(urlData.publicUrl);
          toast.success("Profile picture updated!");
          setShowCropper(false);
          setSelectedImage(null);
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload image");
        }

        setUploading(false);
      },
      "image/png",
      0.9
    );
  }, [userId, currentAvatarUrl, scale, position, onAvatarUpdated]);

  const removeAvatar = async () => {
    if (!currentAvatarUrl) return;

    setUploading(true);
    try {
      // Delete from storage
      const oldPath = currentAvatarUrl.split("/avatars/")[1];
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (error) throw error;

      onAvatarUpdated("");
      toast.success("Profile picture removed");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove profile picture");
    }
    setUploading(false);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {/* Avatar Preview */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Camera className="w-8 h-8" />
              </div>
            )}
          </div>
          
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {currentAvatarUrl ? "Change Photo" : "Upload Photo"}
          </Button>
          
          {currentAvatarUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={removeAvatar}
              disabled={uploading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Crop Dialog */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {/* Crop Preview */}
            <div
              className="w-[200px] h-[200px] rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 cursor-move relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {selectedImage && imageRef.current && (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="absolute"
                  style={{
                    width: imageRef.current.width > imageRef.current.height
                      ? `${200 * scale[0] * (imageRef.current.width / imageRef.current.height)}px`
                      : `${200 * scale[0]}px`,
                    height: imageRef.current.height > imageRef.current.width
                      ? `${200 * scale[0] * (imageRef.current.height / imageRef.current.width)}px`
                      : `${200 * scale[0]}px`,
                    left: `calc(50% + ${position.x}px)`,
                    top: `calc(50% + ${position.y}px)`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                  }}
                  draggable={false}
                />
              )}
            </div>

            <p className="text-sm text-gray-500">Drag to reposition</p>

            {/* Zoom Control */}
            <div className="w-full flex items-center gap-3">
              <span className="text-sm text-gray-600">Zoom</span>
              <Slider
                value={scale}
                onValueChange={setScale}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={resetPosition}
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCropper(false);
                  setSelectedImage(null);
                }}
                className="flex-1"
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={cropAndUpload}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
