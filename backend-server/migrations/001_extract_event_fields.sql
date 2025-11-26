-- Migration: Extract key event fields from JSONB for faster queries
-- Purpose: Improve query performance by creating indexed columns for frequently accessed fields
-- Date: 2025-01-25

-- CRITICAL: Convert event_data from JSON to JSONB to support ? operator
-- This must happen BEFORE the trigger function that uses ? operator
DO $$
BEGIN
  -- Check if column is JSON type and convert to JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_events'
    AND column_name = 'event_data'
    AND data_type = 'json'
  ) THEN
    ALTER TABLE session_events
      ALTER COLUMN event_data TYPE jsonb USING event_data::jsonb;
    RAISE NOTICE 'Converted event_data from JSON to JSONB';
  END IF;
END $$;

-- Add new columns to session_events table
ALTER TABLE session_events
ADD COLUMN IF NOT EXISTS platform_type VARCHAR(32),
ADD COLUMN IF NOT EXISTS platform_name VARCHAR(64),
ADD COLUMN IF NOT EXISTS query_text TEXT,
ADD COLUMN IF NOT EXISTS clicked_url TEXT,
ADD COLUMN IF NOT EXISTS is_ai_attributed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scroll_depth INTEGER,
ADD COLUMN IF NOT EXISTS dwell_time_ms INTEGER;

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_events_platform_type
  ON session_events(platform_type)
  WHERE platform_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_platform_name
  ON session_events(platform_name)
  WHERE platform_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_ai_attributed
  ON session_events(is_ai_attributed)
  WHERE is_ai_attributed = TRUE;

-- Full-text search index for query text
CREATE INDEX IF NOT EXISTS idx_events_query_text_gin
  ON session_events
  USING gin(to_tsvector('english', query_text))
  WHERE query_text IS NOT NULL;

-- Index for clicked URLs (useful for tracking click-through behavior)
CREATE INDEX IF NOT EXISTS idx_events_clicked_url
  ON session_events(clicked_url)
  WHERE clicked_url IS NOT NULL;

-- Composite index for common queries (platform-specific event filtering)
CREATE INDEX IF NOT EXISTS idx_events_platform_type_event_type
  ON session_events(platform_type, event_type, timestamp DESC);

-- Backfill existing data from JSONB to new columns
UPDATE session_events
SET
  platform_type = event_data->>'platformType',
  platform_name = event_data->>'platformName',
  query_text = event_data->>'queryText',
  clicked_url = COALESCE(event_data->>'destination', event_data->>'productUrl'),
  -- OR both AI attribution flags (matching Python and trigger logic)
  is_ai_attributed = (
    COALESCE((event_data->>'isAIToEcommerce')::boolean, FALSE) OR
    COALESCE((event_data->>'sessionHasAIReferrer')::boolean, FALSE)
  ),
  scroll_depth = (event_data->>'scrollDepth')::integer,
  dwell_time_ms = (event_data->>'dwellTime')::integer
WHERE event_data IS NOT NULL
  AND (platform_type IS NULL OR platform_name IS NULL); -- Only update if not already populated

-- Create a function to automatically extract fields on insert/update
CREATE OR REPLACE FUNCTION extract_event_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract platform context
  IF NEW.event_data ? 'platformType' THEN
    NEW.platform_type := NEW.event_data->>'platformType';
  END IF;

  IF NEW.event_data ? 'platformName' THEN
    NEW.platform_name := NEW.event_data->>'platformName';
  END IF;

  -- Extract query text
  IF NEW.event_data ? 'queryText' THEN
    NEW.query_text := NEW.event_data->>'queryText';
  END IF;

  -- Extract clicked URL (from various field names)
  IF NEW.event_data ? 'destination' THEN
    NEW.clicked_url := NEW.event_data->>'destination';
  ELSIF NEW.event_data ? 'productUrl' THEN
    NEW.clicked_url := NEW.event_data->>'productUrl';
  END IF;

  -- Extract AI attribution (OR both flags, matching Python logic in sessions.py)
  -- A conversion is AI-attributed if EITHER flag is true
  NEW.is_ai_attributed := FALSE;

  IF NEW.event_data ? 'isAIToEcommerce' THEN
    NEW.is_ai_attributed := COALESCE((NEW.event_data->>'isAIToEcommerce')::boolean, FALSE);
  END IF;

  IF NEW.event_data ? 'sessionHasAIReferrer' THEN
    NEW.is_ai_attributed := NEW.is_ai_attributed OR COALESCE((NEW.event_data->>'sessionHasAIReferrer')::boolean, FALSE);
  END IF;

  -- Extract engagement metrics
  IF NEW.event_data ? 'scrollDepth' THEN
    NEW.scroll_depth := (NEW.event_data->>'scrollDepth')::integer;
  END IF;

  IF NEW.event_data ? 'dwellTime' THEN
    NEW.dwell_time_ms := (NEW.event_data->>'dwellTime')::integer;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically extract fields
DROP TRIGGER IF EXISTS trigger_extract_event_fields ON session_events;
CREATE TRIGGER trigger_extract_event_fields
  BEFORE INSERT OR UPDATE ON session_events
  FOR EACH ROW
  EXECUTE FUNCTION extract_event_fields();

-- Add helpful comments
COMMENT ON COLUMN session_events.platform_type IS 'Type of platform: ai, ecommerce, or general';
COMMENT ON COLUMN session_events.platform_name IS 'Specific platform name: chatgpt, perplexity, amazon, etc.';
COMMENT ON COLUMN session_events.query_text IS 'Search query text (for AI platforms)';
COMMENT ON COLUMN session_events.clicked_url IS 'URL clicked by user (result links, product links)';
COMMENT ON COLUMN session_events.is_ai_attributed IS 'Whether this event is attributed to AI referral';
COMMENT ON COLUMN session_events.scroll_depth IS 'Scroll depth percentage (0-100)';
COMMENT ON COLUMN session_events.dwell_time_ms IS 'Time spent on page in milliseconds';
