import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Zap, Shield, Lock, Code, HelpCircle, Coins, MessageSquare, ChevronRight } from 'lucide-react';
import { GUIDE_SECTIONS, type GuideArticle } from '@shared/config/guideContent';
import { cn } from '@shared/utils/format';
import { StateBlock } from '@shared/common/StateBlock';
import { ActionButton } from '@shared/common/ActionButton';

const ICON_MAP = {
  zap: Zap,
  shield: Shield,
  lock: Lock,
  code: Code,
  help: HelpCircle,
  coins: Coins,
  message: MessageSquare,
} as const;

export function GuidePage() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>(GUIDE_SECTIONS[0].articles[0].id);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GUIDE_SECTIONS.map((s) => [s.id, true])),
  );
  const [scrollPct, setScrollPct] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GUIDE_SECTIONS;
    return GUIDE_SECTIONS.map((s) => ({
      ...s,
      articles: s.articles.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
      ),
    })).filter((s) => s.articles.length > 0);
  }, [query]);

  const activeArticle: GuideArticle | undefined = useMemo(() => {
    for (const s of GUIDE_SECTIONS) {
      const a = s.articles.find((x) => x.id === active);
      if (a) return a;
    }
    return undefined;
  }, [active]);

  // scroll progress within content
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 0 ? (el.scrollTop / max) * 100 : 0);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [active]);

  // reset scroll on article change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [active]);

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full pb-10">
      <div className="relative">
        <div className="h-[2px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#BFFF00] transition-all duration-150"
            style={{ width: `${scrollPct}%`, boxShadow: '0 0 8px #BFFF0066' }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar TOC */}
        <aside className="lg:w-64 lg:shrink-0">
          <div className="sticky top-20 flex flex-col gap-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs..."
                className="w-full h-9 pl-9 pr-3 bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-lg text-xs text-[#F5F5F5] placeholder-[#7A7A7A] focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
              />
            </div>

            <select
              value={active}
              onChange={(event) => setActive(event.target.value)}
              className="lg:hidden h-10 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#161616] px-3 text-xs font-bold text-[#F5F5F5]"
              aria-label="Select guide article"
            >
              {filteredSections.flatMap((s) => s.articles.map((a) => (
                <option key={a.id} value={a.id}>{s.title} / {a.title}</option>
              )))}
            </select>

            <nav className="hidden lg:flex flex-col gap-1">
              {filteredSections.map((s) => {
                const Icon = ICON_MAP[s.iconName];
                const isOpen = expanded[s.id] ?? true;
                return (
                  <div key={s.id}>
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [s.id]: !isOpen }))}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#BFFF00]" />
                      <span className="font-bold uppercase tracking-wider text-[10px] flex-1 text-left">
                        {s.title}
                      </span>
                      <ChevronRight className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')} />
                    </button>
                    {isOpen && (
                      <div className="ml-3 border-l border-[rgba(255,255,255,0.06)] flex flex-col">
                        {s.articles.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => setActive(a.id)}
                            className={cn(
                              'pl-4 pr-2 py-1.5 text-left text-xs transition-colors',
                              active === a.id
                                ? 'text-[#BFFF00] font-semibold border-l-2 border-[#BFFF00] -ml-px'
                                : 'text-[#A3A3A3] hover:text-[#F5F5F5]',
                            )}
                          >
                            {a.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeArticle ? (
            <article
              ref={contentRef}
              className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 md:p-8 overflow-y-auto lg:max-h-[78vh]"
            >
              <h1 className="text-3xl font-extrabold text-[#F5F5F5] mb-6 tracking-tight">
                {activeArticle.title}
              </h1>
              <div className="prose prose-invert max-w-none">
                {activeArticle.body.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm text-[#D1D5DB] leading-7 mb-4 whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            </article>
          ) : (
            <StateBlock
              kind="empty"
              title="No article matches your search"
              body="Clear the search query or try a broader term across API, wallet, x402, and build docs."
              action={<ActionButton tone="secondary" onClick={() => setQuery('')}>Clear search</ActionButton>}
            />
          )}
        </div>
      </div>
    </div>
  );
}
