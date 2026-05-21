import { cn } from '../../utils/format';

export function LoadingBlock({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101010] p-4', className)}>
      <div className="mb-4 flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton h-3 w-2/5 rounded" />
          <div className="skeleton h-2.5 w-3/5 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="skeleton h-10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
