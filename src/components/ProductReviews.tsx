import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, BadgeCheck, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string;
  verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
}

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchReviews();
  }, [productId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchUserVotes(user.id);
    }
  };

  const fetchUserVotes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("review_votes")
        .select("review_id, vote_type")
        .eq("user_id", userId);

      if (error) throw error;

      const votes: Record<string, string> = {};
      data?.forEach((vote) => {
        votes[vote.review_id] = vote.vote_type;
      });
      setUserVotes(votes);
    } catch (error) {
      console.error("Error fetching user votes:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (reviewId: string, voteType: "helpful" | "not_helpful") => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to vote on reviews",
        variant: "destructive",
      });
      return;
    }

    try {
      const existingVote = userVotes[reviewId];

      if (existingVote === voteType) {
        // Remove vote if clicking same button
        const { error } = await supabase
          .from("review_votes")
          .delete()
          .eq("review_id", reviewId)
          .eq("user_id", user.id);

        if (error) throw error;

        setUserVotes((prev) => {
          const newVotes = { ...prev };
          delete newVotes[reviewId];
          return newVotes;
        });
      } else if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from("review_votes")
          .update({ vote_type: voteType })
          .eq("review_id", reviewId)
          .eq("user_id", user.id);

        if (error) throw error;

        setUserVotes((prev) => ({ ...prev, [reviewId]: voteType }));
      } else {
        // Create new vote
        const { error } = await supabase
          .from("review_votes")
          .insert({
            review_id: reviewId,
            user_id: user.id,
            vote_type: voteType,
          });

        if (error) throw error;

        setUserVotes((prev) => ({ ...prev, [reviewId]: voteType }));
      }

      // Refresh reviews to get updated counts
      fetchReviews();
    } catch (error: any) {
      console.error("Error voting on review:", error);
      toast({
        title: "Error",
        description: "Failed to record your vote",
        variant: "destructive",
      });
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      dist[review.rating as keyof typeof dist]++;
    });
    return dist;
  }, [reviews]);

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const sizeClass = size === "lg" ? "w-6 h-6" : "w-4 h-4";
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">Loading reviews...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {reviews.length > 0 && (
        <div className="pb-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Average Rating */}
            <div className="text-center md:text-left md:w-1/3">
              <p className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</p>
              {renderStars(Math.round(averageRating), "lg")}
              <p className="text-sm text-muted-foreground mt-2">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-12">{rating} star</span>
                    <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {renderStars(review.rating)}
                  {review.verified_purchase && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                      <BadgeCheck className="w-3 h-3 text-green-500" />
                      <span className="text-xs font-medium text-green-500">Verified Purchase</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              {review.review_text && (
                <p className="text-sm text-foreground/90 mt-2">{review.review_text}</p>
              )}
              
              {/* Voting Buttons */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/20">
                <span className="text-xs text-muted-foreground">Was this helpful?</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(review.id, "helpful")}
                    className={`gap-1 h-8 ${
                      userVotes[review.id] === "helpful"
                        ? "bg-green-500/20 text-green-600 hover:bg-green-500/30"
                        : "hover:bg-muted"
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span className="text-xs">{review.helpful_count}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(review.id, "not_helpful")}
                    className={`gap-1 h-8 ${
                      userVotes[review.id] === "not_helpful"
                        ? "bg-red-500/20 text-red-600 hover:bg-red-500/30"
                        : "hover:bg-muted"
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span className="text-xs">{review.not_helpful_count}</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
