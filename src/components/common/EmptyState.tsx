import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, secondary, className }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className ?? ''}`}>
      <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4 text-[#A3A3A3]">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[#F5F5F5] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#A3A3A3] max-w-sm leading-relaxed mb-5">{description}</p>
      )}
      {(action || secondary) && (
        <div className="flex gap-2">
          {action && (
            <button
              onClick={action.onClick}
              className="h-10 px-4 rounded-xl bg-[#BFFF00] text-[#0A0A0A] text-xs font-bold hover:bg-[#D4FF33] transition-colors"
            >
              {action.label}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary.onClick}
              className="h-10 px-4 rounded-xl bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold transition-colors"
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
