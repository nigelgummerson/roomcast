import { useMemo, useState, type ReactNode } from "react";
import { marked } from "marked";
import { mobilise, type Block } from "../core/mobiliser";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { IconSearch, IconBack } from "../ui/icons";

// Row-level filtering: a CardBlock's rows are filtered individually so a
// section/table containing several patients can match on one and hide the
// rest (rather than showing every row in a block just because one matches).
function filterRows(rows: string[][], q: string): string[][] {
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(needle)));
}

function textMatches(md: string, q: string): boolean {
  return !q || md.toLowerCase().includes(q.toLowerCase());
}

function Cards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="grid gap-3">
      {rows.map((row, i) => (
        <Card key={i} className="space-y-1">
          {headers.map((h, j) => (
            <div key={j} className="flex gap-2 text-sm">
              <span className="font-semibold text-slate-600">{h}</span>
              <span>{row[j] ?? ""}</span>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

// Fallback rendering for a TableBlock (ragged rows or no plausible header) —
// shown as an actual scrollable table rather than mis-mapped into labelled
// cards, so a merged-cell artefact can never silently misattribute a value
// to the wrong field.
function TableFallback({ headers, rows, reason }: { headers: string[]; rows: string[][]; reason: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-500">
        Shown as original layout — irregular table ({reason})
      </p>
      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="border-b border-black/10 px-2 py-1 text-left font-semibold text-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-slate-50">
                {row.map((c, j) => (
                  <td key={j} className="border-b border-black/5 px-2 py-1">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function tableBlockText(headers: string[], rows: string[][]): string {
  return [headers.join(" "), ...rows.map((r) => r.join(" "))].join(" ");
}

function renderBlock(b: Block, q: string, key: number): ReactNode {
  if (b.kind === "cards") {
    const rows = filterRows(b.rows, q);
    if (rows.length === 0) return null;
    return <Cards key={key} headers={b.headers} rows={rows} />;
  }
  if (b.kind === "table") {
    if (!textMatches(tableBlockText(b.headers, b.rows), q)) return null;
    return <TableFallback key={key} headers={b.headers} rows={b.rows} reason={b.reason} />;
  }
  if (!textMatches(b.md, q)) return null;
  return (
    <div
      key={key}
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: marked.parse(b.md, { async: false }) }}
    />
  );
}

export function MobileView({ md }: { md: string }) {
  const vm = useMemo(() => mobilise(md), [md]);
  const [q, setQ] = useState("");
  const [original, setOriginal] = useState(false);

  if (original) {
    return (
      <div>
        <Button variant="ghost" className="mb-3" onClick={() => setOriginal(false)}>
          <IconBack size={16} /> Mobile view
        </Button>
        <div
          className="prose max-w-none overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: marked.parse(md, { async: false }) }}
        />
      </div>
    );
  }

  // Render each section's blocks once, and derive which sections still have
  // visible content for the active query. The jump-to index reuses this same
  // visibility result so it never links to a section that has been filtered
  // out of the DOM.
  const sectionRenders = vm.sections.map((s) => {
    const rendered = s.blocks.map((b, i) => renderBlock(b, q, i));
    const visible = !q || rendered.some((el) => el !== null);
    return { section: s, rendered, visible };
  });
  const visibleIds = new Set(
    sectionRenders.filter((r) => r.visible).map((r) => r.section.id),
  );
  const indexItems = q ? vm.index.filter((it) => visibleIds.has(it.id)) : vm.index;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            role="searchbox"
            placeholder="Search…"
            className="w-full rounded-lg border border-black/10 bg-white py-2 pl-8 pr-2 text-sm shadow-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button variant="ghost" onClick={() => setOriginal(true)}>
          Original layout
        </Button>
      </div>

      {vm.index.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-sm">
          {indexItems.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              className="rounded-full border border-[var(--rc-accent)] px-3 py-1 text-xs font-medium text-[var(--rc-accent)] hover:bg-[var(--rc-accent)]/10"
            >
              {it.title}
            </a>
          ))}
        </nav>
      )}

      {sectionRenders.map(({ section: s, rendered, visible }) => {
        if (q && !visible) return null;
        return (
          <section key={s.id} id={s.id} className="space-y-3">
            {s.title && <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>}
            {rendered}
          </section>
        );
      })}
    </div>
  );
}
