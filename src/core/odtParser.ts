import { unzipSync, strFromU8 } from "fflate";
import { htmlToGfm } from "./docParser";

// Cap on `table:number-columns-repeated` expansion so a hostile .odt can't
// blow up memory by claiming a cell repeats millions of times.
const MAX_COL_REPEAT = 100;

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Concatenate the visible text of an ODF element, treating <text:line-break>
// and <text:tab> as spaces (cell/paragraph content is single-line in GFM).
function textOf(node: Node): string {
  let out = "";
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      out += child.nodeValue ?? "";
    } else if (child.nodeType === 1) {
      const el = child as Element;
      if (el.localName === "line-break" || el.localName === "tab") out += " ";
      else out += textOf(el);
    }
  }
  return out;
}

function cellRepeat(cell: Element): number {
  const raw = cell.getAttribute("table:number-columns-repeated");
  const n = raw ? parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_COL_REPEAT);
}

function tableToHtml(table: Element): string {
  const rows = Array.from(table.getElementsByTagName("*")).filter(
    (el) => el.localName === "table-row",
  );
  const html = rows.map((row, rowIdx) => {
    const cells = Array.from(row.childNodes).filter(
      (n): n is Element => n.nodeType === 1 && (n as Element).localName === "table-cell",
    );
    const tag = rowIdx === 0 ? "th" : "td";
    const tds = cells.flatMap((cell) => {
      const content = `<${tag}>${esc(textOf(cell))}</${tag}>`;
      return Array.from({ length: cellRepeat(cell) }, () => content);
    });
    return `<tr>${tds.join("")}</tr>`;
  });
  return `<table>${html.join("")}</table>`;
}

// Walk one ODF block-level element into an HTML fragment. Structure only —
// headings, paragraphs, lists and tables — which is then handed to htmlToGfm
// so it inherits the same table-cell sanitisation and image stripping as the
// .docx path. Inline bold/italic is intentionally not preserved.
function blockToHtml(el: Element): string {
  switch (el.localName) {
    case "h": {
      const lvl = Math.min(6, Math.max(1, parseInt(el.getAttribute("text:outline-level") ?? "1", 10) || 1));
      return `<h${lvl}>${esc(textOf(el))}</h${lvl}>`;
    }
    case "p":
      return `<p>${esc(textOf(el))}</p>`;
    case "list": {
      const items = Array.from(el.childNodes)
        .filter((n): n is Element => n.nodeType === 1 && (n as Element).localName === "list-item")
        .map((li) => `<li>${esc(textOf(li))}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    case "table":
      return tableToHtml(el);
    default:
      return "";
  }
}

export async function odtToMarkdown(input: ArrayBuffer): Promise<string> {
  const files = unzipSync(new Uint8Array(input));
  const content = files["content.xml"];
  if (!content) throw new Error("odt: content.xml not found");

  const xml = strFromU8(content);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("odt: content.xml is not well-formed XML");
  }

  const body = Array.from(doc.getElementsByTagName("*")).find((el) => el.localName === "text");
  if (!body) throw new Error("odt: no <office:text> body");

  // Only top-level blocks (a list/table's own paragraphs are handled by their
  // container, not emitted twice).
  const html = Array.from(body.childNodes)
    .filter((n): n is Element => n.nodeType === 1)
    .map(blockToHtml)
    .join("");

  return htmlToGfm(html);
}
