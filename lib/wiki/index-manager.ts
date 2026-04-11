/**
 * Manages index.md — the master catalog of all wiki pages.
 * This file is the primary navigation artifact the LLM reads before answering queries.
 */

export interface IndexEntry {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: string;
}

export function buildIndexMarkdown(entries: IndexEntry[]): string {
  const grouped = new Map<string, IndexEntry[]>();
  for (const entry of entries) {
    const tag = entry.tags[0] ?? "General";
    if (!grouped.has(tag)) grouped.set(tag, []);
    grouped.get(tag)!.push(entry);
  }

  const sections: string[] = [
    "# Wiki Index",
    "",
    `> Auto-generated catalog. ${entries.length} pages total. Last updated: ${new Date().toISOString()}`,
    "",
  ];

  for (const [tag, items] of [...grouped.entries()].sort()) {
    sections.push(`## ${tag}`, "");
    for (const item of items.sort((a, b) => a.title.localeCompare(b.title))) {
      sections.push(`- [[${item.title}]] — ${item.summary}`);
    }
    sections.push("");
  }

  return sections.join("\n");
}

export function buildLogEntry(
  operation: "ingest" | "query" | "lint",
  title: string,
  details: string
): string {
  const date = new Date().toISOString().split("T")[0];
  return `## [${date}] ${operation} | ${title}\n\n${details}\n`;
}
