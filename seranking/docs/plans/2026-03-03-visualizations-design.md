# Visualizations Design — SE Ranking GEO Exploration
**Date:** 2026-03-03
**Approach:** Option A — data-source sections
**Output:** `notebooks/part5_visualizations.ipynb` + PNGs in `outputs/figures/`

---

## Overview

A single exploratory visualization notebook that loads from processed CSVs (no API calls). Figures are grouped by source dataset, saved as PNG to `outputs/figures/`, and displayed inline. Uses `matplotlib` + `seaborn` (already available via the venv).

---

## Figures

### Section 1 — SEO Panel (`domain_seo_panel_wide.csv`)

| Fig | File | Description |
|-----|------|-------------|
| 1 | `fig1_organic_traffic.png` | Line chart: `traffic_sum` over time (2023–present), one line per domain, faceted by category (beverages / fast_food) |
| 2 | `fig2_keyword_count.png` | Line chart: `keywords_count` over time, same structure |
| 3 | `fig3_position_tiers.png` | Stacked area: position tier mix (`top1_5`, `top6_10`, `top11_20`, `top21_50`, `top51_100`) over time, one panel per domain |

### Section 2 — AI Overview Timeseries (`ai_visibility_timeseries.csv`, engine=ai-overview)

| Fig | File | Description |
|-----|------|-------------|
| 4 | `fig4_aio_link_presence.png` | Line chart: `link_presence` over time (2024-08 → 2026-02), one line per domain, faceted by category |
| 5 | `fig5_ai_traffic_share.png` | Line chart: `ai_traffic / overall_traffic * 100` (%), one line per domain, faceted by category |
| 6 | `fig6_avg_position.png` | Line chart: `average_position` over time, lower = better, faceted by category |

### Section 3 — Cross-LLM Snapshot (`ai_visibility_snapshot.csv`)

| Fig | File | Description |
|-----|------|-------------|
| 7 | `fig7_llm_heatmap.png` | Heatmap: rows=domains, cols=engines, values=`link_presence_current` (log-scaled color), annotated with raw values |

### Section 4 — SERP Presence (`serp_brand_presence.csv`)

| Fig | File | Description |
|-----|------|-------------|
| 8 | `fig8_serp_top10_rate.png` | Horizontal bar chart: top-10 presence rate per brand, colored by size_tier, grouped by category |

### Section 5 — Cross-dataset

| Fig | File | Description |
|-----|------|-------------|
| 9 | `fig9_seo_vs_aio_scatter.png` | Scatter: x=SERP top-10 presence rate, y=AI Overview link_presence (latest), point=domain, color=category, size=size_tier |

---

## Style

- Palette: consistent color per domain across all figures (8 colors from `tab10`)
- Figure size: `(12, 5)` for faceted line charts, `(10, 6)` for singles
- All axes labeled, titles set, grid on with low alpha
- PNGs saved at 150 dpi
