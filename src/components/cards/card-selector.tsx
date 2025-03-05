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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/app/types";
import { cardService } from "@/lib/utils/card-service";
import { getRarityDisplayName } from "@/lib/utils/index";

interface CardSelectorProps {
  selectedCards: string[];
  onSelect: (cardNumber: string) => void;
  onRemove: (cardNumber: string) => void;
  rarity?: string;
  maxSelections?: number;
  label: string;
}

export default function CardSelector({
  selectedCards,
  onSelect,
  onRemove,
  rarity,
  maxSelections = Infinity,
  label,
}: CardSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [selectedRarity, setSelectedRarity] = useState(rarity || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      try {
        const allCards = await cardService.getAllCards();
        setCards(allCards);
        
        // Apply initial filtering if rarity is provided
        if (rarity) {
          setFilteredCards(allCards.filter((card) => card.rarity === rarity));
        } else {
          setFilteredCards(allCards);
        }
      } catch (error) {
        console.error("Failed to load cards:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [rarity]);

  // Apply filtering when search query or rarity changes
  useEffect(() => {
    const applyFilters = async () => {
      if (cards.length === 0) return;

      // Apply search and rarity filters
      let filtered = cards;
      
      if (selectedRarity) {
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
    };

    applyFilters();
  }, [searchQuery, selectedRarity, cards]);

  // When provided rarity changes, update the selected rarity
  useEffect(() => {
    if (rarity) {
      setSelectedRarity(rarity);
    }
  }, [rarity]);

  const handleCardSelect = (cardNumber: string) => {
    if (selectedCards.includes(cardNumber)) {
      onRemove(cardNumber);
    } else if (selectedCards.length < maxSelections) {
      onSelect(cardNumber);
    }
  };

  const getSelectedCardDetails = (cardNumber: string): Card | undefined => {
    return cards.find((card) => card.number === cardNumber);
  };

  const rarityOptions = [
    { value: "", label: "All Rarities" },
    { value: "1-diamond", label: "1 Diamond" },
    { value: "2-diamond", label: "2 Diamond" },
    { value: "3-diamond", label: "3 Diamond" },
    { value: "4-diamond", label: "4 Diamond" },
    { value: "1-star", label: "1 Star" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">{label}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {selectedCards.length} of {maxSelections === Infinity ? "∞" : maxSelections} selected
        </p>
      </div>

      {/* Selected Cards */}
      {selectedCards.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Selected Cards:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCards.map((cardNumber) => {
              const card = getSelectedCardDetails(cardNumber);
              return (
                <Badge
                  key={cardNumber}
                  variant="secondary"
                  className="px-3 py-1 flex items-center gap-2"
                >
                  <span className="truncate max-w-40">
                    {card?.name || cardNumber} ({card?.number})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 rounded-full flex-shrink-0"
                    onClick={() => onRemove(cardNumber)}
                    type="button"
                  >
                    ×
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

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
        {!rarity && (
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
        )}
      </div>

      {/* Card List */}
      <div className="border rounded-md overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">Loading cards...</div>
        ) : filteredCards.length === 0 ? (
          <div className="p-4 text-center">No cards found</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2 min-w-20">Number</th>
                  <th className="text-left p-2 min-w-24">Name</th>
                  <th className="text-left p-2 min-w-24 hidden sm:table-cell">Rarity</th>
                  <th className="text-left p-2 min-w-24 hidden sm:table-cell">Pack</th>
                  <th className="text-right p-2 min-w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => {
                  const isSelected = selectedCards.includes(card.number);
                  const isDisabled = !isSelected && selectedCards.length >= maxSelections;
                  
                  return (
                    <tr
                      key={card.number}
                      className={`border-b hover:bg-muted/50 ${isDisabled ? "" : "cursor-pointer"}`}
                      onClick={() => !isDisabled && handleCardSelect(card.number)}
                    >
                      <td className="p-2 whitespace-nowrap">{card.number}</td>
                      <td className="p-2 whitespace-nowrap">{card.name}</td>
                      <td className="p-2 whitespace-nowrap hidden sm:table-cell">{getRarityDisplayName(card.rarity)}</td>
                      <td className="p-2 whitespace-nowrap hidden sm:table-cell">{card.exclusive_pack}</td>
                      <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant={isSelected ? "destructive" : "secondary"}
                          onClick={() => handleCardSelect(card.number)}
                          disabled={isDisabled}
                          type="button"
                          className="whitespace-nowrap"
                        >
                          {isSelected ? "Remove" : "Select"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View - Alternative layout for very small screens */}
      <div className="sm:hidden mt-4">
        <p className="text-xs text-muted-foreground mb-2">Swipe table horizontally to see more details</p>
      </div>
    </div>
  );
}