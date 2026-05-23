import { cn } from '@shared/utils/format';

interface Props {
  className?: string;
  width?: number | string;
  height?: number | string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ className, width, height, rounded = 'md' }: Props) {
  const radii = { sm: 'rounded', md: 'rounded-md', lg: 'rounded-xl', full: 'rounded-full' };
  return (
    <div
      className={cn('skeleton', radii[rounded], className)}
      style={{ width, height }}
      aria-hidden
    />
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton width={28} height={28} rounded="full" />
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" height={14} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 flex flex-col gap-4">
      <Skeleton width={80} height={10} />
      <Skeleton width={140} height={32} />
      <Skeleton width="100%" height={6} rounded="full" />
    </div>
  );
}
