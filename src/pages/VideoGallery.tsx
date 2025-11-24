import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface Video {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

export default function VideoGallery() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
      
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-8 md:p-12 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Video Gallery
            </h1>
            <p className="text-white/90 text-lg">
              Watch our collection of videos showcasing our mission and impact
            </p>
          </Card>

          {loading ? (
            <div className="text-center text-white py-12">
              <p className="text-xl">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-md border-white/20 p-12 text-center">
              <p className="text-white text-xl">No videos available yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((video) => (
                <Card 
                  key={video.name} 
                  className="bg-white/10 backdrop-blur-md border-white/20 p-4 overflow-hidden"
                >
                  <video
                    src={video.url}
                    className="w-full rounded-lg mb-4"
                    controls
                    preload="metadata"
                  />
                  <h3 className="text-white font-semibold text-lg truncate">
                    {video.name.replace(/\.[^/.]+$/, "")}
                  </h3>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
