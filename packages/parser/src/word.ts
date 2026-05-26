import mammoth from "mammoth";
import type { RawQuestion } from "./excel";

export async function parseWord(buffer: ArrayBuffer): Promise<RawQuestion[]> {
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return parsePlainText(value);
}

function parsePlainText(text: string): RawQuestion[] {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
  return blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim());
    const qLine = lines[0].replace(/^\d+[.、]/, "");
    const ansLine = lines.find(
      (l) => l.startsWith("答案") || l.startsWith("Answer"),
    );
    const expLine = lines.find((l) => l.startsWith("解析"));
    const opts: Record<string, string> = {};
    for (const line of lines) {
      const m = line.match(/^([A-D])[.、]\s*(.+)/);
      if (m) opts[m[1]] = m[2];
    }
    return {
      type: "choice",
      question: qLine,
      options: opts,
      answer: ansLine ? ansLine.replace(/答案[：:]?\s*/i, "").trim() : "",
      explanation: expLine ? expLine.replace(/解析[：:]?\s*/i, "").trim() : "",
      tags: [],
    };
  });
}
