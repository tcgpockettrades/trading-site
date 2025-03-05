"use client";

import { useState, useEffect } from "react";
import { Card as CardType } from "@/app/types";
import { Badge } from "@/components/ui/badge";
import { getRarityDisplayName } from "@/lib/utils/index";
import { cardService } from "@/lib/utils/card-service";

interface CardItemProps {
  cardNumber: string;
  showRarity?: boolean;
  showPack?: boolean;
  className?: string;
}

export default function CardItem({
  cardNumber,
  showRarity = true,
  showPack = true,
  className = "",
}: CardItemProps) {
  const [card, setCard] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCard = async () => {
      setLoading(true);
      try {
        const cardData = await cardService.getCardByNumber(cardNumber);
        setCard(cardData || null);
      } catch (error) {
        console.error(`Failed to load card ${cardNumber}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [cardNumber]);

  if (loading) {
    return (
      <div className={`p-2 border rounded-md animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded-md w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded-md w-1/2"></div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className={`p-2 border rounded-md ${className}`}>
        <p className="text-sm text-muted-foreground">
          Card not found: {cardNumber}
        </p>
      </div>
    );
  }

  // Determine background color based on rarity
  const getBgColorByRarity = (rarity: string) => {
    switch (rarity) {
      case "1-diamond":
        return "bg-blue-100 dark:bg-blue-950";
      case "2-diamond":
        return "bg-green-100 dark:bg-green-950";
      case "3-diamond":
        return "bg-purple-100 dark:bg-purple-950";
      case "4-diamond":
        return "bg-red-100 dark:bg-red-950";
      case "1-star":
        return "bg-yellow-100 dark:bg-yellow-950";
      default:
        return "bg-gray-100 dark:bg-gray-900";
    }
  };

  return (
    <div className={`p-3 border rounded-md ${getBgColorByRarity(card.rarity)} ${className}`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {card.number}
            {showPack && (
                <span> | {card.exclusive_pack}</span>
            )} 
            </span>
          {showRarity && (
            <Badge variant="outline" className="text-xs">
              {getRarityDisplayName(card.rarity)}
            </Badge>
          )}
        </div>
        <h3 className="font-medium">{card.name}</h3>
      </div>
    </div>
  );
}