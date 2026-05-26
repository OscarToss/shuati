export type QuestionType = "choice" | "multi" | "truefalse" | "fill";

export interface QuestionImage {
  name: string;
  storage_path: string;
}

export interface Question {
  id: string;
  deck_id: string;
  type: QuestionType;
  question: string;
  images: QuestionImage[];
  options: Record<string, string>;
  answer: string;
  explanation: string;
  exp_images: QuestionImage[];
  tags: string[];
  sort_order: number;
}

export interface Deck {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  is_default: boolean;
  tags: string[];
  created_at: string;
  question_count?: number;
  correct_count?: number;
  wrong_count?: number;
}

export interface WrongRecord {
  id: string;
  user_id: string;
  question_id: string;
  wrong_count: number;
  last_wrong: string;
  question?: Question;
}

export interface Bookmark {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
  question?: Question;
}

export interface Progress {
  id: string;
  user_id: string;
  deck_id: string;
  correct: number;
  wrong: number;
  updated_at: string;
}

export interface QuizSession {
  id: string;
  user_id: string;
  deck_id: string;
  mode: QuizMode;
  total: number;
  correct: number;
  time_spent: number;
  finished_at: string;
}

export type QuizMode = "sequential" | "random" | "wrong" | "bookmark" | "exam";

export type AnswerResult = "correct" | "wrong" | null;
