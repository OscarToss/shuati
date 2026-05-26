import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuizStore } from "@/stores/quizStore";
import { useDeckStore } from "@/stores/deckStore";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function BookmarkPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const { bookmarks, loadBookmarks } = useQuizStore();
  const { decks, fetchDecks } = useDeckStore();
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const deck = decks.find((d) => d.id === deckId);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);
  useEffect(() => {
    if (deckId) loadBookmarks(deckId);
  }, [deckId, loadBookmarks]);

  useEffect(() => {
    if (bookmarks.length === 0) return;
    const ids = bookmarks.map((b) => b.question_id);
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
  }, [bookmarks]);

  return (
    <div>
      <header className="py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">收藏</h1>
          <p className="text-xs text-gray-400">
            {deck?.title || ""} · {bookmarks.length} 道收藏
          </p>
        </div>
        {bookmarks.length > 0 && (
          <Link
            to={`/quiz/${deckId}?mode=bookmark`}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium active:scale-[0.97] transition-transform"
          >
            刷收藏
          </Link>
        )}
      </header>

      {bookmarks.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-sm">还没有收藏题目</p>
          <Link
            to={`/quiz/${deckId}`}
            className="inline-block mt-2 text-sm text-primary"
          >
            去刷题
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface"
            >
              <svg
                className="w-4 h-4 text-accent shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="flex-1 text-sm text-gray-700 truncate">
                {questions[b.question_id]?.replace(
                  /\[\[img:.*?\]\]/g,
                  "[图]",
                ) || "..."}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
