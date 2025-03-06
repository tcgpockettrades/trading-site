"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import TradesFilter from "@/components/trades/trades-filter";
import TradePostItem from "@/components/trades/trade-post-item";
import { TradePost, TradePostWithCards, Card as CardType } from "@/app/types";
import { cardService } from "@/lib/utils/card-service";

export default function TradesPage() {
  const [tradePosts, setTradePosts] = useState<TradePostWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    rarity: "",
    cardNumber: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();
  
  // Number of trades to load per page
  const PAGE_SIZE = 10;

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setCurrentUserId(data.session.user.id);
      }
    };
    
    getCurrentUser();
  }, [supabase]);

  useEffect(() => {
    loadTradePosts();
  }, [filters, currentPage]);

  // Function to extract user data from post, handling different possible structures
  const extractUserData = (post: any) => {
    // If we already manually fetched and attached user data
    if (post.userDetails) {
      return post.userDetails;
    }
    
    // Try multiple possible locations for user data from a join
    if (post.users && typeof post.users === 'object') {
      return post.users;
    } else if (post.user && typeof post.user === 'object') {
      return post.user;
    } else if (post.users && Array.isArray(post.users) && post.users.length > 0) {
      return post.users[0];
    }
    
    return null;
  };

  const loadTradePosts = async () => {
    setLoading(true);
    try {
      // First, deactivate any posts older than 6 hours
      await deactivateStaleTradesPosts();

      // Calculate range for pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // Try a direct query first
      let query = supabase
        .from("trade_posts")
        .select(`
          *,
          users!trade_posts_user_id_fkey(id, email, friend_code, tcg_pocket_username)
        `, { count: 'exact' })
        .eq("is_active", true)
        .eq("is_completed", false)
        .order("last_refreshed", { ascending: false })
        .range(from, to);

      // Apply rarity filter
      if (filters.rarity) {
        query = query.eq("rarity", filters.rarity);
      }

      // Apply card number filter
      if (filters.cardNumber) {
        query = query.or(`card_wanted.eq.${filters.cardNumber},cards_for_trade.cs.{${filters.cardNumber}}`);
      }

      const { data: posts, error, count } = await query;

      if (error) {
        throw error;
      }

      // Set total pages and total trades count
      if (count !== null) {
        setTotalTrades(count);
        setTotalPages(Math.ceil(count / PAGE_SIZE));
      }

      // If no posts, return early
      if (!posts || posts.length === 0) {
        setTradePosts([]);
        setLoading(false);
        return;
      }

      // IMPORTANT: For each post where users is null/missing, fetch the user info directly
      // This ensures we always have user data regardless of join issues
      const enhancedWithUserDetails = await Promise.all(
        posts.map(async (post: any) => {
          // Check if we need to fetch user data separately
          let userDetails = extractUserData(post);
          
          if (!userDetails && post.user_id) {
            // Fetch user data directly if not included in the join
            const { data: userData } = await supabase
              .from('users')
              .select('id, email, friend_code, tcg_pocket_username')
              .eq('id', post.user_id)
              .single();
              
            userDetails = userData;
            // Attach to post for later use
            post.userDetails = userData;
          }
          
          return post;
        })
      );

      // Now enhance with card details
      const fullyEnhanced = await Promise.all(
        enhancedWithUserDetails.map(async (post: any) => {
          // Get card wanted details
          const cardWantedDetails = await cardService.getCardByNumber(post.card_wanted);
          
          // Get cards for trade details
          const cardsForTradeDetails = await cardService.getCardsByNumbers(post.cards_for_trade);
          
          // Extract user info - using our helper function
          const userData = extractUserData(post);
          
          // Create a consistent user object, even if some fields are null
          const userInfo = userData ? {
            id: userData.id,
            email: userData.email,
            friend_code: userData.friend_code,
            tcg_pocket_username: userData.tcg_pocket_username
          } : null;
          
          // Create the enhanced post with complete user info
          return {
            ...post,
            card_wanted_details: cardWantedDetails || {
              number: post.card_wanted,
              name: "Unknown Card",
              rarity: post.rarity,
              exclusive_pack: "Unknown",
            },
            cards_for_trade_details: cardsForTradeDetails,
            user: userInfo
          } as TradePostWithCards;
        })
      );

      // Apply search filter (client-side since we need the card details)
      let filtered = fullyEnhanced;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = fullyEnhanced.filter(
          (post) =>
            post.card_wanted_details.name.toLowerCase().includes(search) ||
            post.card_wanted_details.number.toLowerCase().includes(search) ||
            post.cards_for_trade_details.some(
              (card) =>
                card.name.toLowerCase().includes(search) ||
                card.number.toLowerCase().includes(search)
            )
        );
      }

      // Log final data structure for debugging
      console.log("Final trade posts with user data:", filtered);

      setTradePosts(filtered);
    } catch (error) {
      console.error("Error loading trade posts:", error);
      toast.error("Failed to load trade posts");
    } finally {
      setLoading(false);
    }
  };

  // Function to deactivate trade posts older than 6 hours
  const deactivateStaleTradesPosts = async () => {
    try {
      // Calculate the timestamp for 6 hours ago
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
      
      // Update posts where last_refreshed is older than 6 hours to is_active = false
      const { error } = await supabase
        .from("trade_posts")
        .update({ is_active: false })
        .eq("is_active", true)
        .lt("last_refreshed", sixHoursAgo.toISOString());
      
      if (error) {
        console.error("Error deactivating stale trade posts:", error);
      }
    } catch (error) {
      console.error("Error in deactivateStaleTradesPosts:", error);
    }
  };

  const handleFilters = (newFilters: {
    search: string;
    rarity: string;
    cardNumber: string;
  }) => {
    setFilters(newFilters);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTradePosts().finally(() => {
      setIsRefreshing(false);
      toast.success("Trade listings refreshed");
    });
  };

  return (
    <div className="container py-6 max-w-5xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trade Posts</h1>
          <p className="text-muted-foreground">
            Browse active trade posts from other players
          </p>
        </div>
        <Link href="/my-trades/create">
          <Button>
            Create Trade
          </Button>
        </Link>
      </div>

      <TradesFilter onFilter={handleFilters} onRefresh={handleRefresh} />

      {!loading && (
        <div className="flex items-center mb-4">
          <div className="text-sm text-muted-foreground">
            Showing {tradePosts.length} of {totalTrades} trades
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full h-40 animate-pulse">
              <CardContent className="p-6 flex items-center justify-center">
                <p className="text-muted-foreground">Loading trades...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tradePosts.length === 0 ? (
        <Card className="w-full">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold mb-2">No trades found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {filters.search || filters.rarity || filters.cardNumber
                ? "No trades match your current filters. Try adjusting your search criteria."
                : "There are no active trade posts at the moment."}
            </p>
            <Link href="/my-trades/create">
              <Button>Create a Trade</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {tradePosts.map((trade) => {
              const isOwner = currentUserId === trade.user_id;
              return (
                <TradePostItem
                  key={trade.id}
                  trade={trade}
                  isOwner={isOwner}
                  showActions={true}
                />
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {tradePosts.length} of {totalTrades} trades
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}