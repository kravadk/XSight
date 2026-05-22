import raw from './docsContent.md?raw';

/** Icon keys mapped to lucide icons in DocsPage. */
export type DocIconName = 'compass' | 'layers' | 'plug' | 'code';

export interface DocArticle {
  id: string;
  title: string;
  /** Markdown-lite body, rendered by `DocsMarkdown`. */
  body: string;
}

export interface DocTab {
  id: string;
  label: string;
  iconName: DocIconName;
  articles: DocArticle[];
}

/**
 * The X Cup documentation hub content lives as plain markdown in
 * `docsContent.md` (so ASCII diagrams and code need no escaping). Tabs and
 * articles are delimited by HTML comments:
 *   <!--TAB id|Label|icon-->        <!--ARTICLE id|Title-->
 * This parses that one file into the structured `DOC_TABS` the UI renders.
 */
function parseDocs(src: string): DocTab[] {
  const tabRe = /<!--TAB\s+([^|]+)\|([^|]+)\|([^>]+?)-->/g;
  const tabMarks: { id: string; label: string; icon: string; from: number; to: number }[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = tabRe.exec(src)) !== null) {
    tabMarks.push({
      id: tm[1].trim(),
      label: tm[2].trim(),
      icon: tm[3].trim(),
      from: tm.index,
      to: tabRe.lastIndex,
    });
  }

  return tabMarks.map((mark, t) => {
    const chunkEnd = t + 1 < tabMarks.length ? tabMarks[t + 1].from : src.length;
    const chunk = src.slice(mark.to, chunkEnd);

    const artRe = /<!--ARTICLE\s+([^|]+)\|([^>]+?)-->/g;
    const artMarks: { id: string; title: string; from: number; to: number }[] = [];
    let am: RegExpExecArray | null;
    while ((am = artRe.exec(chunk)) !== null) {
      artMarks.push({ id: am[1].trim(), title: am[2].trim(), from: am.index, to: artRe.lastIndex });
    }

    const articles: DocArticle[] = artMarks.map((a, i) => {
      const bodyEnd = i + 1 < artMarks.length ? artMarks[i + 1].from : chunk.length;
      return { id: a.id, title: a.title, body: chunk.slice(a.to, bodyEnd).trim() };
    });

    return { id: mark.id, label: mark.label, iconName: mark.icon as DocIconName, articles };
  });
}

export const DOC_TABS: DocTab[] = parseDocs(raw);
