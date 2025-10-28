"""
SE Ranking API Exploration - Backlinks & AI Search Focus

This program explores the SE Ranking API with focus on:
1. Backlinks API - Complete link profile analysis
2. AI Search API - Brand visibility across LLMs (ChatGPT, Gemini, Perplexity, etc.)

Brand chosen for demonstration: Nike (nike.com)
"""

import json
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv
import os
import requests
import time

load_dotenv()


API_BASE_URL = "https://api.seranking.com/v1"
API_KEY = os.getenv("SER_API_KEY")

# Validate API key
if not API_KEY:
    print("WARNING: SER_API_KEY not found in environment variables!")
    print("Please add your SE Ranking API key to .env file")
    print("The script will attempt to run but API requests will fail.\n")

# Headers for API requests
HEADERS = {
    "Authorization": f"Token {API_KEY}",
    "Content-Type": "application/json"
}


def make_api_request(endpoint, params=None, method='GET'):
    """
    Make an API request to SE Ranking API with error handling
    """
    url = f"{API_BASE_URL}/{endpoint}"

    try:
        if method == 'GET':
            response = requests.get(url, headers=HEADERS, params=params, timeout=30)
        elif method == 'POST':
            response = requests.post(url, headers=HEADERS, json=params, timeout=30)

        response.raise_for_status()
        return response.json()

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response: {e.response.text if e.response else 'No response'}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        return None

print("BACKLINKS API EXPLORATION")

# Request Parameters for Backlinks
backlinks_params = {
    "target": "nike.com",
    "mode": "domain",  # Options: domain, host, exact, page
    "limit": 100,
    "offset": 0
}

print(f"\nTarget Domain: {backlinks_params['target']}")
print(f"Analysis Mode: {backlinks_params['mode']}")
print(f"Limit: {backlinks_params['limit']} backlinks\n")

# Fetch backlinks summary
print("Fetching backlinks summary...")
backlinks_summary = make_api_request("backlinks/summary", backlinks_params)

# Fetch sample backlinks
print("Fetching raw backlinks data...")
backlinks_raw = make_api_request("backlinks/raw", backlinks_params)

# Fetch anchor text data
print("Fetching anchor text analysis...")
anchors_data = make_api_request("backlinks/anchors", backlinks_params)

# Fetch referring domains
print("Fetching referring domains...")
referring_domains = make_api_request("backlinks/referring-domains", backlinks_params)

# Compile backlinks data
print("\nCompiling backlinks dataset...")
if backlinks_summary:
    # Handle different response formats from the API
    if isinstance(backlinks_summary, dict):
        summary_data = backlinks_summary
    else:
        summary_data = {}

    # Handle backlinks_raw - could be list or dict
    if backlinks_raw:
        if isinstance(backlinks_raw, list):
            raw_backlinks = backlinks_raw
        elif isinstance(backlinks_raw, dict):
            raw_backlinks = backlinks_raw.get("backlinks", backlinks_raw.get("data", []))
        else:
            raw_backlinks = []
    else:
        raw_backlinks = []

    # Handle anchors data
    if anchors_data:
        if isinstance(anchors_data, list):
            anchors_list = anchors_data
        elif isinstance(anchors_data, dict):
            anchors_list = anchors_data.get("anchors", anchors_data.get("data", []))
        else:
            anchors_list = []
    else:
        anchors_list = []

    # Handle referring domains
    if referring_domains:
        if isinstance(referring_domains, list):
            domains_list = referring_domains
        elif isinstance(referring_domains, dict):
            domains_list = referring_domains.get("domains", referring_domains.get("data", []))
        else:
            domains_list = []
    else:
        domains_list = []

    sample_backlinks_data = {
        "metadata": {
            "target": backlinks_params["target"],
            "mode": backlinks_params["mode"],
            "total_backlinks": summary_data.get("total_backlinks", summary_data.get("total", 0)),
            "total_referring_domains": summary_data.get("total_referring_domains", summary_data.get("referring_domains", 0)),
            "total_subnets": summary_data.get("total_subnets", 0),
            "total_ips": summary_data.get("total_ips", 0),
            "generated_at": datetime.now().isoformat()
        },
        "summary_statistics": summary_data,
        "top_anchors": anchors_list[:10] if anchors_list else [],
        "sample_backlinks": raw_backlinks[:20] if raw_backlinks else [],
        "top_referring_domains": domains_list[:10] if domains_list else []
    }
    print("Backlinks data compiled successfully\n")
else:
    print("Failed to fetch backlinks data\n")
    sample_backlinks_data = {
        "metadata": {
            "target": backlinks_params["target"],
            "mode": backlinks_params["mode"],
            "error": "API request failed",
            "generated_at": datetime.now().isoformat()
        }
    }

# Display backlinks findings
print("BACKLINKS FINDINGS:")
if "summary_statistics" in sample_backlinks_data and sample_backlinks_data["summary_statistics"]:
    summary = sample_backlinks_data["metadata"]
    print(f"Total Backlinks: {summary.get('total_backlinks', 'N/A'):,}")
    print(f"Referring Domains: {summary.get('total_referring_domains', 'N/A'):,}")
    print(f"Unique Subnets: {summary.get('total_subnets', 'N/A'):,}")
    print(f"Unique IPs: {summary.get('total_ips', 'N/A'):,}")
    print(f"\nTop Anchor Texts: {len(sample_backlinks_data['top_anchors'])} collected")
    print(f"Sample Backlinks: {len(sample_backlinks_data['sample_backlinks'])} collected")
    print(f"Top Domains: {len(sample_backlinks_data['top_referring_domains'])} collected")
else:
    print("No data available - API request may have failed")
print()


print("AI SEARCH API EXPLORATION")

# Request Parameters for AI Search
ai_search_params = {
    "target": "nike.com",
    "scope": "domain",  # Options: domain, host, url
    "source": "us",     # Alpha-2 country code
    "offset": 0,
    "limit": 100
}

print(f"\nTarget Domain: {ai_search_params['target']}")
print(f"Scope: {ai_search_params['scope']}")
print(f"Region: {ai_search_params['source']}")
print(f"Tracking: ChatGPT, Gemini, Perplexity, AI Mode\n")

# Test multiple AI engines
engines = ["chatgpt", "gemini", "perplexity", "ai-mode"]
ai_search_data = {}

for engine in engines:
    print(f"Fetching {engine.upper()} overview...")
    params_with_engine = {**ai_search_params, "engine": engine}
    overview = make_api_request("ai-search/overview", params_with_engine)

    if overview:
        ai_search_data[engine] = {
            "overview": overview,
            "prompts": []
        }

        # Fetch sample prompts for this engine
        print(f"Fetching {engine.upper()} prompts...")
        prompts_params = {**ai_search_params, "engine": engine, "limit": 10}
        prompts = make_api_request("ai-search/prompts-by-target", prompts_params)

        if prompts:
            ai_search_data[engine]["prompts"] = prompts.get("prompts", [])
    else:
        ai_search_data[engine] = None

# Fetch brand discovery
print("Fetching brand discovery...")
brand_params = {"target": ai_search_params["target"], "scope": ai_search_params["scope"], "source": ai_search_params["source"]}
ai_brand = make_api_request("ai-search/discover-brand", brand_params)

# Compile AI Search data
print("\nCompiling AI Search dataset...")
if any(ai_search_data.values()) or ai_brand:
    sample_ai_search_data = {
        "metadata": {
            "target": ai_search_params["target"],
            "scope": ai_search_params["scope"],
            "source": ai_search_params["source"],
            "engines_tracked": engines,
            "generated_at": datetime.now().isoformat()
        },
        "brand_info": ai_brand if ai_brand else {},
        "engines": ai_search_data
    }
    print("AI Search data compiled successfully\n")
else:
    print("Failed to fetch AI Search data")
    print("Note: AI Search data may not be available for this domain or account\n")
    sample_ai_search_data = {
        "metadata": {
            "target": ai_search_params["target"],
            "scope": ai_search_params["scope"],
            "source": ai_search_params["source"],
            "engines_tracked": engines,
            "error": "API request failed or no AI Search data available",
            "note": "AI Search tracks brand visibility across ChatGPT, Gemini, Perplexity, and other LLMs",
            "generated_at": datetime.now().isoformat()
        }
    }

# Display AI Search findings
print("AI SEARCH FINDINGS:")
if "engines" in sample_ai_search_data and any(sample_ai_search_data["engines"].values()):
    for engine, data in sample_ai_search_data["engines"].items():
        if data and data.get("overview"):
            overview = data["overview"]
            summary = overview.get("summary", {})

            print(f"\n{engine.upper()}:")
            if "link_presence" in summary:
                lp = summary["link_presence"]
                print(f"  Link Presence: {lp.get('current', 'N/A')} (Change: {lp.get('change_percent', 'N/A')}%)")
            if "average_position" in summary:
                ap = summary["average_position"]
                print(f"  Avg Position: {ap.get('current', 'N/A')}")
            if "ai_opportunity_traffic" in summary:
                traffic = summary["ai_opportunity_traffic"]
                print(f"  AI Traffic: {traffic.get('current', 'N/A')}")
            print(f"  Sample Prompts: {len(data.get('prompts', []))}")

    if sample_ai_search_data.get("brand_info", {}).get("brands"):
        print(f"\nDiscovered Brands: {', '.join(sample_ai_search_data['brand_info']['brands'])}")
else:
    print("No data available - AI Search may not be available for this account")
    print("\nAI Search tracks brand visibility across:")
    print(" ChatGPT (OpenAI)")
    print(" Gemini (Google)")
    print(" Perplexity AI")
    print(" AI Mode")
    print(" AI Overview (Google's SGE)")
print()


# Save datasets to JSON files
print("SAVING DATASETS")

datasets = {
    "data/se_ranking_backlinks_nike": sample_backlinks_data,
    "data/se_ranking_ai_search_nike": sample_ai_search_data
}

for filename, data in datasets.items():
    filepath = f"{filename}.json"
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved: {filepath}")
