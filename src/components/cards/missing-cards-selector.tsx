"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, UserMissingCard } from "@/app/types";
import { cardService } from "@/lib/utils/card-service";
import { createClient } from "@/lib/supabase/client";
import { getRarityDisplayName } from "@/lib/utils/index";
import { toast } from "sonner";

export default function MissingCardsSelector() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [missingCards, setMissingCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCard, setSavingCard] = useState<string | null>(null);
  const supabase = createClient();

  // Load all cards and user's missing cards
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Get all cards
        const allCards = await cardService.getAllCards();
        setCards(allCards);
        setFilteredCards(allCards);

        // Get user's missing cards
        const { data: userSession } = await supabase.auth.getSession();
        if (userSession.session) {
          const { data: missingCardsData } = await supabase
            .from("user_missing_cards")
            .select("card_number")
            .eq("user_id", userSession.session.user.id);

          if (missingCardsData) {
            const missingCardNumbers = missingCardsData.map(item => item.card_number);
            setMissingCards(missingCardNumbers);
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load card data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase]);

  // Filter cards when search or rarity changes
  useEffect(() => {
    if (cards.length === 0) return;

    let filtered = cards;
    
    if (selectedRarity && selectedRarity !== "all") {
      filtered = filtered.filter((card) => card.rarity === selectedRarity);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.name.toLowerCase().includes(query) ||
          card.number.toLowerCase().includes(query) ||
          card.exclusive_pack.toLowerCase().includes(query)
      );
    }
    
    setFilteredCards(filtered);
  }, [searchQuery, selectedRarity, cards]);

  const toggleCardMissing = async (cardNumber: string) => {
    try {
      setSavingCard(cardNumber);
      const { data: userSession } = await supabase.auth.getSession();
      
      if (!userSession.session) {
        toast.error("You must be logged in to update your collection");
        return;
      }
      
      const userId = userSession.session.user.id;
      const isMissing = missingCards.includes(cardNumber);
      
      if (isMissing) {
        // Remove from missing cards
        await supabase
          .from("user_missing_cards")
          .delete()
          .eq("user_id", userId)
          .eq("card_number", cardNumber);
          
        setMissingCards(prev => prev.filter(num => num !== cardNumber));
        
        toast.success("Card removed from your missing cards list");
      } else {
        // Add to missing cards
        await supabase
          .from("user_missing_cards")
          .insert({
            user_id: userId,
            card_number: cardNumber,
          });
          
        setMissingCards(prev => [...prev, cardNumber]);
        
        toast.success("Card added to your missing cards list");
      }
    } catch (error) {
      console.error("Error updating missing cards:", error);
      toast.error("Failed to update your missing cards");
    } finally {
      setSavingCard(null);
    }
  };

  const rarityOptions = [
    { value: "all", label: "All Rarities" },
    { value: "1-diamond", label: "1 Diamond" },
    { value: "2-diamond", label: "2 Diamond" },
    { value: "3-diamond", label: "3 Diamond" },
    { value: "4-diamond", label: "4 Diamond" },
    { value: "1-star", label: "1 Star" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">My Missing Cards</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Check the cards you&apos;re missing to make creating trade offers easier
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search cards..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={selectedRarity}
          onValueChange={setSelectedRarity}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Rarity" />
          </SelectTrigger>
          <SelectContent>
            {rarityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Card List */}
      <div className="border rounded-md overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">Loading cards...</div>
        ) : filteredCards.length === 0 ? (
          <div className="p-4 text-center">No cards found</div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="p-2 min-w-12">Missing</th>
                  <th className="text-left p-2 min-w-20">Number</th>
                  <th className="text-left p-2 min-w-24">Name</th>
                  <th className="text-left p-2 min-w-24">Rarity</th>
                  <th className="text-left p-2 min-w-24">Pack</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => {
                  const isMissing = missingCards.includes(card.number);
                  const isLoading = savingCard === card.number;
                  
                  return (
                    <tr
                      key={card.number}
                      className={`border-b hover:bg-muted/50 cursor-pointer ${isLoading ? "opacity-50" : ""}`}
                      onClick={() => !isLoading && toggleCardMissing(card.number)}
                    >
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isMissing}
                          onCheckedChange={() => toggleCardMissing(card.number)}
                          disabled={isLoading}
                          className={isLoading ? "opacity-50" : ""}
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap">{card.number}</td>
                      <td className="p-2 whitespace-nowrap">{card.name}</td>
                      <td className="p-2 whitespace-nowrap">{getRarityDisplayName(card.rarity)}</td>
                      <td className="p-2 whitespace-nowrap">{card.exclusive_pack}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}