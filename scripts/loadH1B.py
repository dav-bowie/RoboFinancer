#!/usr/bin/env python3
"""
Load H-1B LCA disclosure Excel into Supabase salary_benchmarks table.

Data source: Department of Labor OFLC Performance Data

Requirements:
    - pandas
    - python-dotenv
    - supabase (supabase-py)

Usage:
    pip install pandas python-dotenv supabase
    python3 scripts/loadH1B.py

The script reads "scripts/LCA_Disclosure_Data_FY2025_Q4.xlsx", filters rows and
maps columns to the salary_benchmarks table shape, then upserts in batches of 500.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client


def load_env() -> None:
    load_dotenv()


def get_supabase_client() -> Any:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
    return create_client(url, key)


def read_and_filter_excel(path: str) -> pd.DataFrame:
    # Read the file; let pandas infer types. Use openpyxl engine if available.
    try:
        df = pd.read_excel(path, engine="openpyxl")
    except Exception:
        df = pd.read_excel(path)

    total_rows = len(df)
    print(f"Total rows in file: {total_rows}")

    # Basic filters
    mask = (
        (df.get("VISA_CLASS") == "H-1B")
        & (df.get("CASE_STATUS") == "Certified")
        & (df.get("WAGE_UNIT_OF_PAY") == "Year")
    )

    df = df.loc[mask].copy()

    # Ensure numeric salary column and filter by range
    df["WAGE_RATE_OF_PAY_FROM"] = pd.to_numeric(df.get("WAGE_RATE_OF_PAY_FROM"), errors="coerce")
    # pandas.DataFrame.between inclusive arg changed across versions; handle safely
    try:
        df = df[df["WAGE_RATE_OF_PAY_FROM"].between(30000, 500000, inclusive="both")]
    except TypeError:
        # newer pandas use inclusive='both' as default; fallback
        df = df[(df["WAGE_RATE_OF_PAY_FROM"] >= 30000) & (df["WAGE_RATE_OF_PAY_FROM"] <= 500000)]

    # Drop rows with null salary or null state (per requirements)
    df = df.dropna(subset=["WAGE_RATE_OF_PAY_FROM", "WORKSITE_STATE"]).copy()

    print(f"Rows after filtering: {len(df)}")
    return df


def map_to_benchmarks(df: pd.DataFrame) -> List[Dict]:
    records: List[Dict] = []

    # Normalize begin date to ISO; if missing, leave as None
    if "BEGIN_DATE" in df.columns:
        df["BEGIN_DATE"] = pd.to_datetime(df["BEGIN_DATE"], errors="coerce")

    for _, row in df.iterrows():
        # Skip rows with missing essential data
        if pd.isna(row.get("WAGE_RATE_OF_PAY_FROM")) or pd.isna(row.get("WORKSITE_STATE")):
            continue

        try:
            base_salary = int(round(float(row.get("WAGE_RATE_OF_PAY_FROM"))))
        except Exception:
            # Skip rows with invalid salary
            continue

        role_raw = row.get("SOC_TITLE") or row.get("SOC_NAME") or ""
        role = str(role_raw).strip()
        role_normalized = role.lower().strip()

        scraped_at = None
        if pd.notna(row.get("BEGIN_DATE")):
            try:
                scraped_at = pd.to_datetime(row.get("BEGIN_DATE")).isoformat()
            except Exception:
                scraped_at = None

        rec = {
            "company": row.get("EMPLOYER_NAME") or None,
            "role": role or None,
            "role_normalized": role_normalized or None,
            "base_salary": base_salary,
            "location_state": row.get("WORKSITE_STATE") or None,
            "location_city": row.get("WORKSITE_CITY") or None,
            "scraped_at": scraped_at,
            # fixed values
            "source": "h1b",
            "bonus": None,
            "equity_annual": None,
            "level": None,
            "years_exp": None,
            "total_comp": base_salary,
        }

        records.append(rec)

    return records


def chunked_iterable(iterable: List, size: int):
    for i in range(0, len(iterable), size):
        yield iterable[i : i + size]


def upsert_batches(client: Any, table: str, records: List[Dict], batch_size: int = 500) -> int:
    total = 0
    for idx, batch in enumerate(chunked_iterable(records, batch_size), start=1):
        print(f"Loading batch {idx} (rows {len(batch)})...")
        try:
            res = client.table(table).upsert(batch).execute()
            # supabase-py returns a response object; check for error
            err = None
            try:
                err = getattr(res, "error", None) or (res and res.get("error") if isinstance(res, dict) else None)
            except Exception:
                err = None

            if err:
                print(f"Error loading batch {idx}: {err}")
            else:
                total += len(batch)
        except Exception as e:
            print(f"Exception when loading batch {idx}: {e}")
    return total


def main() -> None:
    load_dotenv()
    client = get_supabase_client()

    file_path = os.path.join(os.path.dirname(__file__), "LCA_Disclosure_Data_FY2025_Q4.xlsx")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Excel file not found at {file_path}")

    df = read_and_filter_excel(file_path)
    records = map_to_benchmarks(df)

    print(f"Prepared {len(records)} records to load")

    if not records:
        print("No records to load. Exiting.")
        return

    loaded = upsert_batches(client, "salary_benchmarks", records, batch_size=500)
    print(f"Total loaded: {loaded}")


if __name__ == "__main__":
    main()
