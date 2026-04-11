-- Migration 002: FTS generated column, user_id, source_count removal

-- 1. Drop the old expression-based FTS index
DROP INDEX IF EXISTS wiki_pages_fts;

-- 2. Add fts generated column for proper Supabase .textSearch() support
ALTER TABLE wiki_pages
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english',
        COALESCE(title, '') || ' ' ||
        COALESCE(summary, '') || ' ' ||
        COALESCE(content, '')
      )
    ) STORED;

CREATE INDEX wiki_pages_fts_idx ON wiki_pages USING GIN (fts);

-- 3. Remove source_count (never updated, replaced by query-time COUNT)
ALTER TABLE wiki_pages DROP COLUMN IF EXISTS source_count;

-- 4. Add user_id to all tables for multi-user support
ALTER TABLE wiki_pages  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE raw_sources ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE wiki_links  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE wiki_logs   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Update RLS policies to be user-scoped
-- wiki_pages
DROP POLICY IF EXISTS "wiki_pages_read" ON wiki_pages;
CREATE POLICY "wiki_pages_select" ON wiki_pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wiki_pages_insert" ON wiki_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wiki_pages_update" ON wiki_pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wiki_pages_delete" ON wiki_pages FOR DELETE USING (auth.uid() = user_id);

-- raw_sources
DROP POLICY IF EXISTS "raw_sources_read" ON raw_sources;
CREATE POLICY "raw_sources_select" ON raw_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "raw_sources_insert" ON raw_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "raw_sources_update" ON raw_sources FOR UPDATE USING (auth.uid() = user_id);

-- wiki_links
DROP POLICY IF EXISTS "wiki_links_read" ON wiki_links;
CREATE POLICY "wiki_links_select" ON wiki_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wiki_links_insert" ON wiki_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wiki_links_delete" ON wiki_links FOR DELETE USING (auth.uid() = user_id);

-- wiki_logs
DROP POLICY IF EXISTS "wiki_logs_read" ON wiki_logs;
CREATE POLICY "wiki_logs_select" ON wiki_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wiki_logs_insert" ON wiki_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Storage bucket policies
CREATE POLICY "raw_sources_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'raw-sources' AND auth.uid() IS NOT NULL);

CREATE POLICY "raw_sources_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'raw-sources' AND auth.uid() IS NOT NULL);
