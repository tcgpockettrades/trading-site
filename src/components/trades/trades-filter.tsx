"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2,RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { getRarityDisplayName } from "@/lib/utils/index";
import { cardService } from "@/lib/utils/card-service";

interface TradesFilterProps {
  onFilter: (filters: {
    search: string;
    rarity: string;
    cardNumber: string;
  }) => void;
  onRefresh?: () => void;
}

export default function TradesFilter({ onFilter, onRefresh }: TradesFilterProps) {
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("all");
  const [cardNumber, setCardNumber] = useState("");
  const [availableRarities, setAvailableRarities] = useState<{value: string, label: string}[]>([]);
  const [searchResults, setSearchResults] = useState<{number: string, name: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use a ref to track if user has changed filters without submitting
  const filtersChanged = useRef(false);
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    const loadRarities = async () => {
      const cards = await cardService.getAllCards();
      const rarities = new Set<string>();
      
      cards.forEach(card => {
        rarities.add(card.rarity);
      });
      
      const rarityOptions = [
        { value: "all", label: "All Rarities" },
        ...Array.from(rarities).map(rarity => ({
          value: rarity,
          label: getRarityDisplayName(rarity),
        })),
      ];
      
      setAvailableRarities(rarityOptions);
    };

    loadRarities();
  }, []);

  // Handle card search for specific card filter
  useEffect(() => {
    const searchCards = async () => {
      if (!search || search.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await cardService.searchCards(search, rarity !== "all" ? rarity : undefined);
        setSearchResults(
          results.slice(0, 5).map((card) => ({
            number: card.number,
            name: card.name,
          }))
        );
      } catch (error) {
        console.error("Error searching cards:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchCards, 300);
    return () => clearTimeout(debounce);
  }, [search, rarity]);

  // Mark filters as changed when any filter changes, but only after initial load
  useEffect(() => {
    if (initialLoadComplete.current) {
      filtersChanged.current = true;
    } else {
      initialLoadComplete.current = true;
    }
  }, [search, rarity, cardNumber]);

  // Handle rarity change and make sure to apply filter immediately
  const handleRarityChange = (value: string) => {
    // First clear search and card number
    setSearch("");
    setCardNumber("");
    setSearchResults([]);
    
    // Then set the new rarity
    setRarity(value);
    filtersChanged.current = true;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setIsSubmitting(true);
    
    onFilter({
      search,
      rarity: rarity === "all" ? "" : rarity,
      cardNumber,
    });
    
    // Reset changed flag since we're submitting current filters
    filtersChanged.current = false;
    
    setTimeout(() => {
      setIsSubmitting(false);
    }, 300);
  };

  const handleReset = () => {
    setSearch("");
    setRarity("all");
    setCardNumber("");
    setSearchResults([]);
    
    onFilter({
      search: "",
      rarity: "",
      cardNumber: "",
    });
    
    filtersChanged.current = false;
  };
  
  const handleRefresh = () => {
    if (onRefresh) {
      setIsRefreshing(true);
      
      // Call the parent's refresh function
      onRefresh();
      
      // Reset refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const selectCard = (number: string, name: string) => {
    setCardNumber(number);
    setSearch(name);
    setSearchResults([]);
    filtersChanged.current = true;
    
    // Auto-submit when a card is selected
    setTimeout(() => {
      handleSubmit();
    }, 50);
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Clear card number when search changes
    if (cardNumber) {
      setCardNumber("");
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search cards..."
                  className="pl-8"
                  value={search}
                  onChange={handleSearchChange}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                    {searchResults.map((result) => (
                      <div
                        key={result.number}
                        className="p-2 cursor-pointer hover:bg-muted"
                        onClick={() => selectCard(result.number, result.name)}
                      >
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {result.number}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isSearching && search.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md p-2 text-center">
                    Searching...
                  </div>
                )}
              </div>

              <Select 
                value={rarity} 
                onValueChange={handleRarityChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by rarity" />
                </SelectTrigger>
                <SelectContent>
                  {availableRarities.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="submit"
                size="sm"
                className="sm:w-auto w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Filtering...
                  </>
                ) : (
                  "Filter"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="sm:w-auto w-full"
                disabled={isSubmitting}
              >
                Reset
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Find trades that match your criteria
        </div>
        {filtersChanged.current && initialLoadComplete.current && (
          <div className="text-sm text-orange-500 font-medium">
            Changes not applied. Click Filter to update results.
          </div>
        )}
      </CardFooter>
    </Card>
  );
}