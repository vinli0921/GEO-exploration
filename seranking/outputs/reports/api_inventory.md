# SE Ranking Data API — Offering Inventory
**Generated:** 2026-02-27
**Account API Key:** (UUID format — stored in environment variable SER_API_KEY)
**Base URL:** `https://api.seranking.com`
**Authentication:** `Authorization: Token <API_KEY>` header
**Rate Limit:** 5 requests/second (HTTP 429 if exceeded)

---

## Endpoint Inventory

### 1. Account Subscription
| Field | Value |
|---|---|
| Endpoint | `GET /v1/account/subscription` |
| Entity | Account / API plan |
| Historical depth | N/A |
| Granularity | Snapshot |
| Required inputs | None |
| Output | status, start_date, expiration_date, units_limit, units_left |
| Credit cost | 0 |
| Panel use | N/A — diagnostic only |

---

### 2. Domain Analysis — Organic/Paid Historical
| Field | Value |
|---|---|
| Endpoint | `GET /v1/domain/overview/history` |
| Entity | Domain |
| Historical depth | **Monthly, backfill to ~2017** |
| Granularity | Monthly |
| Required inputs | source (e.g., `us`), domain, type (`organic` or `adv`) |
| Output | keywords_count, traffic_sum, price_sum, top1_5, top6_10, top11_20, top21_50, top51_100, year, month |
| Credit cost | Low (per domain call) |
| **Panel use** | ✅ **Supports 2023–present longitudinal panel** |

---

### 3. Keyword Research — Bulk Export
| Field | Value |
|---|---|
| Endpoint | `POST /v1/keywords/export?source=us` |
| Entity | Keyword |
| Historical depth | Monthly volume history (~12 months via history_trend) |
| Granularity | Monthly (volume history); snapshot for other metrics |
| Required inputs | source, keywords[] (list), optional cols |
| Output | keyword, volume, cpc, competition, difficulty, serp_features, intents, history_trend |
| Credit cost | Moderate (per keyword) |
| Panel use | ⚠️ Partial — volume history ~12 months; not 2023-backfill |

---

### 4. SERP Data API
| Field | Value |
|---|---|
| Endpoint | `POST /v1/serp/tasks` (submit) + `GET /v1/serp/tasks/{task_id}` (retrieve) |
| Entity | Keyword × Search Engine |
| Historical depth | **Snapshot only** — no historical backfill |
| Granularity | On-demand snapshot |
| Required inputs | engine_id (e.g., 1830 = Google US Desktop), query (list of keywords) |
| Output | URL, snippet, position, SERP features per result (top 100) |
| Credit cost | **10 credits/keyword** |
| Panel use | ❌ Cross-sectional only — current snapshot |

---

### 5. AI Overview Research (AIO)
| Field | Value |
|---|---|
| Endpoint | `GET /v1/domain/aio/keywords-by-target` |
| Entity | Domain |
| Historical depth | **Snapshot only** |
| Granularity | Snapshot |
| Required inputs | target (domain), scope (`domain` or `url`), source, limit |
| Output | keywords[] where domain appears in Google AI Overviews, with featured URLs |
| Credit cost | Low |
| Panel use | ❌ Cross-sectional only |

---

### 6. AI Search Overview (LLM Visibility)
| Field | Value |
|---|---|
| Endpoint | `GET /v1/ai-search/overview` |
| Entity | Domain × LLM Engine |
| Historical depth | **Time series (monthly — exact start date varies by engine)** |
| Granularity | Monthly |
| Required inputs | target, scope, source, engine (`ai-overview`, `chatgpt`, `perplexity`, `gemini`, `ai-mode`) |
| Output | summary: link_presence, average_position, ai_opportunity_traffic; time_series: overall_traffic, organic_traffic, ai_traffic, link_presence, average_position |
| Credit cost | Low |
| **Panel use** | ✅ **Supports time-series analysis (check earliest available date per engine)** |

---

## Panel Construction Summary

| Data Type | Endpoint | 2023–Present Panel | Notes |
|---|---|---|---|
| Domain SEO metrics | `/v1/domain/overview/history` | ✅ Yes | Monthly backfill to ~2017 |
| AI/LLM visibility | `/v1/ai-search/overview` | ✅ Partial | Monthly time series; start date engine-dependent |
| SERP compositions | `/v1/serp/tasks` | ❌ No | Snapshot only; cross-sectional |
| AIO keyword presence | `/v1/domain/aio/keywords-by-target` | ❌ No | Snapshot only |
| Keyword volume history | `/v1/keywords/export` | ⚠️ Limited | ~12 months of monthly volume |

---
