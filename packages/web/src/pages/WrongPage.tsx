import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuizStore } from "@/stores/quizStore";
import { useDeckStore } from "@/stores/deckStore";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import type { WrongRecord as WRecord } from "@/types";

export default function WrongPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const { wrongs, loadWrongs, removeWrong } = useQuizStore();
  const { decks, fetchDecks } = useDeckStore();
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const deck = decks.find((d) => d.id === deckId);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);
  useEffect(() => {
    if (deckId) loadWrongs(deckId);
  }, [deckId, loadWrongs]);

  useEffect(() => {
    if (wrongs.length === 0) return;
    const ids = wrongs.map((w) => w.question_id);
    supabase
      .from("quiz_questions")
      .select("id, question")
      .in("id", ids)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((q: any) => {
            map[q.id] = q.question;
          });
          setQuestions(map);
        }
      });
  }, [wrongs]);

  return (
    <div>
      <header className="py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">错题本</h1>
          <p className="text-xs text-gray-400">
            {deck?.title || ""} · {wrongs.length} 道错题
          </p>
        </div>
        {wrongs.length > 0 && (
          <Link
            to={`/quiz/${deckId}?mode=wrong`}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium active:scale-[0.97] transition-transform"
          >
            重刷错题
          </Link>
        )}
      </header>

      {wrongs.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-sm">暂无错题</p>
          <Link
            to={`/quiz/${deckId}`}
            className="inline-block mt-2 text-sm text-primary"
          >
            去刷题
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {wrongs.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface"
            >
              <span className="text-xs font-medium text-wrong bg-wrong-bg px-2 py-0.5 rounded-full">
                {w.wrong_count}次
              </span>
              <span className="flex-1 text-sm text-gray-700 truncate">
                {questions[w.question_id]?.replace(
                  /\[\[img:.*?\]\]/g,
                  "[图]",
                ) || "..."}
              </span>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-wrong active:scale-90"
                onClick={() => removeWrong(w.id)}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
