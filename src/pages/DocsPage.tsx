import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Compass, Layers, Plug, Code2 } from 'lucide-react';
import { DOC_TABS, type DocIconName } from '@shared/config/docsContent';
import { PageHeader } from '@xcup/components/cup/CupKit';
import { DocsMarkdown } from '@shared/docs/DocsMarkdown';
import { StateBlock } from '@shared/common/StateBlock';
import { cn } from '@shared/utils/format';

const TAB_ICON: Record<DocIconName, typeof Compass> = {
  compass: Compass,
  layers: Layers,
  plug: Plug,
  code: Code2,
};

/**
 * X Cup documentation hub — a tabbed reader for the four doc sections
 * (Overview · Architecture · Integrations · API & Contracts). Content comes
 * from `DOC_TABS`; each article body is rendered by `DocsMarkdown`.
 */
export function DocsPage() {
  const [tabId, setTabId] = useState(DOC_TABS[0].id);
  const [articleId, setArticleId] = useState(DOC_TABS[0].articles[0].id);
  const [query, setQuery] = useState('');
  const [scrollPct, setScrollPct] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const tab = DOC_TABS.find((t) => t.id === tabId) ?? DOC_TABS[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tab.articles;
    return tab.articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
    );
  }, [tab, query]);

  const article = useMemo(
    () => tab.articles.find((a) => a.id === articleId) ?? null,
    [tab, articleId],
  );

  function selectTab(id: string) {
    const next = DOC_TABS.find((t) => t.id === id);
    if (!next) return;
    setTabId(id);
    setArticleId(next.articles[0].id);
    setQuery('');
  }

  // scroll progress within the article panel
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
  }, [articleId, tabId]);

  // reset scroll when the article changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [articleId, tabId]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-10">
      <PageHeader
        kicker="Learn"
        title="Documentation"
        sub="How X Cup works — the product, the architecture, the OKX integrations and the on-chain API."
      />

      {/* tab bar */}
      <div className="flex flex-wrap gap-2">
        {DOC_TABS.map((t) => {
          const Icon = TAB_ICON[t.iconName];
          const active = t.id === tabId;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors',
                active
                  ? 'bg-pitch text-stadium-base'
                  : 'border border-stadium-line text-stadium-text-secondary hover:text-stadium-text',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* scroll progress */}
      <div className="h-[2px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full bg-pitch transition-all duration-150"
          style={{ width: `${scrollPct}%`, boxShadow: '0 0 8px rgba(52,193,114,0.4)' }}
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* article TOC for the active tab */}
        <aside className="lg:w-64 lg:shrink-0">
          <div className="sticky top-20 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stadium-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${tab.label}…`}
                className="h-9 w-full rounded-lg border border-stadium-line bg-stadium-base pl-9 pr-3 text-xs text-stadium-text placeholder-stadium-text-muted outline-none focus:border-pitch-border"
              />
            </div>

            {/* mobile article picker */}
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="h-10 w-full rounded-xl border border-stadium-line bg-stadium-base px-3 text-xs font-bold text-stadium-text lg:hidden"
              aria-label="Select article"
            >
              {tab.articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>

            <nav className="hidden flex-col gap-0.5 lg:flex">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setArticleId(a.id)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-xs transition-colors',
                    a.id === articleId
                      ? 'bg-pitch-bg font-semibold text-pitch'
                      : 'text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.04)] hover:text-stadium-text',
                  )}
                >
                  {a.title}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-xs text-stadium-text-muted">No matches</div>
              )}
            </nav>
          </div>
        </aside>

        {/* article content */}
        <div className="min-w-0 flex-1">
          {article ? (
            <article
              ref={contentRef}
              className="stadium-card overflow-y-auto p-5 md:p-7 lg:max-h-[76vh]"
            >
              <div className="mb-1 text-micro text-pitch">{tab.label}</div>
              <h1 className="font-display mb-5 text-2xl tracking-wide text-stadium-text md:text-3xl">
                {article.title}
              </h1>
              <DocsMarkdown body={article.body} />
            </article>
          ) : (
            <StateBlock
              kind="empty"
              title="Article not found"
              body="Pick another article from the list."
            />
          )}
        </div>
      </div>
    </div>
  );
}
