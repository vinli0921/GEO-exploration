# SE Ranking API Exploration - Backlinks & AI Search

## Overview

This project explores the **SE Ranking API** with a focus on two key areas:
1. **Backlinks API** - Comprehensive link profile analysis and backlink intelligence
2. **AI Search API** - Brand visibility tracking across Large Language Models (LLMs)

**Demo Brand:** Nike (nike.com)

---

## Quick Start

### 1. Install Dependencies

```bash
pip install requests python-dotenv
```

### 2. Set Up API Key

Create a `.env` file in the project root:

```env
SER_API_KEY=your_api_key_here
```


### 3. Run the Script

```bash
python3 se_ranking_api_exploration.py
```

### 4. View Results

The script generates two JSON files in the `data/` directory:
- `data/se_ranking_backlinks_nike.json` - Backlinks data
- `data/se_ranking_ai_search_nike.json` - AI Search data across multiple LLMs

### 5. Visualize the Data

Run the visualization script to create charts and graphs:

```bash
source .venv/bin/activate
python visualize_data.py
```

This generates:
- `data/backlinks_visualization.png` - Comprehensive backlinks analysis charts
- `data/ai_search_visualization.png` - AI Search visibility across LLM platforms

---

## Backlinks API

### Overview

The Backlinks API provides comprehensive data about a domain's link profile, including backlinks, referring domains, anchor text distribution, and link authority metrics.

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/v1/backlinks/summary` | Extended statistics overview |
| `/v1/backlinks/raw` | Individual backlink data |
| `/v1/backlinks/anchors` | Anchor text distribution |
| `/v1/backlinks/referring-domains` | List of domains linking to target |

### Key Metrics & Variables

#### Summary Statistics
- `backlinks` - Total number of backlinks (105.2M for Nike)
- `refdomains` - Unique referring domains (203K for Nike)
- `subnets` - Number of unique C-class subnets (73K)
- `ips` - Number of unique IP addresses (131K)
- `inlink_rank` - Page authority score (0-100)
- `domain_inlink_rank` - Domain authority score (0-100, Nike: 93)

#### Link Type Breakdown
- `dofollow_backlinks` - Links passing PageRank (102.7M, 97.5%)
- `nofollow_backlinks` - Links not passing PageRank (2.6M, 2.5%)
- `text_backlinks` - Text-based hyperlinks (43.9M)
- `edu_backlinks` - Links from .edu domains (251K)
- `gov_backlinks` - Links from .gov domains (5.9K)
- `from_home_page_backlinks` - Links from homepage (27K)

#### Quality Indicators
- `edu_refdomains` - Number of .edu referring domains (836)
- `gov_refdomains` - Number of .gov referring domains (79)
- `dofollow_refdomains` - Domains with dofollow links (177K)
- `from_home_page_refdomains` - Domains linking from homepage (16.5K)

#### Anchor Text Analysis
- `anchors` - Total unique anchor texts (10.8M)
- `dofollow_anchors` - Unique dofollow anchors (10.7M)
- `top_anchors_by_backlinks` - Most used anchor texts
- `top_anchors_by_refdomains` - Anchors from most domains

#### Individual Backlink Properties
- `url_from` - Source page URL
- `url_to` - Target page URL
- `title` - Title of source page
- `anchor` - Anchor text used
- `nofollow` - Whether link is nofollow (true/false)
- `image` - Whether link is from an image (true/false)
- `inlink_rank` - Page authority (0-100)
- `domain_inlink_rank` - Domain authority (0-100)
- `first_seen` - Date link was first discovered
- `last_visited` - Date link was last checked

#### Geographic & TLD Distribution
- `top_tlds` - Top-level domain distribution
- `top_countries` - Geographic distribution of referring domains

### Nike Backlinks Findings

From the sample dataset `se_ranking_backlinks_nike.json`:

**Overall Link Profile:**
- Total Backlinks: **105,251,260**
- Referring Domains: **203,366**
- Unique Subnets: **73,644**
- Unique IPs: **131,163**
- Domain Authority: **93/100** (excellent)
- Page Authority: **58/100**

**Link Quality:**
- Dofollow: **102.7M (97.5%)** - Strong PageRank flow
- Nofollow: **2.6M (2.5%)**
- .EDU Backlinks: **251,254** - High authority educational links
- .GOV Backlinks: **5,923** - Government authority links
- Homepage Links: **27,000** - High-value placements

**Top Anchor Texts (by referring domains):**
1. "Nike" - 27,634 domains
2. Empty anchor - 11,033 domains
3. "www.nike.com" - 7,751 domains
4. "nike.com" - 3,508 domains
5. "Nike Training Club" - 2,204 domains

**Geographic Distribution:**
1. United States - 106,187 domains (52%)
2. Germany - 13,347 domains
3. France - 5,932 domains
4. Netherlands - 3,747 domains
5. Japan - 3,563 domains

**TLD Distribution:**
1. .com - 103,040 domains
2. .org - 5,125 domains
3. .dev - 5,083 domains
4. .net - 5,048 domains
5. .app - 4,247 domains

**Sample Backlink Analysis:**
The dataset includes 20 sample backlinks showing:
- Recent links from Q2-Q3 2025
- Mix of editorial content and directory listings
- Domain authority ranging from 1 to 84
- Mix of text and image-based links
- Diverse anchor text strategies

### Use Cases

1. **Backlink Profile Analysis** - Understand overall link health and authority
2. **Link Building Opportunities** - Identify high-authority link sources
3. **Competitor Analysis** - Compare link profiles with competitors
4. **Link Quality Assessment** - Evaluate authority and trust metrics
5. **Anchor Text Optimization** - Analyze anchor text distribution for SEO
6. **Lost Link Recovery** - Track and recover lost valuable backlinks
7. **Geographic SEO** - Understand regional link distribution
8. **Content Strategy** - Identify what content attracts links

---

## AI Search API

### Overview

The AI Search API tracks your domain and brand's presence in **Large Language Model (LLM) responses** across multiple AI platforms. This cutting-edge feature monitors how AI assistants like ChatGPT, Gemini, and Perplexity reference your brand when users ask questions.

**What is AI Search?**
- Tracks brand visibility in LLM-generated responses
- Monitors citations and links in AI assistant answers
- Covers ChatGPT, Gemini, Perplexity, AI Mode, and AI Overviews
- Analyzes prompts (user queries) that trigger brand mentions

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/v1/ai-search/overview` | High-level LLM performance metrics per engine |
| `/v1/ai-search/prompts-by-target` | Prompts where your domain appears |
| `/v1/ai-search/prompts-by-brand` | Prompts mentioning your brand name |
| `/v1/ai-search/discover-brand` | Brand discovery from domain |

### Supported AI Engines

| Engine | Description |
|--------|-------------|
| `chatgpt` | OpenAI's ChatGPT responses |
| `gemini` | Google's Gemini AI |
| `perplexity` | Perplexity AI search engine |
| `ai-mode` | AI Mode responses |
| `ai-overview` | Google's AI Overviews (SGE) |

### Key Metrics & Variables

#### Overview Metrics (from `/v1/ai-search/overview`)
Per-engine metrics showing performance in each LLM:
- `link_presence.current` - Number of prompts where domain link appears
- `link_presence.change_percent` - Percentage change from previous period
- `average_position.current` - Average position in LLM responses (when cited)
- `ai_opportunity_traffic.current` - Estimated traffic from AI responses
- `time_series` - Historical data arrays for trend analysis
  - `overall_traffic` - Total traffic estimates over time
  - `organic_traffic` - Traditional organic traffic
  - `ai_traffic` - Traffic attributed to AI responses
  - `link_presence` - Link presence over time
  - `average_position` - Position trends over time

#### Prompt-Level Data (from `/v1/ai-search/prompts-by-target`)
Individual user queries where your domain appears:
- `prompt` - The user query/question asked to the LLM
- `volume` - Estimated monthly search volume for this prompt
- `type` - Appearance type: "Link" (URL citation) or "Brand" (name mention)
- `answer.text` - Full LLM response text
- `answer.links` - Array of URLs cited in the response

#### Brand Information (from `/v1/ai-search/discover-brand`)
- `brands` - Array of brand names associated with the target domain

### Request Parameters

**For Overview:**
```python
params = {
    "engine": "chatgpt",       # Required: chatgpt, gemini, perplexity, ai-mode, ai-overview
    "target": "nike.com",      # Domain, subdomain, or URL
    "scope": "domain",         # "domain", "host", or "url"
    "source": "us"             # Alpha-2 country code (us, uk, etc.)
}
```

**For Prompts:**
```python
params = {
    "engine": "chatgpt",       # Required: which LLM to query
    "target": "nike.com",      # Domain to search for
    "scope": "domain",         # Scope of analysis
    "source": "us",            # Regional database
    "sort": "volume",          # Sort by: volume, type, snippet_length
    "sort_order": "desc",      # asc or desc
    "offset": 0,               # Pagination
    "limit": 100               # Max results per page (max 1000)
}
```

### Nike AI Search Findings

**Status:** AI Search endpoints are working correctly.
- **Brand Discovery:** Successfully identified "Nike" as the brand
- **Engines Tracked:** ChatGPT, Gemini, Perplexity, AI-Mode
- **Data Availability:** Currently showing null/zero values (Nike may not have significant LLM visibility yet, or data is still being collected)

**Note:** The AI Search API successfully returns data structure even when there are no active mentions, allowing you to track when visibility begins.

### Use Cases

1. **LLM Brand Visibility** - Monitor how often LLMs mention your brand
2. **Prompt Analysis** - Understand which user queries trigger brand mentions
3. **Content Strategy** - Identify what content LLMs reference and cite
4. **Competitive Intelligence** - Compare AI visibility across competitors
5. **Traffic Attribution** - Measure traffic coming from AI assistant referrals
6. **Brand Monitoring** - Track brand perception in AI responses
7. **Platform Comparison** - Compare performance across ChatGPT, Gemini, Perplexity
8. **Citation Optimization** - Increase likelihood of being cited by LLMs

### Why AI Search Matters

- **Growing Usage:** Millions use AI assistants for research and recommendations
- **Direct Referrals:** LLMs can drive significant referral traffic when citing sources
- **Brand Authority:** Being cited by AI assistants builds credibility
- **New Channel:** AI search is distinct from traditional SEO
- **Early Advantage:** Monitor and optimize before competitors
- **Multi-Platform:** Track visibility across multiple LLM platforms simultaneously

---

## API Authentication

### Base URL
```
https://api.seranking.com/v1
```

### Authentication
Token-based authentication using Authorization header:

```bash
curl -X GET 'https://api.seranking.com/v1/backlinks/summary?target=example.com' \
  -H 'Authorization: Token YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

## Sample Code

### Python Example - Fetch Backlinks

```python
import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SER_API_KEY")
API_BASE_URL = "https://api.seranking.com/v1"

headers = {
    "Authorization": f"Token {API_KEY}",
    "Content-Type": "application/json"
}

# Fetch backlinks summary
params = {
    "target": "nike.com",
    "mode": "domain",
    "limit": 100
}

response = requests.get(
    f"{API_BASE_URL}/backlinks/summary",
    headers=headers,
    params=params
)

if response.status_code == 200:
    data = response.json()
    print(f"Total Backlinks: {data['summary'][0]['backlinks']:,}")
    print(f"Referring Domains: {data['summary'][0]['refdomains']:,}")
else:
    print(f"Error: {response.status_code}")
```

### cURL Example - Fetch Raw Backlinks

```bash
curl -X GET \
  'https://api.seranking.com/v1/backlinks/raw?target=nike.com&mode=domain&limit=10' \
  -H 'Authorization: Token YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

## Data Structure

### Backlinks Summary Response

```json
{
  "summary": [
    {
      "target": "nike.com",
      "backlinks": 105251260,
      "refdomains": 203366,
      "subnets": 73644,
      "ips": 131163,
      "dofollow_backlinks": 102656137,
      "nofollow_backlinks": 2595123,
      "edu_backlinks": 251254,
      "gov_backlinks": 5923,
      "inlink_rank": 58,
      "domain_inlink_rank": 93
    }
  ]
}
```

### Individual Backlink Response

```json
{
  "url_from": "https://example.com/page",
  "url_to": "http://nike.com/",
  "title": "Example Page Title",
  "anchor": "Nike",
  "nofollow": false,
  "image": false,
  "inlink_rank": 45,
  "domain_inlink_rank": 82,
  "first_seen": "2025-06-10",
  "last_visited": "2025-08-16"
}
```

---

## Key Insights from Nike Data

### Link Building Strategy
1. **Brand-Focused Anchors** - "Nike" is the #1 anchor text (27K domains)
2. **Natural Link Profile** - Mix of branded, URL, and contextual anchors
3. **Global Presence** - Strong links from 100+ countries
4. **Educational Authority** - 836 .edu domains linking
5. **Government Trust** - 79 .gov domains linking

### Content That Attracts Links
- Product pages (Nike Air Max, etc.)
- Corporate information (about, news, jobs, investors)
- Training/fitness content (Nike Training Club)
- Brand collaborations (Nike x LEGO)
- Company news and announcements

### Link Quality Indicators
- **97.5% Dofollow** - Excellent PageRank flow
- **Domain Authority 93** - Top-tier domain authority
- **203K Referring Domains** - Massive link diversity
- **27K Homepage Links** - High-value placements

---

## Data Visualization

The `visualize_data.py` script creates comprehensive visual analytics from the JSON data.

### Backlinks Visualization

The backlinks visualization (`data/backlinks_visualization.png`) includes 9 charts:

1. **Overall Link Profile** - Total backlinks, referring domains, unique subnets/IPs
2. **Link Type Breakdown** - Dofollow vs Nofollow distribution (pie chart)
3. **Authority Scores** - Domain Authority and Page Authority (0-100 scale)
4. **Special Link Types** - EDU, GOV, Homepage, and Text links
5. **Top Anchor Texts** - Most common anchor texts by referring domains
6. **Geographic Distribution** - Top countries with referring domains
7. **TLD Distribution** - Top-level domain breakdown (.com, .org, etc.)
8. **Referring Domain Quality** - Quality metrics for referring domains
9. **Summary Statistics** - Key metrics in a text box

### AI Search Visualization

The AI Search visualization (`data/ai_search_visualization.png`) includes 6 charts:

1. **Link Presence by Engine** - Citation counts across ChatGPT, Gemini, Perplexity, AI-Mode
2. **Average Citation Position** - Position ranking in LLM responses
3. **AI Opportunity Traffic** - Estimated traffic from AI assistant referrals
4. **Tracked Prompts per Engine** - Number of user queries tracked per platform
5. **Comparative Performance** - Normalized comparison of link presence vs traffic
6. **Summary Statistics** - Overview of AI Search metrics

### Visualization Features

- High-resolution PNG output (300 DPI)
- Color-coded charts for easy interpretation
- Automatic handling of missing data
- Large number formatting (K, M, B suffixes)
- Non-interactive mode for automated workflows

---

## Files Generated

### Python Scripts
- `se_ranking_api_exploration.py` - Main exploration script with API integration
- `visualize_data.py` - Data visualization and chart generation

### Data Files
- `data/se_ranking_backlinks_nike.json` - Complete backlinks dataset
- `data/se_ranking_ai_search_nike.json` - AI Search dataset with multi-engine data
- `data/backlinks_visualization.png` - Backlinks analysis charts
- `data/ai_search_visualization.png` - AI Search visibility charts

---

## Resources

### Official Documentation
- [SE Ranking API Docs](https://seranking.com/api.html)
- [Quickstart Guide](https://seranking.com/api/data/quickstart-guide/)
- [Postman Collection](https://www.postman.com/serankingdev/workspace/se-ranking-developers/)

### API Endpoints Reference
- [Backlinks API](https://seranking.com/api/data/backlinks/)
- [AI Search API](https://seranking.com/api/data/ai-search/)
- [Domain Analysis API](https://seranking.com/api/data/domain-analysis/)

---

## Next Steps

### Further Exploration
1. **Test Additional Endpoints:**
   - `/v1/backlinks/new` - Recently discovered backlinks
   - `/v1/backlinks/lost` - Recently lost backlinks
   - `/v1/backlinks/authority/page/history` - Authority over time

2. **Competitive Analysis:**
   - Compare Nike vs Adidas backlink profiles
   - Analyze competitor anchor text strategies
   - Identify link building opportunities

3. **Data Analysis:**
   - Build backlink quality score algorithm
   - Analyze temporal patterns in link acquisition
   - Correlate backlinks with traffic/rankings

4. **AI Search Analysis:**
   - Analyze which prompts trigger brand mentions
   - Identify content that LLMs prefer to cite
   - Optimize content for LLM visibility
   - Track brand presence across multiple AI platforms
   - Compare performance: ChatGPT vs Gemini vs Perplexity