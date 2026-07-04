import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { odtToMarkdown } from "./odtParser";

// Build a minimal .odt (a zip whose content.xml holds ODF XML) in memory.
function makeOdt(contentXml: string, opts: { omitContent?: boolean } = {}): ArrayBuffer {
  const files: Record<string, Uint8Array> = {
    mimetype: strToU8("application/vnd.oasis.opendocument.text"),
  };
  if (!opts.omitContent) files["content.xml"] = strToU8(contentXml);
  const zipped = zipSync(files);
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}

const NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"';

function doc(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS}><office:body><office:text>${body}</office:text></office:body></office:document-content>`;
}

describe("odtToMarkdown", () => {
  it("converts a heading to a markdown ATX heading at the right level", async () => {
    const md = await odtToMarkdown(makeOdt(doc('<text:h text:outline-level="2">Ward A</text:h>')));
    expect(md).toContain("## Ward A");
  });

  it("defaults a heading with no outline-level to level 1", async () => {
    const md = await odtToMarkdown(makeOdt(doc("<text:h>Handover</text:h>")));
    expect(md).toMatch(/^#\s+Handover/m);
  });

  it("converts paragraphs to text blocks", async () => {
    const md = await odtToMarkdown(makeOdt(doc("<text:p>Shift summary here.</text:p>")));
    expect(md).toContain("Shift summary here.");
  });

  it("converts a list to markdown bullets", async () => {
    const md = await odtToMarkdown(
      makeOdt(
        doc(
          "<text:list><text:list-item><text:p>First</text:p></text:list-item>" +
            "<text:list-item><text:p>Second</text:p></text:list-item></text:list>",
        ),
      ),
    );
    expect(md).toMatch(/[-*]\s+First/);
    expect(md).toMatch(/[-*]\s+Second/);
  });

  it("converts a table to a GFM pipe table with the first row as header", async () => {
    const md = await odtToMarkdown(
      makeOdt(
        doc(
          "<table:table>" +
            "<table:table-row><table:table-cell><text:p>Bed</text:p></table:table-cell>" +
            "<table:table-cell><text:p>Patient</text:p></table:table-cell></table:table-row>" +
            "<table:table-row><table:table-cell><text:p>1</text:p></table:table-cell>" +
            "<table:table-cell><text:p>Ada L</text:p></table:table-cell></table:table-row>" +
            "</table:table>",
        ),
      ),
    );
    expect(md).toContain("| Bed | Patient |");
    expect(md).toMatch(/\|\s*---/); // header separator row
    expect(md).toContain("| 1 | Ada L |");
  });

  it("sanitises stray pipes in table cells so column structure survives", async () => {
    const md = await odtToMarkdown(
      makeOdt(
        doc(
          "<table:table><table:table-row>" +
            "<table:table-cell><text:p>a | b</text:p></table:table-cell>" +
            "<table:table-cell><text:p>c</text:p></table:table-cell>" +
            "</table:table-row></table:table>",
        ),
      ),
    );
    expect(md).toContain("a \\| b");
  });

  it("throws when content.xml is missing", async () => {
    await expect(odtToMarkdown(makeOdt("", { omitContent: true }))).rejects.toThrow();
  });

  it("throws when the input is not a valid zip", async () => {
    await expect(odtToMarkdown(new Uint8Array([1, 2, 3, 4]).buffer)).rejects.toThrow();
  });
});
