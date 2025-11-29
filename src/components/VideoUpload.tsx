import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, X, Copy, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import VideoMetadataEditor from "./VideoMetadataEditor";
import { Badge } from "@/components/ui/badge";

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [editingVideo, setEditingVideo] = useState<{ name: string; url: string; metadata: any } | null>(null);

  const loadVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const { data, error } = await supabase.storage.from('videos').list();
      
      if (error) throw error;

      // Get metadata for all videos
      const { data: metadataList } = await supabase
        .from('video_metadata')
        .select('*');
      
      const videosWithUrls = data?.map(file => {
        const metadata = metadataList?.find(m => m.video_name === file.name);
        return {
          name: file.name,
          url: supabase.storage.from('videos').getPublicUrl(file.name).data.publicUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at,
          metadata: metadata || null,
          isActive: metadata?.is_active || false
        };
      }) || [];
      
      setVideos(videosWithUrls);
    } catch (error: any) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useState(() => {
    loadVideos();
  });

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('video/')
    );
    
    if (files.length === 0) {
      toast.error('Please drop video files only');
      return;
    }

    await uploadFiles(files);
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    let successCount = 0;
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('videos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;
        successCount++;
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} video(s)`);
      loadVideos();
    }
    
    setUploading(false);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;
    
    try {
      const { error } = await supabase.storage.from('videos').remove([fileName]);
      if (error) throw error;
      
      toast.success('Video deleted');
      loadVideos();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete video');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const toggleActive = async (video: any) => {
    try {
      const newActiveState = !video.isActive;
      
      if (video.metadata?.id) {
        // Update existing metadata
        const { error } = await supabase
          .from('video_metadata')
          .update({ is_active: newActiveState })
          .eq('id', video.metadata.id);
        
        if (error) throw error;
      } else {
        // Create new metadata entry with is_active
        const { error } = await supabase
          .from('video_metadata')
          .insert({
            video_name: video.name,
            title: video.name.replace(/\.[^/.]+$/, ""),
            is_active: newActiveState,
            display_order: 0
          });
        
        if (error) throw error;
      }
      
      toast.success(`Video ${newActiveState ? 'activated' : 'deactivated'}`);
      loadVideos();
    } catch (error: any) {
      console.error('Toggle active error:', error);
      toast.error('Failed to update video status');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-primary/50 bg-background/50 backdrop-blur-sm p-12 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <input
          type="file"
          id="video-upload"
          className="hidden"
          accept="video/*"
          multiple
          onChange={handleFileInput}
          disabled={uploading}
        />
        <label htmlFor="video-upload" className="cursor-pointer">
          <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-semibold mb-2">
            {uploading ? 'Uploading...' : 'Drop videos here or click to upload'}
          </h3>
          <p className="text-muted-foreground">
            Supports MP4, WebM, and other video formats
          </p>
        </label>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Uploaded Videos</h3>
          <Button onClick={loadVideos} variant="outline" size="sm" disabled={loadingVideos}>
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[500px] rounded-md border p-4">
          {loadingVideos ? (
            <p className="text-center text-muted-foreground py-8">Loading videos...</p>
          ) : videos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No videos uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => (
                <Card key={video.name} className="p-4">
                  <div className="space-y-3">
                    <video
                      src={video.url}
                      className="w-full rounded-lg"
                      controls
                      preload="metadata"
                    />
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{video.name}</p>
                          <Badge variant={video.isActive ? "default" : "secondary"}>
                            {video.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(video.size)}
                        </p>
                        {video.metadata && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Title: {video.metadata.title || "Not set"}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                          {video.url}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingVideo({ name: video.name, url: video.url, metadata: video.metadata })}
                            title="Edit metadata"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={video.isActive ? "secondary" : "default"}
                            onClick={() => toggleActive(video)}
                            title={video.isActive ? "Deactivate" : "Activate"}
                          >
                            {video.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyUrl(video.url)}
                            title="Copy URL"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(video.name)}
                            title="Delete video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {editingVideo && (
        <VideoMetadataEditor
          open={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          videoName={editingVideo.name}
          videoUrl={editingVideo.url}
          metadata={editingVideo.metadata}
          onSave={loadVideos}
        />
      )}
    </div>
  );
}
