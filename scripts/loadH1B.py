#!/usr/bin/env python3
"""
Load H-1B wage disclosure data into Supabase.

Data source: Department of Labor OFLC Performance Data
URL: https://www.dol.gov/agencies/eta/foreign-labor/performance

Instructions:
1. Download the H-1B disclosure CSV for the target fiscal year from the DOL site.
2. Install dependencies: pip install pandas supabase python-dotenv
3. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env (service key, not anon key)
4. Run: python scripts/loadH1B.py --file LCA_Disclosure_Data_FY2024.csv --year 2024

The script:
- Filters for H-1B case status = CERTIFIED
- Maps EMPLOYER_NAME, JOB_TITLE, WORKSITE_STATE, WAGE_RATE_OF_PAY_FROM
- Annualizes wages (converts hourly → annual at 2080 hrs)
- Upserts into the h1b_wages table in Supabase
"""

import argparse
import os
import sys

# Uncomment after: pip install pandas supabase python-dotenv
# import pandas as pd
# from supabase import create_client
# from dotenv import load_dotenv

WAGE_UNIT_MULTIPLIERS = {
    'Year': 1,
    'Hour': 2080,
    'Week': 52,
    'Bi-Weekly': 26,
    'Month': 12,
}

TECH_JOB_KEYWORDS = [
    'software', 'engineer', 'developer', 'data', 'scientist',
    'product manager', 'designer', 'devops', 'sre', 'machine learning',
    'backend', 'frontend', 'fullstack', 'infrastructure',
]


def main() -> None:
    parser = argparse.ArgumentParser(description='Load H-1B wage data into Supabase')
    parser.add_argument('--file', required=True, help='Path to DOL CSV file')
    parser.add_argument('--year', type=int, required=True, help='Fiscal year (e.g. 2024)')
    args = parser.parse_args()

    # load_dotenv()
    # supabase_url = os.environ['SUPABASE_URL']
    # supabase_key = os.environ['SUPABASE_SERVICE_KEY']
    # client = create_client(supabase_url, supabase_key)

    print(f'Would load: {args.file} for FY{args.year}')
    print('Stub — uncomment the implementation block after installing dependencies.')
    sys.exit(0)

    # --- Implementation (uncomment) ---
    # df = pd.read_csv(args.file, low_memory=False)
    # df = df[df['CASE_STATUS'] == 'Certified']
    # df['JOB_TITLE_LOWER'] = df['JOB_TITLE'].str.lower()
    # mask = df['JOB_TITLE_LOWER'].str.contains('|'.join(TECH_JOB_KEYWORDS), na=False)
    # df = df[mask]
    #
    # def annualize(row):
    #     unit = row.get('WAGE_UNIT_OF_PAY', 'Year')
    #     mult = WAGE_UNIT_MULTIPLIERS.get(unit, 1)
    #     try:
    #         return int(float(str(row['WAGE_RATE_OF_PAY_FROM']).replace(',', '')) * mult)
    #     except (ValueError, TypeError):
    #         return None
    #
    # df['annual_wage'] = df.apply(annualize, axis=1)
    # df = df.dropna(subset=['annual_wage'])
    # df = df[df['annual_wage'].between(30_000, 1_000_000)]
    #
    # records = [
    #     {
    #         'employer': row['EMPLOYER_NAME'],
    #         'job_title': row['JOB_TITLE'],
    #         'state': row['WORKSITE_STATE'],
    #         'wage_rate': int(row['annual_wage']),
    #         'year': args.year,
    #     }
    #     for _, row in df.iterrows()
    # ]
    #
    # batch_size = 500
    # for i in range(0, len(records), batch_size):
    #     client.table('h1b_wages').upsert(records[i:i + batch_size]).execute()
    #     print(f'Upserted rows {i}–{min(i + batch_size, len(records))}')
    #
    # print(f'Done. Loaded {len(records)} H-1B wage records for FY{args.year}.')


if __name__ == '__main__':
    main()
