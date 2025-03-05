// Card Types
export interface Card {
    number: string;
    name: string;
    rarity: string;
    exclusive_pack: string;
  }
  
  // User Types
  export interface User {
    id: string;
    email: string;
    friend_code: string | null;
    tcg_pocket_username: string | null;
    created_at: string;
    updated_at: string;
    notification_preference: {
      email: boolean;
      text: boolean;
    };
    notification_contact: {
      email: string | null;
      phone: string | null;
    };
  }
  
  export interface UserMissingCard {
    id: string;
    user_id: string;
    card_number: string;
    created_at: string;
  }
  
  // Trade Types
  export interface TradePost {
    id: string;
    user_id: string;
    card_wanted: string;
    cards_for_trade: string[];
    rarity: string;
    created_at: string;
    updated_at: string;
    last_refreshed: string;
    is_active: boolean;
    is_completed: boolean;
    user?: User;
  }
  
  export interface TradePostWithCards extends TradePost {
    card_wanted_details: Card;
    cards_for_trade_details: Card[];
  }
  
  // Notification Types
  export interface UserNotification {
    id: string;
    user_id: string;
    trade_post_id: string;
    notifier_username: string;
    created_at: string;
    is_read: boolean;
    message: string | null;
    trade_post?: TradePost;
  }
  
  export interface TradeRefreshNotification {
    id: string;
    user_id: string;
    trade_post_id: string;
    opt_in: boolean;
    last_notified: string | null;
  }
  
  // Supabase Database Types (partial)
  export type Database = {
    public: {
      Tables: {
        users: {
          Row: User;
          Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & { id?: string };
          Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
        };
        user_missing_cards: {
          Row: UserMissingCard;
          Insert: Omit<UserMissingCard, 'id' | 'created_at'> & { id?: string };
          Update: Partial<Omit<UserMissingCard, 'id' | 'created_at'>>;
        };
        trade_posts: {
          Row: TradePost;
          Insert: Omit<TradePost, 'id' | 'created_at' | 'updated_at' | 'last_refreshed'> & { id?: string };
          Update: Partial<Omit<TradePost, 'id' | 'created_at' | 'updated_at'>>;
        };
        user_notifications: {
          Row: UserNotification;
          Insert: Omit<UserNotification, 'id' | 'created_at' | 'is_read'> & { id?: string };
          Update: Partial<Omit<UserNotification, 'id' | 'created_at'>>;
        };
        trade_refresh_notifications: {
          Row: TradeRefreshNotification;
          Insert: Omit<TradeRefreshNotification, 'id'> & { id?: string };
          Update: Partial<Omit<TradeRefreshNotification, 'id'>>;
        };
      };
    };
  };