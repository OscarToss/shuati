import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuizSession } from "@/types";

export default function StatsPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = JSON.parse(localStorage.getItem("quiz_auth") || "{}").userId;
    if (!userId) return;
    supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("finished_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setSessions(data as QuizSession[]);
        setLoading(false);
      });
  }, []);

  const totalCorrect = sessions.reduce((s, s2) => s + s2.correct, 0);
  const totalQuestions = sessions.reduce((s, s2) => s + s2.total, 0);
  const accuracy =
    totalQuestions > 0
      ? ((totalCorrect / totalQuestions) * 100).toFixed(1)
      : "--";

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );

  return (
    <div>
      <header className="py-4">
        <h1 className="text-lg font-bold text-gray-900">统计</h1>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-surface text-center">
          <p className="text-2xl font-bold text-primary">{sessions.length}</p>
          <p className="text-xs text-gray-400 mt-1">刷题次数</p>
        </div>
        <div className="p-4 rounded-xl bg-surface text-center">
          <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
          <p className="text-xs text-gray-400 mt-1">总题数</p>
        </div>
        <div className="p-4 rounded-xl bg-surface text-center">
          <p className="text-2xl font-bold text-correct">{accuracy}%</p>
          <p className="text-xs text-gray-400 mt-1">正确率</p>
        </div>
      </div>

      <h2 className="text-sm font-medium text-gray-500 mb-3">最近记录</h2>
      {sessions.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          还没有刷题记录
        </p>
      ) : (
        <div className="space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface"
            >
              <span className="text-xs text-gray-400 w-16">
                {new Date(s.finished_at).toLocaleDateString("zh-CN")}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {modeLabel(s.mode)}
              </span>
              <span className="flex-1 text-sm text-gray-700">
                {s.correct}/{s.total}
              </span>
              <span className="text-xs text-gray-400">
                {s.time_spent
                  ? `${Math.floor(s.time_spent / 60)}分${s.time_spent % 60}秒`
                  : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function modeLabel(m: string) {
  const map: Record<string, string> = {
    sequential: "顺序",
    random: "随机",
    wrong: "错题",
    bookmark: "收藏",
    exam: "考试",
  };
  return map[m] || m;
}
