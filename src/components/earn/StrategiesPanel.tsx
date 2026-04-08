import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, type StrategyDto, type StrategyTrigger, type StrategyFireDto } from '../../api/client';
import { Toggle } from '../common/Toggle';
import { toast } from '../../store/toastStore';
import { cn } from '../../utils/format';

const TRIGGER_OPTIONS: { value: StrategyTrigger; label: string; needsTarget: boolean; needsThreshold: boolean; targetHint: string; thresholdHint: string }[] = [
  { value: 'price_below', label: 'Price drops below', needsTarget: true, needsThreshold: true, targetHint: 'OKB', thresholdHint: '20.0' },
  { value: 'price_above', label: 'Price rises above', needsTarget: true, needsThreshold: true, targetHint: 'OKB', thresholdHint: '100.0' },
  { value: 'change24h_below', label: '24h change below', needsTarget: true, needsThreshold: true, targetHint: 'OKB', thresholdHint: '-10' },
  { value: 'change24h_above', label: '24h change above', needsTarget: true, needsThreshold: true, targetHint: 'OKB', thresholdHint: '10' },
  { value: 'volume_spike', label: 'Volume spike (× avg)', needsTarget: true, needsThreshold: true, targetHint: 'OKB', thresholdHint: '2' },
  { value: 'apr_above', label: 'Pool APR rises above', needsTarget: true, needsThreshold: true, targetHint: 'OKB/USDT', thresholdHint: '5' },
  { value: 'apr_below', label: 'Pool APR drops below', needsTarget: true, needsThreshold: true, targetHint: 'OKB/USDT', thresholdHint: '0.5' },
  { value: 'new_token', label: 'New token detected', needsTarget: false, needsThreshold: false, targetHint: '', thresholdHint: '' },
];

/**
 * Active alerts + automation panel inspired by DeFi Saver's strategy
 * subscriptions. Reads from /api/strategies, lets the user create new ones,
 * toggle enable/disable, delete, and view recent fires.
 */
export function StrategiesPanel() {
  const [strategies, setStrategies] = useState<StrategyDto[]>([]);
  const [fires, setFires] = useState<StrategyFireDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // create form state
  const [kind, setKind] = useState<StrategyTrigger>('price_below');
  const [target, setTarget] = useState('OKB');
  const [threshold, setThreshold] = useState('20');
  const [label, setLabel] = useState('');

  const refresh = async () => {
    try {
      const [list, firesList] = await Promise.all([api.listStrategies(), api.strategyFires()]);
      setStrategies(list.strategies);
      setFires(firesList.fires);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const triggerSpec = TRIGGER_OPTIONS.find((t) => t.value === kind)!;

  const submit = async () => {
    setCreating(true);
    try {
      const body: Parameters<typeof api.createStrategy>[0] = {
        kind,
        action: 'notify',
        label: label || undefined,
      };
      if (triggerSpec.needsTarget) body.target = target;
      if (triggerSpec.needsThreshold) {
        const n = Number(threshold);
        if (!Number.isFinite(n)) {
          toast.error('Threshold must be a number');
          return;
        }
        body.threshold = n;
      }
      const res = await api.createStrategy(body);
      toast.success(`Alert created: ${res.strategy.description}`);
      setShowForm(false);
      setLabel('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'create failed');
    } finally {
      setCreating(false);
    }
  };

  const removeStrategy = async (id: string) => {
    try {
      await api.deleteStrategy(id);
      toast.info('Alert removed');
      await refresh();
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleStrategy = async (s: StrategyDto) => {
    try {
      await api.setStrategyEnabled(s.id, !s.enabled);
      await refresh();
    } catch {
      toast.error('Toggle failed');
    }
  };

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#BFFF00]" />
          <h3 className="text-sm font-bold text-[#F5F5F5]">Active alerts &amp; automations</h3>
          <span className="text-[10px] text-[#666] uppercase tracking-wider">
            {strategies.length} active
          </span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#BFFF00] hover:bg-[#D4FF33] text-[#0A0A0A] text-[11px] font-bold transition-colors"
        >
          <Plus className="w-3 h-3" /> {showForm ? 'Cancel' : 'Create alert'}
        </button>
      </div>

      {showForm && (
        <div className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 mb-4 flex flex-col gap-2">
          <div>
            <label className="text-[10px] text-[#666] uppercase tracking-wider">Trigger</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as StrategyTrigger)}
              className="w-full mt-1 h-8 px-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded text-xs text-[#F5F5F5] focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {triggerSpec.needsTarget && (
              <div>
                <label className="text-[10px] text-[#666] uppercase tracking-wider">Target</label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={triggerSpec.targetHint}
                  className="w-full mt-1 h-8 px-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
                />
              </div>
            )}
            {triggerSpec.needsThreshold && (
              <div>
                <label className="text-[10px] text-[#666] uppercase tracking-wider">Threshold</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder={triggerSpec.thresholdHint}
                  className="w-full mt-1 h-8 px-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded text-xs font-mono text-[#F5F5F5] tabular focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] text-[#666] uppercase tracking-wider">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My OKB dip alert"
              className="w-full mt-1 h-8 px-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded text-xs text-[#F5F5F5] focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
            />
          </div>

          <button
            onClick={submit}
            disabled={creating}
            className="h-9 mt-1 rounded-lg bg-[#BFFF00] hover:bg-[#D4FF33] text-[#0A0A0A] text-xs font-bold disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Save alert'}
          </button>
        </div>
      )}

      {loading && strategies.length === 0 && (
        <div className="text-[11px] text-[#666] py-4 text-center">Loading...</div>
      )}

      {!loading && strategies.length === 0 && !showForm && (
        <div className="text-[11px] text-[#666] py-6 text-center">
          No alerts yet. Click <span className="text-[#BFFF00] font-bold">Create alert</span> to set
          up trigger-based notifications.
        </div>
      )}

      {strategies.length > 0 && (
        <div className="flex flex-col gap-2">
          {strategies.map((s) => (
            <div
              key={s.id}
              className={cn(
                'flex items-center justify-between gap-3 p-3 rounded-lg border text-xs',
                s.enabled
                  ? 'bg-[#1A1A1A] border-[rgba(255,255,255,0.04)]'
                  : 'bg-transparent border-[rgba(255,255,255,0.04)] opacity-50',
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {s.firedCount > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-[#BFFF00] shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-[#F5F5F5] font-semibold truncate">
                    {s.label ?? s.description}
                  </div>
                  {s.label && s.label !== s.description && (
                    <div className="text-[10px] text-[#666] truncate">{s.description}</div>
                  )}
                  <div className="text-[10px] text-[#666] tabular">
                    {s.firedCount > 0
                      ? `fired ${s.firedCount}× · last ${new Date(s.lastFiredAt).toLocaleTimeString()}`
                      : 'armed · waiting'}
                  </div>
                </div>
              </div>
              <Toggle checked={s.enabled} onChange={() => toggleStrategy(s)} size="sm" ariaLabel="Enabled" />
              <button
                onClick={() => removeStrategy(s.id)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#666] hover:text-[#EF4444] hover:bg-[rgba(255,255,255,0.06)]"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {fires.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#BFFF00]" />
            <span className="text-[10px] text-[#666] uppercase tracking-wider">Recent fires</span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto scrollbar-hide">
            {fires.slice(0, 5).map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-[10px] text-[#A3A3A3]"
              >
                <span className="truncate">{f.reason}</span>
                <span className="tabular text-[#666] shrink-0">
                  {new Date(f.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
