interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}

export const Skeleton = ({
  width = '100%',
  height = 16,
  radius = 8,
  className = '',
}: SkeletonProps) => (
  <div
    className={`shimmer ${className}`}
    style={{ width, height, borderRadius: radius }}
  />
);
