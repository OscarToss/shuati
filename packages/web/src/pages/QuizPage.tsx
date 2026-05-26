import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuizStore } from "@/stores/quizStore";
import { supabase } from "@/lib/supabase";
import type { QuizMode } from "@/types";

export default function QuizPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get("mode") as QuizMode) || "sequential";
  const limit = searchParams.get("n")
    ? parseInt(searchParams.get("n")!)
    : undefined;

  const {
    questions,
    currentIndex,
    answers,
    loading,
    loadQuestions,
    nextQuestion,
    prevQuestion,
    submitAnswer,
    toggleBookmark,
    finishSession,
    bookmarks,
  } = useQuizStore();
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deckTitle, setDeckTitle] = useState("");

  useEffect(() => {
    if (deckId) {
      loadQuestions(deckId, mode, limit);
      supabase
        .from("quiz_decks")
        .select("title")
        .eq("id", deckId)
        .single()
        .then(({ data }) => {
          if (data) setDeckTitle(data.title);
        });
    }
  }, [deckId, mode, limit, loadQuestions]);

  useEffect(() => {
    const recordWrong = async () => {
      const userId = JSON.parse(
        localStorage.getItem("quiz_auth") || "{}",
      ).userId;
      if (!userId) return;
      for (const [qId, result] of Object.entries(answers)) {
        if (result !== "wrong") continue;
        const { data: existing } = await supabase
          .from("quiz_wrong")
          .select("id, wrong_count")
          .eq("user_id", userId)
          .eq("question_id", qId)
          .single();
        if (existing) {
          await supabase
            .from("quiz_wrong")
            .update({
              wrong_count: existing.wrong_count + 1,
              last_wrong: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("quiz_wrong")
            .insert({ user_id: userId, question_id: qId, wrong_count: 1 });
        }
      }
    };
    if (Object.keys(answers).length > 0) recordWrong();
  }, [answers]);

  const q = questions[currentIndex];
  const currentAnswer = answers[q?.id || ""];
  const isBookmarked = bookmarks.some((b) => b.question_id === q?.id);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!q || currentAnswer) return;
      if (mode === "exam") {
        setExamAnswers((s) => ({ ...s, [q.id]: answer }));
        if (currentIndex < questions.length - 1) {
          setShowExplanation(false);
          setTimeout(() => nextQuestion(), 150);
        }
      } else {
        submitAnswer(q.id, answer);
        setShowExplanation(true);
      }
    },
    [
      q,
      currentAnswer,
      mode,
      currentIndex,
      questions.length,
      nextQuestion,
      submitAnswer,
    ],
  );

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setShowExplanation(false);
      nextQuestion();
    } else {
      const correctCount = Object.values(answers).filter(
        (r) => r === "correct",
      ).length;
      finishSession(questions.length, correctCount);
      setFinished(true);
    }
  };

  const handleExamSubmit = () => {
    let correct = 0;
    for (const [qId, ans] of Object.entries(examAnswers)) {
      const correct2 = useQuizStore.getState().checkAnswer(qId, ans);
      if (correct2) correct++;
    }
    finishSession(questions.length, correct);
    setFinished(true);
  };

  const examNextOrSubmit = () => {
    if (currentIndex < questions.length - 1) nextQuestion();
    else handleExamSubmit();
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  if (!q)
    return (
      <div className="py-20 text-center text-gray-400">
        <p className="text-sm">没有题目</p>
        <button
          className="mt-3 text-primary text-sm"
          onClick={() => navigate(-1)}
        >
          返回
        </button>
      </div>
    );

  if (finished) {
    const total = questions.length;
    const correct =
      mode === "exam"
        ? Object.entries(examAnswers).filter(([qId, ans]) =>
            useQuizStore.getState().checkAnswer(qId, ans),
          ).length
        : Object.values(answers).filter((r) => r === "correct").length;
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold ${correct / total >= 0.6 ? "bg-correct-bg text-correct" : "bg-wrong-bg text-wrong"}`}
        >
          {correct}/{total}
        </div>
        <p className="mt-4 text-lg font-medium text-gray-900">答题完成</p>
        <p className="text-sm text-gray-400 mt-1">
          正确率 {((correct / total) * 100).toFixed(0)}%
        </p>
        <button
          className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-medium active:scale-[0.97]"
          onClick={() => navigate(`/deck/${deckId}`, { replace: true })}
        >
          返回题库
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)]">
      {/* Progress bar */}
      <div className="flex items-center gap-3 py-3">
        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs text-gray-400">
          {currentIndex + 1}/{questions.length}
        </span>
        <button
          onClick={() => navigate(`/deck/${deckId}`)}
          className="text-xs text-gray-400"
        >
          退出
        </button>
      </div>

      {/* Question card */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-gray-500">
            {typeLabel(q.type)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => toggleBookmark(q.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isBookmarked ? "text-accent" : "text-gray-300"} active:scale-90`}
            >
              <svg
                className="w-5 h-5"
                fill={isBookmarked ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Question text */}
        <p className="text-base text-gray-900 leading-relaxed mb-6">
          {renderText(q.question)}
        </p>

        {/* Options */}
        <div className="space-y-2.5">
          {q.type === "truefalse" ? (
            ["对", "错"].map((o) => (
              <OptionButton
                key={o}
                label={o}
                selected={
                  currentAnswer !== null &&
                  (mode === "exam"
                    ? examAnswers[q.id] === o
                    : currentAnswer === "correct"
                      ? o === q.answer
                      : o ===
                        (currentAnswer === "wrong" ? answers[q.id] : undefined))
                }
                result={mode !== "exam" ? currentAnswer : null}
                isCorrect={o === q.answer}
                onPress={() => handleAnswer(o)}
                disabled={mode !== "exam" && currentAnswer !== null}
                mode={mode}
              />
            ))
          ) : q.type === "fill" ? (
            <FillInput
              onSubmit={(v) => handleAnswer(v)}
              disabled={mode !== "exam" && currentAnswer !== null}
            />
          ) : (
            Object.entries(q.options).map(([key, val]) => (
              <OptionButton
                key={key}
                label={`${key}. ${renderText(val)}`}
                selected={
                  currentAnswer !== null &&
                  (mode === "exam"
                    ? !!examAnswers[q.id]?.includes(key)
                    : currentAnswer === "correct"
                      ? q.answer.includes(key)
                      : !!answers[q.id])
                }
                result={mode !== "exam" ? currentAnswer : null}
                isCorrect={q.answer.includes(key)}
                onPress={() => {
                  if (q.type === "multi") {
                    const cur = examAnswers[q.id] || "";
                    const next = cur.includes(key)
                      ? cur.replace(key, "")
                      : cur + key;
                    setExamAnswers((s) => ({
                      ...s,
                      [q.id]: next.split("").sort().join(""),
                    }));
                  } else {
                    handleAnswer(key);
                  }
                }}
                disabled={mode !== "exam" && currentAnswer !== null}
                mode={mode}
              />
            ))
          )}
        </div>

        {/* Multi-select confirm */}
        {q.type === "multi" && mode === "exam" && (
          <button
            className="mt-3 w-full h-10 bg-primary text-white rounded-xl text-sm font-medium"
            onClick={() => handleAnswer(examAnswers[q.id] || "")}
          >
            确认
          </button>
        )}

        {/* Explanation */}
        {showExplanation && q.explanation && (
          <div
            className={`mt-4 p-4 rounded-xl ${currentAnswer === "correct" ? "bg-correct-bg" : "bg-wrong-bg"}`}
          >
            <p className="text-sm font-medium mb-1">
              {currentAnswer === "correct"
                ? "回答正确"
                : `正确答案: ${q.type === "truefalse" ? (q.answer === "对" ? "对" : "错") : q.type === "multi" ? q.answer.split("").join(", ") : q.answer}`}
            </p>
            <p className="text-sm text-gray-600">{q.explanation}</p>
          </div>
        )}

        {/* Exam submit */}
        {mode === "exam" &&
          currentIndex === questions.length - 1 &&
          Object.keys(examAnswers).length > 0 && (
            <button
              className="mt-6 w-full h-12 bg-wrong text-white rounded-xl font-medium"
              onClick={handleExamSubmit}
            >
              交卷
            </button>
          )}
      </div>

      {/* Bottom controls */}
      {!finished && (
        <div className="flex items-center justify-between py-4 gap-3 safe-bottom">
          <button
            className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-gray-500 active:scale-90"
            onClick={prevQuestion}
            disabled={currentIndex === 0}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          {mode !== "exam" && currentAnswer && (
            <button
              className="flex-1 h-12 bg-primary text-white rounded-xl font-medium active:scale-[0.97]"
              onClick={handleNext}
            >
              {currentIndex < questions.length - 1 ? "下一题" : "完成"}
            </button>
          )}
          {mode === "exam" && (
            <button
              className="flex-1 h-12 bg-primary text-white rounded-xl font-medium active:scale-[0.97]"
              onClick={examNextOrSubmit}
            >
              {currentIndex < questions.length - 1 ? "下一题" : "交卷"}
            </button>
          )}
          <button
            className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-gray-500 active:scale-90"
            onClick={handleNext}
            disabled={mode !== "exam" && !currentAnswer}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function OptionButton({
  label,
  selected,
  result,
  isCorrect,
  onPress,
  disabled,
  mode,
}: {
  label: string;
  selected: boolean;
  result: AnswerResult;
  isCorrect: boolean;
  onPress: () => void;
  disabled: boolean;
  mode: string;
}) {
  let bg = "bg-surface";
  if (mode !== "exam" && result) {
    if (isCorrect) bg = "bg-correct-bg border border-correct";
    else if (selected && !isCorrect) bg = "bg-wrong-bg border border-wrong";
    else if (isCorrect) bg = "bg-correct-bg border border-correct";
  } else if (selected && mode === "exam") {
    bg = "bg-primary/10 border border-primary";
  }
  return (
    <button
      className={`w-full min-h-[48px] px-4 py-3 rounded-xl text-sm text-left transition-colors active:scale-[0.98] ${bg}`}
      onClick={onPress}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function FillInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (v: string) => void;
  disabled: boolean;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <input
        className="flex-1 h-12 px-4 border border-gray-200 rounded-xl text-base outline-none focus:border-primary"
        placeholder="输入答案"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        disabled={disabled}
        onKeyDown={(e) => e.key === "Enter" && val && onSubmit(val)}
      />
      <button
        className="px-5 h-12 bg-primary text-white rounded-xl text-sm font-medium active:scale-[0.97]"
        onClick={() => val && onSubmit(val)}
        disabled={disabled || !val}
      >
        确定
      </button>
    </div>
  );
}

function typeLabel(t: string) {
  const map: Record<string, string> = {
    choice: "单选",
    multi: "多选",
    truefalse: "判断",
    fill: "填空",
  };
  return map[t] || t;
}

function renderText(text: string) {
  return text.replace(/\[\[img:(.*?)\]\]/g, "[图片]");
}

type AnswerResult = "correct" | "wrong" | null;
