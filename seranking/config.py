"""
SE Ranking Data Audit — Shared Configuration
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_RAW = BASE_DIR / "data" / "raw"
DATA_PROCESSED = BASE_DIR / "data" / "processed"
DATA_KEYWORDS = BASE_DIR / "data" / "keywords"
OUTPUTS_REPORTS = BASE_DIR / "outputs" / "reports"
OUTPUTS_FIGURES = BASE_DIR / "outputs" / "figures"

for _d in [DATA_RAW, DATA_PROCESSED, DATA_KEYWORDS, OUTPUTS_REPORTS, OUTPUTS_FIGURES]:
    _d.mkdir(parents=True, exist_ok=True)

# ── API ────────────────────────────────────────────────────────────────────────
API_KEY = os.getenv("SER_API_KEY")
if not API_KEY:
    raise RuntimeError("SER_API_KEY not set — check seranking/.env")

API_BASE = "https://api.seranking.com"
HEADERS = {"Authorization": f"Token {API_KEY}"}
RATE_LIMIT_DELAY = 0.25   # seconds between calls (max 5 req/sec)

# ── Brand Universe ─────────────────────────────────────────────────────────────
DOMAINS = {
    "beverages": {
        "large": ["coca-cola.com", "pepsi.com", "drpepper.com"],
        "small": ["drinkolipop.com"],
    },
    "fast_food": {
        "large": ["mcdonalds.com", "wendys.com"],
        "small": ["shakeshack.com", "fiveguys.com"],
    },
}

# Flat list helpers
ALL_DOMAINS = (
    DOMAINS["beverages"]["large"]
    + DOMAINS["beverages"]["small"]
    + DOMAINS["fast_food"]["large"]
    + DOMAINS["fast_food"]["small"]
)

DOMAIN_META = {}
for category, tiers in DOMAINS.items():
    for tier, domains in tiers.items():
        for domain in domains:
            DOMAIN_META[domain] = {"category": category, "size_tier": tier}

# ── SE Ranking API Params ──────────────────────────────────────────────────────
SOURCE = "us"          # regional database
DEVICE = "desktop"

# AI Search engines to query
AI_ENGINES = ["ai-overview", "chatgpt", "perplexity", "gemini", "ai-mode"]

# Study time window
STUDY_START = "2023-01"
STUDY_END   = "2025-02"   # current month
