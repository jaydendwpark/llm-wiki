/**
 * Ingest pipeline — LangGraph-based agent for processing raw sources.
 *
 * Flow:
 *   load_source → read_index → llm_analyze → persist_pages → append_log
 *
 * Uses Gemini 2.5 Flash (1M context window — handles large source documents).
 */

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { createServiceClient } from "@/lib/supabase/server";
import { getIngestSystemPrompt, INGEST_USER_TEMPLATE } from "@/lib/prompts/ingest";
import { extractOutboundLinks } from "@/lib/wiki/parser";
import { parseLLMJson, IngestResultSchema } from "@/lib/utils/parse-llm-json";
import { callLLM, LLMUsage } from "@/lib/agents/llm";
import { recordUsage } from "@/lib/usage/tracker";
import { z } from "zod";

type IngestResult = z.infer<typeof IngestResultSchema>;

const IngestState = Annotation.Root({
  sourceId:      Annotation<string>(),
  userId:        Annotation<string>(),
  locale:        Annotation<string>(),
  filename:      Annotation<string>(),
  sourceContent: Annotation<string>(),
  indexContent:  Annotation<string>(),
  llmResult:     Annotation<IngestResult | null>(),
  llmUsage:      Annotation<LLMUsage | null>(),
  error:         Annotation<string | null>(),
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
    .replace("{sourceContent}", state.sourceContent.slice(0, 800_000)); // ~200K tokens (800K chars)

  const { text, usage } = await callLLM({
    system: getIngestSystemPrompt(state.locale),
    user: userMessage,
  });

  try {
    const result = parseLLMJson(text, IngestResultSchema);
    return { llmResult: result, llmUsage: usage };
  } catch (err) {
    return { error: `LLM parse error: ${err instanceof Error ? err.message : err}` };
  }
}

async function persistPages(state: typeof IngestState.State) {
  if (state.error || !state.llmResult) return {};
  const supabase = createServiceClient();
  const errors: string[] = [];

  const allPages = [state.llmResult.summaryPage, ...state.llmResult.updatedPages];

  for (const page of allPages) {
    const outboundLinks = extractOutboundLinks(page.content);

    const { error: upsertErr } = await supabase
      .from("wiki_pages")
      .upsert(
        {
          slug: page.slug, title: page.title, content: page.content,
          summary: page.summary, tags: page.tags,
          user_id: state.userId,
        },
        { onConflict: "slug" }
      );
    if (upsertErr) {
      console.error(`[ingest] upsert wiki_pages failed for ${page.slug}:`, upsertErr.message);
      errors.push(`upsert ${page.slug}: ${upsertErr.message}`);
      continue;
    }

    const { error: delErr } = await supabase.from("wiki_links").delete().eq("from_slug", page.slug);
    if (delErr) console.error(`[ingest] delete wiki_links failed:`, delErr.message);

    if (outboundLinks.length > 0) {
      const { error: linkErr } = await supabase.from("wiki_links").insert(
        outboundLinks.map((to) => ({ from_slug: page.slug, to_slug: to, user_id: state.userId }))
      );
      if (linkErr) console.error(`[ingest] insert wiki_links failed:`, linkErr.message);
    }
  }

  if (errors.length > 0 && errors.length === allPages.length) {
    return { error: `All page upserts failed: ${errors.join("; ")}` };
  }

  const { error: markErr } = await supabase
    .from("raw_sources")
    .update({ ingested: true, ingested_at: new Date().toISOString() })
    .eq("id", state.sourceId);
  if (markErr) console.error(`[ingest] mark ingested failed:`, markErr.message);

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

  // Fire-and-forget: usage tracking must not fail the main operation
  if (state.llmUsage) {
    recordUsage(state.userId, "ingest", state.llmUsage).catch(console.error);
  }

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

export async function runIngest(sourceId: string, userId: string, locale = "en") {
  const result = await ingestGraph.invoke({
    sourceId, userId, locale,
    filename: "", sourceContent: "", indexContent: "",
    llmResult: null, llmUsage: null, error: null,
  });
  if (result.error) throw new Error(result.error);
  return result.llmResult as IngestResult;
}
