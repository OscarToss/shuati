import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  Deck,
  Question,
  WrongRecord,
  Bookmark,
  Progress,
  QuizSession,
} from "@/types";

interface DeckState {
  decks: Deck[];
  loading: boolean;
  fetchDecks: () => Promise<void>;
  fetchQuestionCount: (deckId: string) => Promise<number>;
  createDeck: (title: string, description?: string) => Promise<string | null>;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: [],
  loading: false,

  fetchDecks: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("quiz_decks")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) set({ decks: data as Deck[], loading: false });
    else set({ loading: false });
  },

  fetchQuestionCount: async (deckId: string) => {
    const { count } = await supabase
      .from("quiz_questions")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", deckId);
    return count ?? 0;
  },

  createDeck: async (title: string, description?: string) => {
    const { data, error } = await supabase
      .from("quiz_decks")
      .insert({ title, description: description || "" })
      .select("id")
      .single();
    if (error) return null;
    get().fetchDecks();
    return data.id;
  },
}));
