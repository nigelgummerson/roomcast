import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import mammoth from "mammoth";
import { sanitiseCell, stripImages } from "./sanitise";

// Mirrors turndown-plugin-gfm's own `cell()` helper (which prefixes the
// first cell in a row with "| " and every other cell with " ", then suffixes
// " |") so table structure is unaffected — only the cell content is
// sanitised (newlines collapsed, stray "|" escaped) before being wrapped.
function cellPrefix(node: HTMLElement): string {
  const siblings = node.parentNode ? Array.prototype.indexOf.call(node.parentNode.childNodes, node) : 0;
  return siblings === 0 ? "| " : " ";
}

function makeTurndown(): TurndownService {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  td.use(gfm);
  // Override turndown-plugin-gfm's table-cell rule (added last, so it wins)
  // to sanitise cell content: collapse internal newlines to spaces and
  // escape stray "|" so hostile cell content can never corrupt the GFM
  // table's column structure.
  td.addRule("sanitisedTableCell", {
    filter: ["th", "td"],
    replacement: (content, node) => `${cellPrefix(node)}${sanitiseCell(content)} |`,
  });
  return td;
}

export function htmlToGfm(html: string): string {
  return makeTurndown().turndown(stripImages(html)).trim() + "\n";
}

export async function docxToMarkdown(input: ArrayBuffer): Promise<string> {
  // mammoth resolves to a different internal unzip module depending on the
  // bundler target: its Node build only recognises the `buffer` input key,
  // while its browser build (used by the deployed PWA, via mammoth's
  // package.json "browser" field remap) only recognises `arrayBuffer`.
  // Supplying both makes docxToMarkdown behave identically under Vitest
  // (Node) and in the browser, rather than only being exercised via mocks.
  const mammothInput = { arrayBuffer: input, buffer: Buffer.from(input) } as unknown as Parameters<
    typeof mammoth.convertToHtml
  >[0];
  const { value: html } = await mammoth.convertToHtml(
    mammothInput,
    // Never embed image data (data: URIs) in the HTML mammoth produces —
    // the resulting empty <img> is then stripped to a placeholder below.
    { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: "" })) },
  );
  return htmlToGfm(html);
}
