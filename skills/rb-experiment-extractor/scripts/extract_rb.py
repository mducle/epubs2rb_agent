#!/usr/bin/env python3
"""
CLI Script: Extract RB Experiment Numbers
Usage:
    python extract_rb.py --doi "10.1038/s41467-022-31842-x"
    python extract_rb.py --pdf "path/to/paper.pdf"
    python extract_rb.py --text "Beamtime allocation RB1910243 at ISIS."
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

from tool_src.rb_extractor_tool import (
    extract_rb_experiment_numbers,
    extract_rb_from_doi,
    extract_rb_from_pdf,
    scan_text_for_rb,
)


def main():
    parser = argparse.ArgumentParser(description="Extract STFC beamtime RB proposal numbers.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--doi", help="Publication DOI or DOI URL.")
    group.add_argument("--pdf", help="Path or URL to PDF file.")
    group.add_argument("--text", help="Raw text string to scan.")
    group.add_argument("--any", dest="unified_input", help="Auto-detecting input (DOI, PDF path, or text).")

    args = parser.parse_args()

    if args.doi:
        result = extract_rb_from_doi(args.doi)
    elif args.pdf:
        result = extract_rb_from_pdf(args.pdf)
    elif args.text:
        matches = scan_text_for_rb(args.text)
        result = {
            "status": "success",
            "experiment_numbers": list(dict.fromkeys(m["rb_number"] for m in matches)),
            "matches_count": len(matches),
            "matches": matches,
        }
    elif args.unified_input:
        result = extract_rb_experiment_numbers(doi_or_url=args.unified_input)
    else:
        result = {"status": "error", "message": "No input provided."}

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

