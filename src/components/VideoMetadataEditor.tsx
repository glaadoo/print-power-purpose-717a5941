import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ImageIcon } from "lucide-react";

interface VideoMetadata {
  id?: string;
  video_name: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  display_order: number;
}

interface VideoMetadataEditorProps {
  open: boolean;
  onClose: () => void;
  videoName: string;
  videoUrl: string;
  metadata: VideoMetadata | null;
  onSave: () => void;
}

export default function VideoMetadataEditor({
  open,
  onClose,
  videoName,
  videoUrl,
  metadata,
  onSave,
}: VideoMetadataEditorProps) {
  const [title, setTitle] = useState(metadata?.title || videoName.replace(/\.[^/.]+$/, ""));
  const [description, setDescription] = useState(metadata?.description || "");
  const [displayOrder, setDisplayOrder] = useState(metadata?.display_order || 0);
  const [saving, setSaving] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(metadata?.thumbnail_url || null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const generateThumbnail = async () => {
    if (!videoRef.current) return;

    setGeneratingThumbnail(true);
    try {
      const video = videoRef.current;
      
      // Wait for video to load metadata
      await new Promise((resolve) => {
        if (video.readyState >= 2) resolve(null);
        else video.addEventListener('loadedmetadata', () => resolve(null), { once: true });
      });

      // Seek to 2 seconds or middle of video
      const seekTime = Math.min(2, video.duration / 2);
      video.currentTime = seekTime;

      // Wait for seek to complete
      await new Promise((resolve) => {
        video.addEventListener('seeked', () => resolve(null), { once: true });
      });

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.9);
      });

      // Upload to storage
      const thumbnailName = `${Date.now()}-${videoName.replace(/\.[^/.]+$/, '')}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('video-thumbnails')
        .upload(thumbnailName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('video-thumbnails')
        .getPublicUrl(thumbnailName);

      setThumbnailPreview(publicUrl);
      toast.success('Thumbnail generated successfully');
      
      return thumbnailName;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast.error('Failed to generate thumbnail');
      return null;
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let thumbnailPath = metadata?.thumbnail_url;

      // Generate thumbnail if not exists
      if (!thumbnailPath && videoRef.current) {
        const generated = await generateThumbnail();
        if (generated) {
          thumbnailPath = generated;
        }
      }

      const metadataData = {
        video_name: videoName,
        title: title || videoName.replace(/\.[^/.]+$/, ""),
        description: description || null,
        thumbnail_url: thumbnailPath,
        display_order: displayOrder,
        is_active: true,
      };

      if (metadata?.id) {
        // Update existing metadata
        const { error } = await supabase
          .from('video_metadata')
          .update(metadataData)
          .eq('id', metadata.id);

        if (error) throw error;
      } else {
        // Insert new metadata
        const { error } = await supabase
          .from('video_metadata')
          .insert(metadataData);

        if (error) throw error;
      }

      toast.success('Video metadata saved successfully');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Failed to save video metadata');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video Metadata</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Preview */}
          <div className="space-y-2">
            <Label>Video Preview</Label>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full rounded-lg"
              controls
              muted
              preload="metadata"
            />
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            {thumbnailPreview ? (
              <div className="relative">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  onClick={generateThumbnail}
                  disabled={generatingThumbnail}
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                >
                  {generatingThumbnail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={generateThumbnail}
                disabled={generatingThumbnail}
                variant="outline"
                className="w-full h-48 border-2 border-dashed"
              >
                {generatingThumbnail ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Generating thumbnail...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 mr-2" />
                    Generate Thumbnail
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={4}
            />
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500">
              Lower numbers appear first in the carousel
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Metadata"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
