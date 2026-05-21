import { Check, Copy, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '../../utils/format';
import { toast } from '../../store/toastStore';

export function CopyableHash({
  value,
  label,
  className,
}: {
  value: string | null | undefined;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = value || 'n/a';

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label ?? 'Value'} copied`);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!value}
      title={value ? `Copy ${label ?? 'hash'}` : 'No value'}
      className={cn(
        'group inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0D0D0D] px-2.5 py-2 text-left',
        'text-[11px] font-mono text-[#D1D5DB] transition-colors hover:border-[rgba(191,255,0,0.18)] hover:text-[#F5F5F5]',
        'disabled:cursor-default disabled:opacity-70',
        className,
      )}
    >
      <span className="truncate">{text}</span>
      {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-[#BFFF00]" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />}
    </button>
  );
}

export function ScanLink({
  href,
  children = 'Open scan',
  className,
}: {
  href: string | null | undefined;
  children?: ReactNode;
  className?: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[rgba(56,189,248,0.22)] bg-[rgba(56,189,248,0.08)] px-2.5 py-1.5 text-[11px] font-bold text-[#7DD3FC] transition-colors hover:border-[rgba(56,189,248,0.45)] hover:text-[#E0F2FE]',
        className,
      )}
    >
      <span className="truncate">{children}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
    </a>
  );
}
