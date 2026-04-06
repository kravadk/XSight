import { useCountUp } from '../../hooks/useCountUp';

interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  digits?: number;
  duration?: number;
}

export const CountUp = ({
  value,
  prefix = '',
  suffix = '',
  digits = 2,
  duration = 1200,
}: CountUpProps) => {
  const v = useCountUp(value, duration);
  return (
    <span>
      {prefix}
      {v.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}
      {suffix}
    </span>
  );
};
