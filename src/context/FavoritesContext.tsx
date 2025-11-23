import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type FavoritesContextType = {
  favorites: Set<string>;
  count: number;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadFavorites(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadFavorites(session.user.id);
      } else {
        setUserId(null);
        setFavorites(new Set());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadFavorites = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", uid);

      if (error) throw error;

      const favoriteIds = new Set(data?.map(f => f.product_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const refreshFavorites = async () => {
    if (userId) {
      await loadFavorites(userId);
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const wasFavorite = favorites.has(productId);

    try {
      if (wasFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);

        if (error) throw error;

        // Update local state immediately
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: userId,
            product_id: productId
          });

        if (error) throw error;

        // Update local state immediately
        setFavorites(prev => new Set(prev).add(productId));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      throw error;
    }
  };

  const isFavorite = (productId: string) => favorites.has(productId);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      count: favorites.size,
      isFavorite,
      toggleFavorite,
      refreshFavorites
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
