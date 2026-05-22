import { useCountUp } from '../../hooks/useCountUp';
import { cn } from '../../utils/format';

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  /** Disable animation (e.g. when value is 0 or unknown) */
  static?: boolean;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className,
  static: isStatic,
}: Props) {
  const animated = useCountUp(value);
  const display = isStatic ? value : animated;
  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className={cn('tabular', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
