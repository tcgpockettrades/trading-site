"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, RefreshCw, CheckCircle, PlusCircle } from "lucide-react";
import { TradePost, UserNotification, TradePostWithCards } from "@/app/types";
import { formatRelativeTime, isTradeExpiringSoon } from "@/lib/utils/index";
import { cardService } from "@/lib/utils/card-service";
import TradePostItem from "@/components/trades/trade-post-item";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { toast } from "sonner";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTradeCount, setActiveTradeCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradePostWithCards[]>([]);
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
      loadDashboardData(data.user.id);
    };

    getUser();
  }, [supabase.auth, router]);

  const loadDashboardData = async (userId: string) => {
    setLoading(true);
    
    try {
      // Load active trade count
      const { count: activeCount } = await supabase
        .from("trade_posts")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("is_completed", false);

      setActiveTradeCount(activeCount || 0);

      // Load all active trades to check for expiring soon
      const { data: activeTrades } = await supabase
        .from("trade_posts")
        .select("last_refreshed")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("is_completed", false);

      if (activeTrades) {
        // Count trades expiring soon (almost 6 hours old)
        const expiringSoon = activeTrades.filter(trade => 
          isTradeExpiringSoon(trade.last_refreshed)
        ).length;
        
        setExpiringSoonCount(expiringSoon);
      }

      // Load recent notifications
      const { data: notificationData } = await supabase
        .from("user_notifications")
        .select(`
          *,
          trade_post:trade_post_id(
            *,
            user:user_id(id, email, friend_code, tcg_pocket_username)
          )
        `)
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (notificationData) {
        setNotifications(notificationData as UserNotification[]);
      }

      // Load recent trades globally
      const { data: recentTradeData } = await supabase
        .from("trade_posts")
        .select(`
          *,
          user:user_id(id, email, friend_code, tcg_pocket_username)
        `)
        .eq("is_active", true)
        .eq("is_completed", false)
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentTradeData) {
        // Enhance with card details
        const enhanced = await Promise.all(
          recentTradeData.map(async (post: TradePost) => {
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
        
        setRecentTrades(enhanced);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      
      // Update the local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to update notification");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-6 max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-center h-full">
            <p>Loading dashboard...</p>
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
        <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
              <p className="text-2xl font-bold">{activeTradeCount}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {activeTradeCount === 0
                  ? "You have no active trades"
                  : `You have ${activeTradeCount} active trade${activeTradeCount === 1 ? "" : "s"}`}
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/my-trades" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  View Trades
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <p className="text-2xl font-bold">{expiringSoonCount}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {expiringSoonCount === 0
                  ? "No trades expiring soon"
                  : `${expiringSoonCount} trade${expiringSoonCount === 1 ? "" : "s"} need to be refreshed`}
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/my-trades" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Trades
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <p className="text-2xl font-bold">{notifications.length}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {notifications.length === 0
                  ? "No new notifications"
                  : `You have ${notifications.length} unread notification${notifications.length === 1 ? "" : "s"}`}
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled={notifications.length === 0}
                onClick={() => {
                  const tab = document.getElementById("notifications-tab");
                  if (tab) {
                    tab.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                <Bell className="h-4 w-4 mr-2" />
                View Notifications
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Quick Actions</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/my-trades/create">
              <Button variant="outline" className="w-full h-full p-6 flex flex-col items-center justify-center gap-2">
                <PlusCircle className="h-6 w-6" />
                <span>Create New Trade</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="w-full h-full p-6 flex flex-col items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Update Profile</span>
              </Button>
            </Link>
            <Link href="/profile/missing-cards">
              <Button variant="outline" className="w-full h-full p-6 flex flex-col items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6" />
                <span>Update Missing Cards</span>
              </Button>
            </Link>
            <Link href="/trades">
              <Button variant="outline" className="w-full h-full p-6 flex flex-col items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Browse Trades</span>
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="notifications" id="notifications-tab">Notifications</TabsTrigger>
            <TabsTrigger value="recent-trades">Recent Trades</TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications">
            <h2 className="text-2xl font-bold mb-4">Your Notifications</h2>
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <Bell className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="text-xl font-semibold mb-1">No new notifications</h3>
                  <p className="text-muted-foreground">
                    When someone wants to trade with you, you will see notifications here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card key={notification.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium mb-1">Trade Interest Notification</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            User &quot;{notification.notifier_username}&quot; is interested in your trade
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">When:</span>{" "}
                            {formatRelativeTime(notification.created_at)}
                          </p>
                          {notification.trade_post && (
                            <div className="mt-2">
                              <span className="text-sm font-medium">Trade:</span>{" "}
                              <span className="text-sm">
                                Looking for card {notification.trade_post.card_wanted}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          Mark as Read
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent-trades">
            <h2 className="text-2xl font-bold mb-4">Recent Trades</h2>
            {recentTrades.length === 0 ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xl font-semibold mb-1">No recent trades</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to create a trade!
                  </p>
                  <Link href="/my-trades/create">
                    <Button>Create a Trade</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentTrades.map((trade) => (
                  <TradePostItem key={trade.id} trade={trade} />
                ))}
                <div className="flex justify-center mt-4">
                  <Link href="/trades">
                    <Button variant="outline">View All Trades</Button>
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}