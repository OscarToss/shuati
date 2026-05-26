import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useQuizStore } from "@/stores/quizStore";
import { useDeckStore } from "@/stores/deckStore";
import { useRef } from "react";

export default function OverviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const { questions, answers, mode, loadQuestions, loading } = useQuizStore();
  const { decks, fetchDecks } = useDeckStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const deck = decks.find((d) => d.id === deckId);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);
  useEffect(() => {
    if (deckId) loadQuestions(deckId, "sequential");
  }, [deckId, loadQuestions]);

  const virtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <header className="py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {deck?.title || "题目总览"}
          </h1>
          <p className="text-xs text-gray-400">{questions.length} 题</p>
        </div>
        <Link
          to={`/quiz/${deckId}`}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium active:scale-[0.97] transition-transform"
        >
          开始刷题
        </Link>
      </header>

      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ contain: "strict" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((vItem) => {
            const q = questions[vItem.index];
            const status = answers[q?.id];
            return (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                <button
                  onClick={() => useQuizStore.getState().jumpTo(vItem.index)}
                  className="w-full flex items-center gap-3 px-3 py-4 border-b border-gray-100 text-left active:bg-gray-50"
                >
                  <span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-medium text-gray-500 shrink-0">
                    {vItem.index + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {q?.question?.replace(/\[\[img:.*?\]\]/g, "[图]") || ""}
                  </span>
                  {status === "correct" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-correct shrink-0" />
                  )}
                  {status === "wrong" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-wrong shrink-0" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
