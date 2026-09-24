#!/usr/bin/env python3
"""
CLI Script: Download STFC ePubs Publications Dataset
Usage:
    python download_dataset.py --query "perovskite" --dept "ISIS" --output "perovskite.csv" --limit 20
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

from tool_src.stfc_epubs_tool import download_stfc_dataset


def main():
    parser = argparse.ArgumentParser(description="Download publications dataset from STFC ePubs.")
    parser.add_argument("--query", "-q", required=True, help="Search query keywords.")
    parser.add_argument("--output", "-o", required=True, help="Target file path (e.g. results.csv).")
    parser.add_argument("--dept", "-d", default=None, help="Facility or department.")
    parser.add_argument("--format", "-f", default="csv", choices=["csv", "ris"], help="Export format.")
    parser.add_argument("--limit", "-l", type=int, default=50, help="Maximum records to export.")

    args = parser.parse_args()

    results = download_stfc_dataset(
        query=args.query,
        output_path=args.output,
        dept=args.dept,
        export_format=args.format,
        limit=args.limit,
    )

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

