"""
STFC ePubs & Beamtime RB Extractor Tools Package
"""

from .stfc_epubs_downloader import StfcEpubsDownloader, download_csv
from .stfc_epubs_tool import (
    search_stfc_publications,
    download_stfc_dataset,
    extract_publication_dois,
    get_stfc_departments_and_types,
    get_agent_tools,
    get_gemini_function_declarations,
)
from .rb_extractor_tool import (
    extract_rb_experiment_numbers,
    extract_rb_from_doi,
    extract_rb_from_pdf,
    scan_text_for_rb,
    get_rb_agent_tools,
    get_gemini_rb_tool_declarations,
)

__all__ = [
    # STFC ePubs repository tools
    "StfcEpubsDownloader",
    "download_csv",
    "search_stfc_publications",
    "download_stfc_dataset",
    "extract_publication_dois",
    "get_stfc_departments_and_types",
    "get_agent_tools",
    "get_gemini_function_declarations",
    # RB experiment number tools
    "extract_rb_experiment_numbers",
    "extract_rb_from_doi",
    "extract_rb_from_pdf",
    "scan_text_for_rb",
    "get_rb_agent_tools",
    "get_gemini_rb_tool_declarations",
]
