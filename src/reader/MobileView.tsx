import { useMemo, useState, type ReactNode } from "react";
import { marked } from "marked";
import { mobilise, type Block } from "../core/mobiliser";

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
        <div key={i} className="rounded-lg border p-3 shadow-sm">
          {headers.map((h, j) => (
            <div key={j} className="flex gap-2 text-sm">
              <span className="font-semibold text-gray-600">{h}</span>
              <span>{row[j] ?? ""}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderBlock(b: Block, q: string, key: number): ReactNode {
  if (b.kind === "cards") {
    const rows = filterRows(b.rows, q);
    if (rows.length === 0) return null;
    return <Cards key={key} headers={b.headers} rows={rows} />;
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
        <button className="mb-3 underline" onClick={() => setOriginal(false)}>
          Mobile view
        </button>
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
        <input
          type="search"
          role="searchbox"
          placeholder="Search…"
          className="flex-1 rounded border px-2 py-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="underline" onClick={() => setOriginal(true)}>
          Original layout
        </button>
      </div>

      {vm.index.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-sm">
          {indexItems.map((it) => (
            <a key={it.id} href={`#${it.id}`} className="text-blue-600 underline">
              {it.title}
            </a>
          ))}
        </nav>
      )}

      {sectionRenders.map(({ section: s, rendered, visible }) => {
        if (q && !visible) return null;
        return (
          <section key={s.id} id={s.id} className="space-y-3">
            {s.title && <h2 className="text-lg font-bold">{s.title}</h2>}
            {rendered}
          </section>
        );
      })}
    </div>
  );
}
