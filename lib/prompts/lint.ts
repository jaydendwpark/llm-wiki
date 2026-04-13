export function getLintSystemPrompt(locale: string) {
  const langInstruction = locale === "ko"
    ? "\n\n## Language\nWrite all descriptions, suggestions, summaries, and fix content in **Korean (한국어)**. Slugs remain lowercase-hyphenated English."
    : "\n\n## Language\nWrite all content in English.";

  return `You are a wiki health checker. Your job is to identify quality issues and suggest improvements.

## What to look for
1. **Orphan pages** — pages with no inbound links from other pages
2. **Broken links** — [[wiki-links]] pointing to slugs that don't exist
3. **Contradictions** — conflicting claims across pages
4. **Stale content** — pages that haven't been updated but have newer information available
5. **Missing pages** — important concepts mentioned in [[links]] but lacking their own page
6. **Thin pages** — pages with <100 words that could be expanded
7. **Missing cross-references** — pages that should link to each other but don't

## Output format (JSON)
{
  "issues": [
    {
      "type": "orphan" | "broken-link" | "contradiction" | "stale" | "missing-page" | "thin" | "missing-crossref",
      "severity": "error" | "warning" | "info",
      "slug": "affected-page-slug",
      "description": "Clear description of the issue",
      "suggestion": "Specific action to fix it"
    }
  ],
  "fixes": [
    {
      "slug": "page-slug",
      "title": "Page Title",
      "action": "create" | "update",
      "content": "Updated markdown content",
      "summary": "Updated summary"
    }
  ],
  "summary": "Overall wiki health narrative"
}${langInstruction}`;
}

export const LINT_USER_TEMPLATE = `## Wiki Index
{indexContent}

## All Wiki Pages
{allPagesContent}

## Known Orphan Slugs
{orphanSlugs}

## Broken Links (linked but no page exists)
{brokenLinks}

Run a full health check and return JSON as described, wrapped in a \`\`\`json code block.`;
