import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, Edit } from "lucide-react";
import Footer from "@/components/Footer";
import VideoMetadataEditor from "@/components/VideoMetadataEditor";

interface Video {
  name: string;
  url: string;
  size: number;
  createdAt: string;
  metadata?: {
    id: string;
    title: string | null;
    description: string | null;
    thumbnail_url: string | null;
    display_order: number;
  };
}

export default function VideoGallery() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      // Get videos from storage
      const { data, error } = await supabase.storage.from('videos').list();
      
      if (error) throw error;
      
      // Get metadata from database
      const { data: metadata } = await supabase
        .from('video_metadata')
        .select('*');
      
      const videosWithUrls = data?.map(file => {
        const meta = metadata?.find(m => m.video_name === file.name);
        return {
          name: file.name,
          url: supabase.storage.from('videos').getPublicUrl(file.name).data.publicUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at,
          metadata: meta ? {
            id: meta.id,
            title: meta.title,
            description: meta.description,
            thumbnail_url: meta.thumbnail_url,
            display_order: meta.display_order,
          } : undefined
        };
      }).sort((a, b) => {
        const aOrder = a.metadata?.display_order ?? 999;
        const bOrder = b.metadata?.display_order ?? 999;
        return aOrder - bOrder;
      }) || [];
      
      setVideos(videosWithUrls);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('videos')
        .upload(fileName, file);

      if (error) throw error;

      toast.success('Video uploaded successfully');
      loadVideos(); // Reload videos
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (videoName: string) => {
    if (!confirm('Are you sure you want to delete this video? This will also delete its metadata and thumbnail.')) return;

    setDeleting(videoName);
    try {
      // Delete video from storage
      const { error: videoError } = await supabase.storage
        .from('videos')
        .remove([videoName]);

      if (videoError) throw videoError;

      // Delete metadata from database
      const { error: metadataError } = await supabase
        .from('video_metadata')
        .delete()
        .eq('video_name', videoName);

      if (metadataError) console.error('Error deleting metadata:', metadataError);

      toast.success('Video deleted successfully');
      loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
      
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white border border-gray-200 p-8 md:p-12 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                  Milestone Donor Videos
                </h1>
                <p className="text-gray-600 text-lg">
                  Manage videos that appear in the homepage carousel
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload">
                  <Button
                    disabled={uploading}
                    className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Video
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600 text-xl">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <Card className="bg-white border border-gray-200 p-12 text-center">
              <p className="text-gray-600 text-xl">No videos uploaded yet. Upload your first video to get started!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <Card 
                  key={video.name} 
                  className="bg-white border border-gray-200 p-4 overflow-hidden group hover:shadow-lg transition-shadow"
                >
                  <div className="relative">
                    {video.metadata?.thumbnail_url ? (
                      <div className="relative aspect-video rounded-lg mb-4 overflow-hidden">
                        <img
                          src={supabase.storage.from('video-thumbnails').getPublicUrl(video.metadata.thumbnail_url).data.publicUrl}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <video
                        src={video.url}
                        className="w-full rounded-lg mb-4 aspect-video object-cover"
                        preload="metadata"
                      />
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => setEditingVideo(video)}
                        variant="secondary"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(video.name)}
                        disabled={deleting === video.name}
                        variant="destructive"
                        size="sm"
                      >
                        {deleting === video.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-gray-900 font-semibold text-lg truncate">
                    {video.metadata?.title || video.name.replace(/\.[^/.]+$/, "")}
                  </h3>
                  {video.metadata?.description && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {video.metadata.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-gray-500 text-xs">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                    {video.metadata && (
                      <p className="text-gray-500 text-xs">
                        Order: {video.metadata.display_order}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />

      {editingVideo && (
        <VideoMetadataEditor
          open={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          videoName={editingVideo.name}
          videoUrl={editingVideo.url}
          metadata={editingVideo.metadata ? {
            id: editingVideo.metadata.id,
            video_name: editingVideo.name,
            title: editingVideo.metadata.title,
            description: editingVideo.metadata.description,
            thumbnail_url: editingVideo.metadata.thumbnail_url,
            display_order: editingVideo.metadata.display_order,
          } : null}
          onSave={loadVideos}
        />
      )}
    </div>
  );
}
