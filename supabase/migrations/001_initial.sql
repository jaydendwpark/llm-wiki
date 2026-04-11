-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wiki pages
CREATE TABLE wiki_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  summary     TEXT,
  tags        TEXT[] DEFAULT '{}',
  source_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full text search index
CREATE INDEX wiki_pages_fts ON wiki_pages
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || content));

-- Raw sources
CREATE TABLE raw_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     TEXT NOT NULL,
  title        TEXT,
  content      TEXT,
  storage_path TEXT,
  mime_type    TEXT DEFAULT 'text/plain',
  ingested     BOOLEAN NOT NULL DEFAULT FALSE,
  ingested_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wiki links graph
CREATE TABLE wiki_links (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_slug TEXT NOT NULL REFERENCES wiki_pages(slug) ON DELETE CASCADE,
  to_slug   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_slug, to_slug)
);

CREATE INDEX wiki_links_from ON wiki_links(from_slug);
CREATE INDEX wiki_links_to   ON wiki_links(to_slug);

-- Operation log
CREATE TABLE wiki_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL CHECK (operation IN ('ingest', 'query', 'lint')),
  title     TEXT,
  details   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wiki_pages_updated_at
  BEFORE UPDATE ON wiki_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security (auth-aware)
ALTER TABLE wiki_pages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_logs   ENABLE ROW LEVEL SECURITY;

-- Public read for wiki pages; all write via service role
CREATE POLICY "wiki_pages_read"  ON wiki_pages  FOR SELECT USING (true);
CREATE POLICY "raw_sources_read" ON raw_sources FOR SELECT USING (true);
CREATE POLICY "wiki_links_read"  ON wiki_links  FOR SELECT USING (true);
CREATE POLICY "wiki_logs_read"   ON wiki_logs   FOR SELECT USING (true);

-- Supabase Storage bucket for raw sources
INSERT INTO storage.buckets (id, name, public)
VALUES ('raw-sources', 'raw-sources', false)
ON CONFLICT DO NOTHING;
