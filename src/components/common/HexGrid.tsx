import { cn } from '../../utils/format';

interface Props {
  className?: string;
  /** Pattern stroke color */
  color?: string;
  /** Opacity 0..1 */
  opacity?: number;
}

/**
 * Subtle SVG hex-grid background. Use as absolutely-positioned overlay
 * inside hero sections / empty states. Pattern is repeated by SVG, no JS.
 */
export function HexGrid({ className, color = '#BFFF00', opacity = 0.05 }: Props) {
  return (
    <svg
      aria-hidden
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      style={{ opacity }}
    >
      <defs>
        <pattern id="hex-grid" width="36" height="32" patternUnits="userSpaceOnUse">
          <polygon
            points="18,2 33,11 33,29 18,38 3,29 3,11"
            fill="none"
            stroke={color}
            strokeWidth="0.6"
          />
        </pattern>
        <radialGradient id="hex-fade">
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="80%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id="hex-mask">
          <rect width="100%" height="100%" fill="url(#hex-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-grid)" mask="url(#hex-mask)" />
    </svg>
  );
}
