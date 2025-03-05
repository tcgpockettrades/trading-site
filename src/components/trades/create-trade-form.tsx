"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CardSelector from "@/components/cards/card-selector";
import { Card as CardType } from "@/app/types";
import { cardService } from "@/lib/utils/card-service";
import { getRarityDisplayName } from "@/lib/utils/index";

const formSchema = z.object({
  rarity: z.string().min(1, { message: "Please select a rarity" }),
  cardWanted: z.string().min(1, { message: "Please select a card you're looking for" }),
  cardsForTrade: z.array(z.string()).min(1, { message: "Please select at least one card to offer" }),
  notifyOnRefresh: z.boolean().optional(),
});

export default function CreateTradeForm() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userMissingCards, setUserMissingCards] = useState<string[]>([]);
  const [filteredMissingCards, setFilteredMissingCards] = useState<{number: string, name: string}[]>([]);
  const [availableRarities, setAvailableRarities] = useState<{value: string, label: string}[]>([]);

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rarity: "", 
      cardWanted: "",
      cardsForTrade: [],
      notifyOnRefresh: true,
    },
  });

  const selectedRarity = form.watch("rarity");
  const selectedCardWanted = form.watch("cardWanted");
  const selectedCardsForTrade = form.watch("cardsForTrade");

  // Load user data and missing cards when component mounts
  useEffect(() => {
    const getUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }
      
      setUser(sessionData.session.user);
      
      // Get user's missing cards
      const { data: missingCardsData } = await supabase
        .from("user_missing_cards")
        .select("card_number")
        .eq("user_id", sessionData.session.user.id);
        
      if (missingCardsData) {
        const missingCardNumbers = missingCardsData.map(item => item.card_number);
        setUserMissingCards(missingCardNumbers);
      }
    };

    const loadRarities = async () => {
      const cards = await cardService.getAllCards();
      const rarities = new Set<string>();
      
      cards.forEach(card => {
        rarities.add(card.rarity);
      });
      
      // Don't provide an "all" option for trade creation since a specific rarity is required
      const rarityOptions = Array.from(rarities).map(rarity => ({
        value: rarity,
        label: getRarityDisplayName(rarity),
      }));
      
      setAvailableRarities(rarityOptions);
    };

    getUser();
    loadRarities();
  }, [supabase, router]);

  // Reset form fields when rarity changes
  useEffect(() => {
    if (selectedRarity) {
      form.setValue("cardWanted", "");
      form.setValue("cardsForTrade", []);
    }
  }, [selectedRarity, form]);

  // Filter missing cards when rarity changes
  useEffect(() => {
    const loadMissingCardsWithDetails = async () => {
      if (!selectedRarity || userMissingCards.length === 0) {
        setFilteredMissingCards([]);
        return;
      }
      
      const cardsWithDetails = [];
      for (const cardNumber of userMissingCards) {
        const card = await cardService.getCardByNumber(cardNumber);
        if (card && card.rarity === selectedRarity) {
          cardsWithDetails.push({ number: cardNumber, name: card.name });
        }
      }
      
      setFilteredMissingCards(cardsWithDetails);
    };
    
    loadMissingCardsWithDetails();
  }, [selectedRarity, userMissingCards]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("You must be logged in to create a trade");
      return;
    }
    
    setLoading(true);
    
    try {
      // Create the trade post
      const { data: tradePost, error } = await supabase
        .from("trade_posts")
        .insert({
          user_id: user.id,
          card_wanted: values.cardWanted,
          cards_for_trade: values.cardsForTrade,
          rarity: values.rarity,
          is_active: true,
          is_completed: false,
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Set up refresh notification preference if selected
      if (values.notifyOnRefresh) {
        await supabase
          .from("trade_refresh_notifications")
          .insert({
            user_id: user.id,
            trade_post_id: tradePost.id,
            opt_in: true,
          });
      }
      
      toast.success("Trade created", {
        description: "Your trade post has been created successfully"
      });
      
      // Redirect to my trades page
      router.push("/my-trades");
    } catch (error) {
      console.error("Error creating trade:", error);
      toast.error("Failed to create trade post");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCardWanted = (cardNumber: string) => {
    form.setValue("cardWanted", cardNumber);
  };

  const handleRemoveCardWanted = () => {
    form.setValue("cardWanted", "");
  };

  const handleSelectCardForTrade = (cardNumber: string) => {
    const currentCards = form.getValues("cardsForTrade");
    form.setValue("cardsForTrade", [...currentCards, cardNumber]);
  };

  const handleRemoveCardForTrade = (cardNumber: string) => {
    const currentCards = form.getValues("cardsForTrade");
    form.setValue(
      "cardsForTrade",
      currentCards.filter((c) => c !== cardNumber)
    );
  };

  if (!user) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create a Trade</CardTitle>
        <CardDescription>
          Set up a new trade post to find the cards you need
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rarity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Rarity</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select card rarity" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRarities.map((rarity) => (
                          <SelectItem key={rarity.value} value={rarity.value}>
                            {rarity.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRarity && (
              <>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cardWanted"
                    render={() => (
                      <FormItem>
                        <FormLabel>Card You Want</FormLabel>
                        <FormControl>
                          <CardSelector
                            selectedCards={selectedCardWanted ? [selectedCardWanted] : []}
                            onSelect={handleSelectCardWanted}
                            onRemove={handleRemoveCardWanted}
                            rarity={selectedRarity}
                            maxSelections={1}
                            label="Select the card you're looking for"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {userMissingCards.length > 0 && selectedRarity && !selectedCardWanted && (
                    <div className="bg-muted p-4 rounded-md">
                      <h4 className="font-medium mb-2">Your Missing Cards</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select from your missing cards of this rarity:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {filteredMissingCards.length > 0 ? (
                          filteredMissingCards.map(({ number, name }) => (
                            <Button
                              key={number}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectCardWanted(number)}
                              type="button"
                            >
                              {name}
                            </Button>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No missing cards of this rarity.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="cardsForTrade"
                    render={() => (
                      <FormItem>
                        <FormLabel>Cards You are Offering</FormLabel>
                        <FormControl>
                          <CardSelector
                            selectedCards={selectedCardsForTrade}
                            onSelect={handleSelectCardForTrade}
                            onRemove={handleRemoveCardForTrade}
                            rarity={selectedRarity}
                            maxSelections={10}
                            label="Select cards you can offer for trade"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/my-trades")}
          type="button"
        >
          Cancel
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={loading || !selectedRarity || !selectedCardWanted || selectedCardsForTrade.length === 0}
          type="button"
        >
          {loading ? "Creating..." : "Create Trade"}
        </Button>
      </CardFooter>
    </Card>
  );
}