import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Question, QuestionType } from "@/types";

interface ParseRow {
  index: number;
  type: QuestionType;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  tags: string[];
  status: "ok" | "error" | "duplicate";
  errorMsg?: string;
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ParseRow[]>([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setRows([]);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
        parseGrid(data);
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const buf = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
        parsePlainText(value);
      } else if (ext === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        parsePlainText(text);
      }
    } catch (e: any) {
      setRows([
        {
          index: 0,
          type: "choice",
          question: "",
          options: {},
          answer: "",
          explanation: "",
          tags: [],
          status: "error",
          errorMsg: `解析失败: ${e?.message || "未知错误"}`,
        },
      ]);
    }
    setParsing(false);
  }, []);

  const parseGrid = async (data: any[][]) => {
    if (data.length < 2) return;
    const header = data[0].map((h: string) => (h || "").toLowerCase().trim());
    const typeIdx = header.findIndex(
      (h: string) => h.includes("type") || h.includes("题型"),
    );
    const qIdx = header.findIndex(
      (h: string) =>
        h.includes("question") || h.includes("题干") || h.includes("题目"),
    );
    const optAIdx = header.findIndex(
      (h: string) => h.includes("option_a") || h === "a" || h.includes("选项a"),
    );
    const optBIdx = header.findIndex(
      (h: string) => h.includes("option_b") || h === "b" || h.includes("选项b"),
    );
    const optCIdx = header.findIndex(
      (h: string) => h.includes("option_c") || h === "c" || h.includes("选项c"),
    );
    const optDIdx = header.findIndex(
      (h: string) => h.includes("option_d") || h === "d" || h.includes("选项d"),
    );
    const ansIdx = header.findIndex(
      (h: string) => h.includes("answer") || h.includes("答案"),
    );
    const expIdx = header.findIndex(
      (h: string) => h.includes("explanation") || h.includes("解析"),
    );
    const tagIdx = header.findIndex(
      (h: string) => h.includes("tag") || h.includes("标签"),
    );
    if (qIdx === -1 || ansIdx === -1) {
      setRows([
        {
          index: 0,
          type: "choice",
          question: "文件格式错误：缺少题干或答案列",
          options: {},
          answer: "",
          explanation: "",
          tags: [],
          status: "error",
          errorMsg: "缺少必要列",
        },
      ]);
      return;
    }

    const parsed: ParseRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[qIdx] || !row[ansIdx]) {
        parsed.push({
          index: i,
          type: "choice",
          question: row[qIdx] || "",
          options: {},
          answer: row[ansIdx] || "",
          explanation: row[expIdx] || "",
          tags: [],
          status: "error",
          errorMsg: "缺少题干或答案",
        });
        continue;
      }
      const type = normalizeType(row[typeIdx] || "choice");
      parsed.push({
        index: i,
        type,
        question: String(row[qIdx]),
        options: {
          A: String(row[optAIdx] || ""),
          B: String(row[optBIdx] || ""),
          C: String(row[optCIdx] || ""),
          D: String(row[optDIdx] || ""),
        },
        answer: String(row[ansIdx]).trim(),
        explanation: String(row[expIdx] || ""),
        tags: row[tagIdx]
          ? String(row[tagIdx])
              .split(/[,，]/)
              .map((t: string) => t.trim())
          : [],
        status: "ok",
      });
    }
    setRows(parsed);
  };

  const parsePlainText = (text: string) => {
    const parsed: ParseRow[] = [];
    const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
    blocks.forEach((block, i) => {
      const lines = block.split("\n").map((l) => l.trim());
      const qLine = lines[0];
      const ansLine = lines.find(
        (l) => l.startsWith("答案") || l.startsWith("Answer"),
      );
      const expLine = lines.find((l) => l.startsWith("解析"));
      if (!qLine || !ansLine) {
        parsed.push({
          index: i,
          type: "choice",
          question: qLine || "",
          options: {},
          answer: "",
          explanation: "",
          tags: [],
          status: "error",
          errorMsg: "无法识别题干或答案",
        });
      } else {
        parsed.push({
          index: i,
          type: "choice",
          question: qLine.replace(/^\d+[.、]/, ""),
          options: detectOptions(lines),
          answer: ansLine.replace(/答案[：:]?\s*/i, "").trim(),
          explanation: expLine?.replace(/解析[：:]?\s*/i, "").trim() || "",
          tags: [],
          status: "ok",
        });
      }
    });
    setRows(parsed);
  };

  const handleImport = async () => {
    if (!deckTitle.trim() || rows.length === 0) return;
    setImporting(true);
    try {
      const userId = JSON.parse(
        localStorage.getItem("quiz_auth") || "{}",
      ).userId;
      if (!userId) throw new Error("请先登录");
      const { data: deck } = await supabase
        .from("quiz_decks")
        .insert({ title: deckTitle, user_id: userId })
        .select("id")
        .single();
      if (!deck) throw new Error("创建题库失败");
      const okRows = rows.filter((r) => r.status === "ok");
      const questions = okRows.map((r, i) => ({
        deck_id: deck.id,
        type: r.type,
        question: r.question,
        options: r.options,
        answer: r.answer,
        explanation: r.explanation,
        tags: r.tags,
        sort_order: i,
      }));
      const { error } = await supabase.from("quiz_questions").insert(questions);
      if (error) throw error;
      navigate(`/deck/${deck.id}`, { replace: true });
    } catch (e: any) {
      setRows([
        {
          index: 0,
          type: "choice",
          question: "",
          options: {},
          answer: "",
          explanation: "",
          tags: [],
          status: "error",
          errorMsg: `导入失败: ${e?.message || "未知错误"}`,
        },
      ]);
    }
    setImporting(false);
  };

  const dropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const okCount = rows.filter((r) => r.status === "ok").length;
  const errCount = rows.filter((r) => r.status === "error").length;

  return (
    <div>
      <header className="py-4">
        <h1 className="text-lg font-bold text-gray-900">导入题库</h1>
      </header>

      {rows.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={dropHandler}
        >
          {parsing ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <svg
                className="w-10 h-10 text-gray-300 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-gray-400">拖拽文件或点击选择</p>
              <p className="text-xs text-gray-300 mt-1">
                支持 Excel、CSV、Word、PDF
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.docx,.pdf"
                className="mt-4 text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <input
              className="flex-1 h-10 px-3 bg-surface rounded-lg text-sm outline-none"
              placeholder="题库名称"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
            />
            <span className="text-xs text-correct">{okCount} 正常</span>
            {errCount > 0 && (
              <span className="text-xs text-wrong">{errCount} 异常</span>
            )}
          </div>
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-gray-100">
            {rows.map((r) => (
              <div
                key={r.index}
                className={`px-3 py-2 border-b border-gray-50 text-sm ${r.status === "error" ? "bg-wrong-bg" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${r.status === "ok" ? "bg-correct" : "bg-wrong"} shrink-0`}
                  />
                  <span className="text-gray-500 text-xs w-8">#{r.index}</span>
                  <span className="flex-1 truncate">
                    {r.question || "(空)"}
                  </span>
                  {r.status === "error" && (
                    <span className="text-xs text-wrong">{r.errorMsg}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 w-full h-12 bg-primary text-white rounded-xl font-medium active:scale-[0.97] disabled:opacity-50"
            onClick={handleImport}
            disabled={importing || !deckTitle || okCount === 0}
          >
            {importing ? "导入中..." : `导入 ${okCount} 道题`}
          </button>
        </>
      )}
    </div>
  );
}

function normalizeType(raw: string): QuestionType {
  const t = (raw || "").toLowerCase().trim();
  if (t.includes("multi") || t.includes("多选")) return "multi";
  if (t.includes("true") || t.includes("判断")) return "truefalse";
  if (t.includes("fill") || t.includes("填空")) return "fill";
  return "choice";
}

function detectOptions(lines: string[]): Record<string, string> {
  const opts: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([A-D])[.、]\s*(.+)/);
    if (m) opts[m[1]] = m[2];
  }
  return opts;
}
