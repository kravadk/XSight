import { Anchor, ExternalLink, Github } from 'lucide-react';

const HACKATHON_URL = 'https://web3.okx.com/xlayer/build-x-hackathon/hook';
const HOOK_REPO_URL = 'https://github.com/kravadk/XHook';

/**
 * Hook hackathon landing — Uniswap V4 Hook submission for OKX «Build with Hook»
 * (22-28 May 2026, 14,000 USDT prize pool). UI deepens as the V4 contract lands.
 */
export function HookPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="stadium-card flex items-center gap-4 p-5">
        <Anchor className="h-8 w-8 text-pitch" />
        <div className="min-w-0 flex-1">
          <div className="text-micro text-stadium-text-muted">Uniswap V4 · OKX Hackathon</div>
          <div className="font-display text-2xl text-stadium-text">Hook</div>
          <div className="mt-1 text-xs text-stadium-text-secondary">
            Submission for the «Build with Hook» track — 22-28 May 2026, 14,000 USDT prize pool.
          </div>
        </div>
      </div>

      <div className="stadium-card p-5">
        <div className="mb-3 text-micro text-pitch">Status</div>
        <div className="text-sm font-semibold text-stadium-text">In progress</div>
        <div className="mt-1 text-xs text-stadium-text-secondary">
          V4 hook contract + dashboard land here. Watch the repo for commits.
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={HOOK_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-pitch px-4 py-2.5 text-sm font-bold text-stadium-base hover:bg-pitch-bright glow-pitch"
        >
          <Github className="h-4 w-4" /> GitHub repo
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
        <a
          href={HACKATHON_URL}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stadium-line bg-[rgba(255,255,255,0.04)] px-4 py-2.5 text-sm font-bold text-stadium-text hover:bg-[rgba(255,255,255,0.08)]"
        >
          Hackathon page
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>
    </div>
  );
}
