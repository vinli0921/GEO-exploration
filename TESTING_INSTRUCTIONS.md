# Testing Instructions for GEO Chrome Extension

## Pre-Testing Setup

### 1. Run Database Migrations

Before testing, you need to apply the database migrations to add the new columns and tables:

**Connect to your Supabase database** using the Supabase SQL editor or `psql`:

```bash
# Get your DATABASE_URL from Supabase dashboard
# Then connect via psql:
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[HOST]:5432/postgres"
```

**Run migration 001** (Extract event fields):
```sql
\i backend-server/migrations/001_extract_event_fields.sql
```

**Run migration 002** (Create session metrics):
```sql
\i backend-server/migrations/002_create_session_metrics.sql
```

**Verify migrations succeeded**:
```sql
-- Check new columns exist
\d session_events

-- Check metrics table exists
\d session_metrics

-- Check triggers are installed
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%extract%' OR tgname LIKE '%metric%';
```

### 2. Reload the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Remove" on the old extension
4. Click "Load unpacked"
5. Select the `/chrome-extension` folder
6. Verify the extension loaded without errors (check the console)

### 3. Restart Backend Server

If you're running the backend locally:
```bash
cd backend-server
python app.py
```

Or redeploy to Vercel if using production.

---

## Test 1: Platform Detection

**Goal**: Verify the extension correctly detects AI platforms and e-commerce sites.

### Test 1a: AI Platform Detection

1. Open the Chrome extension popup and start recording with a test participant ID (e.g., "TEST_01")
2. Visit **ChatGPT** (chat.openai.com)
   - Open browser console (F12)
   - Look for log message: `[Content] Detected: chatgpt (ai)`
3. Visit **Perplexity** (perplexity.ai)
   - Check console for: `[Content] Detected: perplexity (ai)`
4. Visit **Google** and search for something
   - If AI Overview appears, should log: `[Content] Detected: google_ai (ai)`
   - If no AI Overview, should NOT detect as platform
5. Visit **Claude** (claude.ai)
   - Check console for: `[Content] Detected: claude (ai)`

**Expected Result**: Console logs show correct platform detection for each AI site.

### Test 1b: E-commerce Platform Detection

1. Visit **Amazon** (amazon.com)
   - Check console for: `[Content] Detected: amazon (ecommerce)`
2. Visit **Walmart** (walmart.com)
   - Check console for: `[Content] Detected: walmart (ecommerce)`
3. Visit any Shopify store (e.g., gymshark.com)
   - Check console for: `[Content] Detected: shopify (ecommerce)` or `[Content] Detected: generic_ecommerce (ecommerce)`

**Expected Result**: E-commerce sites are correctly identified.

---

## Test 2: AI Query Tracking

**Goal**: Verify AI queries are captured with full text and refinement tracking.

1. Start recording with the extension
2. Go to **ChatGPT**
3. Type a query: "best running shoes for marathon training"
4. Wait 1-2 seconds (for debounce)
5. Modify the query to: "best nike running shoes for marathon training"
6. Submit the query

**Check the database**:
```sql
SELECT event_type, query_text, event_data->'isRefinement' as is_refinement
FROM session_events
WHERE event_type = 'ai_query_input'
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected Result**:
- First query: "best running shoes for marathon training", isRefinement: false
- Second query: "best nike running shoes for marathon training", isRefinement: true

---

## Test 3: AI Result Click Tracking

**Goal**: Verify clicks on AI-provided links are captured with position.

1. Continue recording session from Test 2
2. After ChatGPT responds, click on the **first link** in the response
3. Then go back and click on the **third link**

**Check the database**:
```sql
SELECT event_type, platform_name, clicked_url,
       event_data->'linkPosition' as link_position,
       event_data->'linkText' as link_text
FROM session_events
WHERE event_type = 'ai_result_click'
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected Result**:
- Two events with `event_type = 'ai_result_click'`
- `platform_name = 'chatgpt'`
- First click should have `linkPosition: 1`
- Second click should have `linkPosition: 3`
- URLs and link text should be captured

---

## Test 4: E-commerce Conversion Tracking

**Goal**: Verify product clicks and conversion actions are tracked with AI attribution.

### Test 4a: AI to E-commerce Journey

1. Start a new recording session
2. Go to **Perplexity** (or ChatGPT)
3. Search for "best bluetooth headphones under $100"
4. Click on an **Amazon product link** from the AI results
5. On Amazon, click on a product
6. Click "Add to Cart" button

**Check the database**:
```sql
-- Check AI referrer was stored
SELECT event_type, platform_name, is_ai_attributed,
       event_data->'fromAI' as from_ai
FROM session_events
WHERE event_type IN ('product_click', 'conversion_action')
ORDER BY timestamp DESC;
```

**Expected Result**:
- `product_click` event with `platform_name = 'amazon'`
- `conversion_action` event with `is_ai_attributed = true`
- Both should have `fromAI = true` in event_data

### Test 4b: Direct E-commerce Visit (No AI)

1. Start a new recording session
2. Go directly to **Amazon** (type URL, don't come from AI)
3. Search for a product and click it
4. Click "Add to Cart"

**Check the database**:
```sql
SELECT event_type, is_ai_attributed, event_data->'fromAI' as from_ai
FROM session_events
WHERE event_type = 'conversion_action'
ORDER BY timestamp DESC
LIMIT 1;
```

**Expected Result**:
- `conversion_action` event with `is_ai_attributed = false`
- `fromAI = false`

---

## Test 5: Event Filtering (Noise Reduction)

**Goal**: Verify noisy events are NOT captured.

1. Start recording
2. Visit any website
3. **Scroll continuously** up and down for 10 seconds
4. **Switch tabs** back and forth 5 times
5. **Resize window** multiple times

**Check the database**:
```sql
-- Check event type distribution
SELECT event_type, COUNT(*) as count
FROM session_events
WHERE session_id = (SELECT id FROM sessions ORDER BY started_at DESC LIMIT 1)
GROUP BY event_type
ORDER BY count DESC;
```

**Expected Result**:
- Should see `scroll_milestone` (only at 25%, 50%, 75%, 100%)
- Should NOT see `scroll` (continuous scroll events)
- Should NOT see `dom_mutation` events
- Should NOT see `window_blur` / `window_focus` events
- Should NOT see `dom_snapshot` events
- Should see `visibility_change` (replaces blur/focus)
- Should see `tab_switch` events

**Event count should be ~90% lower than before!**

---

## Test 6: Scroll Milestones

**Goal**: Verify scroll depth is tracked at milestones, not continuously.

1. Start recording
2. Visit a long article or webpage
3. Scroll to **25%** of page → stop
4. Scroll to **50%** → stop
5. Scroll to **75%** → stop
6. Scroll to **100%** (bottom)

**Check the database**:
```sql
SELECT event_type, event_data->'milestone' as milestone,
       event_data->'scrollPercentage' as scroll_percentage
FROM session_events
WHERE event_type = 'scroll_milestone'
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected Result**:
- Exactly **4 events** (one for each milestone)
- Milestones: 25, 50, 75, 100
- No other scroll events captured

---

## Test 7: Dwell Time Tracking

**Goal**: Verify dwell time is computed and stored.

1. Start recording
2. Visit **ChatGPT**
3. Stay on the page for **30 seconds**
4. Type a query and submit
5. Wait for response (another 10 seconds)
6. Click a link in the response

**Check the database**:
```sql
SELECT event_type, dwell_time_ms / 1000 as dwell_seconds
FROM session_events
WHERE dwell_time_ms IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected Result**:
- Events should have `dwell_time_ms` values
- Values should increase over time (first events have lower dwell time)
- The click event should show ~40+ seconds dwell time

---

## Test 8: Session Metrics Computation

**Goal**: Verify the metrics computation function works correctly.

1. Complete a full session with:
   - AI queries on ChatGPT or Perplexity
   - Clicks on AI result links
   - Visit to Amazon via AI link
   - Product click and add to cart on Amazon
2. Stop the recording (this marks session as complete)

**The trigger should auto-compute metrics. Check**:
```sql
SELECT * FROM session_metrics
WHERE session_id = (SELECT id FROM sessions ORDER BY started_at DESC LIMIT 1);
```

**If metrics weren't auto-computed, manually trigger**:
```sql
SELECT compute_session_metrics(
  (SELECT id FROM sessions ORDER BY started_at DESC LIMIT 1)
);
```

**Check the computed metrics**:
```sql
SELECT
  query_count,
  query_refinements,
  ai_platforms_used,
  ai_result_clicks,
  conversions,
  ai_attributed_conversions,
  ai_to_purchase_seconds
FROM session_metrics
WHERE session_id = (SELECT id FROM sessions ORDER BY started_at DESC LIMIT 1);
```

**Expected Result**:
- `query_count` > 0 (number of AI queries)
- `ai_platforms_used` = array of platform names (e.g., `{chatgpt}`)
- `ai_result_clicks` > 0
- `conversions` > 0 (if you clicked add to cart)
- `ai_attributed_conversions` > 0 (if you came from AI)
- `ai_to_purchase_seconds` should be time from first AI interaction to conversion

---

## Test 9: New API Endpoints

**Goal**: Verify the new metrics endpoints work.

### Test 9a: Compute Metrics Endpoint

```bash
# Get the session database ID first
curl http://localhost:5000/api/sessions/list | jq '.sessions[0].id'

# Compute metrics for that session
curl -X POST http://localhost:5000/api/sessions/<SESSION_DB_ID>/compute-metrics
```

**Expected Result**: JSON response with computed metrics.

### Test 9b: Get All Metrics

```bash
curl http://localhost:5000/api/sessions/metrics | jq
```

**Expected Result**: List of all session metrics with session info.

### Test 9c: Metrics Summary

```bash
curl http://localhost:5000/api/sessions/metrics/summary | jq
```

**Expected Result**: Aggregated stats like:
- `total_sessions`
- `total_queries`
- `total_conversions`
- `conversion_rate`
- `ai_attribution_rate`
- `platform_usage` (which AI platforms were used most)

---

## Test 10: Data Volume Comparison

**Goal**: Quantify the event reduction achieved.

**Before the update** (if you have old sessions):
```sql
SELECT COUNT(*) as old_event_count
FROM session_events
WHERE session_id IN (
  SELECT id FROM sessions WHERE started_at < '2025-01-25'
)
AND session_id = <PICK_AN_OLD_SESSION>;
```

**After the update**:
```sql
SELECT COUNT(*) as new_event_count
FROM session_events
WHERE session_id = (
  SELECT id FROM sessions ORDER BY started_at DESC LIMIT 1
);
```

**Calculate reduction**:
- If old session had ~700 events
- New session should have ~50-75 events
- **~90% reduction achieved!**

---

## Test 11: Platform Selector Fallbacks

**Goal**: Verify selector fallbacks work when primary selectors fail.

This is harder to test without modifying platform HTML, but you can:

1. Check browser console for warnings like:
   ```
   [PlatformDetector] Selector failed: textarea#prompt-textarea
   ```
2. If you see such warnings but queries are still captured, the fallback selectors are working!

---

## Test 12: Domain Exclusion

**Goal**: Verify excluded domains are not tracked.

1. Open extension popup → Advanced Settings
2. Add `facebook.com` to Excluded Domains
3. Save settings
4. Start recording
5. Visit Facebook
6. Click around on Facebook

**Check the database**:
```sql
SELECT COUNT(*) as facebook_events
FROM session_events
WHERE url LIKE '%facebook.com%'
AND session_id = (SELECT id FROM sessions ORDER BY started_at DESC LIMIT 1);
```

**Expected Result**: `facebook_events = 0` (no events captured from Facebook)

---

## Success Criteria

✅ **Platform Detection**: All major AI and e-commerce platforms detected correctly
✅ **AI Query Tracking**: Queries captured with full text and refinement detection
✅ **AI Click Tracking**: Result clicks captured with position
✅ **E-commerce Tracking**: Product clicks and conversions tracked
✅ **AI Attribution**: Conversions correctly attributed to AI referrals
✅ **Event Filtering**: 90% reduction in noisy events (scroll, DOM mutations, etc.)
✅ **Scroll Milestones**: Only 4 scroll events per page (not hundreds)
✅ **Metrics Computation**: Session metrics auto-computed on session end
✅ **New Endpoints**: All 3 new API endpoints working
✅ **Domain Exclusion**: Excluded domains not tracked

---

## Troubleshooting

### Platform Not Detected
- Check browser console for errors
- Verify `platforms.json` loaded correctly
- Try different selector from the fallback list in `platforms.json`

### Events Not Captured
- Check if domain is in excluded list
- Verify extension is recording (check popup)
- Check browser console for errors

### Metrics Not Computing
- Manually run: `SELECT compute_session_metrics(<session_id>);`
- Check if session is marked as complete: `UPDATE sessions SET is_complete = true WHERE id = <session_id>;`
- Check for SQL errors in backend logs

### Database Connection Issues
- Verify `DATABASE_URL` in backend `.env` file
- Check Supabase pooler is working
- Try direct connection instead of pooler

---

## Performance Validation

After all tests pass, validate the improvements:

1. **Storage Efficiency**: Check database size growth rate (should be ~90% slower)
2. **Query Performance**: Run analytics queries, should be 5-10x faster with indexes
3. **Extension Performance**: Check if browsing feels smooth (should have no impact)

---

## Next Steps After Testing

1. **Pilot Study**: Run with 5-10 test participants
2. **Validate Selectors**: Ensure AI platform selectors work after UI updates
3. **Monitor**: Set up alerts for selector failures
4. **Iterate**: Update `platforms.json` when platforms change their UI
5. **Scale**: Deploy to full participant pool

---

Good luck with testing! 🚀
