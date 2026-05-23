import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@shared/utils/format';
import { toast } from '@shared/store/toastStore';

interface Props {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'bash', className }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true);
        toast.success('Copied to clipboard');
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error('Copy failed'),
    );
  };

  return (
    <div
      className={cn(
        'relative group min-w-0 max-w-full bg-[#070707] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background:
            'radial-gradient(600px circle at var(--x, 50%) var(--y, 0%), rgba(191,255,0,0.06), transparent 40%)',
        }}
      />
      <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.04)] bg-[#0A0A0A] relative">
        <span className="text-[10px] font-mono text-[#666] uppercase tracking-wider">{language}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] text-[#666] hover:text-[#F5F5F5] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#22C55E]" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="max-w-full px-3 py-3 overflow-x-auto text-[11px] font-mono text-[#A3A3A3] whitespace-pre-wrap break-words leading-relaxed">
        <code className={`language-${language} break-words`}>{code}</code>
      </pre>
    </div>
  );
}
