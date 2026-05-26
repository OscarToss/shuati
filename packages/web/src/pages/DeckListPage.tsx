import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDeckStore } from "@/stores/deckStore";
import type { Deck } from "@/types";

export default function DeckListPage() {
  const { decks, loading, fetchDecks, fetchQuestionCount } = useDeckStore();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
    decks.forEach(async (d) => {
      if (counts[d.id] === undefined) {
        const c = await fetchQuestionCount(d.id);
        setCounts((s) => ({ ...s, [d.id]: c }));
      }
    });
  }, [decks]);

  const filtered = decks.filter(
    (d) => d.title.includes(search) || d.description?.includes(search),
  );
  const defaultDecks = filtered.filter((d) => d.is_default);
  const myDecks = filtered.filter((d) => !d.is_default);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );

  return (
    <div>
      <header className="py-4">
        <h1 className="text-xl font-bold text-gray-900">题库</h1>
        <input
          className="w-full h-10 mt-3 px-4 bg-surface rounded-lg text-sm outline-none"
          placeholder="搜索题库..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </header>

      {defaultDecks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            默认题库
          </h2>
          <div className="space-y-2">
            {defaultDecks.map((d) => (
              <DeckCard key={d.id} deck={d} count={counts[d.id]} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            我的题库
          </h2>
          <Link to="/import" className="text-xs text-primary font-medium">
            + 导入
          </Link>
        </div>
        {myDecks.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">还没有题库</p>
            <Link
              to="/import"
              className="inline-block mt-2 text-sm text-primary"
            >
              导入第一个题库
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {myDecks.map((d) => (
              <DeckCard key={d.id} deck={d} count={counts[d.id]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DeckCard({ deck, count }: { deck: Deck; count?: number }) {
  return (
    <Link
      to={`/deck/${deck.id}`}
      className="block p-4 rounded-xl bg-surface active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{deck.title}</h3>
          {deck.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {deck.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{count ?? "..."} 题</p>
        </div>
        <svg
          className="w-5 h-5 text-gray-300 shrink-0 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
