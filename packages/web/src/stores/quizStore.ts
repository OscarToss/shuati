import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  Question,
  WrongRecord,
  Bookmark,
  AnswerResult,
  QuizMode,
  QuizSession,
} from "@/types";

interface QuizState {
  questions: Question[];
  currentIndex: number;
  mode: QuizMode;
  answers: Record<string, AnswerResult>;
  wrongs: WrongRecord[];
  bookmarks: Bookmark[];
  sessionStart: number | null;
  loading: boolean;

  loadQuestions: (
    deckId: string,
    mode: QuizMode,
    limit?: number,
  ) => Promise<void>;
  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpTo: (index: number) => void;
  submitAnswer: (questionId: string, answer: string) => AnswerResult;
  checkAnswer: (questionId: string, userAnswer: string) => boolean;
  toggleBookmark: (questionId: string) => Promise<void>;
  loadWrongs: (deckId: string) => Promise<void>;
  loadBookmarks: (deckId: string) => Promise<void>;
  removeWrong: (wrongId: string) => Promise<void>;
  finishSession: (total: number, correct: number) => Promise<void>;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  currentIndex: 0,
  mode: "sequential",
  answers: {},
  wrongs: [],
  bookmarks: [],
  sessionStart: null,
  loading: false,

  loadQuestions: async (deckId, mode, limit) => {
    set({
      loading: true,
      mode,
      currentIndex: 0,
      answers: {},
      sessionStart: Date.now(),
    });

    let query = supabase
      .from("quiz_questions")
      .select("*")
      .eq("deck_id", deckId);

    if (mode === "wrong") {
      const { data: w } = await supabase
        .from("quiz_wrong")
        .select("question_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");
      if (w?.length)
        query = supabase
          .from("quiz_questions")
          .select("*")
          .in(
            "id",
            w.map((r) => r.question_id),
          );
      else {
        set({ questions: [], loading: false });
        return;
      }
    }

    if (mode === "bookmark") {
      const { data: b } = await supabase
        .from("quiz_bookmarks")
        .select("question_id");
      if (b?.length)
        query = supabase
          .from("quiz_questions")
          .select("*")
          .in(
            "id",
            b.map((r) => r.question_id),
          );
      else {
        set({ questions: [], loading: false });
        return;
      }
    }

    query = query.order("sort_order");
    if (limit) query = query.limit(limit);

    const { data } = await query;
    if (data) {
      const questions =
        mode === "random" ? shuffle(data as Question[]) : (data as Question[]);
      set({ questions, loading: false });
    } else {
      set({ loading: false });
    }
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1)
      set({ currentIndex: currentIndex + 1 });
  },

  prevQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  jumpTo: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) set({ currentIndex: index });
  },

  checkAnswer: (questionId, userAnswer) => {
    const q = get().questions.find((q) => q.id === questionId);
    if (!q) return false;
    if (q.type === "multi")
      return (
        userAnswer.split("").sort().join("") ===
        q.answer.split("").sort().join("")
      );
    return userAnswer.trim() === q.answer.trim();
  },

  submitAnswer: (questionId, userAnswer) => {
    const correct = get().checkAnswer(questionId, userAnswer);
    const result: AnswerResult = correct ? "correct" : "wrong";
    set((s) => ({ answers: { ...s.answers, [questionId]: result } }));
    return result;
  },

  toggleBookmark: async (questionId) => {
    const userId = JSON.parse(localStorage.getItem("quiz_auth") || "{}").userId;
    if (!userId) return;
    const existing = get().bookmarks.find((b) => b.question_id === questionId);
    if (existing) {
      await supabase.from("quiz_bookmarks").delete().eq("id", existing.id);
      set((s) => ({
        bookmarks: s.bookmarks.filter((b) => b.id !== existing.id),
      }));
    } else {
      const { data } = await supabase
        .from("quiz_bookmarks")
        .insert({ user_id: userId, question_id: questionId })
        .select("*")
        .single();
      if (data) set((s) => ({ bookmarks: [...s.bookmarks, data as Bookmark] }));
    }
  },

  loadWrongs: async (deckId) => {
    const userId = JSON.parse(localStorage.getItem("quiz_auth") || "{}").userId;
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id")
      .eq("deck_id", deckId);
    if (!questions?.length) return;
    const { data } = await supabase
      .from("quiz_wrong")
      .select("*")
      .eq("user_id", userId)
      .in(
        "question_id",
        questions.map((q) => q.id),
      );
    if (data) set({ wrongs: data as WrongRecord[] });
  },

  loadBookmarks: async (deckId) => {
    const userId = JSON.parse(localStorage.getItem("quiz_auth") || "{}").userId;
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id")
      .eq("deck_id", deckId);
    if (!questions?.length) return;
    const { data } = await supabase
      .from("quiz_bookmarks")
      .select("*")
      .eq("user_id", userId)
      .in(
        "question_id",
        questions.map((q) => q.id),
      );
    if (data) set({ bookmarks: data as Bookmark[] });
  },

  removeWrong: async (wrongId) => {
    await supabase.from("quiz_wrong").delete().eq("id", wrongId);
    set((s) => ({ wrongs: s.wrongs.filter((w) => w.id !== wrongId) }));
  },

  finishSession: async (total, correct) => {
    const userId = JSON.parse(localStorage.getItem("quiz_auth") || "{}").userId;
    const { questions, mode, sessionStart } = get();
    if (!userId || !questions.length) return;

    const deckId = questions[0].deck_id;
    const timeSpent = sessionStart
      ? Math.floor((Date.now() - sessionStart) / 1000)
      : 0;

    await supabase.from("quiz_sessions").insert({
      user_id: userId,
      deck_id: deckId,
      mode,
      total,
      correct,
      time_spent: timeSpent,
    });

    const { data: existing } = await supabase
      .from("quiz_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("deck_id", deckId)
      .single();
    if (existing) {
      await supabase.rpc("increment_quiz_progress", {
        p_user_id: userId,
        p_deck_id: deckId,
        p_correct: correct,
        p_wrong: total - correct,
      });
    } else {
      await supabase.from("quiz_progress").insert({
        user_id: userId,
        deck_id: deckId,
        correct,
        wrong: total - correct,
      });
    }
  },
}));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
