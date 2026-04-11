-- Migration 003: Per-user monthly usage tracking (Gemini 2.5 Flash)

-- ── user_plans: one row per user, stores their monthly cost cap ──────────────
CREATE TABLE IF NOT EXISTS public.user_plans (
  user_id                UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name              TEXT    NOT NULL DEFAULT 'free',
  monthly_cost_limit_usd NUMERIC(10,4) NOT NULL DEFAULT 3.0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own plan" ON public.user_plans;
CREATE POLICY "users can read own plan"
  ON public.user_plans FOR SELECT
  USING (auth.uid() = user_id);

-- ── user_usage: one row per (user_id, month), accumulates costs ──────────────
CREATE TABLE IF NOT EXISTS public.user_usage (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month           CHAR(7) NOT NULL,           -- 'YYYY-MM'
  total_cost_usd  NUMERIC(10,6) NOT NULL DEFAULT 0,
  ingest_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  query_cost_usd  NUMERIC(10,6) NOT NULL DEFAULT 0,
  lint_cost_usd   NUMERIC(10,6) NOT NULL DEFAULT 0,
  input_tokens    BIGINT NOT NULL DEFAULT 0,
  output_tokens   BIGINT NOT NULL DEFAULT 0,  -- includes thinking tokens
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own usage" ON public.user_usage;
CREATE POLICY "users can read own usage"
  ON public.user_usage FOR SELECT
  USING (auth.uid() = user_id);

-- ── Atomic upsert + increment function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_user_usage(
  p_user_id       UUID,
  p_month         CHAR(7),
  p_operation     TEXT,
  p_cost_usd      NUMERIC,
  p_input_tokens  BIGINT,
  p_output_tokens BIGINT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_usage (
    user_id, month,
    total_cost_usd,
    ingest_cost_usd, query_cost_usd, lint_cost_usd,
    input_tokens, output_tokens
  )
  VALUES (
    p_user_id, p_month,
    p_cost_usd,
    CASE WHEN p_operation = 'ingest' THEN p_cost_usd ELSE 0 END,
    CASE WHEN p_operation = 'query'  THEN p_cost_usd ELSE 0 END,
    CASE WHEN p_operation = 'lint'   THEN p_cost_usd ELSE 0 END,
    p_input_tokens, p_output_tokens
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    total_cost_usd  = user_usage.total_cost_usd  + EXCLUDED.total_cost_usd,
    ingest_cost_usd = user_usage.ingest_cost_usd + EXCLUDED.ingest_cost_usd,
    query_cost_usd  = user_usage.query_cost_usd  + EXCLUDED.query_cost_usd,
    lint_cost_usd   = user_usage.lint_cost_usd   + EXCLUDED.lint_cost_usd,
    input_tokens    = user_usage.input_tokens    + EXCLUDED.input_tokens,
    output_tokens   = user_usage.output_tokens   + EXCLUDED.output_tokens,
    updated_at      = NOW();

  -- Ensure the user has a plan row (default free tier)
  INSERT INTO public.user_plans (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
