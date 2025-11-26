-- Migration: Create session_metrics table for precomputed analytics
-- Purpose: Store aggregated metrics per session for fast dashboard queries
-- Date: 2025-01-25

-- Create session_metrics table
CREATE TABLE IF NOT EXISTS session_metrics (
  id SERIAL PRIMARY KEY,
  session_id INTEGER UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Query metrics
  query_count INTEGER DEFAULT 0,
  query_refinements INTEGER DEFAULT 0,
  avg_query_length NUMERIC(10,2),

  -- AI engagement metrics
  ai_platforms_used TEXT[], -- Array of platform names (e.g., ['chatgpt', 'perplexity'])
  ai_result_clicks INTEGER DEFAULT 0,
  ai_dwell_time_seconds INTEGER DEFAULT 0,

  -- E-commerce funnel metrics
  ecommerce_visits INTEGER DEFAULT 0,
  products_viewed INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ai_attributed_conversions INTEGER DEFAULT 0,

  -- Journey timing metrics
  ai_to_purchase_seconds INTEGER, -- Time from first AI interaction to conversion

  -- Timestamps
  computed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_metrics_session_id
  ON session_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_metrics_ai_conversions
  ON session_metrics(ai_attributed_conversions)
  WHERE ai_attributed_conversions > 0;

CREATE INDEX IF NOT EXISTS idx_metrics_platforms
  ON session_metrics USING gin(ai_platforms_used);

CREATE INDEX IF NOT EXISTS idx_metrics_conversions
  ON session_metrics(conversions)
  WHERE conversions > 0;

-- Create function to compute metrics for a session
CREATE OR REPLACE FUNCTION compute_session_metrics(p_session_id INTEGER)
RETURNS void AS $$
DECLARE
  v_query_texts TEXT[];
  v_ai_platforms TEXT[];
  v_ecommerce_urls TEXT[];
  v_first_ai_timestamp TIMESTAMP;
  v_first_conversion_timestamp TIMESTAMP;
  v_query_count INTEGER;
  v_query_refinements INTEGER;
  v_avg_query_length NUMERIC;
  v_ai_result_clicks INTEGER;
  v_ai_dwell_time INTEGER;
  v_ecommerce_visits INTEGER;
  v_products_viewed INTEGER;
  v_conversions INTEGER;
  v_ai_attributed_conversions INTEGER;
  v_ai_to_purchase_seconds INTEGER;
BEGIN
  -- Delete existing metrics if any
  DELETE FROM session_metrics WHERE session_id = p_session_id;

  -- Compute query metrics
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'ai_query_input'), 0),
    COALESCE(AVG(LENGTH(query_text)) FILTER (WHERE event_type = 'ai_query_input' AND query_text IS NOT NULL), 0)
  INTO
    v_query_count,
    v_avg_query_length
  FROM session_events
  WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id);

  -- Get query texts for refinement counting
  SELECT array_agg(query_text ORDER BY timestamp)
  INTO v_query_texts
  FROM session_events
  WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id)
    AND event_type = 'ai_query_input'
    AND query_text IS NOT NULL;

  -- Count refinements (simplified: count distinct queries)
  v_query_refinements := COALESCE(array_length(array_remove(v_query_texts, NULL), 1), 0) - 1;
  IF v_query_refinements < 0 THEN
    v_query_refinements := 0;
  END IF;

  -- Get AI platforms used
  SELECT array_agg(DISTINCT platform_name)
  INTO v_ai_platforms
  FROM session_events
  WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id)
    AND platform_type = 'ai'
    AND platform_name IS NOT NULL;

  -- Get AI engagement metrics
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'ai_result_click'), 0),
    COALESCE(SUM(dwell_time_ms) FILTER (WHERE platform_type = 'ai'), 0) / 1000
  INTO
    v_ai_result_clicks,
    v_ai_dwell_time
  FROM session_events
  WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id);

  -- Get ecommerce metrics
  SELECT
    COUNT(DISTINCT url),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'product_click'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'conversion_action'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'conversion_action' AND is_ai_attributed = TRUE), 0)
  INTO
    v_ecommerce_visits,
    v_products_viewed,
    v_conversions,
    v_ai_attributed_conversions
  FROM session_events
  WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id)
    AND platform_type = 'ecommerce';

  -- Get journey timing (AI to purchase)
  SELECT MIN(timestamp)
  INTO v_first_ai_timestamp
  FROM session_events
  WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id)
    AND platform_type = 'ai';

  SELECT MIN(timestamp)
  INTO v_first_conversion_timestamp
  FROM session_events
  WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id)
    AND event_type = 'conversion_action';

  -- Calculate time difference if both exist
  v_ai_to_purchase_seconds := NULL;
  IF v_first_ai_timestamp IS NOT NULL AND v_first_conversion_timestamp IS NOT NULL THEN
    v_ai_to_purchase_seconds := EXTRACT(EPOCH FROM (v_first_conversion_timestamp - v_first_ai_timestamp))::INTEGER;
  END IF;

  -- Insert computed metrics
  INSERT INTO session_metrics (
    session_id,
    query_count,
    query_refinements,
    avg_query_length,
    ai_platforms_used,
    ai_result_clicks,
    ai_dwell_time_seconds,
    ecommerce_visits,
    products_viewed,
    conversions,
    ai_attributed_conversions,
    ai_to_purchase_seconds
  ) VALUES (
    p_session_id,
    v_query_count,
    v_query_refinements,
    v_avg_query_length,
    v_ai_platforms,
    v_ai_result_clicks,
    v_ai_dwell_time,
    v_ecommerce_visits,
    v_products_viewed,
    v_conversions,
    v_ai_attributed_conversions,
    v_ai_to_purchase_seconds
  );

  -- Update session totals
  UPDATE sessions
  SET
    total_events = (SELECT COUNT(*) FROM session_events WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id)),
    total_pages = (SELECT COUNT(DISTINCT url) FROM session_events WHERE session_id IN (SELECT id FROM sessions WHERE id = p_session_id) AND event_type = 'page_load')
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically compute metrics on session end
CREATE OR REPLACE FUNCTION auto_compute_metrics_on_session_end()
RETURNS TRIGGER AS $$
BEGIN
  -- If session was marked as complete, compute metrics
  IF NEW.is_complete = TRUE AND OLD.is_complete = FALSE THEN
    PERFORM compute_session_metrics(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_compute_metrics ON sessions;
CREATE TRIGGER trigger_auto_compute_metrics
  AFTER UPDATE ON sessions
  FOR EACH ROW
  WHEN (NEW.is_complete = TRUE AND OLD.is_complete = FALSE)
  EXECUTE FUNCTION auto_compute_metrics_on_session_end();

-- Add helpful comments
COMMENT ON TABLE session_metrics IS 'Precomputed analytics metrics for each session';
COMMENT ON COLUMN session_metrics.query_count IS 'Total number of AI queries in session';
COMMENT ON COLUMN session_metrics.query_refinements IS 'Number of query refinements/iterations';
COMMENT ON COLUMN session_metrics.avg_query_length IS 'Average length of queries in characters';
COMMENT ON COLUMN session_metrics.ai_platforms_used IS 'Array of AI platform names used in session';
COMMENT ON COLUMN session_metrics.ai_result_clicks IS 'Number of clicks on AI-provided links';
COMMENT ON COLUMN session_metrics.ai_dwell_time_seconds IS 'Total time spent on AI platforms';
COMMENT ON COLUMN session_metrics.ecommerce_visits IS 'Number of unique ecommerce URLs visited';
COMMENT ON COLUMN session_metrics.products_viewed IS 'Number of product pages viewed';
COMMENT ON COLUMN session_metrics.conversions IS 'Number of conversion actions (add to cart, checkout)';
COMMENT ON COLUMN session_metrics.ai_attributed_conversions IS 'Conversions attributed to AI referral';
COMMENT ON COLUMN session_metrics.ai_to_purchase_seconds IS 'Time from first AI interaction to first conversion';

-- Compute metrics for existing sessions
-- Note: This may take a while for large databases
-- Uncomment to run:
-- DO $$
-- DECLARE
--   r RECORD;
-- BEGIN
--   FOR r IN SELECT id FROM sessions WHERE is_complete = TRUE LOOP
--     PERFORM compute_session_metrics(r.id);
--   END LOOP;
-- END $$;
