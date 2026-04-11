/**
 * Markdown rendering pipeline using unified/remark/rehype.
 *
 * Pipeline: remark-parse → remark-gfm → remarkWikiLinks → remark-rehype → rehype-sanitize → rehype-stringify
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Text, PhrasingContent } from "mdast";
import { toSlug } from "./parser";

// ─── Custom [[wiki-links]] remark plugin ─────────────────────────────────────

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

interface WikiLinkNode {
  type: "wikiLink";
  target: string;
  slug: string;
  alias: string;
  data: {
    hName: string;
    hProperties: { href: string; className: string };
    hChildren: Array<{ type: string; value: string }>;
  };
}

const remarkWikiLinks: Plugin<[], Root> = () => (tree) => {
  visit(tree, "text", (node: Text, index, parent) => {
    if (!parent || index === null) return;

    const matches: Array<{ start: number; end: number; target: string; alias: string }> = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(WIKI_LINK_RE.source, "g");

    while ((match = re.exec(node.value)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        target: match[1].trim(),
        alias: (match[2] ?? match[1]).trim(),
      });
    }

    if (matches.length === 0) return;

    const newNodes: PhrasingContent[] = [];
    let cursor = 0;

    for (const m of matches) {
      if (m.start > cursor) {
        newNodes.push({ type: "text", value: node.value.slice(cursor, m.start) });
      }

      const slug = toSlug(m.target);
      const linkNode: WikiLinkNode = {
        type: "wikiLink",
        target: m.target,
        slug,
        alias: m.alias,
        data: {
          hName: "a",
          hProperties: { href: `/wiki/${slug}`, className: "wiki-link" },
          hChildren: [{ type: "text", value: m.alias }],
        },
      };

      newNodes.push(linkNode as unknown as PhrasingContent);
      cursor = m.end;
    }

    if (cursor < node.value.length) {
      newNodes.push({ type: "text", value: node.value.slice(cursor) });
    }

    parent.children.splice(index, 1, ...newNodes);
  });
};

// ─── Sanitize schema: allow wiki-link class on <a> tags ──────────────────────

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["className", "wiki-link"],
    ],
  },
};

// ─── The processor ────────────────────────────────────────────────────────────

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikiLinks)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

export async function renderMarkdown(content: string): Promise<string> {
  const result = await processor.process(content);
  return String(result);
}
