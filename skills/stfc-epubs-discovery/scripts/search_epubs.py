#!/usr/bin/env python3
"""
CLI Script: Search STFC ePubs Publications
Usage:
    python search_epubs.py --query "ISIS neutron" --limit 5
    python search_epubs.py --query "superconductivity" --dept "ISIS" --year-from 2021
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Ensure repository root is on sys.path
repo_root = Path(__file__).resolve().parents[3]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from tool_src.stfc_epubs_tool import search_stfc_publications


def main():
    parser = argparse.ArgumentParser(description="Search STFC ePubs repository.")
    parser.add_argument("--query", "-q", required=True, help="Search query keywords.")
    parser.add_argument("--dept", "-d", default=None, help="Filter by facility or department.")
    parser.add_argument("--pub-type", "-t", default=None, help="Publication type.")
    parser.add_argument("--year", "-y", type=int, default=None, help="Filter by publication year.")
    parser.add_argument("--limit", "-l", type=int, default=5, help="Number of records to retrieve.")
    parser.add_argument("--sort-by", default="score", help="Sort order (score, pub_date_desc).")
    parser.add_argument("--json", action="store_true", default=True, help="Output formatted JSON.")

    args = parser.parse_args()

    results = search_stfc_publications(
        query=args.query,
        year=args.year,
        dept=args.dept,
        pub_type=args.pub_type,
        limit=args.limit,
        sort_by=args.sort_by,
    )

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
