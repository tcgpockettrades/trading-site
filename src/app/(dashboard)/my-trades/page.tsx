// app/(dashboard)/my-trades/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PlusCircle, RefreshCw, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import TradePostItem from "@/components/trades/trade-post-item";
import { TradePost, TradePostWithCards } from "@/app/types";
import { cardService } from "@/lib/utils/card-service";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function MyTradesPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTrades, setActiveTrades] = useState<TradePostWithCards[]>([]);
  const [completedTrades, setCompletedTrades] = useState<TradePostWithCards[]>([]);
  const [expiredTrades, setExpiredTrades] = useState<TradePostWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        router.push("/login");
        return;
      }
      
      setUser(data.user);
      loadTrades(data.user.id);
    };

    getUser();
  }, [supabase.auth, router]);

  const loadTrades = async (userId: string) => {
    setLoading(true);
    
    try {
      // Get all user's trades
      const { data: trades, error } = await supabase
        .from("trade_posts")
        .select(`
          *,
          user:user_id(id, email, friend_code, tcg_pocket_username)
        `)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Enhance with card details
      const enhanced = await Promise.all(
        (trades || []).map(async (post) => {
          const cardWantedDetails = await cardService.getCardByNumber(post.card_wanted);
          const cardsForTradeDetails = await cardService.getCardsByNumbers(post.cards_for_trade);
          
          return {
            ...post,
            card_wanted_details: cardWantedDetails || {
              number: post.card_wanted,
              name: "Unknown Card",
              rarity: post.rarity,
              exclusive_pack: "Unknown",
            },
            cards_for_trade_details: cardsForTradeDetails,
          } as TradePostWithCards;
        })
      );
      
      // Split into active, completed, and expired trades
      setActiveTrades(enhanced.filter(trade => trade.is_active && !trade.is_completed));
      setCompletedTrades(enhanced.filter(trade => trade.is_completed));
      setExpiredTrades(enhanced.filter(trade => !trade.is_active && !trade.is_completed));
    } catch (error) {
      console.error("Error loading trades:", error);
      toast.error("Failed to load your trades");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from("trade_posts")
        .update({
          is_active: true,
          last_refreshed: new Date().toISOString(),
        })
        .eq("id", tradeId);

      if (error) {
        throw error;
      }

      // Reload trades after update
      if (user) {
        loadTrades(user.id);
      }
      
      return true;
    } catch (error) {
      console.error("Error refreshing trade:", error);
      throw error;
    }
  };

  const handleComplete = async (tradeId: string) => {
    try {
      const { error } = await supabase
        .from("trade_posts")
        .update({
          is_completed: true,
          is_active: false,
        })
        .eq("id", tradeId);

      if (error) {
        throw error;
      }

      // Reload trades after update
      if (user) {
        loadTrades(user.id);
      }
      
      return true;
    } catch (error) {
      console.error("Error completing trade:", error);
      throw error;
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-6">
          <div className="flex items-center justify-center h-full">
            <p>Loading your trades...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6 max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Trades</h1>
            <p className="text-muted-foreground">
              Manage your trade posts
            </p>
          </div>
          <Link href="/my-trades/create">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Trade
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="active" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active ({activeTrades.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedTrades.length})
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expired ({expiredTrades.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {activeTrades.length === 0 ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xl font-semibold mb-1">No active trades</h3>
                  <p className="text-muted-foreground mb-4">
                    You don&apos;t have any active trade posts
                  </p>
                  <Link href="/my-trades/create">
                    <Button>Create a Trade</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeTrades.map((trade) => (
                  <TradePostItem
                    key={trade.id}
                    trade={trade}
                    isOwner={true}
                    onRefresh={handleRefresh}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed">
            {completedTrades.length === 0 ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <CheckCircle className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-xl font-semibold mb-1">No completed trades</h3>
                  <p className="text-muted-foreground">
                    You haven&apos;t completed any trades yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedTrades.map((trade) => (
                  <TradePostItem
                    key={trade.id}
                    trade={trade}
                    isOwner={true}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="expired">
            {expiredTrades.length === 0 ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-xl font-semibold mb-1">No expired trades</h3>
                  <p className="text-muted-foreground">
                    You don&apos;t have any expired trade posts
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {expiredTrades.map((trade) => (
                  <TradePostItem
                    key={trade.id}
                    trade={trade}
                    isOwner={true}
                    onRefresh={handleRefresh}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}