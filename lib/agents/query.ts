/**
 * Query pipeline — LangGraph agent for answering questions against the wiki.
 *
 * Flow:
 *   read_index → find_relevant_pages → load_pages → llm_answer → file_back → log
 */

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createServiceClient } from "@/lib/supabase/server";
import { QUERY_SYSTEM_PROMPT, QUERY_USER_TEMPLATE } from "@/lib/prompts/query";
import { extractOutboundLinks } from "@/lib/wiki/parser";

const QueryState = Annotation.Root({
  question: Annotation<string>(),
  indexContent: Annotation<string>(),
  relevantSlugs: Annotation<string[]>(),
  pagesContent: Annotation<string>(),
  llmResult: Annotation<QueryResult | null>(),
  error: Annotation<string | null>(),
});

interface QueryResult {
  answer: string;
  citedPages: string[];
  shouldFile: boolean;
  filedPage: {
    slug: string;
    title: string;
    content: string;
    summary: string;
    tags: string[];
  } | null;
}

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  maxTokens: 8192,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Nodes ───────────────────────────────────────────────────────────────────

async function readIndex(state: typeof QueryState.State) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select("slug, title, summary, tags")
    .order("updated_at", { ascending: false });

  if (!data?.length) return { indexContent: "*(empty wiki)*", relevantSlugs: [] };

  const lines = ["# Wiki Index", ""];
  for (const p of data) {
    lines.push(`- [[${p.title}]] (${p.slug}) — ${p.summary ?? ""}`);
  }

  return { indexContent: lines.join("\n"), relevantSlugs: [] };
}

async function findRelevantPages(state: typeof QueryState.State) {
  // Use Supabase full-text search to find relevant pages
  const supabase = createServiceClient();
  const words = state.question.split(/\s+/).slice(0, 10).join(" & ");

  const { data } = await supabase
    .from("wiki_pages")
    .select("slug")
    .textSearch("content", words, { type: "websearch" })
    .limit(8);

  const slugs = data?.map((p) => p.slug) ?? [];
  return { relevantSlugs: slugs };
}

async function loadPages(state: typeof QueryState.State) {
  if (!state.relevantSlugs.length) {
    return { pagesContent: "*(no relevant pages found)*" };
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select("slug, title, content")
    .in("slug", state.relevantSlugs);

  if (!data?.length) return { pagesContent: "*(no pages loaded)*" };

  const sections = data.map(
    (p) => `## ${p.title} (${p.slug})\n\n${p.content}`
  );
  return { pagesContent: sections.join("\n\n---\n\n") };
}

async function llmAnswer(state: typeof QueryState.State) {
  const userMessage = QUERY_USER_TEMPLATE
    .replace("{indexContent}", state.indexContent)
    .replace("{pagesContent}", state.pagesContent)
    .replace("{question}", state.question);

  const response = await llm.invoke([
    new SystemMessage(QUERY_SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ]);

  const text = response.content as string;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { error: "LLM did not return valid JSON" };

  try {
    return { llmResult: JSON.parse(jsonMatch[0]) as QueryResult };
  } catch {
    return { error: "Failed to parse LLM JSON" };
  }
}

async function fileBack(state: typeof QueryState.State) {
  if (!state.llmResult?.shouldFile || !state.llmResult.filedPage) return {};

  const supabase = createServiceClient();
  const page = state.llmResult.filedPage;
  const outbound = extractOutboundLinks(page.content);

  await supabase.from("wiki_pages").upsert(
    { slug: page.slug, title: page.title, content: page.content, summary: page.summary, tags: page.tags },
    { onConflict: "slug" }
  );

  await supabase.from("wiki_links").delete().eq("from_slug", page.slug);
  if (outbound.length) {
    await supabase.from("wiki_links").insert(
      outbound.map((to) => ({ from_slug: page.slug, to_slug: to }))
    );
  }

  return {};
}

async function appendLog(state: typeof QueryState.State) {
  if (!state.llmResult) return {};
  const supabase = createServiceClient();

  await supabase.from("wiki_logs").insert({
    operation: "query",
    title: state.question.slice(0, 100),
    details: {
      citedPages: state.llmResult.citedPages,
      filed: state.llmResult.shouldFile,
      filedSlug: state.llmResult.filedPage?.slug ?? null,
    },
  });

  return {};
}

// ─── Graph ───────────────────────────────────────────────────────────────────

const graph = new StateGraph(QueryState)
  .addNode("read_index", readIndex)
  .addNode("find_relevant_pages", findRelevantPages)
  .addNode("load_pages", loadPages)
  .addNode("llm_answer", llmAnswer)
  .addNode("file_back", fileBack)
  .addNode("append_log", appendLog)
  .addEdge("__start__", "read_index")
  .addEdge("read_index", "find_relevant_pages")
  .addEdge("find_relevant_pages", "load_pages")
  .addEdge("load_pages", "llm_answer")
  .addEdge("llm_answer", "file_back")
  .addEdge("file_back", "append_log")
  .addEdge("append_log", END);

export const queryGraph = graph.compile();

export async function runQuery(question: string) {
  const result = await queryGraph.invoke({
    question,
    indexContent: "",
    relevantSlugs: [],
    pagesContent: "",
    llmResult: null,
    error: null,
  });
  if (result.error) throw new Error(result.error);
  return result.llmResult as QueryResult;
}
