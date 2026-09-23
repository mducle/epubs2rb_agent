"""
STFC ePubs Tools Package
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

__all__ = [
    "StfcEpubsDownloader",
    "download_csv",
    "search_stfc_publications",
    "download_stfc_dataset",
    "extract_publication_dois",
    "get_stfc_departments_and_types",
    "get_agent_tools",
    "get_gemini_function_declarations",
]

