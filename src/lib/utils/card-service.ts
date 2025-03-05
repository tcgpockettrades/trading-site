import { Card } from '@/app/types';
import { getAllCards } from './index';

export class CardService {
  private static instance: CardService;
  private cards: Card[] = [];
  private loaded = false;

  private constructor() {}

  public static getInstance(): CardService {
    if (!CardService.instance) {
      CardService.instance = new CardService();
    }
    return CardService.instance;
  }

  public async loadCards(): Promise<void> {
    if (!this.loaded) {
      this.cards = await getAllCards();
      this.loaded = true;
    }
  }

  public async searchCards(query: string, rarity?: string): Promise<Card[]> {
    await this.loadCards();
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // If empty query, return all cards (optionally filtered by rarity)
    if (!normalizedQuery) {
      return rarity 
        ? this.cards.filter(card => card.rarity === rarity)
        : this.cards;
    }
    
    // Search by card number, name, or pack
    return this.cards.filter(card => {
      const matchesQuery = 
        card.number.toLowerCase().includes(normalizedQuery) ||
        card.name.toLowerCase().includes(normalizedQuery) ||
        card.exclusive_pack.toLowerCase().includes(normalizedQuery);
      
      // If rarity is specified, filter by that too
      if (rarity) {
        return matchesQuery && card.rarity === rarity;
      }
      
      return matchesQuery;
    });
  }

  public async getCardByNumber(cardNumber: string): Promise<Card | undefined> {
    await this.loadCards();
    return this.cards.find(card => card.number === cardNumber);
  }

  public async getCardsByNumbers(cardNumbers: string[]): Promise<Card[]> {
    await this.loadCards();
    return this.cards.filter(card => cardNumbers.includes(card.number));
  }

  public async getCardsByRarity(rarity: string): Promise<Card[]> {
    await this.loadCards();
    return this.cards.filter(card => card.rarity === rarity);
  }

  public async getAllCards(): Promise<Card[]> {
    await this.loadCards();
    return [...this.cards];
  }
}

// Export a singleton instance
export const cardService = CardService.getInstance();