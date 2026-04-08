import { Fragment } from 'react';

interface Props {
  text: string;
  className?: string;
}

/**
 * Lightweight markdown-ish renderer used by AI text cards.
 *
 * Supports:
 *   - Paragraphs (double newline)
 *   - Bullet list items starting with "- "
 *   - **bold** inline emphasis
 *   - `inline code`
 *
 * Zero dependencies. Designed to look clean in the dark Tailwind theme.
 */
export function RichText({ text, className }: Props) {
  if (!text) return null;
  const blocks = text.split(/\n\n+/);

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const trimmed = block.trimEnd();
        const lines = trimmed.split('\n');
        const isList = lines.length > 1 && lines.every((l) => /^\s*-\s+/.test(l));

        if (isList) {
          return (
            <ul key={i} className="list-none pl-0 mb-3 space-y-1.5 last:mb-0">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2 text-[#A3A3A3] leading-relaxed">
                  <span className="text-[#BFFF00] shrink-0 mt-1">•</span>
                  <span className="flex-1">{renderInline(line.replace(/^\s*-\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="text-[#F5F5F5] leading-relaxed mb-3 last:mb-0 whitespace-pre-wrap">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Inline parser: splits on **bold** and `code` and returns a JSX array.
 * Tolerant of unbalanced markers — leftover ** or ` are rendered as text.
 */
function renderInline(text: string): React.ReactNode {
  // Split on capturing groups so the markers come back as alternating chunks
  const parts = text.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="text-[#F5F5F5] font-bold tabular">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#BFFF00] font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
