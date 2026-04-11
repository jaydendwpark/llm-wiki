/**
 * Ingest pipeline — LangGraph-based agent for processing raw sources.
 *
 * Flow:
 *   load_source → read_index → llm_analyze → persist_pages → append_log
 */

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createServiceClient } from "@/lib/supabase/server";
import { INGEST_SYSTEM_PROMPT, INGEST_USER_TEMPLATE } from "@/lib/prompts/ingest";
import { extractOutboundLinks } from "@/lib/wiki/parser";
import { parseLLMJson, IngestResultSchema } from "@/lib/utils/parse-llm-json";
import { z } from "zod";

type IngestResult = z.infer<typeof IngestResultSchema>;

const IngestState = Annotation.Root({
  sourceId: Annotation<string>(),
  filename: Annotation<string>(),
  sourceContent: Annotation<string>(),
  indexContent: Annotation<string>(),
  llmResult: Annotation<IngestResult | null>(),
  error: Annotation<string | null>(),
});

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  maxTokens: 8192,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Nodes ───────────────────────────────────────────────────────────────────

async function loadSource(state: typeof IngestState.State) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("raw_sources")
    .select("*")
    .eq("id", state.sourceId)
    .single();

  if (error || !data) return { error: `Source not found: ${state.sourceId}` };

  let content = data.content ?? "";
  if (!content && data.storage_path) {
    const { data: file } = await supabase.storage
      .from("raw-sources")
      .download(data.storage_path);
    if (file) content = await file.text();
  }

  return { filename: data.filename, sourceContent: content };
}

async function readIndex(state: typeof IngestState.State) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select("slug, title, summary, tags")
    .order("updated_at", { ascending: false });

  if (!data?.length) return { indexContent: "*(empty wiki — no pages yet)*" };

  const grouped = new Map<string, typeof data>();
  for (const p of data) {
    const tag = p.tags[0] ?? "General";
    if (!grouped.has(tag)) grouped.set(tag, []);
    grouped.get(tag)!.push(p);
  }

  const lines: string[] = ["# Wiki Index", ""];
  for (const [tag, pages] of [...grouped.entries()].sort()) {
    lines.push(`## ${tag}`, "");
    for (const p of pages) {
      lines.push(`- [[${p.title}]] (${p.slug}) — ${p.summary ?? "no summary"}`);
    }
    lines.push("");
  }

  return { indexContent: lines.join("\n") };
}

async function llmAnalyze(state: typeof IngestState.State) {
  if (state.error) return {};

  const userMessage = INGEST_USER_TEMPLATE
    .replace("{indexContent}", state.indexContent)
    .replace("{filename}", state.filename)
    .replace("{sourceContent}", state.sourceContent.slice(0, 60_000));

  const response = await llm.invoke([
    new SystemMessage(INGEST_SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ]);

  try {
    const result = parseLLMJson(response.content as string, IngestResultSchema);
    return { llmResult: result };
  } catch (err) {
    return { error: `LLM parse error: ${err instanceof Error ? err.message : err}` };
  }
}

async function persistPages(state: typeof IngestState.State) {
  if (state.error || !state.llmResult) return {};
  const supabase = createServiceClient();

  const allPages = [state.llmResult.summaryPage, ...state.llmResult.updatedPages];

  for (const page of allPages) {
    const outboundLinks = extractOutboundLinks(page.content);

    await supabase
      .from("wiki_pages")
      .upsert(
        { slug: page.slug, title: page.title, content: page.content, summary: page.summary, tags: page.tags },
        { onConflict: "slug" }
      );

    await supabase.from("wiki_links").delete().eq("from_slug", page.slug);
    if (outboundLinks.length > 0) {
      await supabase.from("wiki_links").insert(
        outboundLinks.map((to) => ({ from_slug: page.slug, to_slug: to }))
      );
    }
  }

  await supabase
    .from("raw_sources")
    .update({ ingested: true, ingested_at: new Date().toISOString() })
    .eq("id", state.sourceId);

  return {};
}

async function appendLog(state: typeof IngestState.State) {
  if (!state.llmResult) return {};
  const supabase = createServiceClient();

  await supabase.from("wiki_logs").insert({
    operation: "ingest",
    title: state.filename,
    details: {
      logEntry: state.llmResult.logEntry,
      pagesCreated: state.llmResult.updatedPages.filter((p) => p.action === "create").length,
      pagesUpdated: state.llmResult.updatedPages.filter((p) => p.action === "update").length,
    },
  });

  return {};
}

// ─── Graph ───────────────────────────────────────────────────────────────────

const graph = new StateGraph(IngestState)
  .addNode("load_source", loadSource)
  .addNode("read_index", readIndex)
  .addNode("llm_analyze", llmAnalyze)
  .addNode("persist_pages", persistPages)
  .addNode("append_log", appendLog)
  .addEdge("__start__", "load_source")
  .addEdge("load_source", "read_index")
  .addEdge("read_index", "llm_analyze")
  .addEdge("llm_analyze", "persist_pages")
  .addEdge("persist_pages", "append_log")
  .addEdge("append_log", END);

export const ingestGraph = graph.compile();

export async function runIngest(sourceId: string) {
  const result = await ingestGraph.invoke({
    sourceId,
    filename: "",
    sourceContent: "",
    indexContent: "",
    llmResult: null,
    error: null,
  });
  if (result.error) throw new Error(result.error);
  return result.llmResult as IngestResult;
}
