import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";

interface Video {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

export default function VideoGallery() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase.storage.from('videos').list();
      
      if (error) throw error;
      
      const videosWithUrls = data?.map(file => ({
        name: file.name,
        url: supabase.storage.from('videos').getPublicUrl(file.name).data.publicUrl,
        size: file.metadata?.size || 0,
        createdAt: file.created_at
      })) || [];
      
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
    if (!confirm('Are you sure you want to delete this video?')) return;

    setDeleting(videoName);
    try {
      const { error } = await supabase.storage
        .from('videos')
        .remove([videoName]);

      if (error) throw error;

      toast.success('Video deleted successfully');
      loadVideos(); // Reload videos
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
                    <video
                      src={video.url}
                      className="w-full rounded-lg mb-4 aspect-video object-cover"
                      controls
                      preload="metadata"
                    />
                    <Button
                      onClick={() => handleDelete(video.name)}
                      disabled={deleting === video.name}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {deleting === video.name ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <h3 className="text-gray-900 font-semibold text-lg truncate">
                    {video.name.replace(/\.[^/.]+$/, "")}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
