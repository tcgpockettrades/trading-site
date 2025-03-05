import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Card } from "../../app/types";

// For combining Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to relative time (e.g. "3 hours ago")
export function formatRelativeTime(dateString: string): string {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
}

// Format friend code in the standard display format
export function formatFriendCode(code: string): string {
  if (!code) return '';
  
  // If already formatted, return as is
  if (code.includes('-')) return code;
  
  // Format as XXXX-XXXX-XXXX
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length !== 12) return code; // Return original if not valid
  
  return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 8)}-${cleaned.substring(8, 12)}`;
}

// Get rarity display name
export function getRarityDisplayName(rarity: string): string {
  const rarityMap: Record<string, string> = {
    '1-diamond': '1 Diamond',
    '2-diamond': '2 Diamond',
    '3-diamond': '3 Diamond',
    '4-diamond': '4 Diamond',
    '1-star': '1 Star'
  };
  
  return rarityMap[rarity] || rarity;
}

// Load all cards from the card_dex.json file
export async function getAllCards(): Promise<Card[]> {
  // In a client component, use dynamic import
  try {
    const cards = (await import('@/data/card_dex.json')).default as Card[];
    return cards;
  } catch (error) {
    console.error("Failed to load card data:", error);
    return [];
  }
}

// Get card details by card number
export async function getCardByNumber(cardNumber: string): Promise<Card | undefined> {
  const cards = await getAllCards();
  return cards.find(card => card.number === cardNumber);
}

// Get multiple cards by their numbers
export async function getCardsByNumbers(cardNumbers: string[]): Promise<Card[]> {
  const cards = await getAllCards();
  return cards.filter(card => cardNumbers.includes(card.number));
}

// Get cards filtered by rarity
export async function getCardsByRarity(rarity: string): Promise<Card[]> {
  const cards = await getAllCards();
  return cards.filter(card => card.rarity === rarity);
}

// Check if a trade is expiring soon (needs refresh)
export function isTradeExpiringSoon(lastRefreshed: string): boolean {
  const refreshedDate = parseISO(lastRefreshed);
  const currentDate = new Date();
  
  // Get the difference in hours
  const diffInHours = (currentDate.getTime() - refreshedDate.getTime()) / (1000 * 60 * 60);
  
  // Trade needs refresh if it's been almost 6 hours (e.g., 5.5 hours)
  return diffInHours >= 5.5;
}

// Check if a trade is expired (over 6 hours)
export function isTradeExpired(lastRefreshed: string): boolean {
  const refreshedDate = parseISO(lastRefreshed);
  const currentDate = new Date();
  
  // Get the difference in hours
  const diffInHours = (currentDate.getTime() - refreshedDate.getTime()) / (1000 * 60 * 60);
  
  // Trade is expired if it's been more than 6 hours
  return diffInHours >= 6;
}

// Validate friend code format
export function isValidFriendCode(code: string): boolean {
  // Remove any non-numeric characters
  const cleaned = code.replace(/\D/g, '');
  
  // Check if it's exactly 12 digits
  return cleaned.length === 16;
}