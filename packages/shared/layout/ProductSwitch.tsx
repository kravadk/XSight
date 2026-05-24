import { Zap, Trophy, Anchor } from 'lucide-react';
import { useUiStore, type Product } from '@shared/store/uiStore';
import { cn } from '@shared/utils/format';

interface ProductDef {
  id: Product;
  label: string;
  subtitle: string;
  icon: typeof Zap;
  accent: string;        // hex color for the active accent + glow
  accentBg: string;      // rgba bg-tint
  accentBorder: string;  // rgba border tint
}

const PRODUCTS: ProductDef[] = [
  {
    id: 'xsight',
    label: 'XSight',
    subtitle: 'AI trading copilot',
    icon: Zap,
    accent: '#34C172',
    accentBg: 'rgba(52,193,114,0.10)',
    accentBorder: 'rgba(52,193,114,0.32)',
  },
  {
    id: 'xcup',
    label: 'X Cup',
    subtitle: 'Football markets',
    icon: Trophy,
    accent: '#E7B84F',
    accentBg: 'rgba(231,184,79,0.10)',
    accentBorder: 'rgba(231,184,79,0.32)',
  },
  {
    id: 'hook',
    label: 'Hook',
    subtitle: 'V4 swap-fee hook',
    icon: Anchor,
    accent: '#4AA8E0',
    accentBg: 'rgba(74,168,224,0.10)',
    accentBorder: 'rgba(74,168,224,0.32)',
  },
];

/** Vertical stack switching between the three product surfaces. */
export function ProductSwitch() {
  const product = useUiStore((s) => s.product);
  const setProduct = useUiStore((s) => s.setProduct);

  return (
    <div className="flex flex-col gap-1.5">
      {PRODUCTS.map((p) => {
        const active = product === p.id;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            onClick={() => setProduct(p.id)}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
              active ? 'border-transparent' : 'border-stadium-line bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]',
            )}
            style={
              active
                ? {
                    background: p.accentBg,
                    borderColor: p.accentBorder,
                    boxShadow: `inset 3px 0 0 ${p.accent}, 0 0 18px ${p.accent}22`,
                  }
                : undefined
            }
          >
            <div
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                active ? '' : 'bg-[rgba(255,255,255,0.04)]',
              )}
              style={active ? { background: `${p.accent}22`, boxShadow: `0 0 12px ${p.accent}44` } : undefined}
            >
              <Icon className="h-4 w-4" style={{ color: active ? p.accent : '#9DA89C' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="font-display text-[13px] leading-tight"
                style={{ fontWeight: 700, color: active ? p.accent : '#EFF4EC' }}
              >
                {p.label}
              </div>
              <div className="text-[10px] text-stadium-text-muted leading-tight mt-0.5 truncate">
                {p.subtitle}
              </div>
            </div>
            {active && (
              <span
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ background: p.accent, boxShadow: `0 0 8px ${p.accent}` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
