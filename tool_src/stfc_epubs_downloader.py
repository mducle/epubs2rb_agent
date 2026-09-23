#!/usr/bin/env python3
"""
STFC ePubs CSV Downloader
=========================
A robust Python application and library to search the Science and Technology
Facilities Council (STFC) institutional repository (https://epubs.stfc.ac.uk/)
and download search results as CSV or RIS datasets.

Supports both:
  1. Standalone CLI usage with rich options (sorting, filtering, format choices).
  2. Reusable Python module/library API (`StfcEpubsDownloader`, `download_csv`).

Zero external dependencies required (uses standard library `urllib`, `csv`, `json`).
"""

import argparse
import csv
import http.cookiejar
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple, Union

__version__ = "1.0.0"
__author__ = "STFC ePubs Tools"

BASE_URL = "https://epubs.stfc.ac.uk"
SEARCH_ENDPOINT = f"{BASE_URL}/search/result"
EXPORT_OPTIONS_ENDPOINT = f"{BASE_URL}/export-options/all"
DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; STFCEpubsDownloader/1.0; +https://epubs.stfc.ac.uk)"


class StfcEpubsError(Exception):
    """Base exception for STFC ePubs downloader errors."""
    pass


class StfcEpubsNoResultsError(StfcEpubsError):
    """Raised when a search yields zero records."""
    pass


class StfcEpubsDownloader:
    """
    Client for interacting with the STFC ePubs repository and downloading
    search query results as CSV.
    """

    def __init__(self, base_url: str = BASE_URL, timeout: int = 45, user_agent: str = DEFAULT_USER_AGENT, verbose: bool = False):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.user_agent = user_agent
        self.verbose = verbose
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )
        self.last_query_info: Dict[str, Any] = {}

    def _log(self, message: str) -> None:
        """Internal logging helper."""
        if self.verbose:
            sys.stderr.write(f"[STFC-ePubs] {message}\n")
            sys.stderr.flush()

    def _make_request(self, url: str, data: Optional[bytes] = None, headers: Optional[Dict[str, str]] = None) -> Tuple[int, bytes, Dict[str, str]]:
        """Makes an HTTP request using the session opener and cookie jar."""
        req_headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        if headers:
            req_headers.update(headers)

        req = urllib.request.Request(url, data=data, headers=req_headers)
        try:
            with self.opener.open(req, timeout=self.timeout) as response:
                status = response.status
                body = response.read()
                resp_headers = dict(response.headers.items())
                return status, body, resp_headers
        except urllib.error.HTTPError as e:
            body = e.read() if hasattr(e, "read") else b""
            raise StfcEpubsError(f"HTTP Error {e.code}: {e.reason} when accessing {url}") from e
        except urllib.error.URLError as e:
            raise StfcEpubsError(f"Network connection failed: {e.reason}") from e

    def search(
        self,
        query: str,
        sort_by: str = "score",
        order: str = "desc",
        year: Optional[Union[str, int]] = None,
        dept: Optional[str] = None,
        pub_type: Optional[str] = None,
        extra_params: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Submits the search query to initialize the search session on epubs.stfc.ac.uk.

        Parameters:
          query: Search keywords or phrase (empty string queries all records)
          sort_by: 'score' (relevance), 'year', 'title', or 'author'
          order: 'desc' or 'asc'
          year: Optional publication year filter (e.g. 2023)
          dept: Optional department filter
          pub_type: Optional publication type filter
          extra_params: Extra URL search parameters

        Returns:
          A dictionary containing metadata about the search result.
        """
        valid_sorts = {"score", "year", "title", "author"}
        if sort_by not in valid_sorts:
            sort_by = "score"

        order = "asc" if order.lower() == "asc" else "desc"

        params: List[Tuple[str, str]] = [
            ("q", query or ""),
            ("sortby", sort_by),
            ("order", order),
        ]

        if year:
            params.append(("filterYear", str(year)))
        if dept:
            params.append(("filterDept[]", str(dept)))
        if pub_type:
            params.append(("filterType[]", str(pub_type)))
        if extra_params:
            for k, v in extra_params.items():
                params.append((k, str(v)))

        search_url = f"{self.base_url}/search/result?{urllib.parse.urlencode(params)}"
        self._log(f"Initiating search at: {search_url}")

        status, body, _ = self._make_request(search_url)
        html = body.decode("utf-8", errors="ignore")

        # Parse results count or presence of export button
        has_export = "exportAllButton" in html
        has_results = False
        count = 0

        # Try to extract total results count from HTML
        count_match = re.search(r"([0-9,]+)\s+results?", html, re.I)
        if count_match:
            try:
                count = int(count_match.group(1).replace(",", ""))
                has_results = count > 0
            except ValueError:
                pass

        if not count_match:
            # Check for totalPages variable in script
            pages_match = re.search(r"var\s+totalPages\s*=\s*(\d+);", html)
            if pages_match:
                pages = int(pages_match.group(1))
                if pages > 0:
                    has_results = True
                    count = pages * 10  # approximate

        no_result_match = re.search(r"No\s+results\s+found|0\s+results", html, re.I)
        if no_result_match and not has_export:
            has_results = False
            count = 0

        info = {
            "query": query,
            "sort_by": sort_by,
            "order": order,
            "search_url": search_url,
            "estimated_count": count,
            "has_export": has_export,
            "has_results": has_results or has_export,
            "html_length": len(html),
        }
        self.last_query_info = info
        self._log(f"Search completed. Found export capability: {has_export}, estimated count: {count}")
        return info

    def get_export_viewstate(self, referer_url: Optional[str] = None) -> Tuple[str, Dict[str, str]]:
        """
        Navigates to /export-options/all within the current session,
        extracts the JSF ViewState token and available checkboxes.
        """
        export_url = f"{self.base_url}/export-options/all"
        headers = {"Referer": referer_url or f"{self.base_url}/search/result"}
        self._log(f"Fetching export options form from {export_url}")

        status, body, _ = self._make_request(export_url, headers=headers)
        html = body.decode("utf-8", errors="ignore")

        # Extract ViewState
        m = re.search(r'name=["\']javax\.faces\.ViewState["\'][^>]*value=["\']([^"\']+)["\']', html)
        if not m:
            m = re.search(r'value=["\']([^"\']+)["\'][^>]*name=["\']javax\.faces\.ViewState["\']', html)

        if not m:
            raise StfcEpubsError(
                "Could not locate javax.faces.ViewState token on the export page. "
                "The repository session may have expired or returned an unexpected page."
            )

        viewstate = m.group(1)

        # Detect checkbox field names based on title or labels
        checkbox_map: Dict[str, str] = {}
        for cb in re.findall(r'<input[^>]*type=["\']checkbox["\'][^>]*>', html):
            name_m = re.search(r'name=["\']([^"\']+)["\']', cb)
            title_m = re.search(r'title=["\']([^"\']+)["\']', cb)
            if name_m and title_m:
                title = title_m.group(1).lower()
                name = name_m.group(1)
                if "affiliat" in title:
                    checkbox_map["affiliations"] = name
                elif "abstract" in title:
                    checkbox_map["abstract"] = name
                elif "isbn" in title:
                    checkbox_map["isbn"] = name
                elif "url" in title or "purl" in title:
                    checkbox_map["purl"] = name
                elif "related" in title:
                    checkbox_map["related"] = name

        return viewstate, checkbox_map

    def download_csv(
        self,
        query: str,
        output_file: Optional[str] = None,
        export_format: str = "standard",
        sort_by: str = "score",
        order: str = "desc",
        year: Optional[Union[str, int]] = None,
        dept: Optional[str] = None,
        pub_type: Optional[str] = None,
        include_abstract: bool = False,
        include_affiliations: bool = False,
        include_isbn: bool = False,
        include_purl: bool = False,
        include_related: bool = False,
        limit: Optional[int] = None,
    ) -> str:
        """
        Executes the query and downloads the full CSV data from STFC ePubs.

        Parameters:
          query: Search keyword or phrase
          output_file: Optional path where to write the CSV file
          export_format: 'standard' (default STFC CSV) or 'researchfish' (CSV for ResearchFish)
          sort_by: 'score', 'year', 'title', or 'author'
          order: 'desc' or 'asc'
          year, dept, pub_type: Optional search filters
          include_*: Optional toggles for extra metadata columns
          limit: Optional limit on the number of data rows returned

        Returns:
          The CSV content as a UTF-8 string.
        """
        search_info = self.search(
            query=query,
            sort_by=sort_by,
            order=order,
            year=year,
            dept=dept,
            pub_type=pub_type,
        )

        if not search_info.get("has_export") and not search_info.get("has_results"):
            self._log("Query returned 0 results. Returning empty CSV header.")
            header = "Workid,Type,Contributors,Department,Division/Group,Funder,Programme,Grant Reference,Start Page,End Page,Article no.,Volume,ISBN,Publisher,Publication Year,Series Title,Series Number,Thesis Details,Meeting Name,Book Title,Patent Number,Patent Assignee,Report DOI,URIs,Related Research Objects,Licence,Full-text Status,Title\n"
            if output_file:
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(header)
            return header

        viewstate, checkbox_map = self.get_export_viewstate(referer_url=search_info["search_url"])

        # Select export button name
        export_btn_val = "Export All CSV"
        export_btn_name = "main-form:export-csv-all"

        if export_format.lower() in ("researchfish", "rf"):
            export_btn_name = "main-form:export-csv-rf-all"
            export_btn_val = "Export All CSV for ResearchFish"
        elif export_format.lower() == "ris":
            export_btn_name = "main-form:export-ris-all"
            export_btn_val = "Export All RIS"

        post_data: Dict[str, str] = {
            "main-form": "main-form",
            "main-form:sortBy": sort_by,
            "main-form:order": order,
            export_btn_name: export_btn_val,
            "javax.faces.ViewState": viewstate,
        }

        # Checkboxes
        if include_abstract and "abstract" in checkbox_map:
            post_data[checkbox_map["abstract"]] = "on"
        if include_affiliations and "affiliations" in checkbox_map:
            post_data[checkbox_map["affiliations"]] = "on"
        if include_isbn and "isbn" in checkbox_map:
            post_data[checkbox_map["isbn"]] = "on"
        if include_purl and "purl" in checkbox_map:
            post_data[checkbox_map["purl"]] = "on"
        if include_related and "related" in checkbox_map:
            post_data[checkbox_map["related"]] = "on"

        encoded_data = urllib.parse.urlencode(post_data).encode("utf-8")
        export_url = f"{self.base_url}/export-options/all"

        headers = {
            "Referer": export_url,
            "Content-Type": "application/x-www-form-urlencoded",
        }
        self._log(f"Submitting CSV export request ({export_format} format)...")

        status, body, resp_headers = self._make_request(export_url, data=encoded_data, headers=headers)
        csv_text = body.decode("utf-8", errors="replace")

        # If limited rows requested
        if limit is not None and limit > 0 and export_format != "ris":
            csv_text = self._slice_csv(csv_text, limit)

        if output_file:
            self._log(f"Writing {len(csv_text)} characters to {output_file}")
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(csv_text)

        return csv_text

    def get_records(self, query: str, limit: Optional[int] = None, **kwargs) -> List[Dict[str, str]]:
        """
        Searches ePubs and returns records directly as a list of Python dictionaries.
        """
        csv_text = self.download_csv(query=query, limit=limit, **kwargs)
        reader = csv.DictReader(io.StringIO(csv_text))
        return list(reader)

    def _slice_csv(self, csv_text: str, limit: int) -> str:
        """Helper to retain the CSV header and the first `limit` rows."""
        lines = csv_text.splitlines(keepends=True)
        if not lines:
            return csv_text
        header = lines[0]
        rows = lines[1 : limit + 1]
        return header + "".join(rows)


def download_csv(
    query: str,
    output_file: Optional[str] = None,
    sort_by: str = "score",
    order: str = "desc",
    export_format: str = "standard",
    year: Optional[Union[str, int]] = None,
    dept: Optional[str] = None,
    pub_type: Optional[str] = None,
    limit: Optional[int] = None,
    verbose: bool = False,
) -> str:
    """
    Convenience function to download CSV data from a STFC ePubs query in a single call.
    """
    downloader = StfcEpubsDownloader(verbose=verbose)
    return downloader.download_csv(
        query=query,
        output_file=output_file,
        sort_by=sort_by,
        order=order,
        export_format=export_format,
        year=year,
        dept=dept,
        pub_type=pub_type,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# CLI & Terminal Interface
# ---------------------------------------------------------------------------

def run_interactive():
    """Interactive CLI wizard."""
    print("=" * 60)
    print("  STFC ePubs CSV Downloader - Interactive Mode")
    print("  https://epubs.stfc.ac.uk/")
    print("=" * 60)

    try:
        query = input("\nEnter search query (e.g. 'quantum', 'neutron', 'ISIS'): ").strip()
        print("\nSelect export format:")
        print("  1. Standard STFC CSV (full publication details)")
        print("  2. ResearchFish CSV (for ResearchFish grant reporting)")
        print("  3. RIS Citation format")
        fmt_choice = input("Choice [1/2/3, default: 1]: ").strip()
        export_format = "standard"
        if fmt_choice == "2":
            export_format = "researchfish"
        elif fmt_choice == "3":
            export_format = "ris"

        print("\nSort by:")
        print("  1. Relevance / Score (default)")
        print("  2. Publication Year")
        print("  3. Title")
        print("  4. Author")
        sort_choice = input("Choice [1/2/3/4, default: 1]: ").strip()
        sort_map = {"1": "score", "2": "year", "3": "title", "4": "author"}
        sort_by = sort_map.get(sort_choice, "score")

        order_choice = input("Sort order: Descending or Ascending? [desc/asc, default: desc]: ").strip().lower()
        order = "asc" if order_choice == "asc" else "desc"

        year = input("Filter by publication year (leave blank for all years): ").strip()
        limit_str = input("Limit number of records (leave blank for all): ").strip()
        limit = int(limit_str) if limit_str.isdigit() else None

        default_filename = f"stfc_{re.sub(r'[^a-zA-Z0-9_-]', '_', query) or 'all'}.{('ris' if export_format == 'ris' else 'csv')}"
        output_file = input(f"Output file name [default: {default_filename}]: ").strip()
        if not output_file:
            output_file = default_filename

        print(f"\n[+] Connecting to STFC ePubs and fetching data for '{query}'...")
        start_time = time.time()
        downloader = StfcEpubsDownloader(verbose=True)
        csv_data = downloader.download_csv(
            query=query,
            output_file=output_file,
            export_format=export_format,
            sort_by=sort_by,
            order=order,
            year=year or None,
            limit=limit,
        )
        elapsed = time.time() - start_time
        lines_count = len(csv_data.splitlines()) - 1
        print(f"\n[✓] Successfully downloaded {lines_count} records ({len(csv_data):,} bytes) in {elapsed:.2f}s!")
        print(f"[✓] Saved dataset to: {os.path.abspath(output_file)}")

    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[!] Error occurred: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Download CSV publication data from STFC ePubs (https://epubs.stfc.ac.uk/)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download all results for 'graphene' to a CSV file
  python3 stfc_epubs_downloader.py --query "graphene" --output graphene_papers.csv

  # Search with publication year filter, sorted by year descending
  python3 stfc_epubs_downloader.py -q "neutron scattering" --year 2024 --sort year -o neutron_2024.csv

  # Download in ResearchFish CSV format
  python3 stfc_epubs_downloader.py -q "Diamond Light Source" --format researchfish -o diamond_rf.csv

  # Export records as JSON
  python3 stfc_epubs_downloader.py -q "ISIS" --limit 50 --json -o isis_sample.json

  # Interactive wizard mode
  python3 stfc_epubs_downloader.py --interactive
        """,
    )

    parser.add_argument("-q", "--query", type=str, default="", help="Search query keywords or phrases")
    parser.add_argument("-o", "--output", type=str, default=None, help="Output file path (writes to stdout if omitted)")
    parser.add_argument("-f", "--format", choices=["standard", "researchfish", "rf", "ris"], default="standard", help="Export format (default: standard CSV)")
    parser.add_argument("-s", "--sort", choices=["score", "year", "title", "author"], default="score", help="Sort field (default: score)")
    parser.add_argument("--order", choices=["desc", "asc"], default="desc", help="Sort order (default: desc)")
    parser.add_argument("--year", type=str, default=None, help="Filter by publication year (e.g. 2024)")
    parser.add_argument("--dept", type=str, default=None, help="Filter by department code or name")
    parser.add_argument("--type", type=str, default=None, dest="pub_type", help="Filter by publication type")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of rows returned")
    parser.add_argument("--json", action="store_true", help="Output results as JSON instead of CSV")
    parser.add_argument("--preview", action="store_true", help="Print a preview summary table of the first few records")
    parser.add_argument("-i", "--interactive", action="store_true", help="Launch interactive step-by-step wizard")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show detailed connection and progress logs")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    args = parser.parse_args()

    if args.interactive or (len(sys.argv) == 1 and sys.stdin.isatty()):
        run_interactive()
        return

    downloader = StfcEpubsDownloader(verbose=args.verbose)

    try:
        if args.json:
            records = downloader.get_records(
                query=args.query,
                sort_by=args.sort,
                order=args.order,
                year=args.year,
                dept=args.dept,
                pub_type=args.pub_type,
                limit=args.limit,
            )
            json_text = json.dumps(records, indent=2, ensure_ascii=False)
            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    f.write(json_text)
                if args.verbose or not args.output:
                    print(f"Exported {len(records)} records to {args.output}", file=sys.stderr)
            else:
                sys.stdout.write(json_text)
            return

        csv_text = downloader.download_csv(
            query=args.query,
            output_file=args.output,
            export_format=args.format,
            sort_by=args.sort,
            order=args.order,
            year=args.year,
            dept=args.dept,
            pub_type=args.pub_type,
            limit=args.limit,
        )

        if args.preview:
            reader = csv.reader(io.StringIO(csv_text))
            rows = list(reader)
            if rows:
                header = rows[0]
                data_rows = rows[1:6]
                print(f"\nPreview of {len(rows)-1} total records from STFC ePubs:")
                print("-" * 80)
                # Print sample columns (e.g. Workid, Title, Year, Contributors)
                indices = [i for i, h in enumerate(header) if h in ("Workid", "Title", "Publication Year", "Type", "Department")]
                if not indices:
                    indices = list(range(min(4, len(header))))
                
                col_names = [header[i] for i in indices]
                print(" | ".join(f"{c[:20]:<20}" for c in col_names))
                print("-" * 80)
                for r in data_rows:
                    vals = [r[i] if i < len(r) else "" for i in indices]
                    print(" | ".join(f"{v[:20]:<20}" for v in vals))
                print("-" * 80)

        if not args.output and not args.preview:
            sys.stdout.write(csv_text)
        elif args.output and not args.verbose:
            row_count = max(0, len(csv_text.splitlines()) - 1)
            print(f"Downloaded {row_count} records ({len(csv_text):,} bytes) to '{args.output}'")

    except StfcEpubsError as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Unexpected error: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
