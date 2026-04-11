import { z, ZodSchema } from "zod";

/**
 * Robustly extracts and parses JSON from an LLM response.
 *
 * Priority order:
 * 1. ```json ... ``` code block
 * 2. First top-level { ... } object (greedy from last })
 * 3. Throws if neither found or schema validation fails
 */
export function parseLLMJson<T>(text: string, schema: ZodSchema<T>): T {
  // 1. Try to extract from ```json ... ``` code fence
  const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    const parsed = tryParse(fenceMatch[1]);
    if (parsed !== null) return schema.parse(parsed);
  }

  // 2. Try plain ``` ... ``` (without json label)
  const plainFenceMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (plainFenceMatch) {
    const parsed = tryParse(plainFenceMatch[1]);
    if (parsed !== null) return schema.parse(parsed);
  }

  // 3. Fallback: find the outermost { ... } using brace counting
  const extracted = extractOutermostObject(text);
  if (extracted !== null) {
    const parsed = tryParse(extracted);
    if (parsed !== null) return schema.parse(parsed);
  }

  throw new Error("No valid JSON found in LLM response");
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function extractOutermostObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

// ─── Zod schemas for each LLM operation ──────────────────────────────────────

const WikiPagePayloadSchema = z.object({
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  action: z.enum(["create", "update"]).optional(),
});

export const IngestResultSchema = z.object({
  summaryPage: WikiPagePayloadSchema,
  updatedPages: z.array(WikiPagePayloadSchema),
  logEntry: z.string(),
});

export const QueryResultSchema = z.object({
  answer: z.string(),
  citedPages: z.array(z.string()),
  shouldFile: z.boolean(),
  filedPage: z
    .object({
      slug: z.string(),
      title: z.string(),
      content: z.string(),
      summary: z.string(),
      tags: z.array(z.string()).default([]),
    })
    .nullable(),
});

const LintIssueSchema = z.object({
  type: z.enum([
    "orphan",
    "broken-link",
    "contradiction",
    "stale",
    "missing-page",
    "thin",
    "missing-crossref",
  ]),
  severity: z.enum(["error", "warning", "info"]),
  slug: z.string(),
  description: z.string(),
  suggestion: z.string(),
});

export const LintResultSchema = z.object({
  issues: z.array(LintIssueSchema),
  fixes: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      action: z.enum(["create", "update"]),
      content: z.string(),
      summary: z.string(),
    })
  ),
  summary: z.string(),
});
