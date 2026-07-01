// Generates the hostile-formatting .docx fixture corpus used by
// src/core/corpus.test.ts. All content is fictional (see docs/DPIA-draft.md —
// roomcast must never be exercised against real patient data).
//
// Run: node scripts/gen-fixtures.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  ImageRun,
  ExternalHyperlink,
  WidthType,
} from "docx";

const outDir = "samples/edge";
mkdirSync(outDir, { recursive: true });

// A 1x1 transparent PNG, used for the "embedded image" fixture. Kept tiny —
// the point of the fixture is to prove image *data* never reaches the
// markdown payload, not to test image fidelity.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function p(text) {
  return new Paragraph({ children: [new TextRun(text)] });
}

function cell(text, opts = {}) {
  const { columnSpan, rowSpan, children } = opts;
  return new TableCell({
    columnSpan,
    rowSpan,
    children: children ?? [p(String(text))],
  });
}

function headerRow(cells) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((c) => (c instanceof TableCell ? c : cell(c))),
  });
}

function dataRow(cells) {
  return new TableRow({
    children: cells.map((c) => (c instanceof TableCell ? c : cell(c))),
  });
}

async function write(name, children) {
  const doc = new Document({
    sections: [{ children }],
  });
  const buf = await Packer.toBuffer(doc);
  writeFileSync(join(outDir, name), buf);
  console.log(`wrote ${name}`);
}

// 1. Merged cells (colspan) -> ragged rows once flattened to GFM. `docx` has
// no way to express a *true* rowspan that mammoth will read back out as a
// clean grid (mammoth reports rowSpan but does not duplicate the covered
// cells), so this fixture uses columnSpan, which reliably produces the same
// "row has fewer cells than the header" artefact that a rowspan/colspan mix
// causes in real hostile handovers.
async function mergedCells() {
  await write("merged-cells.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow(["Bed", "Patient", "Job"]),
        dataRow([cell("1"), cell("AB - bloods due, review bloods", { columnSpan: 2 })]),
        dataRow(["2", "CD", "Scan"]),
      ],
    }),
  ]);
}

// 2. Two-row header (category row + field row), both flagged tblHeader.
async function twoRowHeader() {
  await write("two-row-header.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow([cell("Patient details", { columnSpan: 2 }), cell("Job")]),
        headerRow(["Bed", "Patient", "Job"]),
        dataRow(["1", "AB", "Bloods"]),
        dataRow(["2", "CD", "Scan"]),
      ],
    }),
  ]);
}

// 3. Data-only table, no row flagged as a header.
async function noHeader() {
  await write("no-header.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        dataRow(["1", "AB", "Bloods"]),
        dataRow(["2", "CD", "Scan"]),
      ],
    }),
  ]);
}

// 4. Table nested inside a cell. `docx` supports this directly (a TableCell
// may contain a Table), but it is unusual — real authoring tools (Word) can
// produce it via copy/paste, and it stresses the parser/mobiliser the same
// way.
async function nestedTable() {
  const inner = new Table({
    rows: [headerRow(["Drug", "Dose"]), dataRow(["Paracetamol", "1g"])],
  });
  await write("nested-table.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow(["Bed", "Patient", "Meds"]),
        dataRow([cell("1"), cell("AB"), cell(null, { children: [p("see table"), inner] })]),
      ],
    }),
  ]);
}

// 5. Empty cells and a fully empty row.
async function emptyCells() {
  await write("empty-cells.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow(["Bed", "Patient", "Job"]),
        dataRow(["1", "", "Bloods"]),
        dataRow(["", "", ""]),
        dataRow(["3", "EF", ""]),
      ],
    }),
  ]);
}

// 6. Very wide table (12+ columns).
async function wideTable() {
  const n = 14;
  const headers = Array.from({ length: n }, (_, i) => `Col${i + 1}`);
  const row = Array.from({ length: n }, (_, i) => `v${i + 1}`);
  await write("wide-table.docx", [
    new Paragraph({ text: "Wide table", heading: HeadingLevel.HEADING_1 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow(headers), dataRow(row), dataRow(row)],
    }),
  ]);
}

// 7. Very tall table (200+ rows) — payload-size stress fixture.
async function tallTable() {
  const rows = [headerRow(["Bed", "Patient", "Job"])];
  for (let i = 1; i <= 220; i++) {
    rows.push(dataRow([String(i), `Patient${i}`, "Review"]));
  }
  await write("tall-table.docx", [
    new Paragraph({ text: "Tall table", heading: HeadingLevel.HEADING_1 }),
    new Table({ rows }),
  ]);
}

// 8. Cell containing a bulleted list and a line break.
async function listAndLinebreak() {
  const listCell = cell(null, {
    children: [
      new Paragraph({ children: [new TextRun("Jobs:"), new TextRun({ text: "urgent", break: 1 })] }),
      new Paragraph({ text: "bloods", bullet: { level: 0 } }),
      new Paragraph({ text: "obs", bullet: { level: 0 } }),
    ],
  });
  await write("list-and-linebreak.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [headerRow(["Bed", "Patient", "Job"]), dataRow([cell("1"), cell("AB"), listCell])],
    }),
  ]);
}

// 9. Cell text containing a literal pipe.
async function literalPipe() {
  await write("literal-pipe.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow(["Bed", "Patient", "Job"]),
        dataRow(["1", "AB", "Bloods | urgent | fasting"]),
      ],
    }),
  ]);
}

// 10. Embedded (inline) image.
async function embeddedImage() {
  const imageCell = cell(null, {
    children: [
      new Paragraph({
        children: [new ImageRun({ type: "png", data: PNG_1PX, transformation: { width: 20, height: 20 } })],
      }),
    ],
  });
  await write("embedded-image.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [headerRow(["Bed", "Patient", "Scan"]), dataRow([cell("1"), cell("AB"), imageCell])],
    }),
  ]);
}

// 11. Non-Latin + emoji content (Welsh, Arabic, emoji).
async function nonLatinEmoji() {
  await write("non-latin-emoji.docx", [
    new Paragraph({ text: "Adroddiad trosglwyddo 🩺", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow(["Gwely", "Claf", "Nodyn"]),
        dataRow(["1", "Llywelyn ap Gruffudd", "adolygu bore 🩺"]),
        dataRow(["2", "مريض (Marid)", "فحص الدم"]),
      ],
    }),
  ]);
}

// 12. Hyperlinks and bold/italic runs inside cells.
async function linksBoldItalic() {
  const linkCell = cell(null, {
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "See ", bold: true }),
          new ExternalHyperlink({
            link: "https://example.invalid/protocol",
            children: [new TextRun({ text: "protocol", italics: true, style: "Hyperlink" })],
          }),
        ],
      }),
    ],
  });
  await write("links-bold-italic.docx", [
    new Paragraph({ text: "Ward 5 handover", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow(["Bed", "Patient", "Job"]),
        dataRow([cell("1"), cell(null, { children: [p("AB")] }), linkCell]),
      ],
    }),
  ]);
}

// 13. Multiple separate tables under different headings.
async function multipleTables() {
  await write("multiple-tables.docx", [
    new Paragraph({ text: "Bay A", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [headerRow(["Bed", "Patient"]), dataRow(["1", "AB"])],
    }),
    new Paragraph({ text: "Bay B", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [headerRow(["Bed", "Patient"]), dataRow(["1", "CD"])],
    }),
  ]);
}

// 14. Empty document.
async function emptyDoc() {
  await write("empty-doc.docx", [new Paragraph({ text: "" })]);
}

// 15. Kitchen sink — combines several hostile patterns in one file.
async function kitchenSink() {
  const listCell = cell(null, {
    children: [
      new Paragraph({ children: [new TextRun("Jobs:"), new TextRun({ text: "urgent", break: 1 })] }),
      new Paragraph({ text: "bloods", bullet: { level: 0 } }),
    ],
  });
  await write("kitchen-sink.docx", [
    new Paragraph({ text: "Ward 5 handover 🩺", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        headerRow(["Bed", "Patient", "Job"]),
        dataRow([cell("1"), cell("AB | urgent"), listCell]),
        dataRow([cell("2"), cell("CD - review, bloods", { columnSpan: 2 })]),
        dataRow(["", "", ""]),
      ],
    }),
    new Paragraph({ text: "Bay B", heading: HeadingLevel.HEADING_1 }),
    new Table({
      rows: [
        dataRow(["3", "EF", "Discharge"]),
      ],
    }),
    new Paragraph({
      children: [new ImageRun({ type: "png", data: PNG_1PX, transformation: { width: 20, height: 20 } })],
    }),
  ]);
}

// Rejection fixtures — deliberately NOT given a .docx extension, so the
// corpus test's readdirSync(...).filter(f => f.endsWith(".docx")) loop never
// feeds them through the full "must succeed" pipeline. They exist so
// docParser's rejection path (Step 9 of the task brief) has real inputs.
function rejectionFixtures() {
  // A very small stand-in for the legacy binary .doc format (OLE2 compound
  // file signature) — not a real Word document, just enough to exercise the
  // "this is not a .docx zip" rejection path.
  const oleSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  writeFileSync(join(outDir, "legacy-format.doc"), Buffer.concat([oleSignature, Buffer.alloc(32)]));
  writeFileSync(join(outDir, "not-a-word-file.txt"), "This is a plain text file, not a Word document.\n");
  console.log("wrote legacy-format.doc, not-a-word-file.txt");
}

await mergedCells();
await twoRowHeader();
await noHeader();
await nestedTable();
await emptyCells();
await wideTable();
await tallTable();
await listAndLinebreak();
await literalPipe();
await embeddedImage();
await nonLatinEmoji();
await linksBoldItalic();
await multipleTables();
await emptyDoc();
await kitchenSink();
rejectionFixtures();
