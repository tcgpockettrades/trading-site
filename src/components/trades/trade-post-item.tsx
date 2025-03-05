"use client";

import { useState } from "react";
import Link from "next/link";
import { Clipboard, RefreshCw, MailCheck, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import CardItem from "@/components/cards/card-item";
import { TradePostWithCards } from "@/app/types";
import { formatRelativeTime, formatFriendCode, getRarityDisplayName, isTradeExpired } from "@/lib/utils/index";
import { createClient } from "@/lib/supabase/client";

const notifyFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  message: z.string().optional(),
});

interface TradePostItemProps {
  trade: TradePostWithCards;
  isOwner?: boolean;
  showActions?: boolean;
  onRefresh?: (tradeId: string) => void;
  onComplete?: (tradeId: string) => void;
}

export default function TradePostItem({
  trade,
  isOwner = false,
  showActions = true,
  onRefresh,
  onComplete,
}: TradePostItemProps) {
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof notifyFormSchema>>({
    resolver: zodResolver(notifyFormSchema),
    defaultValues: {
      username: "",
      message: "",
    },
  });

  const copyFriendCode = () => {
    if (!trade.user?.friend_code) return;
    
    navigator.clipboard.writeText(formatFriendCode(trade.user.friend_code));
    setIsCopied(true);
    
    toast.success("Friend code copied!", {
      description: `${formatFriendCode(trade.user.friend_code)} copied to clipboard`
    });
    
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh(trade.id);
      toast.success("Trade refreshed", {
        description: "Your trade post has been refreshed and will remain active for another 6 hours"
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to refresh trade post"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    
    setIsCompleting(true);
    try {
      await onComplete(trade.id);
      toast.success("Trade completed", {
        description: "Your trade post has been marked as completed"
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to mark trade as completed"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const onNotifySubmit = async (values: z.infer<typeof notifyFormSchema>) => {
    setIsNotifying(true);
    
    try {
      // Check if user is logged in
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        toast.error("Login required", {
          description: "You must be logged in to notify a trader"
        });
        setIsNotifying(false);
        setIsNotifyDialogOpen(false);
        return;
      }
      
      // First check if this user has already notified this trade post
      const { data: existingNotifications } = await supabase
        .from("user_notifications")
        .select("id")
        .eq("trade_post_id", trade.id)
        .eq("notifier_username", values.username);
      
      if (existingNotifications && existingNotifications.length > 0) {
        toast.error("Already notified", {
          description: "You have already sent a notification for this trade"
        });
        setIsNotifying(false);
        setIsNotifyDialogOpen(false);
        return;
      }
      
      // Create notification with optional message
      await supabase.from("user_notifications").insert({
        user_id: trade.user_id,
        trade_post_id: trade.id,
        notifier_username: values.username,
        message: values.message || null,
      });
      
      // Also call the API route which will handle email/text notification if needed
      await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tradeId: trade.id,
          notifierUsername: values.username,
          message: values.message || null,
        }),
      });
      
      toast.success("Trader notified", {
        description: "The trader has been notified of your interest"
      });
      
      setHasNotified(true);
      form.reset();
    } catch (error) {
      console.error("Notification error:", error);
      toast.error("Notification failed", {
        description: "There was an error sending the notification"
      });
    } finally {
      setIsNotifying(false);
      setIsNotifyDialogOpen(false);
    }
  };

  const isExpired = isTradeExpired(trade.last_refreshed);
  
  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="px-4 py-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                Looking for {trade.card_wanted_details.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Posted {formatRelativeTime(trade.created_at)}
                {trade.updated_at !== trade.created_at &&
                  ` · Updated ${formatRelativeTime(trade.updated_at)}`}
              </p>
            </div>
            <Badge>
              {getRarityDisplayName(trade.rarity)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Looking For:</h4>
              <CardItem cardNumber={trade.card_wanted} />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">
                Offering:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {trade.cards_for_trade_details.map((card) => (
                  <CardItem
                    key={card.number}
                    cardNumber={card.number}
                    showRarity={false}
                  />
                ))}
              </div>
            </div>
          </div>

          {trade.user && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t pt-3 mt-3">
              <div className="flex items-center space-x-2 self-center sm:self-start">
                <span className="text-sm font-medium">Friend Code:</span>
                <span className="text-sm">
                  {formatFriendCode(trade.user.friend_code || "")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={copyFriendCode}
                  title="Copy Friend Code"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {showActions && (
                <div className="flex space-x-2 mt-2 sm:mt-0 self-center sm:self-auto">
                  {isOwner ? (
                    <>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={handleRefresh}
                        disabled={isRefreshing || !isExpired}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {isRefreshing ? "Refreshing..." : "Refresh"}
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleComplete}
                        disabled={isCompleting}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {isCompleting ? "Completing..." : "Mark Complete"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setIsNotifyDialogOpen(true)}
                      disabled={hasNotified}
                    >
                      <MailCheck className="h-4 w-4 mr-1" />
                      {hasNotified ? "Notified" : "Notify Trader"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Trader</DialogTitle>
            <DialogDescription>
              Send a notification to the trader that you&apos;re interested in this trade. They&apos;ll see your Pokemon TCG Pocket username.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onNotifySubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Pokemon TCG Pocket Username</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your in-game username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="I have this card and would like to trade!" 
                        rows={3}
                        maxLength={200}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNotifyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isNotifying}>
                  {isNotifying ? "Sending..." : "Send Notification"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}