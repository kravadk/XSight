import { useCipherScramble } from '@shared/hooks/useCipherScramble';
import { cn } from '@shared/utils/format';

interface Props {
  text: string;
  duration?: number;
  delay?: number;
  className?: string;
  /** Font feature mono is recommended for stable layout while scrambling */
  mono?: boolean;
}

export function CipherScramble({ text, duration = 600, delay = 0, className, mono }: Props) {
  const { value, isScrambling } = useCipherScramble(text, duration, delay);
  return (
    <span
      className={cn(
        'tabular',
        mono && 'font-mono',
        isScrambling && 'text-[#BFFF00]',
        className,
      )}
    >
      {value}
    </span>
  );
}
