export interface Profile {
  id: string;
  display_name: string | null;
  preferred_voice: 'ar-XA-Neural2-A' | 'ar-XA-Neural2-C';
  auto_play: boolean;
  show_romanization: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  last_studied_at: string | null;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
  card_count?: number; // computed by query
}

export interface Card {
  id: string;
  deck_id: string;
  arabic: string;
  english: string;
  romanization: string | null;
  is_starred: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}
