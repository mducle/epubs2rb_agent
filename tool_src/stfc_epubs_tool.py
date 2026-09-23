"""
STFC ePubs AI Agent Tools
=========================
A suite of tools designed for AI agents (Google GenAI / Gemini, LangChain, CrewAI,
or standalone LLM agents) to query the Science and Technology Facilities Council
(STFC) repository (https://epubs.stfc.ac.uk/), download publication datasets,
and extract publication DOI addresses.

Features:
- `search_stfc_publications`: Structured, token-efficient repository search.
- `download_stfc_dataset`: Bulk export of publications to CSV or RIS format.
- `extract_publication_dois`: Parse publication datasets or files to extract and validate DOIs.
- `get_stfc_departments_and_types`: Retrieve valid facility filters.
- Native function calling compatibility with Google GenAI SDK (`google-genai`).
"""

import csv
import io
import json
import os
import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Tuple, Union

# Import underlying downloader from stfc_epubs_downloader
try:
    from .stfc_epubs_downloader import StfcEpubsDownloader, StfcEpubsError
except ImportError:
    from stfc_epubs_downloader import StfcEpubsDownloader, StfcEpubsError

# Regex to detect standard DOIs (handles prefixes like doi:, https://doi.org/, dx.doi.org, etc.)
DOI_REGEX = re.compile(
    r'(?:https?://(?:dx\.)?doi\.org/|doi:\s*|doi/)?\b(10\.\d{4,9}/[^\s"\'<>]+)',
    re.IGNORECASE,
)

# Common STFC facilities & departments
STFC_DEPARTMENTS = [
    "ISIS",
    "Diamond Light Source",
    "Central Laser Facility (CLF)",
    "Rutherford Appleton Laboratory (RAL)",
    "Daresbury Laboratory (DL)",
    "Scientific Computing Department (SCD)",
    "Particle Physics Department (PPD)",
    "UK Astronomy Technology Centre (UK ATC)",
    "Technology Department",
    "National Quantum Computing Centre (NQCC)",
    "Boulby Underground Laboratory",
    "Chilbolton Observatory",
    "Hartree Centre",
]

# Standard publication types in STFC ePubs
STFC_PUBLICATION_TYPES = [
    "Journal Article",
    "Conference Paper",
    "Technical Report",
    "Book Chapter",
    "Book",
    "Thesis",
    "Patent",
    "Dataset",
]


def _clean_doi(raw_doi: str) -> str:
    """Cleans trailing punctuation or characters from a DOI candidate."""
    doi = raw_doi.strip().rstrip(".,;:) \t\n\r")
    # Remove leading URL wrappers or doi: prefix if still present
    doi = re.sub(r'^https?://(?:dx\.)?doi\.org/', '', doi, flags=re.IGNORECASE)
    doi = re.sub(r'^doi:\s*', '', doi, flags=re.IGNORECASE)
    return doi.strip()


def _normalize_record(raw: Dict[str, str], include_abstract: bool = False) -> Dict[str, Any]:
    """
    Transforms raw CSV row dictionary into a clean, normalized schema
    tailored for LLM consumption.
    """
    authors_raw = raw.get("Contributors", "")
    authors = [a.strip() for a in authors_raw.split(",") if a.strip()] if authors_raw else []

    record: Dict[str, Any] = {
        "work_id": raw.get("Workid", "").strip(),
        "title": raw.get("Title", "").strip(),
        "authors": authors,
        "publication_year": raw.get("Publication Year", "").strip(),
        "type": raw.get("Type", "").strip(),
        "department": raw.get("Department", "").strip(),
        "division": raw.get("Division/Group", "").strip(),
        "journal_or_series": raw.get("Series Title", "").strip() or raw.get("Book Title", "").strip(),
        "volume": raw.get("Volume", "").strip(),
        "uris": raw.get("URIs", "").strip(),
        "report_doi": raw.get("Report DOI", "").strip(),
        "funder": raw.get("Funder", "").strip(),
        "grant_reference": raw.get("Grant Reference", "").strip(),
    }

    # Extract primary DOI if readily identifiable in URIs or Report DOI
    uris = record["uris"]
    report_doi = record["report_doi"]
    primary_doi = None

    if report_doi and report_doi.startswith("10."):
        primary_doi = _clean_doi(report_doi)
    elif uris:
        m = DOI_REGEX.search(uris)
        if m:
            primary_doi = _clean_doi(m.group(1))

    record["primary_doi"] = primary_doi
    record["doi_url"] = f"https://doi.org/{primary_doi}" if primary_doi else None

    if include_abstract and "Abstract" in raw:
        record["abstract"] = raw.get("Abstract", "").strip()

    # Filter out empty string fields to save LLM context window tokens
    return {k: v for k, v in record.items() if v not in (None, "", [])}


# ============================================================================
# Agent Tools
# ============================================================================

def search_stfc_publications(
    query: str,
    year: Optional[Union[str, int]] = None,
    dept: Optional[str] = None,
    pub_type: Optional[str] = None,
    sort_by: str = "score",
    order: str = "desc",
    limit: int = 10,
    include_abstract: bool = False,
) -> Dict[str, Any]:
    """
    Search the Science and Technology Facilities Council (STFC) ePubs institutional
    repository for scientific publications, technical reports, and facility outputs.

    Args:
        query: Keywords, author name, facility instrument name, or topic
               (e.g., 'neutron scattering', 'ISIS', 'quantum', 'superconductivity').
        year: Optional 4-digit publication year filter (e.g. 2023).
        dept: Optional department or facility filter (e.g., 'ISIS', 'RAL', 'Diamond').
        pub_type: Optional publication type (e.g., 'Journal Article', 'Conference Paper').
        sort_by: Field to sort results by: 'score' (relevance), 'year', 'title', or 'author'. Default is 'score'.
        order: Sort order: 'desc' (descending, default) or 'asc' (ascending).
        limit: Maximum number of publication records to return (default: 10, recommended <= 50 to conserve tokens).
        include_abstract: Whether to fetch and include full abstracts (default: False to conserve tokens).

    Returns:
        A dictionary with search metadata and a list of normalized publication records:
        {
            "query": str,
            "estimated_total": int,
            "returned_count": int,
            "publications": [
                {
                    "work_id": "30707155",
                    "title": "...",
                    "authors": ["..."],
                    "publication_year": "2023",
                    "type": "Journal Article",
                    "department": "ISIS",
                    "primary_doi": "10.xxxx/yyyy",
                    "doi_url": "https://doi.org/10.xxxx/yyyy",
                    ...
                }
            ]
        }
    """
    downloader = StfcEpubsDownloader(verbose=False)

    effective_query = query
    if dept and dept.lower() not in (query or "").lower():
        effective_query = f"{query} {dept}".strip()

    try:
        raw_records = downloader.get_records(
            query=effective_query,
            sort_by=sort_by,
            order=order,
            year=str(year) if year else None,
            dept=None,
            pub_type=None,
            limit=limit,
            include_abstract=include_abstract,
        )

        estimated_count = downloader.last_query_info.get("estimated_count", len(raw_records))
        normalized = [_normalize_record(r, include_abstract=include_abstract) for r in raw_records]

        return {
            "status": "success",
            "query": query,
            "filters": {
                "year": year,
                "dept": dept,
                "pub_type": pub_type,
                "sort_by": sort_by,
                "order": order,
            },
            "estimated_total": estimated_count,
            "returned_count": len(normalized),
            "publications": normalized,
        }

    except StfcEpubsError as e:
        return {
            "status": "error",
            "query": query,
            "message": f"STFC repository query failed: {str(e)}",
            "publications": [],
        }
    except Exception as e:
        return {
            "status": "error",
            "query": query,
            "message": f"Unexpected error during search: {str(e)}",
            "publications": [],
        }


def download_stfc_dataset(
    query: str,
    output_path: str,
    export_format: str = "standard",
    year: Optional[Union[str, int]] = None,
    dept: Optional[str] = None,
    pub_type: Optional[str] = None,
    sort_by: str = "score",
    order: str = "desc",
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Downloads search results from the STFC ePubs repository and saves them
    directly to a file on disk (CSV or RIS citation format).

    Args:
        query: Search keywords or phrases.
        output_path: Local filesystem path where the dataset should be saved (e.g. 'isis_2023.csv').
        export_format: Export format: 'standard' (full STFC CSV), 'researchfish' (CSV for ResearchFish), or 'ris'.
        year: Optional publication year filter.
        dept: Optional department or facility filter.
        pub_type: Optional publication type filter.
        sort_by: 'score', 'year', 'title', or 'author'.
        order: 'desc' or 'asc'.
        limit: Optional maximum number of records to write.

    Returns:
        Summary dictionary containing:
        {
            "status": "success",
            "output_path": "/absolute/path/to/file.csv",
            "records_count": 42,
            "file_size_bytes": 15420,
            "export_format": "standard"
        }
    """
    downloader = StfcEpubsDownloader(verbose=False)

    try:
        # Ensure parent directory exists
        abs_output_path = os.path.abspath(output_path)
        parent_dir = os.path.dirname(abs_output_path)
        if parent_dir and not os.path.exists(parent_dir):
            os.makedirs(parent_dir, exist_ok=True)

        effective_query = query
        if dept and dept.lower() not in (query or "").lower():
            effective_query = f"{query} {dept}".strip()

        csv_text = downloader.download_csv(
            query=effective_query,
            output_file=abs_output_path,
            export_format=export_format,
            sort_by=sort_by,
            order=order,
            year=str(year) if year else None,
            dept=None,
            pub_type=None,
            limit=limit,
        )

        lines = csv_text.splitlines()
        row_count = max(0, len(lines) - 1) if export_format != "ris" else len(lines)
        file_size = os.path.getsize(abs_output_path) if os.path.exists(abs_output_path) else len(csv_text.encode("utf-8"))

        return {
            "status": "success",
            "query": query,
            "output_path": abs_output_path,
            "records_count": row_count,
            "file_size_bytes": file_size,
            "export_format": export_format,
        }

    except Exception as e:
        return {
            "status": "error",
            "query": query,
            "output_path": output_path,
            "message": f"Failed to download STFC dataset: {str(e)}",
        }


def extract_publication_dois(
    dataset: Optional[List[Dict[str, Any]]] = None,
    file_path: Optional[str] = None,
    csv_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Parses an STFC ePubs dataset to extract, normalize, and validate all Digital
    Object Identifiers (DOIs). Can accept in-memory publication records, a CSV
    file path, or raw CSV text.

    Args:
        dataset: List of publication dictionaries (such as the 'publications' returned
                 by `search_stfc_publications`).
        file_path: Optional path to a CSV file on disk (such as created by `download_stfc_dataset`).
        csv_text: Optional raw CSV string content.

    Returns:
        Structured dictionary containing:
        {
            "status": "success",
            "total_records_scanned": 15,
            "records_with_doi": 12,
            "unique_dois_count": 12,
            "unique_dois": ["10.1080/00323910490970771", ...],
            "publications_with_dois": [
                {
                    "work_id": "30012",
                    "title": "Neutron Compton scattering...",
                    "publication_year": "2004",
                    "department": "ISIS",
                    "doi": "10.1080/00323910490970771",
                    "doi_url": "https://doi.org/10.1080/00323910490970771",
                    "source_field": "URIs"
                }
            ]
        }
    """
    records: List[Dict[str, Any]] = []

    # Source 1: In-memory publication objects
    if dataset:
        records.extend(dataset)

    # Source 2: File on disk
    if file_path:
        if not os.path.exists(file_path):
            return {
                "status": "error",
                "message": f"File not found: {file_path}",
                "unique_dois": [],
                "unique_dois_count": 0,
            }
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            records.extend(list(reader))

    # Source 3: Raw CSV text
    if csv_text:
        reader = csv.DictReader(io.StringIO(csv_text))
        records.extend(list(reader))

    if not records:
        return {
            "status": "success",
            "message": "No records provided to scan for DOIs.",
            "total_records_scanned": 0,
            "records_with_doi": 0,
            "unique_dois_count": 0,
            "unique_dois": [],
            "publications_with_dois": [],
        }

    seen_dois = set()
    unique_dois_list: List[str] = []
    publications_with_dois: List[Dict[str, Any]] = []

    for r in records:
        work_id = r.get("work_id") or r.get("Workid", "")
        title = r.get("title") or r.get("Title", "")
        year = r.get("publication_year") or r.get("Publication Year", "")
        dept = r.get("department") or r.get("Department", "")

        # Check candidate fields
        extracted_for_record: List[Tuple[str, str]] = []  # (doi, source_field)

        # 1. Direct primary_doi if already normalized
        if r.get("primary_doi"):
            doi = _clean_doi(r["primary_doi"])
            extracted_for_record.append((doi, "primary_doi"))

        # 2. Check Report DOI field
        report_doi = r.get("report_doi") or r.get("Report DOI", "")
        if report_doi and report_doi.strip():
            m = DOI_REGEX.search(report_doi)
            if m:
                extracted_for_record.append((_clean_doi(m.group(1)), "Report DOI"))
            elif report_doi.strip().startswith("10."):
                extracted_for_record.append((_clean_doi(report_doi), "Report DOI"))

        # 3. Check URIs field
        uris = r.get("uris") or r.get("URIs", "")
        if uris and uris.strip():
            for m in DOI_REGEX.finditer(uris):
                doi = _clean_doi(m.group(1))
                extracted_for_record.append((doi, "URIs"))

        # 4. Check Related Research Objects or other fields if present
        related = r.get("Related Research Objects", "") or r.get("related_research_objects", "")
        if related and related.strip():
            for m in DOI_REGEX.finditer(related):
                doi = _clean_doi(m.group(1))
                extracted_for_record.append((doi, "Related Research Objects"))

        # Deduplicate per record
        record_dois_seen = set()
        for doi, field in extracted_for_record:
            doi_lower = doi.lower()
            if doi_lower not in record_dois_seen:
                record_dois_seen.add(doi_lower)
                if doi_lower not in seen_dois:
                    seen_dois.add(doi_lower)
                    unique_dois_list.append(doi)

                publications_with_dois.append({
                    "work_id": str(work_id).strip(),
                    "title": str(title).strip(),
                    "publication_year": str(year).strip(),
                    "department": str(dept).strip(),
                    "doi": doi,
                    "doi_url": f"https://doi.org/{doi}",
                    "source_field": field,
                })

    records_with_doi_count = len({p["work_id"] for p in publications_with_dois if p["work_id"]})
    if records_with_doi_count == 0:
        records_with_doi_count = len(publications_with_dois)

    return {
        "status": "success",
        "total_records_scanned": len(records),
        "records_with_doi": records_with_doi_count,
        "unique_dois_count": len(unique_dois_list),
        "unique_dois": unique_dois_list,
        "publications_with_dois": publications_with_dois,
    }


def get_stfc_departments_and_types() -> Dict[str, Any]:
    """
    Returns valid department names and publication types available in the STFC
    repository to assist agents in formulating targeted filter queries.

    Returns:
        Dictionary listing STFC departments, facilities, and publication types:
        {
            "facilities_and_departments": ["ISIS", "Diamond Light Source", ...],
            "publication_types": ["Journal Article", "Conference Paper", ...]
        }
    """
    return {
        "status": "success",
        "facilities_and_departments": STFC_DEPARTMENTS,
        "publication_types": STFC_PUBLICATION_TYPES,
        "supported_sort_fields": ["score", "year", "title", "author"],
        "export_formats": ["standard", "researchfish", "ris"],
    }


# ============================================================================
# Framework Helpers: Google GenAI & LangChain
# ============================================================================

def get_agent_tools() -> List[Any]:
    """
    Returns the list of agent tool callables.
    These can be passed directly to:
    - Google GenAI SDK: `client.models.generate_content(..., config={'tools': get_agent_tools()})`
    - Any agent runtime that inspects Python functions and docstrings.
    """
    return [
        search_stfc_publications,
        download_stfc_dataset,
        extract_publication_dois,
        get_stfc_departments_and_types,
    ]


def get_gemini_function_declarations() -> List[Dict[str, Any]]:
    """
    Generates manual OpenAPI / JSON Schema function declarations compatible
    with Gemini API function calling specs or Vertex AI function calling.
    """
    return [
        {
            "name": "search_stfc_publications",
            "description": "Search the STFC ePubs repository for scientific papers and repository records.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "query": {
                        "type": "STRING",
                        "description": "Keywords, facility names (e.g. ISIS, Diamond), or research topics.",
                    },
                    "year": {
                        "type": "INTEGER",
                        "description": "Optional 4-digit publication year filter (e.g. 2023).",
                    },
                    "dept": {
                        "type": "STRING",
                        "description": "Optional STFC department or facility name (e.g. 'ISIS', 'RAL').",
                    },
                    "pub_type": {
                        "type": "STRING",
                        "description": "Optional publication type (e.g. 'Journal Article').",
                    },
                    "sort_by": {
                        "type": "STRING",
                        "description": "Field to sort by: 'score', 'year', 'title', or 'author'. Default 'score'.",
                    },
                    "limit": {
                        "type": "INTEGER",
                        "description": "Maximum number of records to return (default 10).",
                    },
                    "include_abstract": {
                        "type": "BOOLEAN",
                        "description": "Whether to fetch abstracts. Default False.",
                    },
                },
                "required": ["query"],
            },
        },
        {
            "name": "download_stfc_dataset",
            "description": "Download publications from STFC ePubs and save directly to a CSV or RIS file on disk.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "query": {"type": "STRING", "description": "Search query terms."},
                    "output_path": {"type": "STRING", "description": "Target file path on disk (e.g. 'output.csv')."},
                    "export_format": {
                        "type": "STRING",
                        "description": "Format: 'standard' CSV, 'researchfish' CSV, or 'ris'.",
                    },
                    "year": {"type": "INTEGER", "description": "Publication year filter."},
                    "dept": {"type": "STRING", "description": "Department filter."},
                    "limit": {"type": "INTEGER", "description": "Max rows to save."},
                },
                "required": ["query", "output_path"],
            },
        },
        {
            "name": "extract_publication_dois",
            "description": "Extract, validate, and normalize publication DOI addresses from a publication list or downloaded dataset.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "file_path": {
                        "type": "STRING",
                        "description": "Optional path to a CSV dataset file on disk to extract DOIs from.",
                    },
                    "csv_text": {
                        "type": "STRING",
                        "description": "Optional raw CSV string content.",
                    },
                },
            },
        },
        {
            "name": "get_stfc_departments_and_types",
            "description": "Returns supported STFC facilities, departments, and publication types for query filtering.",
            "parameters": {
                "type": "OBJECT",
                "properties": {},
            },
        },
    ]


if __name__ == "__main__":
    import pprint
    print("Testing STFC ePubs Agent Tools directly...")
    res = search_stfc_publications(query="quantum ISIS", limit=2)
    print(f"Status: {res.get('status')}, Estimated total: {res.get('estimated_total')}")
    print(f"Found {len(res.get('publications', []))} publications:")
    pprint.pprint(res.get("publications"))

    print("\nTesting DOI extraction...")
    doi_res = extract_publication_dois(dataset=res.get("publications"))
    print(f"Extracted {doi_res.get('unique_dois_count')} DOIs:")
    pprint.pprint(doi_res.get("unique_dois"))
