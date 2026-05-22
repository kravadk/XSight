import { Fragment, type ReactNode } from 'react';
import { useUiStore, type Tab } from '../../store/uiStore';
import { CodeBlock } from '../common/CodeBlock';

interface Props {
  /** Markdown-lite article body. */
  body: string;
}

/**
 * Docs-grade markdown renderer for the in-app documentation hub.
 *
 * Supports headings (`##`/`###`), paragraphs, `-` and `1.` lists, fenced code
 * blocks (rendered through `CodeBlock` — monospace, ideal for ASCII diagrams),
 * `|` tables, `>` callouts, and inline `**bold**`, `` `code` `` and links.
 * A `[label](tab:markets)` link switches the app tab instead of navigating out.
 *
 * Deliberately separate from `RichText` (which AI cards depend on) so the docs
 * can render richer content without risking that component.
 */
export function DocsMarkdown({ body }: Props) {
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const blocks = parseBlocks(body);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => renderBlock(b, i, setActiveTab))}
    </div>
  );
}

/* ---- block model ---- */

type Block =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'callout'; text: string };

function isBlockStart(line: string): boolean {
  return (
    line.trimStart().startsWith('```') ||
    /^#{2,3}\s+/.test(line) ||
    /^\s*-\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    line.trimStart().startsWith('> ')
  );
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    // fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'text';
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ kind: 'code', lang, code: code.join('\n') });
      continue;
    }

    // heading
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: 'heading', level: h[1].length as 2 | 3, text: h[2] });
      i++;
      continue;
    }

    // table — a `|` header row followed by a `|---|` separator
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      lines[i + 1].includes('-') &&
      /^[\s:|-]+$/.test(lines[i + 1].trim())
    ) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    // callout / blockquote
    if (line.trimStart().startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'callout', text: buf.join(' ') });
      continue;
    }

    // unordered list
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // paragraph — gather until a blank line or the next block start
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      buf.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: 'para', text: buf.join(' ') });
  }

  return blocks;
}

/* ---- inline ---- */

function renderInline(text: string, setActiveTab: (t: Tab) => void): ReactNode {
  const parts = text.split(/(\*\*[^*]+?\*\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-stadium-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="rounded bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 font-mono text-[12px] text-pitch"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith('tab:')) {
        const tab = href.slice(4) as Tab;
        return (
          <button
            key={i}
            onClick={() => setActiveTab(tab)}
            className="font-semibold text-pitch hover:underline"
          >
            {label}
          </button>
        );
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-pitch hover:underline"
        >
          {label}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/* ---- block rendering ---- */

function renderBlock(b: Block, key: number, setActiveTab: (t: Tab) => void): ReactNode {
  switch (b.kind) {
    case 'heading':
      return b.level === 2 ? (
        <h2 key={key} className="mt-4 text-lg font-bold text-stadium-text first:mt-0">
          {renderInline(b.text, setActiveTab)}
        </h2>
      ) : (
        <h3
          key={key}
          className="mt-3 text-micro uppercase tracking-wider text-pitch first:mt-0"
        >
          {renderInline(b.text, setActiveTab)}
        </h3>
      );

    case 'para':
      return (
        <p key={key} className="text-sm leading-relaxed text-stadium-text-secondary">
          {renderInline(b.text, setActiveTab)}
        </p>
      );

    case 'code':
      return <CodeBlock key={key} code={b.code} language={b.lang} />;

    case 'ul':
      return (
        <ul key={key} className="flex flex-col gap-1.5">
          {b.items.map((it, j) => (
            <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-stadium-text-secondary">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-pitch" />
              <span className="flex-1">{renderInline(it, setActiveTab)}</span>
            </li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol key={key} className="flex flex-col gap-1.5">
          {b.items.map((it, j) => (
            <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-stadium-text-secondary">
              <span className="font-mono text-xs font-bold text-pitch">{j + 1}.</span>
              <span className="flex-1">{renderInline(it, setActiveTab)}</span>
            </li>
          ))}
        </ol>
      );

    case 'table':
      return (
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-stadium-line-strong">
                {b.headers.map((hd, j) => (
                  <th
                    key={j}
                    className="px-3 py-2 text-left text-micro uppercase tracking-wider text-stadium-text-muted"
                  >
                    {renderInline(hd, setActiveTab)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r} className="border-b border-stadium-line last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 align-top text-stadium-text-secondary">
                      {renderInline(cell, setActiveTab)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'callout':
      return (
        <div
          key={key}
          className="rounded-xl border border-pitch-border bg-pitch-bg p-3.5 text-sm leading-relaxed text-stadium-text-secondary"
        >
          {renderInline(b.text, setActiveTab)}
        </div>
      );
  }
}
