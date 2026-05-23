import { cn } from '@shared/utils/format';

export function SegmentedTabs<T extends string>({
  value,
  items,
  onChange,
  className,
}: {
  value: T;
  items: { id: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-1', className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'min-h-8 rounded-lg px-3 text-xs font-bold transition-all duration-200',
              active ? 'bg-[#BFFF00] text-[#080808]' : 'text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F5F5]',
              item.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
