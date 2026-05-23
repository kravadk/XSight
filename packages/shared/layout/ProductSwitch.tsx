import { Zap, Trophy, Anchor } from 'lucide-react';
import { useUiStore, type Product } from '@shared/store/uiStore';
import { cn } from '@shared/utils/format';

const PRODUCTS: { id: Product; label: string; icon: typeof Zap }[] = [
  { id: 'xsight', label: 'XSight', icon: Zap },
  { id: 'xcup', label: 'X Cup', icon: Trophy },
  { id: 'hook', label: 'Hook', icon: Anchor },
];

/** Segmented switch between the three product surfaces — XSight copilot, X Cup market, Hook hackathon. */
export function ProductSwitch() {
  const product = useUiStore((s) => s.product);
  const setProduct = useUiStore((s) => s.setProduct);

  return (
    <div className="flex gap-1 rounded-xl border border-stadium-line bg-stadium-base p-1">
      {PRODUCTS.map((p) => {
        const active = product === p.id;
        return (
          <button
            key={p.id}
            onClick={() => setProduct(p.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors',
              active
                ? 'bg-pitch text-stadium-base shadow-[0_2px_10px_rgba(52,193,114,0.3)]'
                : 'text-stadium-text-secondary hover:text-stadium-text',
            )}
          >
            <p.icon className="h-3.5 w-3.5" />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
