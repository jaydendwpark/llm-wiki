# LLM Wiki — Agent Schema

This is the schema file for the LLM Wiki system, based on Andrej Karpathy's pattern.
It governs how the AI agent writes and maintains the wiki.

---

## Architecture

Three immutable layers:

```
raw/          ← append-only source documents (never modify)
wiki/         ← LLM-owned markdown pages (your domain)
CLAUDE.md     ← this schema (co-evolved with the user)
```

---

## File Naming Rules

- **Wiki pages**: `wiki/<slug>.md` — lowercase, hyphenated, no special chars
  - Entities: `entity-<name>.md` (e.g. `entity-transformer.md`)
  - Concepts: `concept-<name>.md` (e.g. `concept-attention.md`)
  - Sources: `source-<title>.md` (e.g. `source-attention-is-all-you-need.md`)
  - Query results: `query-<topic>.md` (e.g. `query-transformer-vs-rnn.md`)
- **Slugs** must be deterministic from the title: `toSlug(title)`

## Page Format

Every wiki page MUST include a YAML frontmatter block:

```yaml
---
title: "Page Title"
tags: [concept, relevant-tag]
summary: "One-sentence TLDR used in index.md"
sources: ["source-slug-1"]
updated: "2026-04-11"
---
```

Followed by the markdown body. Use `##` for sections. **All links to other wiki pages MUST use `[[wiki-links]]`** format, never plain markdown links.

---

## Ingest Workflow

When a new source arrives in `raw/`:

1. **Read** the source completely
2. **Discuss** key takeaways with the user (optional, but recommended for first-time topics)
3. **Write** a summary page (`wiki/source-<title>.md`) with:
   - Abstract: what the source is about
   - Key claims (bulleted)
   - Entities mentioned → link to their pages with `[[entity-name]]`
   - Contradictions with existing wiki pages flagged explicitly
4. **Update** 10-15 existing pages:
   - Add cross-references: `See also: [[new-source-title]]`
   - Update claims with new evidence
   - Flag contradictions: `⚠️ CONTRADICTION with [[Other Page]]: ...`
5. **Update** `wiki/index.md` — add new pages to their category
6. **Append** to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD] ingest | Source Title
   Summary of what was added and which pages were updated.
   ```

**Token budget**: a single ingest may touch 10-15 pages. Prioritize pages the source directly discusses.

---

## Query Workflow

When the user asks a question:

1. **Read** `wiki/index.md` to find relevant pages
2. **Load** the relevant pages (typically 3-8)
3. **Answer** with citations using `[[wiki-links]]`
4. **Decide**: is this answer worth filing back into the wiki?
   - File it if: novel synthesis, reusable analysis, discovered connection
   - Don't file if: simple factual lookup, already covered elsewhere
5. If filing: write `wiki/query-<topic>.md` and update `wiki/index.md`
6. **Append** to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD] query | Question text
   Answer summary. Filed: yes/no (slug if yes).
   ```

---

## Lint Workflow

Run periodically or on request:

1. Scan all pages for:
   - **Orphan pages**: no inbound `[[links]]` from other pages
   - **Broken links**: `[[slug]]` that has no corresponding page
   - **Contradictions**: conflicting claims (flag with `⚠️ CONTRADICTION`)
   - **Thin pages**: < 100 words — expand or merge
   - **Stale claims**: newer sources have superseded information
   - **Missing pages**: concepts mentioned but lacking their own page
2. For each issue: either auto-fix or propose fix to user
3. **Append** to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD] lint | Health check
   N issues found: X orphans, Y broken links, Z contradictions.
   Fixed: ..., Proposed: ...
   ```

---

## Cross-referencing Rules

- **Every page** must link to 3-8 related pages via `[[wiki-links]]`
- When creating a new page, scan `wiki/index.md` for related entities
- When updating a page, check if new links can be added
- The goal: the wiki should be navigable purely by following links

---

## Contradiction Handling

When a new source contradicts an existing claim:

```markdown
> ⚠️ **CONTRADICTION** — [[Source A]] claims X, but [[Source B]] claims Y.
> Status: unresolved | Resolution: ...
```

Do not silently overwrite. Flag contradictions explicitly. The user decides resolution.

---

## Index Format (`wiki/index.md`)

```markdown
# Wiki Index

> N pages total. Last updated: YYYY-MM-DD.

## Concepts
- [[Concept Name]] (concept-slug) — One-line TLDR

## Entities
- [[Entity Name]] (entity-slug) — One-line TLDR

## Sources
- [[Source Title]] (source-slug) — One-line TLDR

## Query Results
- [[Query: Topic]] (query-slug) — One-line TLDR
```

---

## Log Format (`wiki/log.md`)

```markdown
# Wiki Log

## [YYYY-MM-DD] ingest | Title
Details...

## [YYYY-MM-DD] query | Question
Details...

## [YYYY-MM-DD] lint | Health check
Details...
```

Parse with: `grep "^## \[" wiki/log.md | tail -10`

---

## Principles

1. **The wiki is the product.** Chat history is ephemeral. The wiki is permanent.
2. **Dense links > sparse links.** Every page should be reachable within 2 hops.
3. **Immutable sources.** Never edit files in `raw/`.
4. **File good answers.** Valuable synthesis should not disappear into chat.
5. **Flag, don't overwrite.** Contradictions are information. Preserve them.
6. **One-line summaries.** Every page needs a summary for `index.md`.
7. **Co-evolve this schema.** When a new pattern works well, document it here.
