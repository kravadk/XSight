import { useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Magnetic strength factor (0..0.6 reasonable) */
  strength?: number;
}

/**
 * A button that subtly translates toward the cursor when hovered, creating
 * a "magnetic" pull effect. Pure CSS transform with spring transition.
 */
export function MagneticButton({
  children,
  strength = 0.25,
  className,
  style,
  onMouseMove,
  onMouseLeave,
  ...rest
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    setPos({ x: dx * strength, y: dy * strength });
    onMouseMove?.(e);
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setPos({ x: 0, y: 0 });
    onMouseLeave?.(e);
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        ...style,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}
