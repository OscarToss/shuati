import * as pdfjsLib from "pdfjs-dist";
import type { RawQuestion } from "./excel";

export async function parsePdf(buffer: ArrayBuffer): Promise<RawQuestion[]> {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  const { parseWord } = await import("./word");
  return parseWord(
    new TextEncoder().encode(text).buffer as unknown as ArrayBuffer,
  );
}
