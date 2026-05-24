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
    label: 'XStriker',
    subtitle: 'Football markets',
    icon: Trophy,
    accent: '#E7B84F',
    accentBg: 'rgba(231,184,79,0.10)',
    accentBorder: 'rgba(231,184,79,0.32)',
  },
  {
    id: 'hook',
    label: 'XTariff',
    subtitle: 'V4 identity-gated fee',
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
    <div
      className="relative overflow-hidden rounded-2xl border border-stadium-line p-2.5"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 100%), #0E140C',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      {/* atmospheric haze behind the group */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(60% 60% at 0% 0%, rgba(52,193,114,0.10) 0%, transparent 70%),' +
            'radial-gradient(60% 60% at 100% 50%, rgba(231,184,79,0.08) 0%, transparent 70%),' +
            'radial-gradient(60% 60% at 0% 100%, rgba(74,168,224,0.10) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col gap-2">
      {PRODUCTS.map((p) => {
        const active = product === p.id;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            onClick={() => setProduct(p.id)}
            className={cn(
              'group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left transition-all duration-200',
              !active && 'hover:scale-[1.01]',
            )}
            style={
              active
                ? {
                    background: `linear-gradient(135deg, ${p.accent}28 0%, ${p.accent}0A 100%)`,
                    borderColor: p.accent,
                    boxShadow: `inset 4px 0 0 ${p.accent}, 0 0 24px ${p.accent}38, 0 4px 12px rgba(0,0,0,0.3)`,
                  }
                : {
                    background: `linear-gradient(180deg, ${p.accent}0F 0%, rgba(255,255,255,0.01) 100%)`,
                    borderColor: `${p.accent}38`,
                  }
            }
          >
            {/* Subtle glow layer on active */}
            {active && (
              <div
                className="absolute -right-4 -top-4 h-16 w-16 rounded-full pointer-events-none blur-2xl"
                style={{ background: `${p.accent}44` }}
              />
            )}

            <div
              className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all"
              style={{
                background: active ? `${p.accent}33` : `${p.accent}1A`,
                border: `1px solid ${active ? p.accent : `${p.accent}40`}`,
                boxShadow: active ? `0 0 16px ${p.accent}66` : `0 0 8px ${p.accent}22`,
              }}
            >
              <Icon
                style={{ color: p.accent, width: 20, height: 20, filter: active ? `drop-shadow(0 0 4px ${p.accent}aa)` : 'none' }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="font-display text-[17px] leading-tight tracking-tight"
                style={{ fontWeight: 800, color: active ? p.accent : '#EFF4EC' }}
              >
                {p.label}
              </div>
              <div
                className="text-[11px] leading-tight mt-1 font-semibold"
                style={{ color: active ? `${p.accent}cc` : '#9DA89C' }}
              >
                {p.subtitle}
              </div>
            </div>

            {active ? (
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{
                  background: p.accent,
                  boxShadow: `0 0 12px ${p.accent}, 0 0 4px ${p.accent}`,
                  animation: 'pulse-dot 1.6s ease-in-out infinite',
                }}
              />
            ) : (
              <span
                className="h-1.5 w-1.5 rounded-full flex-shrink-0 opacity-40"
                style={{ background: p.accent }}
              />
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}
