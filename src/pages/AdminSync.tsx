import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Check, X } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";

export default function AdminSync() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [syncing, setSyncing] = useState({
    sinalite: false,
    scalablepress: false,
    psrestful: false
  });

  const [results, setResults] = useState<Record<string, { success: boolean; message: string } | null>>({
    sinalite: null,
    scalablepress: null,
    psrestful: null
  });

  useEffect(() => {
    // Check authentication with proper Supabase Auth
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/admin-login');
        return;
      }

      // Verify admin role from database
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        toast.error("Error verifying admin access");
        navigate('/admin-login');
        return;
      }

      if (!roles) {
        toast.error("You don't have admin access");
        navigate('/admin-login');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/admin-login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const syncSinaLite = async () => {
    setSyncing(prev => ({ ...prev, sinalite: true }));
    try {
      const { data, error } = await supabase.functions.invoke('sync-sinalite');
      if (error) throw error;
      
      setResults(prev => ({
        ...prev,
        sinalite: { success: true, message: data.message || 'Sync completed successfully' }
      }));
      toast.success('SinaLite products synced successfully');
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        sinalite: { success: false, message: error.message || 'Sync failed' }
      }));
      toast.error('Failed to sync SinaLite products');
    } finally {
      setSyncing(prev => ({ ...prev, sinalite: false }));
    }
  };

  const syncScalablePress = async () => {
    setSyncing(prev => ({ ...prev, scalablepress: true }));
    try {
      const { data, error } = await supabase.functions.invoke('sync-scalablepress');
      if (error) throw error;
      
      setResults(prev => ({
        ...prev,
        scalablepress: { success: true, message: data.message || 'Sync completed successfully' }
      }));
      toast.success('Scalable Press products synced successfully');
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        scalablepress: { success: false, message: error.message || 'Sync failed' }
      }));
      toast.error('Failed to sync Scalable Press products');
    } finally {
      setSyncing(prev => ({ ...prev, scalablepress: false }));
    }
  };

  const syncPsRestful = async () => {
    setSyncing(prev => ({ ...prev, psrestful: true }));
    try {
      const { data, error } = await supabase.functions.invoke('sync-psrestful');
      if (error) throw error;
      
      setResults(prev => ({
        ...prev,
        psrestful: { success: true, message: data.message || 'Sync completed successfully' }
      }));
      toast.success('PsRestful products synced successfully');
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        psrestful: { success: false, message: error.message || 'Sync failed' }
      }));
      toast.error('Failed to sync PsRestful products');
    } finally {
      setSyncing(prev => ({ ...prev, psrestful: false }));
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 text-white">
        <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
          <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase" aria-label="Print Power Purpose Home">
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
        </header>
        <div className="h-full flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 text-white">
        <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
          <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase" aria-label="Print Power Purpose Home">
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
        </header>
        <div className="h-full flex items-center justify-center">
          <div className="text-lg">Access Denied</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 text-white">
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase" aria-label="Print Power Purpose Home">
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen py-12 px-4">
          <VideoBackground 
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />
          
          <div className="relative max-w-4xl mx-auto space-y-6">
            <GlassCard>
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Product Sync</h1>
                <Button 
                  onClick={() => navigate("/admin")}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Admin
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">SinaLite Products</CardTitle>
                  <CardDescription className="text-white/70">Sync products from SinaLite API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={syncSinaLite}
                    disabled={syncing.sinalite}
                    className="w-full"
                  >
                    {syncing.sinalite ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync SinaLite
                      </>
                    )}
                  </Button>
                  {results.sinalite && (
                    <div className={`p-4 rounded-lg ${results.sinalite.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex items-center gap-2 text-white">
                        {results.sinalite.success ? (
                          <Check className="h-5 w-5 text-green-400" />
                        ) : (
                          <X className="h-5 w-5 text-red-400" />
                        )}
                        <span className="font-medium">{results.sinalite.message}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </GlassCard>

            <GlassCard>
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Scalable Press Products</CardTitle>
                  <CardDescription className="text-white/70">Sync products from Scalable Press API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={syncScalablePress}
                    disabled={syncing.scalablepress}
                    className="w-full"
                  >
                    {syncing.scalablepress ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Scalable Press
                      </>
                    )}
                  </Button>
                  {results.scalablepress && (
                    <div className={`p-4 rounded-lg ${results.scalablepress.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex items-center gap-2 text-white">
                        {results.scalablepress.success ? (
                          <Check className="h-5 w-5 text-green-400" />
                        ) : (
                          <X className="h-5 w-5 text-red-400" />
                        )}
                        <span className="font-medium">{results.scalablepress.message}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </GlassCard>

            <GlassCard>
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">PsRestful Products</CardTitle>
                  <CardDescription className="text-white/70">Sync products from PsRestful API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={syncPsRestful}
                    disabled={syncing.psrestful}
                    className="w-full"
                  >
                    {syncing.psrestful ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync PsRestful
                      </>
                    )}
                  </Button>
                  {results.psrestful && (
                    <div className={`p-4 rounded-lg ${results.psrestful.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex items-center gap-2 text-white">
                        {results.psrestful.success ? (
                          <Check className="h-5 w-5 text-green-400" />
                        ) : (
                          <X className="h-5 w-5 text-red-400" />
                        )}
                        <span className="font-medium">{results.psrestful.message}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
