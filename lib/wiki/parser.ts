/**
 * Parses [[wiki-links]] in markdown content.
 * Supports [[Page Name]], [[Page Name|Alias]], and [[page-slug]].
 */

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export interface WikiLink {
  raw: string;       // full match: [[Page Name|Alias]]
  target: string;    // "Page Name"
  slug: string;      // "page-name"
  alias: string;     // display text
}

export function parseWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK_RE.source, "g");
  while ((match = re.exec(content)) !== null) {
    const target = match[1].trim();
    const alias = match[2]?.trim() ?? target;
    links.push({
      raw: match[0],
      target,
      slug: toSlug(target),
      alias,
    });
  }
  return links;
}

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Replaces [[wiki-links]] in content with HTML anchor tags.
 * Uses base path for href construction.
 */
export function renderWikiLinks(content: string, basePath = "/wiki"): string {
  return content.replace(WIKI_LINK_RE, (_match, target, alias) => {
    const slug = toSlug(target.trim());
    const label = alias?.trim() ?? target.trim();
    return `<a href="${basePath}/${slug}" class="wiki-link">${label}</a>`;
  });
}

/**
 * Extract unique outbound slugs from a page's content.
 */
export function extractOutboundLinks(content: string): string[] {
  const links = parseWikiLinks(content);
  return [...new Set(links.map((l) => l.slug))];
}
