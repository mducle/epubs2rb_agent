"""
Example & Verification Script: STFC ePubs Agent Tools
======================================================
Demonstrates how an AI Agent (e.g. Gemini / Google GenAI SDK, LangChain, or custom agent loop)
uses the STFC ePubs tools to:
1. Search STFC institutional repository for publications.
2. Query valid departments/facilities (ISIS, RAL, Diamond, etc.).
3. Download search datasets to disk.
4. Parse and extract DOI addresses from datasets.
5. Export tool definitions for Gemini Function Calling.
"""

import json
import os
import sys
import tempfile

# Ensure workspace root is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from tool_src.stfc_epubs_tool import (
    search_stfc_publications,
    download_stfc_dataset,
    extract_publication_dois,
    get_stfc_departments_and_types,
    get_gemini_function_declarations,
    get_agent_tools,
)


def run_tests():
    # Ensure stdout handles utf-8 if reconfigured
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 70)
    print("[*] RUNNING STFC EPUBS AGENT TOOLS TEST & VERIFICATION SUITE")
    print("=" * 70)

    # ------------------------------------------------------------------------
    # Test 1: Department and Facility metadata helper
    # ------------------------------------------------------------------------
    print("\n[Test 1] Inspecting STFC facilities and publication types...")
    meta = get_stfc_departments_and_types()
    assert meta["status"] == "success"
    assert "ISIS" in meta["facilities_and_departments"]
    assert "Diamond Light Source" in meta["facilities_and_departments"]
    assert "Journal Article" in meta["publication_types"]
    print(f"  [OK] Found {len(meta['facilities_and_departments'])} facilities/departments and {len(meta['publication_types'])} publication types.")

    # ------------------------------------------------------------------------
    # Test 2: Search STFC publications (ISIS neutron / quantum)
    # ------------------------------------------------------------------------
    print("\n[Test 2] Agent searching STFC publications (query='ISIS neutron', limit=3)...")
    search_res = search_stfc_publications(
        query="ISIS neutron",
        dept="ISIS",
        limit=3,
        sort_by="score",
    )
    assert search_res["status"] == "success", f"Search failed: {search_res}"
    assert len(search_res["publications"]) > 0, "Expected at least 1 publication"
    print(f"  [OK] Search succeeded. Estimated total: {search_res.get('estimated_total')}")
    print(f"  [OK] Retrieved {len(search_res['publications'])} publications:")
    for i, p in enumerate(search_res["publications"], 1):
        print(f"     [{i}] Workid: {p.get('work_id')} | Year: {p.get('publication_year')}")
        print(f"         Title: {p.get('title')[:75]}...")
        print(f"         DOI: {p.get('primary_doi')} (URL: {p.get('doi_url')})")

    # ------------------------------------------------------------------------
    # Test 3: Extract DOIs from in-memory publication objects
    # ------------------------------------------------------------------------
    print("\n[Test 3] Extracting DOIs from in-memory publication search results...")
    doi_res = extract_publication_dois(dataset=search_res["publications"])
    assert doi_res["status"] == "success"
    print(f"  [OK] Scanned records: {doi_res['total_records_scanned']}")
    print(f"  [OK] Records with DOI: {doi_res['records_with_doi']}")
    print(f"  [OK] Unique DOIs extracted: {doi_res['unique_dois_count']}")
    for d in doi_res["unique_dois"]:
        print(f"     -> {d}")

    # ------------------------------------------------------------------------
    # Test 4: Download dataset to CSV file on disk
    # ------------------------------------------------------------------------
    temp_dir = tempfile.mkdtemp(prefix="stfc_agent_test_")
    test_csv_path = os.path.join(temp_dir, "test_stfc_export.csv")
    print(f"\n[Test 4] Agent downloading dataset to disk: {test_csv_path}...")

    download_res = download_stfc_dataset(
        query="superconductivity",
        output_path=test_csv_path,
        limit=5,
    )
    assert download_res["status"] == "success", f"Download failed: {download_res}"
    assert os.path.exists(test_csv_path), "File should exist on disk"
    file_size = os.path.getsize(test_csv_path)
    assert file_size > 0, "File should not be empty"
    print(f"  [OK] Download completed: {download_res['records_count']} records, {download_res['file_size_bytes']} bytes")

    # ------------------------------------------------------------------------
    # Test 5: Parse and extract DOIs from downloaded CSV file
    # ------------------------------------------------------------------------
    print(f"\n[Test 5] Extracting publication DOIs from downloaded CSV file ({test_csv_path})...")
    file_doi_res = extract_publication_dois(file_path=test_csv_path)
    assert file_doi_res["status"] == "success"
    assert file_doi_res["total_records_scanned"] > 0
    print(f"  [OK] Scanned {file_doi_res['total_records_scanned']} records from CSV file.")
    print(f"  [OK] Found {file_doi_res['unique_dois_count']} unique DOIs.")
    for pub in file_doi_res["publications_with_dois"][:3]:
        print(f"     Workid {pub['work_id']} -> DOI: {pub['doi']} (field: {pub['source_field']})")

    # Cleanup temp test file
    try:
        os.remove(test_csv_path)
        os.rmdir(temp_dir)
    except Exception:
        pass

    # ------------------------------------------------------------------------
    # Test 6: Verify Gemini Function Declarations
    # ------------------------------------------------------------------------
    print("\n[Test 6] Verifying Gemini / Google GenAI Function Declarations...")
    declarations = get_gemini_function_declarations()
    assert len(declarations) == 4
    names = [d["name"] for d in declarations]
    assert "search_stfc_publications" in names
    assert "download_stfc_dataset" in names
    assert "extract_publication_dois" in names
    assert "get_stfc_departments_and_types" in names
    print(f"  [OK] Successfully verified {len(declarations)} Gemini function declarations:")
    for d in declarations:
        print(f"     - {d['name']}: {d['description']}")

    # ------------------------------------------------------------------------
    # Test 7: Simulated Agent Workflow Cycle
    # ------------------------------------------------------------------------
    print("\n[Test 7] Simulated LLM Agent Execution Flow...")
    print("  Scenario: User asks agent: 'Find publications on muon spectroscopy at ISIS and give me all DOIs'")
    agent_query = "muon spectroscopy"
    step1 = search_stfc_publications(query=agent_query, dept="ISIS", limit=3)
    step2 = extract_publication_dois(dataset=step1["publications"])

    agent_response = {
        "user_query": agent_query,
        "facility": "ISIS",
        "papers_found": step1["returned_count"],
        "dois": step2["unique_dois"],
    }
    print("  Agent synthesized response:")
    print(json.dumps(agent_response, indent=4))

    print("\n" + "=" * 70)
    print("[OK] ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
