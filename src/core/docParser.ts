import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import mammoth from "mammoth";

function makeTurndown(): TurndownService {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  td.use(gfm);
  return td;
}

export function htmlToGfm(html: string): string {
  return makeTurndown().turndown(html).trim() + "\n";
}

export async function docxToMarkdown(input: ArrayBuffer): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: input });
  return htmlToGfm(html);
}
