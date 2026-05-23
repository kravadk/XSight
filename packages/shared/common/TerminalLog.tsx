import { cn } from '@shared/utils/format';

export interface LogLine {
  ts?: number;
  prefix?: string;
  text: string;
  level?: 'info' | 'success' | 'error' | 'warn' | 'cmd';
}

interface Props {
  lines: LogLine[];
  className?: string;
  maxHeight?: number | string;
  /** When true, body is rendered as raw `<pre>` (preserves whitespace) */
  raw?: boolean;
  rawContent?: string;
}

const LEVEL_COLORS: Record<NonNullable<LogLine['level']>, string> = {
  info: 'text-[#A3A3A3]',
  success: 'text-[#22C55E]',
  error: 'text-[#EF4444]',
  warn: 'text-[#F59E0B]',
  cmd: 'text-[#BFFF00]',
};

function fmtTs(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export function TerminalLog({ lines, className, maxHeight = 240, raw, rawContent }: Props) {
  return (
    <div
      className={cn(
        'bg-[#070707] border border-[rgba(255,255,255,0.06)] rounded-xl font-mono text-[11px] overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[rgba(255,255,255,0.04)] bg-[#0A0A0A]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/60" />
        <span className="ml-2 text-[10px] text-[#666] uppercase tracking-wider">XSight Terminal</span>
      </div>
      <div
        className="px-3 py-2 overflow-auto leading-relaxed"
        style={{ maxHeight }}
      >
        {raw ? (
          <pre className="whitespace-pre-wrap text-[#A3A3A3]">{rawContent}</pre>
        ) : lines.length === 0 ? (
          <div className="text-[#444] italic">// no output yet</div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-2">
              {line.ts && <span className="text-[#444] shrink-0">[{fmtTs(line.ts)}]</span>}
              {line.prefix && <span className="text-[#666] shrink-0">{line.prefix}</span>}
              <span className={cn('break-all', LEVEL_COLORS[line.level ?? 'info'])}>{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
