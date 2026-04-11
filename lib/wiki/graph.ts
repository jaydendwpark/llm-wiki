/**
 * Builds force-graph compatible node/link data from wiki_pages + wiki_links.
 */

export interface GraphNode {
  id: string;        // slug
  name: string;      // title
  val: number;       // size (based on inbound link count)
  group: string;     // first tag or "general"
  summary?: string;
}

export interface GraphLink {
  source: string;    // from slug
  target: string;    // to slug
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function buildGraphData(
  pages: Array<{ slug: string; title: string; tags: string[]; summary?: string | null }>,
  links: Array<{ from_slug: string; to_slug: string }>
): GraphData {
  // Count inbound links per node
  const inboundCount: Record<string, number> = {};
  for (const link of links) {
    inboundCount[link.to_slug] = (inboundCount[link.to_slug] ?? 0) + 1;
  }

  const nodes: GraphNode[] = pages.map((p) => ({
    id: p.slug,
    name: p.title,
    val: 1 + (inboundCount[p.slug] ?? 0) * 2,
    group: p.tags[0] ?? "general",
    summary: p.summary ?? undefined,
  }));

  const pageSet = new Set(pages.map((p) => p.slug));
  const graphLinks: GraphLink[] = links
    .filter((l) => pageSet.has(l.from_slug) && pageSet.has(l.to_slug))
    .map((l) => ({ source: l.from_slug, target: l.to_slug }));

  return { nodes, links: graphLinks };
}

/** Returns orphan slugs (nodes with no inbound links). */
export function findOrphans(data: GraphData): string[] {
  const hasInbound = new Set(data.links.map((l) => l.target));
  return data.nodes.filter((n) => !hasInbound.has(n.id)).map((n) => n.id);
}
