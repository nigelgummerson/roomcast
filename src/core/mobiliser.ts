import { marked, type Token, type Tokens } from "marked";

export interface CardBlock {
  kind: "cards";
  headers: string[];
  rows: string[][];
}
export interface TextBlock {
  kind: "text";
  md: string;
}
export type Block = CardBlock | TextBlock;

export interface Section {
  id: string;
  title: string | null;
  level: number;
  blocks: Block[];
}
export interface ViewModel {
  sections: Section[];
  index: { id: string; title: string }[];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function tableToCards(t: Tokens.Table): CardBlock {
  return {
    kind: "cards",
    headers: t.header.map((c) => c.text),
    rows: t.rows.map((row) => row.map((c) => c.text)),
  };
}

export function mobilise(md: string): ViewModel {
  const tokens = marked.lexer(md);
  const sections: Section[] = [];
  const usedIds = new Set<string>();

  const uniqueId = (title: string): string => {
    const base = slugify(title) || "section";
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  // Sentinel id for the leading (untitled) section. It must never be produced by
  // uniqueId()/slugify() for a real heading, so it is assigned directly rather than
  // reserved via uniqueId() — slugify() strips non letter/number characters, so a
  // leading underscore can never appear in a real heading's slug. This id is only
  // meaningful if the leading section actually ends up kept (i.e. it has content);
  // otherwise it is dropped below and never appears in the output.
  let current: Section = { id: "_lead", title: null, level: 0, blocks: [] };
  const pushText = (raw: string) => {
    if (raw.trim()) current.blocks.push({ kind: "text", md: raw });
  };

  for (const token of tokens as Token[]) {
    if (token.type === "heading") {
      if (current.blocks.length > 0 || current.title !== null) sections.push(current);
      const h = token as Tokens.Heading;
      current = { id: uniqueId(h.text), title: h.text, level: h.depth, blocks: [] };
    } else if (token.type === "table") {
      current.blocks.push(tableToCards(token as Tokens.Table));
    } else {
      pushText((token as { raw?: string }).raw ?? "");
    }
  }
  if (current.blocks.length > 0 || current.title !== null) sections.push(current);

  const index = sections
    .filter((s) => s.title !== null)
    .map((s) => ({ id: s.id, title: s.title as string }));

  return { sections, index };
}
