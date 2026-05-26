import type { RawQuestion } from "./excel";

export interface ValidationResult {
  rows: (RawQuestion & {
    index: number;
    status: "ok" | "error";
    errorMsg?: string;
  })[];
  okCount: number;
  errCount: number;
}

const validTypes = ["choice", "multi", "truefalse", "fill"];

const typeMap: Record<string, string> = {
  多选: "multi",
  单选: "choice",
  判断: "truefalse",
  填空: "fill",
  选择: "choice",
};

export function validateRows(rows: RawQuestion[]): ValidationResult {
  const validated = rows.map((r, i) => {
    const errors: string[] = [];
    if (!r.question.trim()) errors.push("缺少题干");
    if (!r.answer.trim()) errors.push("缺少答案");
    const t = typeMap[r.type.toLowerCase()] || r.type.toLowerCase();
    if (!validTypes.includes(t)) errors.push(`未知题型: ${r.type}`);
    return {
      ...r,
      index: i + 1,
      status: errors.length === 0 ? ("ok" as const) : ("error" as const),
      errorMsg: errors.join("; "),
    };
  });
  return {
    rows: validated,
    okCount: validated.filter((r) => r.status === "ok").length,
    errCount: validated.filter((r) => r.status === "error").length,
  };
}
