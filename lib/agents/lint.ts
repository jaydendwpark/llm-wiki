/**
 * Lint pipeline — periodic wiki health check.
 *
 * Flow:
 *   load_all_pages → analyze_graph → llm_lint → apply_fixes → log
 */

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createServiceClient } from "@/lib/supabase/server";
import { LINT_SYSTEM_PROMPT, LINT_USER_TEMPLATE } from "@/lib/prompts/lint";
import { buildGraphData, findOrphans } from "@/lib/wiki/graph";
import { extractOutboundLinks } from "@/lib/wiki/parser";

const LintState = Annotation.Root({
  allPages: Annotation<PageData[]>(),
  allLinks: Annotation<LinkData[]>(),
  indexContent: Annotation<string>(),
  orphanSlugs: Annotation<string[]>(),
  brokenLinks: Annotation<string[]>(),
  llmResult: Annotation<LintResult | null>(),
  error: Annotation<string | null>(),
});

interface PageData {
  slug: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string[];
}

interface LinkData {
  from_slug: string;
  to_slug: string;
}

export interface LintIssue {
  type: "orphan" | "broken-link" | "contradiction" | "stale" | "missing-page" | "thin" | "missing-crossref";
  severity: "error" | "warning" | "info";
  slug: string;
  description: string;
  suggestion: string;
}

interface LintResult {
  issues: LintIssue[];
  fixes: Array<{
    slug: string;
    title: string;
    action: "create" | "update";
    content: string;
    summary: string;
  }>;
  summary: string;
}

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  maxTokens: 8192,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Nodes ───────────────────────────────────────────────────────────────────

async function loadAllPages(state: typeof LintState.State) {
  const supabase = createServiceClient();

  const [{ data: pages }, { data: links }] = await Promise.all([
    supabase.from("wiki_pages").select("slug, title, content, summary, tags"),
    supabase.from("wiki_links").select("from_slug, to_slug"),
  ]);

  const lines = ["# Wiki Index", ""];
  for (const p of pages ?? []) {
    lines.push(`- [[${p.title}]] (${p.slug}) — ${p.summary ?? ""}`);
  }

  return {
    allPages: (pages as PageData[]) ?? [],
    allLinks: (links as LinkData[]) ?? [],
    indexContent: lines.join("\n"),
  };
}

async function analyzeGraph(state: typeof LintState.State) {
  const graphData = buildGraphData(state.allPages, state.allLinks);
  const orphanSlugs = findOrphans(graphData);

  // Find broken links: to_slug not in any page slug
  const pageSlugs = new Set(state.allPages.map((p) => p.slug));
  const broken = [...new Set(
    state.allLinks
      .filter((l) => !pageSlugs.has(l.to_slug))
      .map((l) => l.to_slug)
  )];

  return { orphanSlugs, brokenLinks: broken };
}

async function llmLint(state: typeof LintState.State) {
  // Only send content summaries to avoid huge context
  const allPagesContent = state.allPages
    .slice(0, 30) // limit for token budget
    .map((p) => `### ${p.title} (${p.slug})\n${p.content.slice(0, 800)}`)
    .join("\n\n---\n\n");

  const userMessage = LINT_USER_TEMPLATE
    .replace("{indexContent}", state.indexContent)
    .replace("{allPagesContent}", allPagesContent)
    .replace("{orphanSlugs}", state.orphanSlugs.join(", ") || "none")
    .replace("{brokenLinks}", state.brokenLinks.join(", ") || "none");

  const response = await llm.invoke([
    new SystemMessage(LINT_SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ]);

  const text = response.content as string;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { error: "LLM did not return valid JSON" };

  try {
    return { llmResult: JSON.parse(jsonMatch[0]) as LintResult };
  } catch {
    return { error: "Failed to parse LLM JSON" };
  }
}

async function applyFixes(state: typeof LintState.State) {
  if (!state.llmResult?.fixes?.length) return {};
  const supabase = createServiceClient();

  for (const fix of state.llmResult.fixes) {
    const outbound = extractOutboundLinks(fix.content);

    await supabase.from("wiki_pages").upsert(
      { slug: fix.slug, title: fix.title, content: fix.content, summary: fix.summary },
      { onConflict: "slug" }
    );

    await supabase.from("wiki_links").delete().eq("from_slug", fix.slug);
    if (outbound.length) {
      await supabase.from("wiki_links").insert(
        outbound.map((to) => ({ from_slug: fix.slug, to_slug: to }))
      );
    }
  }

  return {};
}

async function appendLog(state: typeof LintState.State) {
  if (!state.llmResult) return {};
  const supabase = createServiceClient();

  await supabase.from("wiki_logs").insert({
    operation: "lint",
    title: `Health check — ${state.allPages.length} pages`,
    details: {
      issueCount: state.llmResult.issues.length,
      fixCount: state.llmResult.fixes.length,
      orphans: state.orphanSlugs.length,
      brokenLinks: state.brokenLinks.length,
      summary: state.llmResult.summary,
    },
  });

  return {};
}

// ─── Graph ───────────────────────────────────────────────────────────────────

const graph = new StateGraph(LintState)
  .addNode("load_all_pages", loadAllPages)
  .addNode("analyze_graph", analyzeGraph)
  .addNode("llm_lint", llmLint)
  .addNode("apply_fixes", applyFixes)
  .addNode("append_log", appendLog)
  .addEdge("__start__", "load_all_pages")
  .addEdge("load_all_pages", "analyze_graph")
  .addEdge("analyze_graph", "llm_lint")
  .addEdge("llm_lint", "apply_fixes")
  .addEdge("apply_fixes", "append_log")
  .addEdge("append_log", END);

export const lintGraph = graph.compile();

export async function runLint() {
  const result = await lintGraph.invoke({
    allPages: [],
    allLinks: [],
    indexContent: "",
    orphanSlugs: [],
    brokenLinks: [],
    llmResult: null,
    error: null,
  });
  if (result.error) throw new Error(result.error);
  return result.llmResult as LintResult;
}
