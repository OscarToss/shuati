import * as XLSX from "xlsx";

export interface RawQuestion {
  type: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  tags: string[];
}

export function parseExcel(buffer: ArrayBuffer): RawQuestion[] {
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  if (data.length < 2) return [];

  const header = data[0].map((h: string) => (h || "").toLowerCase().trim());
  const typeIdx = header.findIndex(
    (h: string) => h.includes("type") || h.includes("题型"),
  );
  const qIdx = header.findIndex(
    (h: string) =>
      h.includes("question") || h.includes("题干") || h.includes("题目"),
  );
  const optAIdx = header.findIndex(
    (h: string) => h.includes("option_a") || h.includes("选项a"),
  );
  const optBIdx = header.findIndex(
    (h: string) => h.includes("option_b") || h.includes("选项b"),
  );
  const optCIdx = header.findIndex(
    (h: string) => h.includes("option_c") || h.includes("选项c"),
  );
  const optDIdx = header.findIndex(
    (h: string) => h.includes("option_d") || h.includes("选项d"),
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

  return data.slice(1).map((row) => ({
    type: (row[typeIdx] || "choice").toString(),
    question: (row[qIdx] || "").toString(),
    options: {
      A: (row[optAIdx] || "").toString(),
      B: (row[optBIdx] || "").toString(),
      C: (row[optCIdx] || "").toString(),
      D: (row[optDIdx] || "").toString(),
    },
    answer: (row[ansIdx] || "").toString().trim(),
    explanation: (row[expIdx] || "").toString(),
    tags: row[tagIdx]
      ? row[tagIdx]
          .toString()
          .split(/[,，]/)
          .map((t: string) => t.trim())
      : [],
  }));
}
