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
export interface TableBlock {
  kind: "table";
  headers: string[];
  rows: string[][];
  reason: string;
}
export type Block = CardBlock | TextBlock | TableBlock;

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

// A clean table (plausible header, every row the same width) becomes a
// CardBlock; anything else (merged-cell artefacts producing ragged rows, or
// a table with no plausible header) falls back to a TableBlock so the
// original grid is shown rather than silently mis-mapping data into the
// wrong labelled fields.
export function classifyTable(headers: string[], rows: string[][]): "cards" | "table" {
  if (headers.length === 0 || headers.some((h) => h.trim() === "")) return "table";
  if (rows.some((r) => r.length !== headers.length)) return "table";
  return "cards";
}

// marked's own table tokenizer force-pads (or truncates) every parsed row to
// exactly `header.length` cells before mobiliser ever sees it — so a
// genuinely ragged row (the classic merged/colspan-cell artefact) would
// otherwise be invisible to classifyTable. Recover the *true* per-row cell
// count from the table's raw markdown source (splitting on unescaped "|",
// matching the escaping sanitiseCell already applies) so raggedness
// survives into classification.
function splitRawRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function tableToBlock(t: Tokens.Table): CardBlock | TableBlock {
  const headers = t.header.map((c) => c.text);
  const paddedRows = t.rows.map((row) => row.map((c) => c.text));

  // t.raw is "<header line>\n<delimiter line>\n<data line>\n...".
  const dataLines = t.raw.trim().split("\n").slice(2).filter((l) => l.trim() !== "");
  const rawRows = dataLines.map(splitRawRow);
  const ragged = rawRows.some((r) => r.length !== headers.length);

  // Use the raw (possibly ragged) rows once we know they matter for
  // classification/display; otherwise the marked-parsed rows are equivalent
  // and already carry correctly-typed inline tokens' rendered text.
  const rows = ragged ? rawRows : paddedRows;

  if (!ragged && classifyTable(headers, rows) === "cards") {
    return { kind: "cards", headers, rows };
  }
  const reason = headers.length === 0 || headers.some((h) => h.trim() === "") ? "no header" : "ragged rows";
  return { kind: "table", headers, rows, reason };
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
      current.blocks.push(tableToBlock(token as Tokens.Table));
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
