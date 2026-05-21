import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  Cable,
  Bot,
  Braces,
  BrainCircuit,
  ChevronDown,
  CheckCircle2,
  Coins,
  ExternalLink,
  Fingerprint,
  Flag,
  Layers3,
  LockKeyhole,
  RadioTower,
  RefreshCw,
  Scale,
  ShieldCheck,
  TimerReset,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api, ApiError, type CupAdapterOverviewDto, type CupAiEdgeDto, type CupActionPlanDto, type CupFairOddsDto, type CupFantasyQuestDto, type CupMatchDto, type CupOnchainMatchDto, type CupOracleContractDto, type CupOutcome, type CupPersistenceHealthDto, type CupPlayerStatsDto, type CupReadinessDto, type CupSentimentDto, type CupSettlementCheckDto, type CupSettlementLogEntryDto, type CupTeamStrengthDto, type CupTrackProofDto, type FanPassSbtEligibilityDto, type FanPassSbtMintDto, type FanScoreDto } from '../api/client';
import { CodeBlock } from '../components/common/CodeBlock';
import { ActionButton } from '../components/common/ActionButton';
import { AppCard, AppCardHeader } from '../components/common/AppCard';
import { CopyableHash, ScanLink } from '../components/common/CopyableHash';
import { InlineAlert } from '../components/common/InlineAlert';
import { LoadingBlock } from '../components/common/LoadingBlock';
import { StateBlock } from '../components/common/StateBlock';
import { StatusPill } from '../components/common/StatusPill';
import { TeamLogo } from '../components/cup/TeamLogo';
import { X402PayAndCall } from '../components/api/X402PayAndCall';
import { cn } from '../utils/format';
import { toast } from '../store/toastStore';

const SAMPLE_WALLET = '0x0E437c109A4C1e15172c4dA557E77724D7243F71';

type View = 'hub' | 'fanpass' | 'agent';

interface Props {
  view: View;
}

const VIEW_COPY: Record<View, {
  eyebrow: string;
  headline: string;
  body: string;
  accent: 'lime' | 'blue' | 'amber';
}> = {
  hub: {
    eyebrow: 'Matches',
    headline: 'Pick a match and know what is safe to do',
    body: 'Check whether a match is ready for rewards, quests, predictions, or AI guidance. Technical proof stays available when you need it.',
    accent: 'lime',
  },
  fanpass: {
    eyebrow: 'My FanPass',
    headline: 'Check rewards and claim your fan badge',
    body: 'Score your wallet, see which rewards are open, and mint a non-transferable FanPass badge when your activity qualifies.',
    accent: 'blue',
  },
  agent: {
    eyebrow: 'AI Pick',
    headline: 'Ask the assistant what to do next',
    body: 'Choose a match and get a clear WAIT, SKIP, or prepare-for-approval recommendation. Nothing executes without your confirmation.',
    accent: 'amber',
  },
};

export function CupPage({ view }: Props) {
  const [matches, setMatches] = useState<CupMatchDto[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [edge, setEdge] = useState<CupAiEdgeDto | null>(null);
  const [fairOdds, setFairOdds] = useState<CupFairOddsDto | null>(null);
  const [settlementCheck, setSettlementCheck] = useState<CupSettlementCheckDto | null>(null);
  const [sentiment, setSentiment] = useState<CupSentimentDto | null>(null);
  const [strength, setStrength] = useState<CupTeamStrengthDto | null>(null);
  const [playerStats, setPlayerStats] = useState<CupPlayerStatsDto | null>(null);
  const [fanScore, setFanScore] = useState<FanScoreDto | null>(null);
  const [plan, setPlan] = useState<CupActionPlanDto | null>(null);
  const [contract, setContract] = useState<CupOracleContractDto | null>(null);
  const [readiness, setReadiness] = useState<CupReadinessDto | null>(null);
  const [adapters, setAdapters] = useState<CupAdapterOverviewDto | null>(null);
  const [persistence, setPersistence] = useState<CupPersistenceHealthDto | null>(null);
  const [onchain, setOnchain] = useState<CupOnchainMatchDto | null>(null);
  const [settlementLog, setSettlementLog] = useState<CupSettlementLogEntryDto[]>([]);
  const [trackProof, setTrackProof] = useState<CupTrackProofDto | null>(null);
  const [fantasyQuest, setFantasyQuest] = useState<CupFantasyQuestDto | null>(null);
  const [sbtEligibility, setSbtEligibility] = useState<FanPassSbtEligibilityDto | null>(null);
  const [fanWallet, setFanWallet] = useState(SAMPLE_WALLET);
  const [fanWalletError, setFanWalletError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailNonce, setDetailNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => matches.find((m) => m.id === selectedId) ?? matches[0] ?? null,
    [matches, selectedId],
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [overview, ready, adapterStatus, persistenceStatus, proofStatus] = await Promise.all([
          api.cupOverview(),
          api.cupReadiness(),
          api.cupAdapters(),
          api.cupPersistence(),
          api.cupTrackProof(),
        ]);
        if (!alive) return;
        setMatches(overview.matches);
        setContract(overview.contract);
        setReadiness(ready);
        setAdapters(adapterStatus);
        setPersistence(persistenceStatus);
        setTrackProof(proofStatus);
        const next = overview.matches.find((m) => m.id === selectedId)?.id ?? overview.matches[0]?.id ?? '';
        setSelectedId(next);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof ApiError && err.detail ? err.detail : 'CupHub unavailable');
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    async function loadDetail() {
      const matchId = selected.id;
      try {
        const [nextEdge, nextFairOdds, nextSettlementCheck, nextScore, nextSbt, nextPlan, nextSentiment, nextStrength, nextPlayerStats, nextQuest] = await Promise.all([
          api.cupAiEdge(matchId),
          api.cupFairOdds(matchId),
          api.cupSettlementCheck(matchId),
          api.cupFanScore(fanWallet),
          api.cupFanPassSbtEligibility(fanWallet),
          api.cupActionPlan(matchId, view === 'agent' ? 'agent' : view === 'fanpass' ? 'fan' : 'builder'),
          api.cupSentiment(matchId),
          api.cupTeamStrength(matchId),
          api.cupPlayerStats(matchId),
          api.cupFantasyQuest(matchId, fanWallet),
        ]);
        const [nextOnchain, nextLog] = await Promise.all([
          api.cupOnchainMatch(matchId),
          api.cupSettlementLog(matchId),
        ]);
        if (!alive) return;
        setEdge(nextEdge);
        setFairOdds(nextFairOdds);
        setSettlementCheck(nextSettlementCheck);
        setFanScore(nextScore);
        setSbtEligibility(nextSbt);
        setPlan(nextPlan);
        setSentiment(nextSentiment);
        setStrength(nextStrength);
        setPlayerStats(nextPlayerStats);
        setFantasyQuest(nextQuest);
        setOnchain(nextOnchain);
        setSettlementLog(nextLog.events);
      } catch (err) {
        if (!alive) return;
        toast.error(err instanceof ApiError && err.detail ? err.detail : 'CupHub detail failed');
      }
    }
    void loadDetail();
    return () => { alive = false; };
  }, [selected, view, fanWallet, detailNonce]);

  useEffect(() => {
    if (readiness?.agenticWalletAddress) setFanWallet(readiness.agenticWalletAddress);
  }, [readiness?.agenticWalletAddress]);

  function updateFanWallet(nextWallet: string) {
    const value = nextWallet.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      setFanWalletError('Invalid wallet address. Use a 0x address with 40 hex characters.');
      return;
    }
    setFanWalletError(null);
    setFanWallet(value);
  }

  const copy = VIEW_COPY[view];

  return (
    <div className="mx-auto w-full max-w-[1600px] pb-10 text-[#F5F5F5]">
      <section className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[#10120D] p-5 md:p-6 mb-5">
        <PitchLines />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] items-end gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  'h-9 w-9 rounded-lg text-[#0A0A0A] flex items-center justify-center',
                  copy.accent === 'lime' ? 'bg-[#BFFF00]' : copy.accent === 'blue' ? 'bg-[#38BDF8]' : 'bg-[#F59E0B]',
                )}
              >
                <RadioTower className="w-4 h-4" />
              </span>
              <span
                className={cn(
                  'text-micro',
                  copy.accent === 'lime' ? 'text-[#BFFF00]' : copy.accent === 'blue' ? 'text-[#38BDF8]' : 'text-[#F59E0B]',
                )}
              >
                {copy.eyebrow}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-[rgba(56,189,248,0.12)] text-[#38BDF8] font-bold">
                X Layer
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold leading-tight text-[#F5F5F5] max-w-2xl">
              {copy.headline}
            </h1>
            <p className="text-sm md:text-base text-[#D1D5DB] mt-3 max-w-2xl leading-relaxed">
              {copy.body}
            </p>
          </div>
          <div className="w-full space-y-3">
            <HeroMatchCard match={selected} loading={loading} />
          </div>
        </div>
      </section>

      {error && (
        <InlineAlert
          tone="error"
          title="CupHub request failed"
          body={`${error}. Check provider availability or backend logs; production mode will not show synthetic fixtures.`}
          className="mb-5"
        />
      )}

      {view === 'hub' && (
        <div className="space-y-5">
          <CupHubActionConsole
            selected={selected}
            loading={loading}
            settlementCheck={settlementCheck}
            onRefresh={() => setDetailNonce((n) => n + 1)}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SettlementStatusCard match={selected} settlementCheck={settlementCheck} onchain={onchain} />
            <FairOddsActionCard edge={edge} fairOdds={fairOdds} selected={selected} />
            <QuestPreviewCard quest={fantasyQuest} />
          </div>
          <CompactMatchSelector
            title="Pick a match"
            subtitle="Choose the match you want to check for rewards, quests, or AI guidance."
            loading={loading}
            matches={matches}
            selectedId={selected?.id ?? ''}
            onSelect={setSelectedId}
            tone="lime"
          />
          <AdvancedDisclosure title="For builders and judges" subtitle="Technical proof, source receipts, hashes, API calls, and track evidence. Hidden by default so it does not interrupt the user flow.">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5">
              <div className="space-y-5">
                <FixtureRegistry loading={loading} matches={matches} selectedId={selected?.id} onSelect={setSelectedId} />
                <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#151515] p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-[#BFFF00]" />
                    <h2 className="text-sm font-bold text-[#F5F5F5]">Settlement receipts</h2>
                  </div>
                  {selected ? (
                    <SettlementPanel
                      match={selected}
                      contract={contract}
                      onchain={onchain}
                      settlementCheck={settlementCheck}
                      settlementLog={settlementLog}
                      onActionDone={() => setDetailNonce((n) => n + 1)}
                    />
                  ) : <div className="h-40 skeleton rounded-xl" />}
                </section>
                <ReferenceMarketPanel selectedId={selectedId} settlementCheck={settlementCheck} />
              </div>
              <div className="grid grid-cols-1 gap-4 content-start 2xl:grid-cols-2">
                <EdgePanel edge={edge} match={selected} fairOdds={fairOdds} />
                <FantasyQuestPanel quest={fantasyQuest} />
                <SignalStack sentiment={sentiment} strength={strength} />
                <PlayerStatsPanel stats={playerStats} />
                <AdapterStatusPanel adapters={adapters} />
                <BuilderSurface selectedId={selectedId} />
                <CupArchitectureMap />
                <TrackProofCenter proof={trackProof} />
              </div>
            </div>
          </AdvancedDisclosure>
        </div>
      )}

      {view === 'fanpass' && (
        <FanPassView
          fanScore={fanScore}
          readiness={readiness}
          persistence={persistence}
          selected={selected}
          sbtEligibility={sbtEligibility}
          walletInput={fanWallet}
          walletError={fanWalletError}
          onWalletSubmit={updateFanWallet}
          onSbtMinted={() => setDetailNonce((n) => n + 1)}
        />
      )}

      {view === 'agent' && (
        <AgentBetView
          plan={plan}
          edge={edge}
          sentiment={sentiment}
          strength={strength}
          playerStats={playerStats}
          settlementCheck={settlementCheck}
          fanScore={fanScore}
          selected={selected}
          matches={matches}
          loading={loading}
          selectedId={selectedId}
          onSelect={setSelectedId}
          fairOdds={fairOdds}
          onRebuildPlan={() => setDetailNonce((n) => n + 1)}
        />
      )}
    </div>
  );
}

function FixtureRegistry({
  loading,
  matches,
  selectedId,
  onSelect,
}: {
  loading: boolean;
  matches: CupMatchDto[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const visibleMatches = useMemo(() => {
    if (loading) return [];
    return priorityMatches(matches, selectedId);
  }, [loading, matches, selectedId]);
  const hiddenCount = Math.max(0, matches.length - visibleMatches.length);

  return (
    <AppCard>
      <AppCardHeader
        icon={<RadioTower className="w-4 h-4 text-[#BFFF00]" />}
        title="Priority fixture registry"
        subtitle="Shortlist from real providers. Scheduled means the fixture exists; it is not a live match."
        action={<StatusPill tone="amber">{hiddenCount > 0 ? `${visibleMatches.length}/${matches.length} shown` : 'real sources'}</StatusPill>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleMatches.map((match) => (
          <MatchTile
            key={match.id}
            match={match}
            active={selectedId === match.id}
            onClick={() => onSelect(match.id)}
          />
        ))}
        {loading && Array.from({ length: 4 }).map((_, i) => <LoadingBlock key={i} rows={1} className="h-36" />)}
        {!loading && hiddenCount > 0 && (
          <InlineAlert
            className="md:col-span-2"
            tone="info"
            title={`${hiddenCount} extra provider fixtures hidden`}
            body="CupHub keeps the registry focused for the demo. The API still exposes the full provider feed for builders."
          />
        )}
        {!loading && matches.length === 0 && (
          <StateBlock
            kind="warning"
            className="md:col-span-2"
            title="No trusted fixtures yet"
        body="No provider returned fixtures. Production mode does not fill this with seeded matches; add free provider keys or wait for ESPN to return events."
            action={<ActionButton tone="amber" icon={<RefreshCw className="w-4 h-4" />} onClick={() => window.location.reload()}>Refresh feed</ActionButton>}
          />
        )}
      </div>
    </AppCard>
  );
}

function BuilderSurface({ selectedId }: { selectedId: string }) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#151515] p-3">
      <div className="flex items-center gap-2 mb-3">
        <Braces className="w-4 h-4 text-[#38BDF8]" />
        <h2 className="text-sm font-bold text-[#F5F5F5]">Builder surface</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {[
          '/api/v1/cup/fixtures',
          '/api/v1/cup/result/:matchId',
          '/api/v1/cup/ai-edge',
          '/api/v1/cup/fair-odds',
          '/api/v1/cup/settlement-check',
          '/api/v1/cup/fan-score',
          '/api/v1/cup/action-plan',
          'MCP: get_cup_fixtures',
          'MCP: resolve_match',
          'MCP: get_cup_ai_edge',
          'MCP: verify_outcome',
          'MCP: get_cup_settlement_state',
          'MCP: get_fan_score',
        ].map((item) => (
          <div key={item} className="rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] px-2.5 py-1.5">
            <div className="text-[10px] font-mono text-[#D1D5DB] truncate">{item}</div>
          </div>
        ))}
      </div>
      <CodeBlock
        language="bash"
        code={`curl "${window.location.origin}/api/v1/cup/ai-edge?matchId=${selectedId}" \\
  -H "X-PAYMENT: <real-x402-or-xlayer-payment-proof>"

curl "${window.location.origin}/api/v1/cup/settlement-check?matchId=${selectedId}" \\
  -H "X-PAYMENT: <real-x402-or-xlayer-payment-proof>"

curl "${window.location.origin}/mcp" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"verify_outcome","arguments":{"matchId":"${selectedId}"}}}'`}
      />
      <X402PayAndCall
        compact
        className="mt-3"
        fullPath={`/cup/ai-edge?matchId=${encodeURIComponent(selectedId)}`}
        title="Pay & call Cup AI edge"
        description="External apps and AI agents pay from their own wallet to unlock verified Cup intelligence JSON. This is infrastructure monetization, not a charge for browsing the UI."
      />
      <BuilderUseCases />
    </section>
  );
}

function priorityMatches(matches: CupMatchDto[], selectedId?: string, limit = 4) {
  const priority = matches
    .slice()
    .sort((a, b) => {
      const aRank = a.status === 'live' ? 0 : a.status === 'final' || a.status === 'settled' ? 2 : 1;
      const bRank = b.status === 'live' ? 0 : b.status === 'final' || b.status === 'settled' ? 2 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
    });
  const selected = selectedId ? priority.find((match) => match.id === selectedId) : null;
  const top = priority.filter((match) => match.id !== selectedId).slice(0, selected ? Math.max(0, limit - 1) : limit);
  return selected ? [selected, ...top] : top;
}

function humanMatchStatus(match: CupMatchDto | null): string {
  if (!match) return 'No match selected';
  if (match.settlement.state === 'finalized') return 'Finalized';
  if (match.status === 'final' || match.status === 'settled') return 'Waiting for trusted result';
  if (match.status === 'live') return 'In progress';
  return 'Upcoming';
}

function humanSourceStatus(status?: CupMatchDto['sourceStatus'] | 'settlement_challenged'): string {
  if (!status) return 'Checking';
  if (status === 'settlement_ready') return 'Ready for rewards';
  if (status === 'fixture_available') return 'Fixture available';
  if (status === 'source_quorum_unavailable') return 'Result not trusted yet';
  if (status === 'conflicting_sources') return 'Sources disagree';
  if (status === 'provider_rate_limited') return 'Provider busy';
  if (status === 'settlement_challenged') return 'Under challenge';
  if (status === 'live') return 'In progress';
  if (status === 'demo_dev_only') return 'Demo only';
  return String(status).replaceAll('_', ' ');
}

function humanSourceTone(status?: CupMatchDto['sourceStatus'] | 'settlement_challenged'): 'green' | 'blue' | 'amber' | 'red' | 'neutral' {
  if (status === 'settlement_ready') return 'green';
  if (status === 'live') return 'blue';
  if (status === 'fixture_available') return 'neutral';
  if (status === 'conflicting_sources' || status === 'settlement_challenged') return 'red';
  return 'amber';
}

function userSourceStatus(match: CupMatchDto | null): CupMatchDto['sourceStatus'] | 'settlement_challenged' | undefined {
  if (!match) return undefined;
  if (match.status === 'scheduled' && match.sourceStatus === 'live') return 'fixture_available';
  return match.sourceStatus;
}

function humanQuestState(state?: CupFantasyQuestDto['claimState']): string {
  if (state === 'basic_available') return 'Basic quest open';
  if (state === 'winner_available') return 'Winner reward open';
  if (state === 'winner_locked') return 'Winner reward locked';
  if (state === 'locked') return 'Rewards locked';
  return 'Checking rewards';
}

function fanLevelLabel(level?: FanScoreDto['level'] | string): string {
  if (level === 'oracle-grade') return 'Oracle contributor';
  if (level === 'trusted') return 'Trusted fan';
  if (level === 'active') return 'Basic fan';
  return 'New wallet';
}

function decisionLabel(decision?: CupActionPlanDto['riskDecision'] | string | null): string {
  if (decision === 'NO_TRADE') return 'SKIP';
  if (decision === 'WAIT') return 'WAIT';
  if (decision === 'HEDGE_PREP') return 'PREPARE';
  if (decision === 'APPROVAL_REQUIRED') return 'APPROVAL NEEDED';
  return 'CHECKING';
}

function userDecisionBody(plan: CupActionPlanDto | null, settlementCheck: CupSettlementCheckDto | null): string {
  if (!plan) return 'Ask the assistant to read the selected match, reward status, AI edge, and safety rules.';
  if (plan.riskDecision === 'NO_TRADE') return 'Skip this action for now. Risk or reward conditions are not good enough.';
  if (plan.riskDecision === 'WAIT') return settlementCheck?.reason ?? 'Wait until the match has a trusted final result.';
  if (plan.riskDecision === 'HEDGE_PREP') return 'Prepare the action, but do not send anything until approval and final checks pass.';
  if (plan.riskDecision === 'APPROVAL_REQUIRED') return 'The assistant found a possible action. You still need to approve before anything happens.';
  return plan.primaryAction;
}

function BuilderUseCases() {
  const cases = [
    {
      title: 'Prediction app',
      tag: 'settlement infra',
      body: 'Read fixtures, wait for CupOracleV2 finalization, then resolve payouts from a source-backed outcome.',
    },
    {
      title: 'Fantasy quest',
      tag: 'GameFi',
      body: 'Use fixtures, team strength, player-impact availability, and finalized outcomes to score quests without inventing stats.',
    },
    {
      title: 'NFT campaign',
      tag: 'NFT gating',
      body: 'Gate commemorative mints by FanPass score and finalized match state instead of open-ended wallet farming.',
    },
    {
      title: 'AI agent',
      tag: 'MCP',
      body: 'Call CupHub tools, produce WAIT/NO_TRADE/APPROVAL plans, and re-check the oracle before final actions.',
    },
  ];
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {cases.map((item) => (
        <div key={item.title} className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0D0D0D] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-extrabold text-[#F5F5F5]">{item.title}</div>
            <StatusPill tone={item.tag === 'GameFi' ? 'amber' : item.tag === 'NFT gating' ? 'blue' : 'neutral'}>{item.tag}</StatusPill>
          </div>
          <div className="text-[11px] leading-relaxed text-[#D1D5DB]">{item.body}</div>
        </div>
      ))}
    </div>
  );
}

function ActionIntro({
  icon,
  tone,
  title,
  body,
  status,
}: {
  icon: ReactNode;
  tone: 'lime' | 'blue' | 'amber';
  title: string;
  body: string;
  status: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border p-4 md:p-5',
        tone === 'lime' && 'border-[rgba(191,255,0,0.28)] bg-[#101409]',
        tone === 'blue' && 'border-[rgba(56,189,248,0.28)] bg-[#11151A]',
        tone === 'amber' && 'border-[rgba(245,158,11,0.28)] bg-[#18130D]',
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              tone === 'lime' && 'border-[rgba(191,255,0,0.24)] bg-[rgba(191,255,0,0.12)] text-[#BFFF00]',
              tone === 'blue' && 'border-[rgba(56,189,248,0.24)] bg-[rgba(56,189,248,0.12)] text-[#7DD3FC]',
              tone === 'amber' && 'border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.12)] text-[#FBBF24]',
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black leading-tight text-[#F5F5F5]">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#D1D5DB]">{body}</p>
          </div>
        </div>
        <StatusPill tone={tone === 'lime' ? 'lime' : tone} className="shrink-0">{status}</StatusPill>
      </div>
    </section>
  );
}

function AdvancedDisclosure({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#101010]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.025)]"
      >
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-[#F5F5F5]">{title}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-[#D1D5DB]">{subtitle}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill tone={open ? 'green' : 'neutral'}>{open ? 'shown' : 'hidden'}</StatusPill>
          <ChevronDown className={cn('h-4 w-4 text-[#D1D5DB] transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      {open && <div className="border-t border-[rgba(255,255,255,0.08)] p-4">{children}</div>}
    </section>
  );
}

function CupHubActionConsole({
  selected,
  loading,
  settlementCheck,
  onRefresh,
}: {
  selected: CupMatchDto | null;
  loading: boolean;
  settlementCheck: CupSettlementCheckDto | null;
  onRefresh: () => void;
}) {
  const status = 'No match selected';
  const readiness = settlementCheck?.canPropose
    ? 'Ready for rewards'
    : settlementCheck?.status === 'settlement_challenged'
      ? 'Under challenge'
      : selected?.settlement.state === 'finalized'
        ? 'Finalized'
        : 'Result not trusted yet';
  const displayStatus = selected ? `${humanMatchStatus(selected)} · ${humanSourceStatus(userSourceStatus(selected))}` : status;
  return (
    <section className="rounded-2xl border border-[rgba(191,255,0,0.26)] bg-[#101409] p-4 md:p-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusPill tone="lime">selected match</StatusPill>
            <StatusPill tone={humanSourceTone(userSourceStatus(selected))}>{displayStatus}</StatusPill>
            <StatusPill tone={readiness === 'Ready for rewards' || readiness === 'Finalized' ? 'green' : readiness === 'Under challenge' ? 'red' : 'amber'}>
              {readiness}
            </StatusPill>
          </div>
          {loading ? (
            <LoadingBlock rows={2} />
          ) : selected ? (
            <div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0B0D0B] p-4">
                <ActionTeam team={selected.home} />
                <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[#050505] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#9CA3AF]">vs</div>
                <ActionTeam team={selected.away} align="right" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <SettlementMetric label="kickoff" value={new Date(selected.kickoffUtc).toLocaleString()} />
                <SettlementMetric label="proof" value={selected.receipts.length > 0 ? `${selected.receipts.length} sources` : 'not ready'} />
                <SettlementMetric label="match" value={humanMatchStatus(selected)} />
                <SettlementMetric label="rewards" value={settlementCheck?.canFinalize || selected.settlement.state === 'finalized' ? 'can unlock' : 'locked'} />
              </div>
              <div className="mt-3 text-xs leading-relaxed text-[#D1D5DB]">
                {settlementCheck?.canPropose
                  ? 'This match has enough trusted result proof for reward or prediction flows to move forward.'
                  : settlementCheck?.reason ?? 'Pick a match and check whether rewards, quests, or predictions should wait.'}
              </div>
            </div>
          ) : (
            <StateBlock compact kind="warning" title="No fixture available" body="CupHub waits for real provider data instead of showing mock matches." />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton tone="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={onRefresh}>Check match status</ActionButton>
            <ActionButton tone="secondary" icon={<Trophy className="h-4 w-4" />} onClick={onRefresh}>View fan quest</ActionButton>
            <span className="text-xs text-[#D1D5DB]">Updates match safety, AI edge, and reward status.</span>
          </div>
        </div>
        <X402PayAndCall
          compact
          fullPath={`/cup/ai-edge?matchId=${encodeURIComponent(selected?.id ?? '')}`}
          title="Get AI edge"
          description="Optional paid check for AI probabilities and risk. You approve the wallet payment before anything is sent."
        />
      </div>
    </section>
  );
}

function ActionTeam({ team, align = 'left' }: { team: CupMatchDto['home']; align?: 'left' | 'right' }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', align === 'right' && 'flex-row-reverse text-right')}>
      <TeamLogo code={team.code} name={team.name} size="md" />
      <div className="min-w-0">
        <div className="text-2xl font-black leading-none text-[#F5F5F5]">{team.code}</div>
        <div className="mt-1 truncate text-xs text-[#D1D5DB]">{team.name}</div>
      </div>
    </div>
  );
}

function SettlementStatusCard({
  match,
  settlementCheck,
  onchain,
}: {
  match: CupMatchDto | null;
  settlementCheck: CupSettlementCheckDto | null;
  onchain: CupOnchainMatchDto | null;
}) {
  const state = settlementStateFromChain(onchain);
  const tone = settlementCheck?.canPropose || state === 'finalized' ? 'green' : settlementCheck?.status === 'settlement_challenged' ? 'red' : 'amber';
  return (
    <ActionSummaryCard
      icon={<ShieldCheck className="h-4 w-4" />}
      tone={tone}
      title="Can rewards unlock?"
      status={state === 'finalized' ? 'Finalized' : settlementCheck?.canPropose ? 'Ready' : humanSourceStatus(settlementCheck?.status)}
      body={settlementCheck?.canPropose ? 'Result proof is strong enough for apps to prepare rewards or payout logic.' : settlementCheck?.reason ?? match?.settlement.sourceQuorum.reason ?? 'Waiting for selected match.'}
      footer={settlementCheck?.canPropose ? 'Next step: prepare reward flow' : 'Next step: wait for trusted result proof'}
    />
  );
}

function FairOddsActionCard({
  edge,
  fairOdds,
  selected,
}: {
  edge: CupAiEdgeDto | null;
  fairOdds: CupFairOddsDto | null;
  selected: CupMatchDto | null;
}) {
  const oddsFooter = fairOdds && selected
    ? `${selected.home.code} ${fairOdds.decimalOdds.home.toFixed(2)} · Draw ${fairOdds.decimalOdds.draw.toFixed(2)} · ${selected.away.code} ${fairOdds.decimalOdds.away.toFixed(2)}`
    : 'No AI edge yet';
  return (
    <ActionSummaryCard
      icon={<Coins className="h-4 w-4" />}
      tone={edge?.risk === 'LOW' ? 'green' : edge?.risk === 'HIGH' ? 'red' : 'amber'}
      title="AI match read"
      status={edge ? decisionLabel(edge.edge) : 'Checking'}
      body={edge ? `Risk ${edge.risk.toLowerCase()}, confidence ${Math.round(edge.confidence * 100)}%. This is guidance, not a bookmaker quote.` : 'Waiting for AI edge.'}
      footer={oddsFooter}
    />
  );
}

function QuestPreviewCard({ quest }: { quest: CupFantasyQuestDto | null }) {
  return (
    <ActionSummaryCard
      icon={<Trophy className="h-4 w-4" />}
      tone={quest?.claimState === 'basic_available' || quest?.claimState === 'winner_available' ? 'green' : 'amber'}
      title="Fan quest"
      status={humanQuestState(quest?.claimState)}
      body={quest?.recommendedQuest ?? 'Select a match and wallet to preview a fantasy quest.'}
      footer={quest ? `FanPass: ${quest.fanPassGate.status.replaceAll('_', ' ')} · ${quest.playerStatsStatus === 'unavailable' ? 'player stats unavailable' : 'player stats ready'}` : 'Quest waits for match + FanPass'}
    />
  );
}

function ActionSummaryCard({
  icon,
  tone,
  title,
  status,
  body,
  footer,
}: {
  icon: ReactNode;
  tone: 'green' | 'blue' | 'amber' | 'red' | 'neutral' | 'lime';
  title: string;
  status: string;
  body: string;
  footer: string;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#151515] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-2 text-[#F5F5F5]">{icon}</div>
          <h3 className="truncate text-sm font-extrabold text-[#F5F5F5]">{title}</h3>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      <p className="min-h-12 text-xs leading-relaxed text-[#D1D5DB]">{body}</p>
      <div className="mt-3 truncate rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0B0B0B] px-3 py-2 text-[11px] font-mono text-[#D1D5DB]">{footer}</div>
    </section>
  );
}

function CompactMatchSelector({
  title,
  subtitle,
  loading,
  matches,
  selectedId,
  onSelect,
  tone,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  matches: CupMatchDto[];
  selectedId: string;
  onSelect: (id: string) => void;
  tone: 'lime' | 'amber';
}) {
  const visibleMatches = useMemo(() => loading ? [] : priorityMatches(matches, selectedId), [loading, matches, selectedId]);
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#151515] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-[#F5F5F5]">{title}</h3>
          <p className="mt-0.5 text-xs text-[#D1D5DB]">{subtitle}</p>
        </div>
        <StatusPill tone={tone}>{visibleMatches.length > 0 ? `${visibleMatches.length} shown` : 'checking'}</StatusPill>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        {visibleMatches.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelect(match.id)}
            className={cn(
              'rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
              selectedId === match.id
                ? tone === 'lime'
                  ? 'border-[rgba(191,255,0,0.5)] bg-[rgba(191,255,0,0.08)]'
                  : 'border-[rgba(245,158,11,0.5)] bg-[rgba(245,158,11,0.08)]'
                : 'border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] hover:border-[rgba(255,255,255,0.16)]',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <StatusPill tone={humanSourceTone(userSourceStatus(match))} className="max-w-full">{humanSourceStatus(userSourceStatus(match))}</StatusPill>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo code={match.home.code} name={match.home.name} size="sm" />
                <span className="truncate text-sm font-black text-[#F5F5F5]">{match.home.code}</span>
              </div>
              <span className="text-[10px] text-[#9CA3AF]">vs</span>
              <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
                <TeamLogo code={match.away.code} name={match.away.name} size="sm" />
                <span className="truncate text-sm font-black text-[#F5F5F5]">{match.away.code}</span>
              </div>
            </div>
            <div className="mt-2 truncate text-[10px] text-[#D1D5DB]">{humanMatchStatus(match)} · {new Date(match.kickoffUtc).toLocaleString()}</div>
          </button>
        ))}
        {loading && Array.from({ length: 4 }).map((_, index) => <LoadingBlock key={index} rows={1} className="h-[104px]" />)}
      </div>
    </section>
  );
}

function AgentDecisionConsole({
  plan,
  settlementCheck,
  selectedId,
  onRebuildPlan,
}: {
  plan: CupActionPlanDto | null;
  settlementCheck: CupSettlementCheckDto | null;
  selectedId: string;
  onRebuildPlan: () => void;
}) {
  const decision = plan?.riskDecision ?? 'loading';
  const blocked = plan?.executionBlockedReason ?? (settlementCheck?.status !== 'settlement_ready' ? settlementCheck?.reason : null);
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.3)] bg-[#18130D] p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#F59E0B]" />
            <h3 className="text-sm font-extrabold text-[#F5F5F5]">AI recommendation</h3>
          </div>
          <div className="text-4xl font-black text-[#F5F5F5]">{decisionLabel(decision)}</div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#D1D5DB]">
            {userDecisionBody(plan, settlementCheck)}
          </p>
        </div>
        <ActionButton className="shrink-0" tone="amber" icon={<RefreshCw className="h-4 w-4" />} onClick={onRebuildPlan}>
          Ask AI assistant
        </ActionButton>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <SettlementMetric label="match" value={selectedId || 'none'} />
        <SettlementMetric label="status" value={humanSourceStatus(settlementCheck?.status)} />
        <SettlementMetric label="approval" value={decision === 'APPROVAL_REQUIRED' ? 'needed' : 'not needed'} />
      </div>
      {blocked && (
        <InlineAlert className="mt-3" tone="warning" title="Action blocked" body={blocked} />
      )}
    </section>
  );
}

function AgentWhyCard({
  plan,
  edge,
  settlementCheck,
  fanScore,
}: {
  plan: CupActionPlanDto | null;
  edge: CupAiEdgeDto | null;
  settlementCheck: CupSettlementCheckDto | null;
  fanScore: FanScoreDto | null;
}) {
  const reasons = [
    settlementCheck?.canPropose ? 'Trusted result proof is ready.' : 'Result is not trusted yet, so final rewards should wait.',
    edge ? `AI says ${decisionLabel(edge.edge)} with ${edge.risk.toLowerCase()} risk.` : 'AI edge is still loading.',
    fanScore ? `${fanLevelLabel(fanScore.level)} score is ${fanScore.score}.` : 'FanPass score is still loading.',
  ];
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.18)] bg-[#151515] p-4">
      <h3 className="mb-3 text-sm font-extrabold text-[#F5F5F5]">Why this decision</h3>
      <div className="space-y-2">
        {reasons.map((reason) => (
          <div key={reason} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
            <span>{reason}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-[#0D0D0D] px-3 py-2 text-[11px] text-[#D1D5DB]">
        {plan?.executionBlockedReason ?? 'If action becomes executable, the UI still requires explicit approval.'}
      </div>
    </section>
  );
}

function AgentSafetySummary({
  selected,
  edge,
  settlementCheck,
  fanScore,
}: {
  selected: CupMatchDto | null;
  edge: CupAiEdgeDto | null;
  settlementCheck: CupSettlementCheckDto | null;
  fanScore: FanScoreDto | null;
}) {
  const safe = edge?.edge === 'NO_TRADE' || settlementCheck?.status !== 'settlement_ready' || (fanScore?.score ?? 0) < 35;
  return (
    <ActionSummaryCard
      icon={<LockKeyhole className="h-4 w-4" />}
      tone={safe ? 'amber' : 'blue'}
      title="Execution safety"
      status={safe ? 'approval locked' : 'approval required'}
      body="No automatic betting or swaps. If an action ever becomes available, you approve it before anything is sent."
      footer={selected ? `${selected.home.code}/${selected.away.code} · ${humanSourceStatus(settlementCheck?.status)}` : 'No selected match'}
    />
  );
}

function CupArchitectureMap() {
  const layers = [
    {
      title: 'Sports data',
      comparable: 'SportsDataIO / SportMonks',
      icon: <RadioTower className="h-4 w-4" />,
      body: 'ESPN, TheSportsDB, and football-data.org adapters normalize fixtures/results into source receipts.',
      tone: 'blue' as const,
    },
    {
      title: 'Outcome settlement',
      comparable: 'UMA / Polymarket resolution',
      icon: <Scale className="h-4 w-4" />,
      body: 'CupOracleV2 anchors rules, source, evidence, proposal, challenge window, and finality on X Layer.',
      tone: 'lime' as const,
    },
    {
      title: 'Builder distribution',
      comparable: 'x402 + MCP',
      icon: <Cable className="h-4 w-4" />,
      body: 'Paid endpoints and agent-readable tools let other apps consume CupHub instead of rebuilding the backend.',
      tone: 'amber' as const,
    },
    {
      title: 'Consumer proof',
      comparable: 'Sorare / Azuro-style infra use',
      icon: <Fingerprint className="h-4 w-4" />,
      body: 'FanPass, Fantasy Quest Builder, and AgentBet prove downstream apps can build on top safely.',
      tone: 'green' as const,
    },
  ];

  return (
    <section className="rounded-2xl border border-[rgba(56,189,248,0.16)] bg-[#101419] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Layers3 className="h-4 w-4 text-[#7DD3FC]" />
          <h2 className="text-sm font-extrabold leading-snug text-[#F5F5F5]">CupOS architecture</h2>
        </div>
        <StatusPill tone="blue">compact map</StatusPill>
      </div>
      <div className="relative grid grid-cols-1 gap-1.5">
        {layers.map((layer, index) => (
          <div key={layer.title} className="group relative rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0B0D10] px-2.5 py-2 transition-colors hover:border-[rgba(56,189,248,0.22)]">
            {index < layers.length - 1 && (
              <div className="absolute left-5 top-[calc(100%-2px)] h-2 w-px bg-[rgba(56,189,248,0.18)]" aria-hidden />
            )}
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                  layer.tone === 'lime' && 'border-[rgba(191,255,0,0.22)] bg-[rgba(191,255,0,0.10)] text-[#BFFF00]',
                  layer.tone === 'blue' && 'border-[rgba(56,189,248,0.22)] bg-[rgba(56,189,248,0.10)] text-[#7DD3FC]',
                  layer.tone === 'amber' && 'border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.10)] text-[#FBBF24]',
                  layer.tone === 'green' && 'border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.10)] text-[#4ADE80]',
                )}
              >
                {layer.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-extrabold text-[#F5F5F5]">{layer.title}</h3>
                  <StatusPill tone={layer.tone} className="max-w-full">{layer.comparable}</StatusPill>
                </div>
                <p className="mt-1 truncate text-[10px] text-[#D1D5DB]">{layer.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrackProofCenter({ proof }: { proof: CupTrackProofDto | null }) {
  return (
    <section className="rounded-2xl border border-[rgba(191,255,0,0.18)] bg-[#11140D] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-[#BFFF00]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Track Proof Center</h2>
        </div>
        <StatusPill tone="lime">{proof ? `${proof.tracks.length} tracks` : 'loading'}</StatusPill>
      </div>
      {!proof ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {proof.tracks.map((track) => (
            <div key={track.track} className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[11px] font-extrabold text-[#F5F5F5]">{track.track}</div>
                <StatusPill tone={track.status === 'ready' ? 'green' : track.status === 'strong' ? 'blue' : 'amber'}>{track.status}</StatusPill>
              </div>
              <div className="mt-1 truncate text-[10px] text-[#D1D5DB]">{track.judgeShouldSee}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {track.proofs.slice(0, 3).map((item) => (
                  <span key={`${track.track}-${item.label}`} className="rounded-md border border-[rgba(255,255,255,0.06)] bg-[#090909] px-1.5 py-1 text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                    {item.kind}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReferenceMarketPanel({
  selectedId,
  settlementCheck,
}: {
  selectedId: string;
  settlementCheck: CupSettlementCheckDto | null;
}) {
  const rules = [
    'Market opens only after CupHub fixture exists.',
    'Payout stays blocked until CupOracleV2 finalizes.',
    'Challenged or quorum-missing state pauses payout logic.',
  ];
  return (
    <section className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#11151A] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-[#38BDF8]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Reference market consumer</h2>
        </div>
        <StatusPill tone="blue">infra proof</StatusPill>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {rules.map((rule) => (
          <div key={rule} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3 text-[11px] leading-relaxed text-[#D1D5DB]">
            {rule}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <CodeBlock
          language="ts"
          code={`const settlement = await cup.getSettlementCheck("${selectedId}");
if (settlement.status !== "settlement_ready") return "PAUSE_PAYOUTS";
if (!settlement.finalOutcome) return "WAIT_FOR_FINALITY";`}
        />
      </div>
      <div className="mt-2 text-[11px] text-[#D1D5DB]">
        Current status: <span className="font-mono text-[#BFFF00]">{settlementCheck?.status ?? 'loading'}</span>
      </div>
    </section>
  );
}

function FantasyQuestPanel({ quest }: { quest: CupFantasyQuestDto | null }) {
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[#18130D] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Fantasy Quest Builder</h2>
        </div>
        <StatusPill tone="amber">GameFi proof</StatusPill>
      </div>
      {!quest ? (
        <StateBlock compact kind="warning" title="Quest unavailable" body="Fantasy quests require a selected fixture and valid FanPass wallet." />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[#9CA3AF]">Recommended quest</div>
            <div className="text-xs leading-relaxed text-[#F5F5F5]">{quest.recommendedQuest}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <SettlementMetric label="favorite" value={quest.teamStrengthSignal.favorite} />
            <SettlementMetric label="delta" value={quest.teamStrengthSignal.delta} />
            <SettlementMetric label="playerStats" value={quest.playerStatsStatus} />
            <SettlementMetric label="claimState" value={quest.claimState} />
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#F5F5F5]">FanPass gate</div>
              <GateStatus status={quest.fanPassGate.status} />
            </div>
            <div className="text-[11px] leading-relaxed text-[#D1D5DB]">{quest.fanPassGate.reason}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function FanPassView({
  fanScore,
  readiness,
  persistence,
  selected,
  sbtEligibility,
  walletInput,
  walletError,
  onWalletSubmit,
  onSbtMinted,
}: {
  fanScore: FanScoreDto | null;
  readiness: CupReadinessDto | null;
  persistence: CupPersistenceHealthDto | null;
  selected: CupMatchDto | null;
  sbtEligibility: FanPassSbtEligibilityDto | null;
  walletInput: string;
  walletError: string | null;
  onWalletSubmit: (wallet: string) => void;
  onSbtMinted: () => void;
}) {
  return (
    <div className="space-y-5">
      <ActionIntro
        icon={<Fingerprint className="w-5 h-5" />}
        tone="blue"
        title="Can this wallet get rewards or a badge?"
        body="Check the wallet, see which fan rewards are open, and mint a non-transferable FanPass badge when the wallet qualifies."
        status={fanLevelLabel(fanScore?.level)}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 items-start">
        <WalletIdentityPanel
          fanScore={fanScore}
          persistence={persistence}
          walletInput={walletInput}
          walletError={walletError}
          onWalletSubmit={onWalletSubmit}
        />
        <FanPassSbtPanel eligibility={sbtEligibility} onMinted={onSbtMinted} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RewardGatePanel fanScore={fanScore} readiness={readiness} selected={selected} />
        <FanNextStepsPanel fanScore={fanScore} selected={selected} persistence={persistence} />
      </div>
      <AdvancedDisclosure title="For builders and judges" subtitle="Full reputation breakdown, campaign logic, NFT gating details, and integration snippets.">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <FanPassPanel fanScore={fanScore} focused />
          <CampaignGateSimulator fanScore={fanScore} selected={selected} />
          <FanPassNftGatePanel fanScore={fanScore} selected={selected} />
          <IntegrationSurfacePanel
            title="FanPass integration"
            items={[
              'GET /api/v1/cup/fan-score?wallet=0x...',
              'MCP: get_fan_score',
              'Use score before reward claims, NFT mints, quest payouts, or agent delegation.',
            ]}
          />
        </div>
      </AdvancedDisclosure>
    </div>
  );
}

function AgentBetView({
  plan,
  edge,
  sentiment,
  strength,
  playerStats,
  settlementCheck,
  fanScore,
  fairOdds,
  selected,
  matches,
  loading,
  selectedId,
  onSelect,
  onRebuildPlan,
}: {
  plan: CupActionPlanDto | null;
  edge: CupAiEdgeDto | null;
  sentiment: CupSentimentDto | null;
  strength: CupTeamStrengthDto | null;
  playerStats: CupPlayerStatsDto | null;
  settlementCheck: CupSettlementCheckDto | null;
  fanScore: FanScoreDto | null;
  fairOdds: CupFairOddsDto | null;
  selected: CupMatchDto | null;
  matches: CupMatchDto[];
  loading: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onRebuildPlan: () => void;
}) {
  return (
    <div className="space-y-5">
      <ActionIntro
        icon={<Bot className="w-5 h-5" />}
        tone="amber"
        title="What should I do with this match?"
        body="Ask the assistant for a simple recommendation: wait, skip, prepare, or request approval before action."
        status={decisionLabel(plan?.riskDecision)}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5 items-start">
        <div className="space-y-4">
          <AgentDecisionConsole plan={plan} settlementCheck={settlementCheck} selectedId={selectedId} onRebuildPlan={onRebuildPlan} />
          <X402PayAndCall
            compact
            fullPath={`/cup/ai-edge?matchId=${encodeURIComponent(selectedId)}`}
            title="Get paid AI edge"
            description="Optional paid call for deeper probabilities and risk. You confirm the wallet transfer first."
          />
        </div>
        <CompactMatchSelector
          title="Choose a match"
          subtitle="Pick the fixture before asking the assistant."
          loading={loading}
          matches={matches}
          selectedId={selectedId}
          onSelect={onSelect}
          tone="amber"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AgentWhyCard plan={plan} edge={edge} settlementCheck={settlementCheck} fanScore={fanScore} />
        <AgentSafetySummary selected={selected} edge={edge} settlementCheck={settlementCheck} fanScore={fanScore} />
        <FairOddsActionCard edge={edge} fairOdds={fairOdds} selected={selected} />
      </div>
      <AdvancedDisclosure title="For builders and judges" subtitle="Agent trace, risk planner internals, API calls, paid endpoint state, and raw signals.">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <AgentWorkflowPanel settlementCheck={settlementCheck} edge={edge} fanScore={fanScore} />
          <AgentPanel plan={plan} focused={false} selectedId={selectedId} settlementCheck={settlementCheck} onRebuildPlan={onRebuildPlan} />
          <ExecutionSafetyPanel selected={selected} edge={edge} settlementCheck={settlementCheck} fanScore={fanScore} />
          <ApprovalControlPanel edge={edge} settlementCheck={settlementCheck} />
          <AgentMatchSelector loading={loading} matches={matches} selectedId={selectedId} onSelect={onSelect} />
          <AgentTracePanel plan={plan} />
          <RiskHedgePlanner plan={plan} edge={edge} fairOdds={fairOdds} settlementCheck={settlementCheck} />
          <ReferenceConsumerProof selectedId={selectedId} />
          <PaymentRequiredPanel />
          <EdgePanel edge={edge} match={selected} fairOdds={fairOdds} />
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5 items-stretch">
            <SignalStack sentiment={sentiment} strength={strength} />
            <PlayerStatsPanel stats={playerStats} />
          </div>
        </div>
      </AdvancedDisclosure>
    </div>
  );
}

function MiniPrimitive({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.08)] p-3 h-full">
      <div className="text-xs font-bold text-[#F5F5F5] mb-1">{title}</div>
      <div className="text-[11px] text-[#D1D5DB] leading-relaxed">{body}</div>
    </div>
  );
}

function WalletIdentityPanel({
  fanScore,
  persistence,
  walletInput,
  walletError,
  onWalletSubmit,
}: {
  fanScore: FanScoreDto | null;
  persistence: CupPersistenceHealthDto | null;
  walletInput: string;
  walletError: string | null;
  onWalletSubmit: (wallet: string) => void;
}) {
  const [draft, setDraft] = useState(walletInput);
  const explorer = fanScore?.wallet ? `https://www.okx.com/web3/explorer/xlayer/address/${fanScore.wallet}` : '';
  useEffect(() => setDraft(walletInput), [walletInput]);
  return (
    <section className="rounded-2xl border border-[rgba(56,189,248,0.22)] bg-[#11151A] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-[#38BDF8]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Wallet identity</h2>
        </div>
        <StatusPill tone={fanScore?.level === 'oracle-grade' || fanScore?.level === 'trusted' ? 'green' : fanScore?.level === 'active' ? 'blue' : 'amber'}>
          {fanLevelLabel(fanScore?.level)}
        </StatusPill>
      </div>
      {fanScore ? (
        <div className="space-y-3">
          <form
            className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onWalletSubmit(draft);
            }}
          >
            <label className="min-w-0">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Wallet to score</span>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#090909] px-3 font-mono text-xs text-[#F5F5F5] outline-none transition-colors focus:border-[rgba(56,189,248,0.55)]"
                placeholder="0x..."
              />
            </label>
            <ActionButton className="self-end" tone="blue" type="submit">Check my FanPass</ActionButton>
          </form>
          {walletError && (
            <InlineAlert tone="error" title="Invalid wallet" body={walletError} />
          )}
          <div className="rounded-xl border border-[rgba(56,189,248,0.18)] bg-[#0A1015] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Fan score</div>
                <div className="mt-1 text-4xl font-black text-[#F5F5F5]">{fanScore.score}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-[#38BDF8]">{fanLevelLabel(fanScore.level)}</div>
                <div className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-[#D1D5DB]">{fanScore.verdict}</div>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#050505]">
              <div className="h-full rounded-full bg-[#38BDF8]" style={{ width: `${Math.min(100, Math.max(0, fanScore.score))}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Address</div>
            <CopyableHash value={fanScore.wallet} label="FanPass wallet" className="w-full" />
            <div className="mt-2">
              <ScanLink href={explorer}>Open wallet on OKX explorer</ScanLink>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <MiniPrimitive title="What this means" body={fanScore.level === 'unknown' ? 'Start with basic quests and low-value rewards.' : fanScore.level === 'active' ? 'Basic fan actions are open with conservative limits.' : 'Stronger reward gates can open when match results are finalized.'} />
            <MiniPrimitive title="Activity history" body={persistence?.ok ? 'Your app activity can count toward future rewards.' : 'Live checks work, but long-term activity history is limited right now.'} />
          </div>
        </div>
      ) : (
        <StateBlock compact kind="info" title="Wallet not loaded" body="Connect or provide a wallet before a campaign uses FanPass gates." />
      )}
    </section>
  );
}

function FanPassNftGatePanel({
  fanScore,
  selected,
}: {
  fanScore: FanScoreDto | null;
  selected: CupMatchDto | null;
}) {
  const score = fanScore?.score ?? 0;
  const finalized = selected?.settlement.state === 'finalized';
  const gates = [
    {
      label: 'Commemorative claim',
      status: score >= 20 ? 'eligible' : 'limited',
      detail: 'Allow low-value participation NFTs for wallets with basic real activity.',
    },
    {
      label: 'Winner moment mint',
      status: finalized && score >= 35 ? 'eligible' : 'blocked',
      detail: 'Requires finalized CupOracle result; unresolved markets cannot mint winner moments.',
    },
    {
      label: 'Trusted fan edition',
      status: score >= 70 ? 'eligible' : 'manual review',
      detail: 'Higher-value NFT campaigns use FanPass tiering to reduce farming.',
    },
  ];
  return (
    <section className="rounded-2xl border border-[rgba(56,189,248,0.22)] bg-[#11151A] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#F5F5F5]">NFT claim gating</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#D1D5DB]">FanPass can gate NFT mints without adding a new minting contract to the MVP.</p>
        </div>
        <StatusPill tone="blue">NFT track proof</StatusPill>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {gates.map((gate) => (
          <div key={gate.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#F5F5F5]">{gate.label}</div>
              <GateStatus status={gate.status} />
            </div>
            <div className="text-[11px] leading-relaxed text-[#D1D5DB]">{gate.detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-[rgba(191,255,0,0.12)] bg-[rgba(191,255,0,0.05)] px-3 py-2 text-[11px] leading-relaxed text-[#D1D5DB]">
        Integration pattern: NFT app calls <span className="font-mono text-[#BFFF00]">/api/v1/cup/fan-score</span>, checks oracle finality, then decides claim eligibility.
      </div>
    </section>
  );
}

function CampaignGateSimulator({
  fanScore,
  selected,
}: {
  fanScore: FanScoreDto | null;
  selected: CupMatchDto | null;
}) {
  const score = fanScore?.score ?? 0;
  const finalized = selected?.settlement.state === 'finalized';
  const campaigns = [
    {
      label: 'Basic fan quest',
      source: 'wallet history + CupHub usage',
      status: score >= 10 ? 'eligible' : 'limited',
      reason: score >= 10 ? 'Wallet has enough signal for low-value participation.' : 'Allow read-only activity until more history exists.',
    },
    {
      label: 'Active fan reward',
      source: 'x402 usage + on-chain activity',
      status: score >= 35 ? 'eligible' : 'blocked',
      reason: score >= 35 ? 'Reward tier can open with conservative limits.' : 'Block recurring rewards until activity is visible.',
    },
    {
      label: 'Trusted community access',
      source: 'consistency + wallet history',
      status: score >= 64 ? 'eligible' : 'manual review',
      reason: score >= 64 ? 'Trusted enough for campaign access.' : 'Require manual review for higher-value community gates.',
    },
    {
      label: 'Oracle contributor campaign',
      source: 'oracle actions + finality',
      status: score >= 75 && finalized ? 'eligible' : 'limited',
      reason: finalized ? 'Oracle result is finalized; high-trust actions can count.' : 'Do not count market wins or contributor rewards before oracle finality.',
    },
  ];
  return (
    <section className="rounded-2xl border border-[rgba(56,189,248,0.22)] bg-[#11151A] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#F5F5F5]">Campaign Gate Simulator</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#D1D5DB]">
            Use FanPass before reward claims, Discord/Telegram access, community drops, or agent delegation.
          </p>
        </div>
        <StatusPill tone="blue">Social proof</StatusPill>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {campaigns.map((campaign) => (
          <div key={campaign.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#F5F5F5]">{campaign.label}</div>
              <GateStatus status={campaign.status} />
            </div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[#9CA3AF]">Source: {campaign.source}</div>
            <div className="text-[11px] leading-relaxed text-[#D1D5DB]">{campaign.reason}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FanPassSbtPanel({
  eligibility,
  onMinted,
}: {
  eligibility: FanPassSbtEligibilityDto | null;
  onMinted: () => void;
}) {
  const [adminKey, setAdminKey] = useState('');
  const [needsKey, setNeedsKey] = useState(false);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<FanPassSbtMintDto | null>(null);

  const disabledReason = !eligibility
    ? 'Eligibility is still loading.'
    : !eligibility.contract.address
      ? 'FanPassSBT contract address is not configured.'
      : !eligibility.contract.writeApiEnabled
        ? 'Cup write API is disabled.'
        : !eligibility.eligible
          ? eligibility.reason
          : eligibility.minted
            ? 'FanPass SBT is already minted for this wallet.'
            : null;

  async function mintSbt() {
    if (!eligibility || disabledReason) return;
    setMinting(true);
    setMintError(null);
    setMintResult(null);
    try {
      const result = await api.cupFanPassSbtMint(eligibility.wallet, needsKey || adminKey ? adminKey : undefined);
      setMintResult(result);
      setAdminKey('');
      setNeedsKey(false);
      toast.success(`FanPass SBT minted #${result.tokenId}`);
      onMinted();
    } catch (err) {
      const message = err instanceof ApiError && err.detail ? err.detail : err instanceof Error ? err.message : 'FanPass SBT mint failed';
      if (err instanceof ApiError && err.status === 401) setNeedsKey(true);
      setMintError(message);
      toast.error(message);
    } finally {
      setMinting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[rgba(167,139,250,0.24)] bg-[#15121B] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-[#C4B5FD]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">FanPass badge</h2>
        </div>
        <StatusPill tone={eligibility?.contract.status === 'deployed' ? 'purple' : 'amber'}>
          {eligibility?.contract.status ?? 'loading'}
        </StatusPill>
      </div>
      {!eligibility ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <SettlementMetric label="can mint" value={eligibility.eligible ? 'yes' : 'not yet'} />
            <SettlementMetric label="badge" value={eligibility.minted ? `minted #${eligibility.tokenId}` : 'not minted'} />
            <SettlementMetric label="score" value={eligibility.score} />
            <SettlementMetric label="level" value={fanLevelLabel(eligibility.level)} />
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-[#9CA3AF]">Badge status</div>
            <div className="text-xs leading-relaxed text-[#D1D5DB]">{eligibility.reason}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {eligibility.contract.explorerUrl && <ScanLink href={eligibility.contract.explorerUrl}>Open badge contract</ScanLink>}
            <StatusPill tone="purple">non-transferable</StatusPill>
            <span className="text-[11px] leading-relaxed text-[#D1D5DB]">
              Proof badge for fan campaigns; not an NFT marketplace.
            </span>
          </div>
          <div className="rounded-xl border border-[rgba(167,139,250,0.18)] bg-[#0D0B12] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-[#F5F5F5]">Mint FanPass badge</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#D1D5DB]">
                  Claims a non-transferable badge when this wallet has enough real fan activity.
                </div>
              </div>
              <ActionButton
                tone="blue"
                loading={minting}
                disabled={Boolean(disabledReason) || (needsKey && !adminKey.trim())}
                onClick={mintSbt}
              >
                Mint FanPass badge
              </ActionButton>
            </div>
            {disabledReason && (
              <InlineAlert tone={eligibility.minted ? 'success' : 'warning'} title={eligibility.minted ? 'Already minted' : 'Mint unavailable'} body={disabledReason} />
            )}
            {needsKey && !disabledReason && (
              <label className="mt-3 block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Operator write key</span>
                <input
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  type="password"
                  autoComplete="off"
                  placeholder="CUP_WRITE_API_KEY"
                  className="h-10 w-full rounded-lg border border-[rgba(167,139,250,0.22)] bg-[#090909] px-3 font-mono text-xs text-[#F5F5F5] outline-none transition-colors focus:border-[rgba(167,139,250,0.55)]"
                />
                <div className="mt-1 text-[10px] leading-relaxed text-[#9CA3AF]">
                  This is sent only with this mint request as <span className="font-mono">X-CUP-ADMIN-KEY</span>; it is not stored in browser state outside this component.
                </div>
              </label>
            )}
            {mintError && (
              <InlineAlert className="mt-3" tone="error" title="Mint failed" body={mintError} />
            )}
            {mintResult && (
              <div className="mt-3 space-y-2">
                <InlineAlert tone="success" title={`FanPass SBT minted #${mintResult.tokenId}`} body="The badge can now be used as on-chain campaign-gating proof." />
                <div className="flex flex-wrap items-center gap-2">
                  <ScanLink href={mintResult.explorerUrl}>Open mint tx</ScanLink>
                  <CopyableHash value={mintResult.txHash} label="mint tx" className="min-w-[220px] flex-1" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function RewardGatePanel({
  fanScore,
  readiness,
  selected,
}: {
  fanScore: FanScoreDto | null;
  readiness: CupReadinessDto | null;
  selected: CupMatchDto | null;
}) {
  const score = fanScore?.score ?? 0;
  const gates = [
    { label: 'Basic quests', status: score > 0 ? 'eligible' : 'limited', detail: 'Read fixtures, follow teams, claim low-value participation tasks.' },
    { label: 'Active fan rewards', status: score >= 35 ? 'eligible' : 'blocked', detail: 'Allow recurring quests or fantasy participation after activity is visible.' },
    { label: 'Trusted campaign access', status: score >= 70 ? 'eligible' : 'manual review', detail: 'Higher-value rewards need stronger wallet history and consistency.' },
    { label: 'Trusted contributor', status: score >= 75 && selected?.settlement.state === 'finalized' ? 'eligible' : 'limited', detail: 'Higher-trust rewards wait for final match results before counting wins.' },
  ];
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#151515] p-5">
      <h2 className="text-sm font-bold text-[#F5F5F5] mb-4">Reward gates</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gates.map((gate) => (
          <div key={gate.label} className="rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.08)] p-3 min-h-[94px]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#F5F5F5]">{gate.label}</div>
              <GateStatus status={gate.status} />
            </div>
            <div className="text-[11px] text-[#D1D5DB] leading-relaxed">{gate.detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.08)] p-3">
        <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1">Match result rule</div>
        <div className="text-xs text-[#E5E7EB]">
          {readiness?.contract.status === 'deployed'
            ? 'Higher-value rewards can wait for a finalized match result before opening.'
            : 'Basic reward checks work now; higher-value rewards need final match proof.'}
        </div>
      </div>
    </section>
  );
}

function GateStatus({ status }: { status: string }) {
  const tone = status === 'eligible' ? 'green' : status === 'manual review' ? 'blue' : status === 'limited' ? 'amber' : 'red';
  return <StatusPill tone={tone}>{status}</StatusPill>;
}

function FanNextStepsPanel({
  fanScore,
  selected,
  persistence,
}: {
  fanScore: FanScoreDto | null;
  selected: CupMatchDto | null;
  persistence: CupPersistenceHealthDto | null;
}) {
  const score = fanScore?.score ?? 0;
  const cases = [
    { label: 'Complete a basic quest', action: 'Start with low-value fan tasks and match participation.', active: score < 35 },
    { label: 'Build wallet history', action: 'More real app usage raises the pass from New wallet to Basic fan.', active: score < 70 },
    { label: 'Wait for final result', action: 'Winner rewards stay locked until the selected match is finalized.', active: selected?.settlement.state !== 'finalized' },
    { label: 'Use match features', action: 'Checking matches, joining quests, and verified actions add stronger signal.', active: true },
    { label: 'Durable activity', action: persistence?.ok ? 'Activity storage is online for reputation inputs.' : 'Live checks work, but durable app activity is unavailable.', active: !persistence?.ok },
  ];
  return (
    <section className="rounded-2xl border border-[rgba(56,189,248,0.22)] bg-[#11151A] p-5">
      <h2 className="text-sm font-bold text-[#F5F5F5] mb-4">How to improve your pass</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cases.map((item) => (
          <div
            key={item.label}
            className={cn(
              'rounded-xl border p-3 min-h-[74px]',
              item.active ? 'bg-[rgba(56,189,248,0.08)] border-[rgba(56,189,248,0.24)]' : 'bg-[#0D0D0D] border-[rgba(255,255,255,0.08)]',
            )}
          >
            <div className="text-xs font-bold text-[#F5F5F5] mb-1">{item.label}</div>
            <div className="text-[11px] text-[#D1D5DB] leading-relaxed">{item.action}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntegrationSurfacePanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#151515] p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Braces className="w-4 h-4 text-[#38BDF8]" />
        <h2 className="text-sm font-bold text-[#F5F5F5]">{title}</h2>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs text-[#E5E7EB] leading-relaxed">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function AgentMatchSelector({
  loading,
  matches,
  selectedId,
  onSelect,
}: {
  loading: boolean;
  matches: CupMatchDto[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const visibleMatches = useMemo(() => {
    if (loading) return [];
    const priority = matches
      .slice()
      .sort((a, b) => {
        const aRank = a.status === 'live' ? 0 : a.status === 'final' || a.status === 'settled' ? 2 : 1;
        const bRank = b.status === 'live' ? 0 : b.status === 'final' || b.status === 'settled' ? 2 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
      });
    const selected = selectedId ? priority.find((match) => match.id === selectedId) : null;
    const top = priority.filter((match) => match.id !== selectedId).slice(0, selected ? 3 : 4);
    return selected ? [selected, ...top] : top;
  }, [loading, matches, selectedId]);
  const hiddenCount = Math.max(0, matches.length - visibleMatches.length);

  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#151515] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-[#F5F5F5]">Agent target match</h2>
          <p className="text-[11px] text-[#D1D5DB] mt-0.5">Choose one real provider fixture for the reference agent. Full feed stays available through CupHub APIs.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <StatusPill tone="amber">observed only</StatusPill>
          {hiddenCount > 0 && <StatusPill tone="neutral">{visibleMatches.length}/{matches.length} shown</StatusPill>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {visibleMatches.map((match) => (
          <button
            key={match.id}
            onClick={() => onSelect(match.id)}
            className={cn(
              'rounded-xl border p-3 text-left min-h-[126px] transition-all duration-200',
              selectedId === match.id
                ? 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.45)]'
                : 'bg-[#0D0D0D] border-[rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:border-[rgba(245,158,11,0.3)]',
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[10px] uppercase tracking-wider text-[#D1D5DB]">{match.stage}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                  {new Date(match.kickoffUtc).toLocaleString()} · {humanMatchStatus(match)}
                </div>
              </div>
              <StatusPill tone={sourceStatusTone(match.sourceStatus)} className="shrink-0">
                {sourceStatusLabel(match.sourceStatus)}
              </StatusPill>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo code={match.home.code} name={match.home.name} size="sm" />
                <span className="truncate text-lg font-extrabold text-[#F5F5F5]">{match.home.code}</span>
              </div>
              <span className="text-[10px] text-[#9CA3AF]">vs</span>
              <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
                <TeamLogo code={match.away.code} name={match.away.name} size="sm" />
                <span className="truncate text-lg font-extrabold text-[#F5F5F5]">{match.away.code}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#D1D5DB]">
              <span className="truncate">{match.receipts.length} source receipt{match.receipts.length === 1 ? '' : 's'}</span>
              <span className="font-mono text-[#F59E0B]">{match.settlement.state.replaceAll('_', ' ')}</span>
            </div>
          </button>
        ))}
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[126px] skeleton rounded-xl" />)}
        {!loading && hiddenCount > 0 && (
          <InlineAlert
            className="md:col-span-2"
            tone="info"
            title={`${hiddenCount} extra provider fixtures hidden`}
            body="AgentBet keeps the decision surface focused. Builders can still query the complete fixture registry through /api/v1/cup/fixtures."
          />
        )}
        {!loading && matches.length === 0 && (
          <StateBlock
            compact
            kind="warning"
            className="md:col-span-2"
            title="No match context"
            body="The reference agent stays idle until CupHub has a real fixture with receipts."
          />
        )}
      </div>
    </section>
  );
}

function AgentWorkflowPanel({
  settlementCheck,
  edge,
  fanScore,
}: {
  settlementCheck: CupSettlementCheckDto | null;
  edge: CupAiEdgeDto | null;
  fanScore: FanScoreDto | null;
}) {
  const steps = [
    {
      label: 'Observe',
      state: settlementCheck ? 'complete' : 'waiting',
      body: `${settlementCheck?.sourceCount ?? 0} receipts, settlement status ${settlementCheck?.status ?? 'loading'}.`,
    },
    {
      label: 'Decide',
      state: edge ? 'complete' : 'waiting',
      body: edge ? `AI edge: ${edge.edge}, risk ${edge.risk}.` : 'Waiting for AI edge and fair odds.',
    },
    {
      label: 'Approve',
      state: edge?.edge && edge.edge !== 'NO_TRADE' && settlementCheck?.status !== 'settlement_challenged' ? 'manual' : 'locked',
      body: 'No hedge, swap, or payout action executes without explicit approval.',
    },
    {
      label: 'Verify',
      state: settlementCheck?.canFinalize ? 'ready' : 'locked',
      body: `FanPass ${fanScore?.level ?? 'unknown'}; recheck oracle before any final action.`,
    },
  ];
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.24)] bg-[#18130D] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#F5F5F5]">Observe - Decide - Approve - Verify</h2>
        <StatusPill tone="amber">reference consumer</StatusPill>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] font-mono text-[#F59E0B]">0{index + 1}</div>
              <StatusPill tone={step.state === 'complete' || step.state === 'ready' ? 'green' : step.state === 'manual' ? 'blue' : 'neutral'}>
                {step.state}
              </StatusPill>
            </div>
            <div className="mb-1 text-xs font-extrabold text-[#F5F5F5]">{step.label}</div>
            <div className="text-[11px] leading-relaxed text-[#D1D5DB]">{step.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApprovalControlPanel({
  edge,
  settlementCheck,
}: {
  edge: CupAiEdgeDto | null;
  settlementCheck: CupSettlementCheckDto | null;
}) {
  const executable = Boolean(edge && edge.edge !== 'NO_TRADE' && settlementCheck?.status === 'settlement_ready');
  const reason = !edge
    ? 'Waiting for AI edge.'
    : edge.edge === 'NO_TRADE'
      ? 'NO_TRADE is a valid safe output. The agent should not force a position.'
      : settlementCheck?.status !== 'settlement_ready'
        ? `Settlement guard blocks execution: ${settlementCheck?.reason ?? 'quorum is not ready'}.`
        : 'A real app would now show an approval transaction, then re-check CupOracle before execution.';
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[#151515] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#F5F5F5]">Human approval gate</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#D1D5DB]">MVP is recommendation-only: no autonomous bet, swap, custody, or payout execution.</p>
        </div>
        <StatusPill tone={executable ? 'green' : 'amber'}>{executable ? 'approval possible' : 'locked'}</StatusPill>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <MiniPrimitive title="Spend limit" body="$0.00 until the user signs an explicit limit transaction." />
        <MiniPrimitive title="Route/liquidity" body="If a route is missing, the agent returns no executable action." />
        <MiniPrimitive title="Pre-flight" body="Re-read settlement status immediately before any final action." />
      </div>
      <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
        <div className="text-xs font-bold text-[#F5F5F5]">Current decision</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[#D1D5DB]">{reason}</div>
      </div>
      <ActionButton className="mt-3 w-full justify-center" tone="amber" disabled>
        Approval transaction disabled in reference MVP
      </ActionButton>
    </section>
  );
}

function ExecutionSafetyPanel({
  selected,
  edge,
  settlementCheck,
  fanScore,
}: {
  selected: CupMatchDto | null;
  edge: CupAiEdgeDto | null;
  settlementCheck: CupSettlementCheckDto | null;
  fanScore: FanScoreDto | null;
}) {
  const items = [
    {
      label: 'Settlement open',
      body: selected?.settlement.state === 'finalized'
        ? 'Final outcome exists. Agent can use the result as proof.'
        : 'Agent can plan, but cannot treat the market as resolved.',
    },
    {
      label: 'Quorum guard',
      body: settlementCheck?.status === 'settlement_ready'
        ? 'Source quorum is ready for settlement proposal.'
        : `No final action: ${settlementCheck?.reason ?? 'settlement check is still loading'}.`,
    },
    {
      label: 'NO_TRADE guard',
      body: edge?.edge === 'NO_TRADE'
        ? 'Current signal says do not force a trading action.'
        : 'If action is suggested, require explicit approval first.',
    },
    {
      label: 'FanPass trust',
      body: fanScore && fanScore.score >= 70
        ? 'Wallet can receive higher trust treatment, but approval is still required.'
        : 'Low or unknown reputation requires smaller limits or manual review.',
    },
    {
      label: 'Dispute handling',
      body: 'If a challenge appears, pause payout logic and re-read CupOracle.',
    },
  ];
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[#18130D] p-5 h-full">
      <h2 className="text-sm font-bold text-[#F5F5F5] mb-4">Execution safety</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.08)] p-3">
            <div className="text-xs font-bold text-[#F5F5F5] mb-1">{item.label}</div>
            <div className="text-[11px] text-[#D1D5DB] leading-relaxed">{item.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PitchLines() {
  return (
    <div className="absolute inset-0 opacity-35 pointer-events-none">
      <div className="absolute inset-4 rounded-[28px] border border-[#BFFF00]/20" />
      <div className="absolute left-1/2 top-4 bottom-4 w-px bg-[#BFFF00]/20" />
      <div className="absolute left-[calc(50%-70px)] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full border border-[#BFFF00]/20" />
      <div className="absolute right-0 top-0 h-40 w-60 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2),transparent_65%)]" />
      <div className="absolute left-0 bottom-0 h-44 w-72 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),transparent_70%)]" />
    </div>
  );
}

function sourceStatusLabel(status: CupMatchDto['sourceStatus']): string {
  if (status === 'fixture_available') return 'fixture available';
  if (status === 'demo_dev_only') return 'demo only';
  return status.replaceAll('_', ' ');
}

function sourceStatusTone(status: CupMatchDto['sourceStatus']): 'green' | 'blue' | 'amber' | 'red' | 'neutral' {
  if (status === 'settlement_ready') return 'green';
  if (status === 'live') return 'blue';
  if (status === 'fixture_available') return 'neutral';
  if (status === 'conflicting_sources') return 'red';
  return 'amber';
}

function HeroMatchCard({ match, loading }: { match: CupMatchDto | null; loading: boolean }) {
  if (loading) return <div className="skeleton h-[104px] rounded-2xl" />;
  if (!match) {
    return (
      <StateBlock
        compact
        kind="warning"
        title="No trusted match yet"
        body="No provider fixture is selected. CupOS is waiting for real provider data instead of filling the page with demo matches."
      />
    );
  }
  const statusTone = humanSourceTone(userSourceStatus(match));
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#080A07]/80 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[#D1D5DB]">
          Selected match
        </div>
        <StatusPill tone={statusTone}>{humanSourceStatus(userSourceStatus(match))}</StatusPill>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <HeroTeam team={match.home} />
        <div className="rounded-full border border-[rgba(255,255,255,0.10)] bg-[#0D0D0D] px-2 py-1 text-[10px] font-bold text-[#9CA3AF]">
          VS
        </div>
        <HeroTeam team={match.away} align="right" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#D1D5DB]">
        <span className="truncate">{new Date(match.kickoffUtc).toLocaleString()}</span>
        <span className="shrink-0 font-mono text-[#BFFF00]">{match.receipts.length > 0 ? 'proof available' : 'proof pending'}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <StatusPill tone={match.status === 'final' || match.status === 'settled' ? 'green' : match.status === 'live' ? 'blue' : 'neutral'}>
          {humanMatchStatus(match)}
        </StatusPill>
        <span className="text-[10px] text-[#D1D5DB]">ready for user checks</span>
      </div>
    </div>
  );
}

function ReferenceConsumerProof({ selectedId }: { selectedId: string }) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#151515] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Braces className="w-4 h-4 text-[#38BDF8]" />
        <h2 className="text-sm font-bold text-[#F5F5F5]">Reference consumer proof</h2>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-[#D1D5DB]">
        This is the shape a prediction market, fantasy quest, or agent can use: consume CupHub, check FanPass, then pause until oracle state is safe.
      </p>
      <CodeBlock
        language="ts"
        code={`const [edge, settlement, fan] = await Promise.all([
  cup.getAiEdge("${selectedId}"),
  cup.getSettlementState("${selectedId}"),
  cup.getFanScore(wallet),
]);

if (settlement.status !== "settlement_ready") return "WAIT";
if (edge.edge === "NO_TRADE" || fan.score < 35) return "NO_TRADE";
return "SHOW_APPROVAL";`}
      />
      <div className="mt-2 text-[10px] text-[#9CA3AF]">
        Mirrors the behavior expected from <span className="font-mono text-[#D1D5DB]">examples/cuphub-reference-market.ts</span>.
      </div>
    </section>
  );
}

function PaymentRequiredPanel() {
  return (
    <section className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#11151A] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">x402 payment state</h2>
        </div>
        <StatusPill tone="blue">paid API guard</StatusPill>
      </div>
      <div className="text-xs leading-relaxed text-[#D1D5DB]">
        Paid CupHub endpoints should return a structured 402 payment-required response until a real X Layer payment proof is attached and not replayed.
      </div>
    </section>
  );
}

function HeroTeam({ team, align = 'left' }: { team: CupMatchDto['home']; align?: 'left' | 'right' }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', align === 'right' && 'flex-row-reverse text-right')}>
      <TeamLogo code={team.code} name={team.name} size="sm" />
      <div className="min-w-0">
        <div className="text-base font-extrabold leading-none text-[#F5F5F5]">{team.code}</div>
        <div className="mt-1 truncate text-[10px] text-[#D1D5DB]">{team.name}</div>
      </div>
    </div>
  );
}

function MatchTile({ match, active, onClick }: { match: CupMatchDto; active: boolean; onClick: () => void }) {
  const sourceTone = humanSourceTone(userSourceStatus(match));
  const kickoff = new Date(match.kickoffUtc).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <button
      onClick={onClick}
      aria-label={`${match.home.name} vs ${match.away.name}, ${match.stage}, ${humanSourceStatus(userSourceStatus(match))}`}
      className={cn(
        'group min-h-[206px] text-left rounded-xl border p-3 transition-all duration-200 bg-[#101010]',
        active
          ? 'border-[#BFFF00]/50 shadow-[0_0_24px_rgba(191,255,0,0.08)]'
          : 'border-[rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.14)]',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-black uppercase tracking-wide text-[#F5F5F5]">
            {match.home.code} <span className="text-[#6B7280]">vs</span> {match.away.code}
          </div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">{kickoff} · {humanMatchStatus(match)}</div>
        </div>
        <div className="shrink-0 self-start">
          <StatusBadge status={match.settlement.state} />
        </div>
      </div>

      <div className="space-y-2">
        <TeamRow team={match.home} label="Home" score={match.score?.home} />
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.07)]" />
          <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0A0A0A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">vs</span>
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.07)]" />
        </div>
        <TeamRow team={match.away} label="Away" score={match.score?.away} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-[#D1D5DB]">
        <span className="min-w-0 truncate">{new Date(match.kickoffUtc).toLocaleString()}</span>
        <span className="shrink-0 font-mono text-[#BFFF00]">{match.receipts.length > 0 ? 'proof available' : 'proof pending'}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <StatusPill tone={sourceTone} className="max-w-full">{humanSourceStatus(userSourceStatus(match))}</StatusPill>
        {match.score && <span className="shrink-0 text-xs font-extrabold text-[#F5F5F5]">{match.score.home}:{match.score.away}</span>}
      </div>
    </button>
  );
}

function TeamRow({ team, label, score }: { team: CupMatchDto['home']; label: string; score?: number }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D0D0D] p-2.5">
      <TeamLogo code={team.code} name={team.name} size="md" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</span>
          <span className="font-mono text-[10px] text-[#BFFF00]">{team.code}</span>
        </div>
        <div className="mt-0.5 truncate text-sm font-extrabold leading-tight text-[#F5F5F5]">{team.name}</div>
        <div className="mt-0.5 text-[10px] font-mono text-[#9CA3AF]">rating {team.rating}</div>
      </div>
      {typeof score === 'number' && <div className="text-2xl font-extrabold tabular text-[#F5F5F5]">{score}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: CupMatchDto['settlement']['state'] }) {
  const tone = status === 'finalized' ? 'green' : status === 'challenge_window' ? 'amber' : status === 'proposed' ? 'blue' : 'neutral';
  return <StatusPill tone={tone}>{status.replaceAll('_', ' ')}</StatusPill>;
}

function SettlementPanel({
  match,
  contract,
  onchain,
  settlementCheck,
  settlementLog,
  onActionDone,
}: {
  match: CupMatchDto;
  contract: CupOracleContractDto | null;
  onchain: CupOnchainMatchDto | null;
  settlementCheck: CupSettlementCheckDto | null;
  settlementLog: CupSettlementLogEntryDto[];
  onActionDone: () => void;
}) {
  const [outcome, setOutcome] = useState<CupOutcome>(match.settlement.proposedOutcome ?? 'HOME');
  const [mutating, setMutating] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ action: string; txHash: string; explorerUrl: string } | null>(null);

  useEffect(() => {
    setOutcome(match.settlement.proposedOutcome ?? 'HOME');
    setLastTx(null);
  }, [match.id, match.settlement.proposedOutcome]);

  const state = settlementStateFromChain(onchain);
  const chainOutcome = outcomeFromNumber(onchain?.finalOutcome) ?? outcomeFromNumber(onchain?.proposedOutcome);
  const canWrite = Boolean(contract?.writeApiEnabled && contract.address && onchain?.registered);
  const settlementReady = match.settlement.sourceQuorum.status === 'settlement_ready';
  const disabledReason = settlementDisabledReason({ canWrite, settlementReady, state, settlementCheck, contract, onchain });

  async function runSettlementAction(action: 'propose' | 'challenge' | 'finalize') {
    setMutating(action);
    try {
      const tx = action === 'propose'
        ? await api.cupProposeResult(match.id, outcome)
        : action === 'challenge'
          ? await api.cupChallengeResult(match.id)
          : await api.cupFinalizeResult(match.id);
      setLastTx({ action: tx.action, txHash: tx.txHash, explorerUrl: tx.explorerUrl });
      toast.success(`CupOracle tx submitted: ${tx.action}`);
      onActionDone();
    } catch (err) {
      toast.error(err instanceof ApiError && err.detail ? err.detail : 'CupOracle action failed');
    } finally {
      setMutating(null);
    }
  }

  const steps = [
    { label: 'Registered', done: Boolean(onchain?.registered) },
    { label: 'Sources hashed', done: match.receipts.length > 0 },
    { label: 'Proposed', done: state === 'proposed' || state === 'challenged' || state === 'finalized' },
    { label: 'Challenge window', done: state === 'challenged' || match.settlement.state === 'challenge_window' || state === 'finalized' },
    { label: 'Finalized', done: state === 'finalized' },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {steps.map((s, i) => (
          <div key={s.label} className="rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-3">
            <div className="flex items-center gap-2">
              {s.done ? <CheckCircle2 className="w-4 h-4 text-[#BFFF00]" /> : <TimerReset className="w-4 h-4 text-[#9CA3AF]" />}
              <span className="text-xs font-bold text-[#F5F5F5]">{i + 1}. {s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <HashRow label="Rules hash" value={match.settlement.rulesHash} />
        <HashRow label="Source hash" value={match.settlement.sourceHash} />
        <HashRow label="Evidence hash" value={match.settlement.evidenceHash} />
        <HashRow label="Evidence URI" value={match.settlement.evidenceUri} />
        <HashRow label="Quorum" value={match.settlement.sourceQuorum.reason} />
      </div>
      {settlementCheck && (
        <div className="mt-3 rounded-lg border border-[rgba(56,189,248,0.16)] bg-[rgba(56,189,248,0.06)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7DD3FC]">Settlement check API</div>
              <div className="mt-1 text-xs font-bold text-[#F5F5F5]">{settlementCheck.status}</div>
            </div>
            <div className="flex gap-2">
              <StatusPill tone={settlementCheck.canPropose ? 'green' : 'amber'}>
                {settlementCheck.canPropose ? 'proposal ready' : 'proposal blocked'}
              </StatusPill>
              <StatusPill tone={settlementCheck.canFinalize ? 'green' : 'neutral'}>
                {settlementCheck.canFinalize ? 'finalize ready' : 'finalize locked'}
              </StatusPill>
            </div>
          </div>
          <div className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{settlementCheck.reason}</div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <SettlementMetric label="sourceCount" value={settlementCheck.sourceCount} />
            <SettlementMetric label="agreeingSources" value={settlementCheck.agreeingSources} />
            <SettlementMetric label="proposedOutcome" value={settlementCheck.proposedOutcome ?? 'n/a'} />
            <SettlementMetric
              label="challengeEndsAt"
              value={settlementCheck.challengeEndsAt ? new Date(settlementCheck.challengeEndsAt).toLocaleString() : 'n/a'}
            />
          </div>
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-3">
        <div className="rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">On-chain registry</div>
              <div className="text-xs font-bold text-[#F5F5F5]">
                {onchain?.registered ? 'Registered in CupOracle' : 'Waiting for contract registration'}
              </div>
            </div>
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded',
                onchain?.registered ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
              )}
            >
              {state}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <HashRow label="Oracle outcome" value={chainOutcome ?? 'Unknown'} />
            <HashRow
              label="Challenge ends"
              value={onchain?.challengeEndsAt ? new Date(onchain.challengeEndsAt * 1000).toLocaleString() : 'n/a'}
            />
          </div>
        </div>
        <div className="rounded-lg bg-[#0D0D0D] border border-[rgba(191,255,0,0.14)] p-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Settlement controls</div>
              <div className="text-xs font-bold text-[#F5F5F5]">Propose, challenge, or finalize a source-backed X Layer result.</div>
            </div>
            <button
              onClick={onActionDone}
              className="h-8 w-8 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#090909] text-[#D1D5DB] hover:text-[#F5F5F5] flex items-center justify-center"
              title="Refresh settlement"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['HOME', 'DRAW', 'AWAY'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setOutcome(item)}
                className={cn(
                  'min-h-10 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 px-2',
                  outcome === item
                    ? 'bg-[#BFFF00] text-[#0A0A0A] border-[#BFFF00]'
                    : 'bg-[#090909] text-[#D1D5DB] border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,255,0,0.35)]',
                )}
              >
                {item === 'HOME' && <TeamLogo code={match.home.code} name={match.home.name} size="sm" showEmoji={false} className="h-4 w-6 rounded-[4px] text-[7px]" />}
                {item === 'AWAY' && <TeamLogo code={match.away.code} name={match.away.name} size="sm" showEmoji={false} className="h-4 w-6 rounded-[4px] text-[7px]" />}
                <span>{item === 'HOME' ? match.home.code : item === 'AWAY' ? match.away.code : 'DRAW'}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SettlementButton
              icon={<Flag className="w-3.5 h-3.5" />}
              label="Propose"
              disabled={!canWrite || !settlementReady || Boolean(mutating)}
              loading={mutating === 'propose'}
              onClick={() => void runSettlementAction('propose')}
            />
            <SettlementButton
              icon={<Scale className="w-3.5 h-3.5" />}
              label="Challenge"
              disabled={!canWrite || Boolean(mutating) || state !== 'proposed'}
              loading={mutating === 'challenge'}
              onClick={() => void runSettlementAction('challenge')}
            />
            <SettlementButton
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Finalize"
              disabled={!canWrite || Boolean(mutating) || state !== 'proposed'}
              loading={mutating === 'finalize'}
              onClick={() => void runSettlementAction('finalize')}
            />
          </div>
          {disabledReason && (
            <div className="mt-2 rounded-lg border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.06)] px-3 py-2 text-[10px] leading-relaxed text-[#FBBF24]">
              {disabledReason}
            </div>
          )}
          {lastTx && (
            <a
              href={lastTx.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#090909] border border-[rgba(56,189,248,0.16)] px-3 py-2 text-[11px] text-[#38BDF8] hover:text-[#7DD3FC]"
            >
              <span className="truncate">{lastTx.action}: {lastTx.txHash}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {settlementLog.length > 0 && (
          <div className="rounded-lg bg-[#0D0D0D] border border-[rgba(56,189,248,0.14)] p-3">
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">Settlement tx log</div>
            <div className="space-y-2">
              {settlementLog.slice(0, 3).map((entry) => (
                <a
                  key={`${entry.txHash}-${entry.timestamp}`}
                  href={entry.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg bg-[#090909] border border-[rgba(255,255,255,0.05)] px-3 py-2 hover:border-[rgba(56,189,248,0.22)]"
                >
                  <span className="text-[10px] font-bold text-[#38BDF8]">{entry.action}</span>
                  <span className="text-[10px] font-mono text-[#9CA3AF] truncate">{entry.txHash}</span>
                  <ExternalLink className="w-3 h-3 text-[#9CA3AF]" />
                </a>
              ))}
            </div>
          </div>
        )}
        {match.receipts.map((r) => <ReceiptEvidenceCard key={`${r.provider}-${r.payloadHash}`} receipt={r} />)}
      </div>
    </div>
  );
}

function settlementDisabledReason({
  canWrite,
  settlementReady,
  state,
  settlementCheck,
  contract,
  onchain,
}: {
  canWrite: boolean;
  settlementReady: boolean;
  state: ReturnType<typeof settlementStateFromChain>;
  settlementCheck: CupSettlementCheckDto | null;
  contract: CupOracleContractDto | null;
  onchain: CupOnchainMatchDto | null;
}) {
  if (!contract?.address) return 'Action blocked: CupOracleV2 address is missing.';
  if (!contract.writeApiEnabled) return 'Action blocked: write API is disabled for safety. Enable it only for controlled operator usage.';
  if (!onchain?.registered) return 'Action blocked: match is not registered on-chain yet.';
  if (!canWrite) return 'Action blocked: CupOracle write prerequisites are incomplete.';
  if (state === 'challenged' || settlementCheck?.status === 'settlement_challenged') return 'Action blocked: settlement is challenged. Consumers should pause payouts and wait for dispute handling.';
  if (state === 'finalized') return 'Action blocked: this settlement is already finalized.';
  if (!settlementReady) return `Proposal blocked: ${settlementCheck?.reason ?? 'source quorum is unavailable'}.`;
  return null;
}

function ReceiptEvidenceCard({ receipt }: { receipt: CupMatchDto['receipts'][number] }) {
  const payload = receipt.normalizedPayload ? JSON.stringify(receipt.normalizedPayload) : 'normalized payload unavailable';
  return (
    <a
      href={receipt.url.startsWith('http') ? receipt.url : undefined}
      target="_blank"
      rel="noreferrer"
      className="block min-w-0 rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.05)] px-3 py-2 hover:border-[rgba(191,255,0,0.18)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#F5F5F5]">{receipt.provider}</div>
          <div className="text-[10px] text-[#D1D5DB]">{new Date(receipt.observedAt).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#BFFF00] font-mono">{Math.round(receipt.confidence * 100)}%</span>
          {receipt.url.startsWith('http') && <ExternalLink className="w-3 h-3 text-[#9CA3AF]" />}
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
        <div className="min-w-0 rounded-md bg-[#090909] border border-[rgba(255,255,255,0.05)] px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-[#9CA3AF]">Payload hash</div>
          <div className="mt-1 text-[10px] font-mono text-[#D1D5DB] truncate">{receipt.payloadHash}</div>
        </div>
        <div className="min-w-0 rounded-md bg-[#090909] border border-[rgba(255,255,255,0.05)] px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-[#9CA3AF]">Normalized payload</div>
          <div className="mt-1 text-[10px] font-mono text-[#D1D5DB] truncate">{payload}</div>
        </div>
      </div>
    </a>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-3">
      <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">{label}</div>
      <CopyableHash value={value} label={label} className="w-full border-transparent bg-transparent px-0 py-0" />
    </div>
  );
}

function SettlementMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#090909] px-2.5 py-2">
      <div className="mb-1 truncate text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</div>
      <div className="truncate font-mono text-[11px] text-[#F5F5F5]">{value}</div>
    </div>
  );
}

function SettlementButton({
  icon,
  label,
  disabled,
  loading,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  loading: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-9 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-45 disabled:cursor-not-allowed',
        danger
          ? 'bg-[rgba(239,68,68,0.08)] text-[#FCA5A5] border-[rgba(239,68,68,0.2)] hover:border-[rgba(239,68,68,0.42)]'
          : 'bg-[#090909] text-[#F5F5F5] border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,255,0,0.35)]',
      )}
    >
      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}

function outcomeFromNumber(value?: number): CupOutcome | null {
  if (value === 1) return 'HOME';
  if (value === 2) return 'DRAW';
  if (value === 3) return 'AWAY';
  return null;
}

function settlementStateFromChain(onchain: CupOnchainMatchDto | null): 'unregistered' | 'open' | 'proposed' | 'challenged' | 'finalized' {
  if (!onchain?.registered) return 'unregistered';
  if (onchain.state === 1) return 'proposed';
  if (onchain.state === 2) return 'challenged';
  if (onchain.state === 3) return 'finalized';
  return 'open';
}

function SignalStack({ sentiment, strength }: { sentiment: CupSentimentDto | null; strength: CupTeamStrengthDto | null }) {
  const sentimentMode = sentiment?.mode === 'live-input-only' ? 'input-only' : sentiment?.mode ?? 'unavailable';
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#151515] p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <RadioTower className="w-4 h-4 text-[#38BDF8]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Signal adapters</h2>
        </div>
        <StatusPill tone="blue">not settlement truth</StatusPill>
      </div>
      {!sentiment || !strength ? (
        <div className="h-32 skeleton rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Team strength</div>
              <SignalModePill mode="live-adapter" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <AdapterMetric label={strength.home.code} value={strength.home.strength} tone="lime" />
              <AdapterMetric label={strength.away.code} value={strength.away.strength} tone="blue" />
            </div>
            <div className="mt-2 text-[10px] text-[#9CA3AF]">delta {strength.delta > 0 ? '+' : ''}{strength.delta}, confidence {Math.round(strength.confidence * 100)}%</div>
          </div>
          <div className="rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Sentiment input</div>
              <SignalModePill mode={sentimentMode} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <AdapterMetric label={sentiment.home.code} value={sentiment.home.sentiment} tone="lime" />
              <AdapterMetric label="DRAW" value={sentiment.drawNarrative} tone="amber" />
              <AdapterMetric label={sentiment.away.code} value={sentiment.away.sentiment} tone="blue" />
            </div>
            <div className="mt-2 text-[10px] text-[#9CA3AF] truncate">source {sentiment.sourceHash}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-[#D1D5DB]">Sentiment is an input signal only; it never resolves outcomes.</div>
          </div>
        </div>
      )}
    </section>
  );
}

function SignalModePill({ mode }: { mode: string }) {
  const normalized = mode.replace('_', '-');
  const tone = normalized === 'live-adapter' ? 'green' : normalized === 'input-only' ? 'blue' : 'amber';
  return <StatusPill tone={tone}>{normalized}</StatusPill>;
}

function AdapterStatusPanel({ adapters }: { adapters: CupAdapterOverviewDto | null }) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#151515] p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Cable className="w-4 h-4 text-[#BFFF00]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Source adapters</h2>
        </div>
        {adapters && (
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded',
              adapters.readyForProductionSettlement
                ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
                : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
            )}
          >
            {adapters.liveSources}/{adapters.requiredLiveSources} live
          </span>
        )}
      </div>
      {!adapters ? (
        <div className="h-36 skeleton rounded-xl" />
      ) : (
        <div className="space-y-1.5">
          {adapters.adapters.map((adapter) => (
            <a
              key={adapter.id}
              href={adapter.docsUrl.startsWith('http') ? adapter.docsUrl : undefined}
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-2.5 hover:border-[rgba(191,255,0,0.18)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#F5F5F5]">{adapter.name}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{adapter.role}</span>
                </div>
                <div className="text-[10px] text-[#9CA3AF] truncate">{adapter.note}</div>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    'text-[10px] font-bold uppercase',
                    adapter.status === 'live' ? 'text-[#22C55E]' : adapter.status === 'dev_only' ? 'text-[#38BDF8]' : 'text-[#F59E0B]',
                  )}
                >
                  {adapter.status}
                </div>
                <div className="text-[10px] font-mono text-[#9CA3AF]">{Math.round(adapter.confidenceWeight * 100)}%</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerStatsPanel({ stats }: { stats: CupPlayerStatsDto | null }) {
  const topPlayers = stats?.players.slice().sort((a, b) => b.expectedImpact - a.expectedImpact).slice(0, 4) ?? [];
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#151515] p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Player impact feed</h2>
        </div>
        {stats && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[rgba(245,158,11,0.1)] text-[#F59E0B]">
            {stats.sourceMode.replace('-', ' ')}
          </span>
        )}
      </div>
      {!stats ? (
        <div className="h-36 skeleton rounded-xl" />
      ) : (
        <div className="space-y-1.5">
          {topPlayers.length === 0 && (
            <StateBlock
              compact
              kind="info"
              title="Player stats unavailable"
              body="CupOS leaves this feed empty until a live provider supplies player data. No local placeholder player list is rendered."
            />
          )}
          {topPlayers.map((player) => (
            <div
              key={player.playerId}
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TeamLogo code={player.team} size="sm" showEmoji={false} className="h-6 w-6 text-[8px]" />
                  <span className="text-xs font-bold text-[#F5F5F5] truncate">{player.name}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{player.team}</span>
                </div>
                <div className="text-[10px] text-[#9CA3AF]">
                  {player.role} / {player.minutesProjection} min projection
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-[#F59E0B] tabular">{player.expectedImpact}</div>
                <div className="text-[10px] text-[#9CA3AF]">impact</div>
              </div>
            </div>
          ))}
          <div className="text-[10px] text-[#9CA3AF] font-mono truncate">source {stats.sourceHash}</div>
        </div>
      )}
    </section>
  );
}

function AdapterMetric({ label, value, tone }: { label: string; value: number; tone: 'lime' | 'blue' | 'amber' }) {
  const color = tone === 'lime' ? '#BFFF00' : tone === 'blue' ? '#38BDF8' : '#F59E0B';
  const isTeam = label !== 'DRAW';
  return (
    <div className="rounded-lg bg-[#090909] border border-[rgba(255,255,255,0.05)] p-2 min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[#D1D5DB]">
        {isTeam && <TeamLogo code={label} size="sm" showEmoji={false} className="h-5 w-5 text-[7px]" />}
        <span>{label}</span>
      </div>
      <div className="text-lg font-extrabold tabular" style={{ color }}>{value}</div>
    </div>
  );
}

function EdgePanel({
  edge,
  match,
  fairOdds,
}: {
  edge: CupAiEdgeDto | null;
  match: CupMatchDto | null;
  fairOdds: CupFairOddsDto | null;
}) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#151515] p-3">
      <div className="flex items-center gap-2 mb-3">
        <BrainCircuit className="w-4 h-4 text-[#BFFF00]" />
        <h2 className="text-sm font-bold text-[#F5F5F5]">AI edge engine</h2>
      </div>
      {!edge || !match ? (
        <div className="h-52 skeleton rounded-xl" />
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Prob
              label={match.home.code}
              value={edge.fairProbability.home}
              decimalOdds={fairOdds?.decimalOdds.home}
              teamName={match.home.name}
            />
            <Prob label="DRAW" value={edge.fairProbability.draw} decimalOdds={fairOdds?.decimalOdds.draw} />
            <Prob
              label={match.away.code}
              value={edge.fairProbability.away}
              decimalOdds={fairOdds?.decimalOdds.away}
              teamName={match.away.name}
            />
          </div>
          <div className="rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-3 mb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Suggested edge</div>
                <div className="text-xl font-extrabold text-[#BFFF00]">{edge.edge}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Risk</div>
                <div className={cn('text-xl font-extrabold', edge.risk === 'HIGH' ? 'text-[#EF4444]' : edge.risk === 'MEDIUM' ? 'text-[#F59E0B]' : 'text-[#22C55E]')}>
                  {edge.risk}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="mb-2 rounded-lg border border-[rgba(56,189,248,0.14)] bg-[rgba(56,189,248,0.06)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7DD3FC]">Odds source</span>
                <span className="text-[10px] font-mono text-[#D1D5DB] truncate">
                  {fairOdds?.source ?? 'xsight-fair-probability'} / {fairOdds?.sourceHash ?? edge.sourceHash}
                </span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-[#D1D5DB]">
                Decimal fair odds from the paid CupHub odds endpoint. Not bookmaker odds; this is the oracle risk engine quote.
              </div>
            </div>
            {edge.rationale.map((r) => (
              <div key={r} className="flex gap-2 text-xs text-[#D1D5DB]">
                <Activity className="w-3.5 h-3.5 text-[#38BDF8] mt-0.5 shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Prob({
  label,
  value,
  decimalOdds,
  teamName,
}: {
  label: string;
  value: number;
  decimalOdds?: number;
  teamName?: string;
}) {
  const displayOdds = decimalOdds ?? (value > 0 ? 1 / value : 0);
  return (
    <div className="rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-2.5 min-w-0">
      <div className="mb-2 flex items-center gap-2 text-[10px] text-[#D1D5DB] uppercase tracking-wider">
        {teamName && <TeamLogo code={label} name={teamName} size="sm" showEmoji={false} className="h-6 w-6 text-[8px]" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-lg font-extrabold text-[#F5F5F5] tabular">{Math.round(value * 100)}%</div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">odds</div>
          <div className="text-sm font-extrabold tabular text-[#BFFF00]">{displayOdds ? displayOdds.toFixed(2) : 'n/a'}</div>
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="h-full bg-[#BFFF00]" style={{ width: `${Math.max(4, value * 100)}%` }} />
      </div>
    </div>
  );
}

function FanPassPanel({ fanScore, focused }: { fanScore: FanScoreDto | null; focused: boolean }) {
  return (
    <motion.section
      animate={focused ? { borderColor: 'rgba(191,255,0,0.45)' } : { borderColor: 'rgba(255,255,255,0.07)' }}
      className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border bg-[#151515] p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Fingerprint className="w-4 h-4 text-[#38BDF8]" />
        <h2 className="text-sm font-bold text-[#F5F5F5]">FanPass reputation</h2>
      </div>
      {!fanScore ? (
        <div className="h-40 skeleton rounded-xl" />
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] text-[#D1D5DB] uppercase tracking-wider">Wallet tier</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xl font-extrabold text-[#F5F5F5]">{fanScore.level}</span>
                <StatusPill tone={fanScore.score >= 70 ? 'green' : fanScore.score >= 35 ? 'blue' : 'amber'}>
                  real activity
                </StatusPill>
              </div>
              <CopyableHash value={fanScore.wallet} label="FanPass wallet" className="mt-3 w-full max-w-[280px]" />
            </div>
            <ScoreMeter score={fanScore.score} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(fanScore.breakdown).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] text-[#D1D5DB]">{k}</div>
                  <div className="text-sm font-bold text-[#F5F5F5] tabular">{v}</div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]">
                  <div className="h-full rounded-full bg-[#38BDF8]" style={{ width: `${Math.min(100, Math.max(4, v))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#D1D5DB] leading-relaxed">{fanScore.verdict}</p>
        </div>
      )}
    </motion.section>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[#0D0D0D]">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.08)" strokeWidth="9" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={score >= 70 ? '#4ADE80' : score >= 35 ? '#38BDF8' : '#F59E0B'}
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${pct * 2.638} 263.8`}
        />
      </svg>
      <div className="relative text-center">
        <div className="text-3xl font-extrabold tabular text-[#F5F5F5]">{score}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">score</div>
      </div>
    </div>
  );
}

function AgentTracePanel({ plan }: { plan: CupActionPlanDto | null }) {
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[#18130D] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Agent Trace</h2>
        </div>
        <StatusPill tone="amber">AI Agent proof</StatusPill>
      </div>
      {!plan ? (
        <LoadingBlock rows={3} />
      ) : (
        <div className="space-y-2">
          {plan.agentTrace.map((step) => (
            <div key={`${step.step}-${step.tool}`} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">Step {step.step}</div>
                  <div className="truncate font-mono text-xs font-bold text-[#F5F5F5]">{step.tool}</div>
                </div>
                <StatusPill tone={step.status === 'ok' ? 'green' : step.status === 'quorum_missing' ? 'amber' : 'red'}>{step.status}</StatusPill>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-2">
                <div className="rounded-lg bg-[#090909] px-2.5 py-2 font-mono text-[10px] text-[#D1D5DB]">
                  {Object.keys(step.input).length ? JSON.stringify(step.input) : '{}'}
                </div>
                <div className="rounded-lg bg-[#090909] px-2.5 py-2 text-[11px] leading-relaxed text-[#D1D5DB]">
                  {step.output}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RiskHedgePlanner({
  plan,
  edge,
  fairOdds,
  settlementCheck,
}: {
  plan: CupActionPlanDto | null;
  edge: CupAiEdgeDto | null;
  fairOdds: CupFairOddsDto | null;
  settlementCheck: CupSettlementCheckDto | null;
}) {
  return (
    <section className="rounded-2xl border border-[rgba(245,158,11,0.22)] bg-[#18130D] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-bold text-[#F5F5F5]">Risk & Hedge Planner</h2>
        </div>
        <StatusPill tone="amber">Trading proof</StatusPill>
      </div>
      {!plan || !edge || !fairOdds ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <SettlementMetric label="decision" value={plan.riskDecision} />
            <SettlementMetric label="risk" value={edge.risk} />
            <SettlementMetric label="confidence" value={`${Math.round(edge.confidence * 100)}%`} />
            <SettlementMetric label="readiness" value={plan.hedgeReadiness} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <OddsMini label="Home" probability={fairOdds.fairProbability.home} odds={fairOdds.decimalOdds.home} />
            <OddsMini label="Draw" probability={fairOdds.fairProbability.draw} odds={fairOdds.decimalOdds.draw} />
            <OddsMini label="Away" probability={fairOdds.fairProbability.away} odds={fairOdds.decimalOdds.away} />
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[#9CA3AF]">Execution status</div>
            <div className="text-xs leading-relaxed text-[#D1D5DB]">
              {plan.executionBlockedReason ?? `No automatic execution. Show approval UI and re-check settlement state ${settlementCheck?.status ?? ''} before any hedge.`}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function OddsMini({ label, probability, odds }: { label: string; probability: number; odds: number }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D0D0D] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-[#F5F5F5]">{Math.round(probability * 100)}%</div>
      <div className="font-mono text-[10px] text-[#F59E0B]">odds {odds.toFixed(2)}</div>
    </div>
  );
}

function AgentPanel({
  plan,
  focused,
  selectedId,
  settlementCheck,
  onRebuildPlan,
}: {
  plan: CupActionPlanDto | null;
  focused: boolean;
  selectedId: string;
  settlementCheck: CupSettlementCheckDto | null;
  onRebuildPlan: () => void;
}) {
  const normalizedAction = plan?.primaryAction.toUpperCase().includes('NO_TRADE')
    ? 'NO_TRADE'
    : settlementCheck?.status === 'settlement_challenged'
      ? 'WAIT_CHALLENGE'
      : settlementCheck?.status !== 'settlement_ready'
        ? 'WAIT_QUORUM'
        : 'READY_WITH_APPROVAL';
  return (
    <motion.section
      animate={focused ? { borderColor: 'rgba(245,158,11,0.5)' } : { borderColor: 'rgba(255,255,255,0.07)' }}
      className="min-w-0 max-w-full overflow-hidden rounded-2xl border bg-[#151515] p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="truncate text-sm font-bold text-[#F5F5F5]">AgentBet reference consumer</h2>
        </div>
        <ActionButton className="shrink-0 whitespace-nowrap" tone="amber" icon={<RefreshCw className="h-4 w-4" />} onClick={onRebuildPlan}>
          Rebuild action plan
        </ActionButton>
      </div>
      {!plan ? (
        <div className="h-44 skeleton rounded-xl" />
      ) : (
        <div>
          <div className="rounded-xl bg-[#0D0D0D] border border-[rgba(255,255,255,0.06)] p-3 mb-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Primary action</div>
              <StatusPill tone={normalizedAction === 'READY_WITH_APPROVAL' ? 'green' : normalizedAction === 'NO_TRADE' ? 'amber' : 'blue'}>
                {plan.riskDecision ?? normalizedAction}
              </StatusPill>
            </div>
            <div className="text-xs text-[#F5F5F5] leading-relaxed">{plan.primaryAction}</div>
            <div className="mt-3 grid min-w-0 grid-cols-1 md:grid-cols-3 gap-2">
              <SettlementMetric label="riskDecision" value={plan.riskDecision} />
              <SettlementMetric label="hedgeReadiness" value={plan.hedgeReadiness} />
              <SettlementMetric label="blockedReason" value={plan.executionBlockedReason ?? 'none'} />
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-[#D1D5DB]">
              This panel is a reference consumer. It can recommend, but it does not execute autonomous betting or custody-heavy actions in the MVP.
            </div>
          </div>
          <div className="space-y-2">
            {plan.guardrails.map((g) => (
              <div key={g} className="flex gap-2 text-xs text-[#D1D5DB]">
                <Trophy className="w-3.5 h-3.5 text-[#F59E0B] mt-0.5 shrink-0" />
                <span>{g}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-[#9CA3AF] font-mono">match: {selectedId}</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {plan.apiCalls.map((call) => (
              <div key={call} className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#090909] px-2.5 py-2 text-[10px] font-mono text-[#D1D5DB] truncate">
                {call}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}
