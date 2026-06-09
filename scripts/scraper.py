#!/usr/bin/env python3
"""
Scrape compensation data from public aggregator sources.

Supported sources:
- Levels.fyi (public aggregate endpoints)
- Glassdoor (requires account + API access)
- Blind (limited public data)

Instructions:
1. Install dependencies: pip install httpx beautifulsoup4 supabase python-dotenv
2. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
3. Run: python scripts/scraper.py --source levels --role "Software Engineer" --year 2024

Ethics note:
- Only scrape publicly available aggregate data, not individual profiles.
- Respect robots.txt and rate limits.
- Cache responses locally to avoid hammering endpoints.
- Use official APIs where available (Glassdoor has a partner API).

The script upserts into the market_data table in Supabase:
  (role, level, city, p25, p50, p75, p90, source, year)
"""

import argparse
import sys
import time

# Uncomment after: pip install httpx beautifulsoup4 supabase python-dotenv
# import httpx
# from bs4 import BeautifulSoup
# from supabase import create_client
# from dotenv import load_dotenv

LEVELS_FYI_ROLES = [
    'Software Engineer',
    'Product Manager',
    'Data Scientist',
    'Designer',
    'Engineering Manager',
    'Data Engineer',
    'DevOps / SRE',
]

CITIES = [
    'San Francisco, CA',
    'San Jose, CA',
    'New York, NY',
    'Seattle, WA',
    'Boston, MA',
    'Los Angeles, CA',
    'Austin, TX',
    'Denver, CO',
    'Chicago, IL',
    'Washington, DC',
]

REQUEST_DELAY_SECONDS = 2  # be polite


def scrape_levels_fyi(_role: str, _city: str) -> dict | None:
    """Stub — implement against Levels.fyi public endpoints."""
    print(f'  [stub] Would scrape Levels.fyi for {_role} in {_city}')
    time.sleep(REQUEST_DELAY_SECONDS)
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description='Scrape comp data into Supabase')
    parser.add_argument('--source', choices=['levels', 'glassdoor'], default='levels')
    parser.add_argument('--role', default='Software Engineer')
    parser.add_argument('--year', type=int, default=2024)
    args = parser.parse_args()

    print(f'Source: {args.source} | Role: {args.role} | Year: {args.year}')
    print('Stub — implement scrape_levels_fyi() and uncomment the Supabase upsert.')

    for city in CITIES:
        data = scrape_levels_fyi(args.role, city)
        if data:
            print(f'  Got data for {city}: {data}')
        else:
            print(f'  No data for {city} (stub returned None)')

    sys.exit(0)


if __name__ == '__main__':
    main()
