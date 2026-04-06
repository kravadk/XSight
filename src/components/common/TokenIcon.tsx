import { TOKENS } from '../../utils/mockData';

interface TokenIconProps {
  symbol: string;
  size?: number;
}

export const TokenIcon = ({ symbol, size = 32 }: TokenIconProps) => {
  const t = TOKENS[symbol];
  const color = t?.color ?? '#9CA3AF';
  const letter = t?.icon ?? symbol[0];
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.45,
      }}
    >
      {letter}
    </div>
  );
};
